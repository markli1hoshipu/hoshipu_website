"""
YIF IOUs and Payments API Router
Handles IOU and payment CRUD operations with PostgreSQL
Updated: 2025-12-23 - Fixed IOUItemCreate model
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import io
import openpyxl

from database import get_db_connection
from routers.yif_router import verify_token
from rate_limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/api/yif", tags=["yif-ious"])


# ========================
# Pydantic Models
# ========================

from pydantic import validator


class IOUItemCreate(BaseModel):
    client: str
    amount: float
    flight: Optional[str] = ""
    ticket_number: Optional[str] = ""
    remark: Optional[str] = ""

    @validator('amount')
    def amount_must_be_reasonable(cls, v):
        if abs(v) > 100000000:  # 100 million limit
            raise ValueError('Amount exceeds reasonable limit')
        return v


class IOUCreate(BaseModel):
    user_code: str
    ious_date: str  # YYMMDD format
    items: List[IOUItemCreate]
    ious_id: Optional[str] = None  # Auto-generated if not provided


class PaymentCreate(BaseModel):
    ious_db_id: int  # Database ID of IOU
    user_code: str
    payment_date: str  # YYMMDD format
    payer_name: str
    amount: float
    remark: Optional[str] = ""

    @validator('amount')
    def amount_must_be_reasonable(cls, v):
        if abs(v) > 100000000:  # 100 million limit
            raise ValueError('Amount exceeds reasonable limit')
        return v


class BatchPaymentCreate(BaseModel):
    user_code: str
    payment_date: str
    payer_name: str
    total_amount: float
    ious_db_ids: List[int]  # List of IOU database IDs in order
    remark: Optional[str] = ""

    @validator('total_amount')
    def amount_must_be_reasonable(cls, v):
        if abs(v) > 100000000:  # 100 million limit
            raise ValueError('Amount exceeds reasonable limit')
        return v


class IOUSearchParams(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    client: Optional[str] = None
    ticket_number: Optional[str] = None
    remaining_amount: Optional[float] = None
    amount_margin: Optional[float] = 100
    initial_amount: Optional[float] = None
    initial_margin: Optional[float] = 100
    flight: Optional[str] = None
    status: Optional[str] = None  # "0,1,2" format
    remark: Optional[str] = None
    ious_id: Optional[str] = None


class PaymentSearchParams(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    payer_name: Optional[str] = None
    remark: Optional[str] = None


# ========================
# Helper Functions
# ========================

def get_user_info(cursor, user_id: int):
    """Get user info including role for RLS"""
    cursor.execute("""
        SELECT id, username, user_code, role
        FROM yif_workers
        WHERE id = %s AND is_active = TRUE
    """, (user_id,))
    return cursor.fetchone()


def set_rls_context(cursor, user_id: int, role: str):
    """Set RLS context for the current session"""
    cursor.execute("SELECT set_yif_user_context(%s, %s)", (user_id, role))


def update_iou_status(cursor, ious_db_id: int):
    """
    Update IOU status based on payments.
    Call this after any payment operation.

    Status codes:
    - 0: Unpaid (no payments)
    - 1: Partial (has payments, still has balance)
    - 2: Paid (remaining = 0)
    - 3: Negative (initial amount < 0)
    - 4: Overpaid (remaining < 0, but initial >= 0)
    """
    cursor.execute("""
        UPDATE yif_ious SET status = (
            SELECT CASE
                WHEN i.total_amount < 0 THEN 3
                WHEN i.total_amount - COALESCE(SUM(p.amount), 0) = 0 THEN 2
                WHEN i.total_amount - COALESCE(SUM(p.amount), 0) < 0 THEN 4
                WHEN COUNT(p.id) > 0 THEN 1
                ELSE 0
            END
            FROM yif_ious i
            LEFT JOIN yif_payments p ON p.ious_id = i.id
            WHERE i.id = %s
            GROUP BY i.id, i.total_amount
        )
        WHERE id = %s
    """, (ious_db_id, ious_db_id))


def generate_ious_id(cursor, user_code: str, date: str, is_hand_entry: bool = True):
    """Generate next available IOU ID"""
    user_code = user_code.upper()
    while len(user_code) < 3:
        user_code = 'A' + user_code
    if len(user_code) > 3:
        user_code = user_code[:3]

    type_char = 'H' if is_hand_entry else 'D'
    prefix = f"{user_code}{date}{type_char}"

    # Find next available number
    cursor.execute("""
        SELECT ious_id FROM yif_ious
        WHERE ious_id LIKE %s
        ORDER BY ious_id DESC
        LIMIT 1
    """, (f"{prefix}%",))

    result = cursor.fetchone()
    if result:
        last_num = int(result['ious_id'][-2:])
        next_num = last_num + 1
    else:
        next_num = 1

    if next_num > 99:
        raise HTTPException(400, "Maximum IOU number reached for this date and type")

    return f"{prefix}{next_num:02d}"


def calculate_iou_rest(cursor, iou_db_id: int) -> float:
    """Calculate remaining amount for an IOU"""
    cursor.execute("""
        SELECT
            i.total_amount,
            COALESCE(SUM(p.amount), 0) as paid
        FROM yif_ious i
        LEFT JOIN yif_payments p ON p.ious_id = i.id
        WHERE i.id = %s
        GROUP BY i.id
    """, (iou_db_id,))
    result = cursor.fetchone()
    if result:
        return float(result['total_amount']) - float(result['paid'])
    return 0


# ========================
# IOU Endpoints
# ========================

@router.post("/ious")
@limiter.limit("30/minute")
async def create_iou(request: Request, iou_data: IOUCreate, user_id: int = Depends(verify_token)):
    """Create a new IOU with items"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get user info
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Validate date format
        if len(iou_data.ious_date) != 6 or not iou_data.ious_date.isdigit():
            raise HTTPException(400, "Date must be in YYMMDD format")

        # Validate user_code
        user_code = iou_data.user_code.upper()
        if not user_code.isalpha() or len(user_code) > 3:
            raise HTTPException(400, "User code must be 2-3 letters")

        while len(user_code) < 3:
            user_code = 'A' + user_code

        # Generate IOU ID if not provided
        ious_id = iou_data.ious_id
        if not ious_id:
            ious_id = generate_ious_id(cursor, user_code, iou_data.ious_date)

        # Check for duplicate
        cursor.execute("SELECT id FROM yif_ious WHERE ious_id = %s", (ious_id,))
        if cursor.fetchone():
            raise HTTPException(400, f"IOU ID {ious_id} already exists")

        # Calculate total amount
        total_amount = sum(item.amount for item in iou_data.items)

        # Determine initial status
        status = 3 if total_amount < 0 else 0

        # Insert IOU
        cursor.execute("""
            INSERT INTO yif_ious (ious_id, worker_id, user_code, ious_date, total_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (ious_id, user_id, user_code, iou_data.ious_date, total_amount, status))

        iou_db_id = cursor.fetchone()['id']

        # Insert items
        for idx, item in enumerate(iou_data.items):
            cursor.execute("""
                INSERT INTO yif_iou_items (ious_id, worker_id, item_index, client, amount, flight, ticket_number, remark)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (iou_db_id, user_id, idx, item.client, item.amount,
                  item.flight or "", item.ticket_number or "", item.remark or ""))

        # Log the action
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, 'create_iou', 'iou', ious_id, f"Created IOU with {len(iou_data.items)} items, total: {total_amount}"))

        conn.commit()

        return {
            "success": True,
            "message": f"IOU {ious_id} created successfully",
            "iou": {
                "id": iou_db_id,
                "ious_id": ious_id,
                "total_amount": total_amount,
                "items_count": len(iou_data.items)
            }
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to create IOU: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/ious")
async def search_ious(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    client: Optional[str] = None,
    ticket_number: Optional[str] = None,
    remaining_amount: Optional[float] = None,
    amount_margin: float = 100,
    initial_amount: Optional[float] = None,
    initial_margin: float = 100,
    flight: Optional[str] = None,
    status: Optional[str] = None,
    remark: Optional[str] = None,
    ious_id: Optional[str] = None,
    target_worker_id: Optional[str] = None,  # Filter by worker_id (admin/manager only for team-data)
    skip: int = 0,
    limit: int = 100,
    user_id: int = Depends(verify_token)
):
    """Search IOUs with various filters"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Build query
        query = """
            SELECT
                i.id,
                i.ious_id,
                i.user_code,
                i.worker_id,
                i.ious_date,
                i.total_amount,
                i.status,
                i.created_at,
                COALESCE(SUM(p.amount), 0) as paid,
                i.total_amount - COALESCE(SUM(p.amount), 0) as rest
            FROM yif_ious i
            LEFT JOIN yif_payments p ON p.ious_id = i.id
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND i.ious_date >= %s"
            params.append(start_date)

        if end_date:
            query += " AND i.ious_date <= %s"
            params.append(end_date)

        if ious_id:
            query += " AND i.ious_id LIKE %s"
            params.append(f"%{ious_id}%")

        if status:
            status_list = [int(s) for s in status.split(',') if s.isdigit()]
            if status_list:
                query += f" AND i.status IN ({','.join(['%s'] * len(status_list))})"
                params.extend(status_list)

        # worker_id filter logic:
        # - By default, everyone only sees their own IOUs (by worker_id)
        # - Admin/manager can pass target_worker_id="all" to see all, or target_worker_id=X to see specific user
        if target_worker_id and user['role'] in ('admin', 'manager'):
            # Admin/manager with explicit target_worker_id parameter
            if target_worker_id.lower() != 'all':
                query += " AND i.worker_id = %s"
                params.append(int(target_worker_id))
            # If target_worker_id="all", no filter - see all users
        else:
            # Default: filter by current user's worker_id
            query += " AND i.worker_id = %s"
            params.append(user_id)

        query += " GROUP BY i.id"

        # Amount filters (applied after grouping)
        having_clauses = []

        if remaining_amount is not None:
            having_clauses.append("(i.total_amount - COALESCE(SUM(p.amount), 0)) BETWEEN %s AND %s")
            params.append(remaining_amount - amount_margin)
            params.append(remaining_amount + amount_margin)

        if initial_amount is not None:
            having_clauses.append("i.total_amount BETWEEN %s AND %s")
            params.append(initial_amount - initial_margin)
            params.append(initial_amount + initial_margin)

        if having_clauses:
            query += " HAVING " + " AND ".join(having_clauses)

        # If text filters are used, we need to filter via subquery with items
        if client or ticket_number or flight or remark:
            # Build item filter subquery
            item_conditions = []
            item_params = []
            if client:
                item_conditions.append("LOWER(it.client) LIKE %s")
                item_params.append(f"%{client.lower()}%")
            if ticket_number:
                item_conditions.append("it.ticket_number LIKE %s")
                item_params.append(f"%{ticket_number}%")
            if flight:
                item_conditions.append("LOWER(it.flight) LIKE %s")
                item_params.append(f"%{flight.lower()}%")
            if remark:
                item_conditions.append("LOWER(it.remark) LIKE %s")
                item_params.append(f"%{remark.lower()}%")

            # Wrap original query and filter by items
            query = f"""
                SELECT * FROM ({query}) AS filtered_ious
                WHERE filtered_ious.id IN (
                    SELECT DISTINCT it.ious_id FROM yif_iou_items it
                    WHERE {" AND ".join(item_conditions)}
                )
            """
            params = params + item_params

        # Always add ORDER BY at the end (after any wrapping)
        query += " ORDER BY ious_date DESC, ious_id DESC"

        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['count']

        # Add pagination
        query += " LIMIT %s OFFSET %s"
        params.extend([limit, skip])

        cursor.execute(query, params)
        ious_list = cursor.fetchall()

        if not ious_list:
            return {
                "success": True,
                "total": 0,
                "skip": skip,
                "limit": limit,
                "ious": []
            }

        # ===== BATCH QUERY OPTIMIZATION =====
        # Get all IOU IDs for batch queries
        iou_ids = [iou['id'] for iou in ious_list]

        # Batch query: Get ALL items for these IOUs in ONE query
        cursor.execute("""
            SELECT ious_id, client, amount, flight, ticket_number, remark, item_index
            FROM yif_iou_items
            WHERE ious_id = ANY(%s)
            ORDER BY ious_id, item_index
        """, (iou_ids,))
        all_items = cursor.fetchall()

        # Batch query: Get ALL payments for these IOUs in ONE query
        cursor.execute("""
            SELECT ious_id, payment_date, payer_name, amount, remark
            FROM yif_payments
            WHERE ious_id = ANY(%s)
            ORDER BY ious_id, created_at
        """, (iou_ids,))
        all_payments = cursor.fetchall()

        # Group items by IOU ID using dictionary (O(1) lookup)
        items_by_iou = {}
        for item in all_items:
            iou_id = item['ious_id']
            if iou_id not in items_by_iou:
                items_by_iou[iou_id] = []
            items_by_iou[iou_id].append({
                'client': item['client'],
                'amount': float(item['amount']),
                'flight': item['flight'],
                'ticket_number': item['ticket_number'],
                'remark': item['remark']
            })

        # Group payments by IOU ID using dictionary (O(1) lookup)
        payments_by_iou = {}
        for payment in all_payments:
            iou_id = payment['ious_id']
            if iou_id not in payments_by_iou:
                payments_by_iou[iou_id] = []
            payments_by_iou[iou_id].append({
                'payment_date': payment['payment_date'],
                'payer_name': payment['payer_name'],
                'amount': float(payment['amount']),
                'remark': payment['remark']
            })

        # Build results using dictionary lookups (fast!)
        results = []
        for iou in ious_list:
            iou_id = iou['id']
            results.append({
                **dict(iou),
                'total_amount': float(iou['total_amount']),
                'paid': float(iou['paid']),
                'rest': float(iou['rest']),
                'items': items_by_iou.get(iou_id, []),
                'payments': payments_by_iou.get(iou_id, [])
            })

        return {
            "success": True,
            "total": total,
            "skip": skip,
            "limit": limit,
            "ious": results
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Search failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/ious/{iou_db_id}")
async def get_iou(iou_db_id: int, user_id: int = Depends(verify_token)):
    """Get a single IOU with full details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Users can only view their own IOUs (by worker_id)
        cursor.execute("""
            SELECT
                i.*,
                COALESCE(SUM(p.amount), 0) as paid,
                i.total_amount - COALESCE(SUM(p.amount), 0) as rest
            FROM yif_ious i
            LEFT JOIN yif_payments p ON p.ious_id = i.id
            WHERE i.id = %s AND i.worker_id = %s
            GROUP BY i.id
        """, (iou_db_id, user_id))

        iou = cursor.fetchone()
        if not iou:
            raise HTTPException(404, "IOU not found or access denied")

        # Get items
        cursor.execute("""
            SELECT * FROM yif_iou_items
            WHERE ious_id = %s
            ORDER BY item_index
        """, (iou_db_id,))
        items = cursor.fetchall()

        # Get payments
        cursor.execute("""
            SELECT * FROM yif_payments
            WHERE ious_id = %s
            ORDER BY created_at
        """, (iou_db_id,))
        payments = cursor.fetchall()

        return {
            "success": True,
            "iou": {
                **dict(iou),
                'total_amount': float(iou['total_amount']),
                'paid': float(iou['paid']),
                'rest': float(iou['rest']),
                'items': [dict(item) for item in items],
                'payments': [dict(p) for p in payments]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get IOU: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/ious/next-id/{user_code}/{date}")
async def get_next_iou_id(user_code: str, date: str, user_id: int = Depends(verify_token)):
    """Get the next available IOU ID for hand entry"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        next_id = generate_ious_id(cursor, user_code, date, is_hand_entry=True)
        return {"success": True, "next_id": next_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to generate ID: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================
# Payment Endpoints
# ========================

@router.post("/payments")
@limiter.limit("60/minute")
async def create_payment(request: Request, payment_data: PaymentCreate, user_id: int = Depends(verify_token)):
    """Create a single payment"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Validate date
        if len(payment_data.payment_date) != 6 or not payment_data.payment_date.isdigit():
            raise HTTPException(400, "Date must be in YYMMDD format")

        # Validate user_code
        user_code = payment_data.user_code.upper()
        if not user_code.isalpha():
            raise HTTPException(400, "User code must be letters only")

        while len(user_code) < 3:
            user_code = 'A' + user_code
        if len(user_code) > 3:
            user_code = user_code[:3]

        # Check if IOU exists
        cursor.execute("SELECT id, ious_id FROM yif_ious WHERE id = %s", (payment_data.ious_db_id,))
        iou = cursor.fetchone()
        if not iou:
            raise HTTPException(404, "IOU not found")

        # Insert payment
        cursor.execute("""
            INSERT INTO yif_payments (ious_id, worker_id, user_code, payment_date, payer_name, amount, remark)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (payment_data.ious_db_id, user_id, user_code, payment_data.payment_date,
              payment_data.payer_name, payment_data.amount, payment_data.remark or ""))

        payment_id = cursor.fetchone()['id']

        # Update IOU status
        update_iou_status(cursor, payment_data.ious_db_id)

        # Log
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, 'create_payment', 'payment', str(payment_id),
              f"Payment of {payment_data.amount} to IOU {iou['ious_id']}"))

        conn.commit()

        # Get updated IOU rest
        rest = calculate_iou_rest(cursor, payment_data.ious_db_id)

        return {
            "success": True,
            "message": f"Payment created successfully",
            "payment": {
                "id": payment_id,
                "ious_id": iou['ious_id'],
                "amount": payment_data.amount,
                "new_rest": rest
            }
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to create payment: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.post("/payments/batch")
@limiter.limit("20/minute")
async def create_batch_payment(request: Request, batch_data: BatchPaymentCreate, user_id: int = Depends(verify_token)):
    """Create batch payments - distribute amount across multiple IOUs in order"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Validate
        if len(batch_data.payment_date) != 6 or not batch_data.payment_date.isdigit():
            raise HTTPException(400, "Date must be in YYMMDD format")

        user_code = batch_data.user_code.upper()
        while len(user_code) < 3:
            user_code = 'A' + user_code
        if len(user_code) > 3:
            user_code = user_code[:3]

        if batch_data.total_amount <= 0:
            raise HTTPException(400, "Amount must be positive")

        # Get IOUs with their remaining amounts
        ious_info = []
        total_rest = 0
        for iou_id in batch_data.ious_db_ids:
            cursor.execute("""
                SELECT
                    i.id, i.ious_id, i.total_amount,
                    i.total_amount - COALESCE(SUM(p.amount), 0) as rest
                FROM yif_ious i
                LEFT JOIN yif_payments p ON p.ious_id = i.id
                WHERE i.id = %s
                GROUP BY i.id
            """, (iou_id,))
            iou = cursor.fetchone()
            if iou:
                ious_info.append(iou)
                total_rest += float(iou['rest'])

        if not ious_info:
            raise HTTPException(404, "No valid IOUs found")

        if batch_data.total_amount > total_rest:
            raise HTTPException(400, f"Payment amount ({batch_data.total_amount}) exceeds total remaining ({total_rest})")

        # Distribute payments
        remaining_amount = batch_data.total_amount
        created_payments = []

        for iou in ious_info:
            if remaining_amount <= 0:
                break

            rest = float(iou['rest'])
            if rest <= 0:
                continue

            payment_amount = min(rest, remaining_amount)
            remaining_amount -= payment_amount

            cursor.execute("""
                INSERT INTO yif_payments (ious_id, worker_id, user_code, payment_date, payer_name, amount, remark)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (iou['id'], user_id, user_code, batch_data.payment_date,
                  batch_data.payer_name, payment_amount, batch_data.remark or ""))

            payment_id = cursor.fetchone()['id']

            # Update IOU status
            update_iou_status(cursor, iou['id'])

            created_payments.append({
                "id": payment_id,
                "ious_id": iou['ious_id'],
                "amount": payment_amount
            })

        # Log
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, 'batch_payment', 'payment', 'batch',
              f"Batch payment of {batch_data.total_amount} across {len(created_payments)} IOUs"))

        conn.commit()

        return {
            "success": True,
            "message": f"Created {len(created_payments)} payments",
            "payments": created_payments
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to create batch payments: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.post("/payments/selective")
async def create_selective_payment(batch_data: BatchPaymentCreate, user_id: int = Depends(verify_token)):
    """Create selective payments - prioritize negative IOUs first"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Validate
        if len(batch_data.payment_date) != 6 or not batch_data.payment_date.isdigit():
            raise HTTPException(400, "Date must be in YYMMDD format")

        user_code = batch_data.user_code.upper()
        while len(user_code) < 3:
            user_code = 'A' + user_code
        if len(user_code) > 3:
            user_code = user_code[:3]

        # Get IOUs with their remaining amounts
        ious_info = []
        for iou_id in batch_data.ious_db_ids:
            cursor.execute("""
                SELECT
                    i.id, i.ious_id, i.total_amount,
                    i.total_amount - COALESCE(SUM(p.amount), 0) as rest
                FROM yif_ious i
                LEFT JOIN yif_payments p ON p.ious_id = i.id
                WHERE i.id = %s
                GROUP BY i.id
            """, (iou_id,))
            iou = cursor.fetchone()
            if iou:
                ious_info.append(iou)

        if not ious_info:
            raise HTTPException(404, "No valid IOUs found")

        # Separate negative and positive IOUs
        negative_ious = [i for i in ious_info if float(i['rest']) < 0]
        positive_ious = [i for i in ious_info if float(i['rest']) > 0]

        # Calculate totals
        total_rest = sum(float(i['rest']) for i in ious_info)

        if batch_data.total_amount > total_rest:
            raise HTTPException(400, f"Payment amount ({batch_data.total_amount}) exceeds total remaining ({total_rest})")

        remaining_amount = batch_data.total_amount
        created_payments = []

        # First, clear negative IOUs (pay their absolute value to bring to 0)
        for iou in negative_ious:
            rest = float(iou['rest'])  # This is negative
            payment_amount = rest  # Negative payment to bring to 0
            remaining_amount -= rest  # Subtracting negative = adding

            cursor.execute("""
                INSERT INTO yif_payments (ious_id, worker_id, user_code, payment_date, payer_name, amount, remark)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (iou['id'], user_id, user_code, batch_data.payment_date,
                  batch_data.payer_name, payment_amount, batch_data.remark or ""))

            payment_id = cursor.fetchone()['id']

            # Update IOU status
            update_iou_status(cursor, iou['id'])

            created_payments.append({
                "id": payment_id,
                "ious_id": iou['ious_id'],
                "amount": payment_amount
            })

        # Then distribute to positive IOUs
        for iou in positive_ious:
            if remaining_amount <= 0:
                break

            rest = float(iou['rest'])
            payment_amount = min(rest, remaining_amount)
            remaining_amount -= payment_amount

            cursor.execute("""
                INSERT INTO yif_payments (ious_id, worker_id, user_code, payment_date, payer_name, amount, remark)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (iou['id'], user_id, user_code, batch_data.payment_date,
                  batch_data.payer_name, payment_amount, batch_data.remark or ""))

            payment_id = cursor.fetchone()['id']

            # Update IOU status
            update_iou_status(cursor, iou['id'])

            created_payments.append({
                "id": payment_id,
                "ious_id": iou['ious_id'],
                "amount": payment_amount
            })

        # Log
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, 'selective_payment', 'payment', 'selective',
              f"Selective payment of {batch_data.total_amount} across {len(created_payments)} IOUs"))

        conn.commit()

        return {
            "success": True,
            "message": f"Created {len(created_payments)} payments",
            "payments": created_payments
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to create selective payments: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/payments")
async def search_payments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    payer_name: Optional[str] = None,
    remark: Optional[str] = None,
    target_worker_id: Optional[str] = None,  # Filter by worker_id (admin/manager only)
    skip: int = 0,
    limit: int = 100,
    user_id: int = Depends(verify_token)
):
    """Search payments"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        query = """
            SELECT
                p.*,
                i.ious_id as iou_ious_id
            FROM yif_payments p
            JOIN yif_ious i ON i.id = p.ious_id
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND p.payment_date >= %s"
            params.append(start_date)

        if end_date:
            query += " AND p.payment_date <= %s"
            params.append(end_date)

        if payer_name:
            query += " AND p.payer_name LIKE %s"
            params.append(f"%{payer_name}%")

        if remark:
            query += " AND p.remark LIKE %s"
            params.append(f"%{remark}%")

        # worker_id filter: everyone sees their own payments by default
        # Admin/manager can pass target_worker_id="all" to see all
        if target_worker_id and user['role'] in ('admin', 'manager'):
            if target_worker_id.lower() != 'all':
                query += " AND p.worker_id = %s"
                params.append(int(target_worker_id))
        else:
            query += " AND p.worker_id = %s"
            params.append(user_id)

        # Count
        count_query = f"SELECT COUNT(*) FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['count']

        query += " ORDER BY p.payment_date DESC, p.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, skip])

        cursor.execute(query, params)
        payments = cursor.fetchall()

        return {
            "success": True,
            "total": total,
            "skip": skip,
            "limit": limit,
            "payments": [dict(p) for p in payments]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Search failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================
# Export Endpoints
# ========================

@router.get("/export/ious")
async def export_ious(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    target_worker_id: Optional[str] = None,  # Filter by worker_id (admin/manager only for team-data)
    export_type: str = "summary",  # summary, detailed, full
    user_id: int = Depends(verify_token)
):
    """Export IOUs to Excel"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Build query
        query = """
            SELECT
                i.*,
                COALESCE(SUM(p.amount), 0) as paid,
                i.total_amount - COALESCE(SUM(p.amount), 0) as rest
            FROM yif_ious i
            LEFT JOIN yif_payments p ON p.ious_id = i.id
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND i.ious_date >= %s"
            params.append(start_date)

        if end_date:
            query += " AND i.ious_date <= %s"
            params.append(end_date)

        if status:
            status_list = [int(s) for s in status.split(',') if s.isdigit()]
            if status_list:
                query += f" AND i.status IN ({','.join(['%s'] * len(status_list))})"
                params.extend(status_list)

        # worker_id filter: everyone exports their own IOUs by default
        # Admin/manager can pass target_worker_id="all" to export all
        if target_worker_id and user['role'] in ('admin', 'manager'):
            if target_worker_id.lower() != 'all':
                query += " AND i.worker_id = %s"
                params.append(int(target_worker_id))
        else:
            query += " AND i.worker_id = %s"
            params.append(user_id)

        query += " GROUP BY i.id ORDER BY i.ious_date DESC, i.ious_id DESC"

        cursor.execute(query, params)
        ious_list = cursor.fetchall()

        # Create Excel workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "IOUs"

        if export_type == "summary":
            # Summary: one row per IOU
            ws.append(['Date', 'Initial Amount', 'Remaining', 'Client', 'User', 'IOU ID', 'Remark'])
            for iou in ious_list:
                cursor.execute("SELECT client, remark FROM yif_iou_items WHERE ious_id = %s LIMIT 1", (iou['id'],))
                item = cursor.fetchone()
                ws.append([
                    iou['ious_date'],
                    float(iou['total_amount']),
                    float(iou['rest']),
                    item['client'] if item else '',
                    iou['user_code'],
                    iou['ious_id'],
                    item['remark'] if item else ''
                ])

        elif export_type == "detailed":
            # Detailed: show all items
            ws.append(['Date', 'Total Amount', 'Remaining', 'Client', 'User', 'IOU ID',
                      'Ticket', 'Flight', 'Item Amount', 'Remark'])
            for iou in ious_list:
                cursor.execute("SELECT * FROM yif_iou_items WHERE ious_id = %s ORDER BY item_index", (iou['id'],))
                items = cursor.fetchall()
                for idx, item in enumerate(items):
                    ws.append([
                        iou['ious_date'] if idx == 0 else '',
                        float(iou['total_amount']) if idx == 0 else '',
                        float(iou['rest']) if idx == 0 else '',
                        item['client'],
                        iou['user_code'] if idx == 0 else '',
                        iou['ious_id'] if idx == 0 else '',
                        item['ticket_number'],
                        item['flight'],
                        float(item['amount']),
                        item['remark']
                    ])

        else:  # full - include payments
            ws.append(['Date', 'Total Amount', 'Remaining', 'Client', 'User', 'IOU ID',
                      'Ticket', 'Flight', 'Item Amount', 'IOU Remark',
                      'Payment Date', 'Payment Amount', 'Payer', 'Payment Remark'])
            for iou in ious_list:
                cursor.execute("SELECT * FROM yif_iou_items WHERE ious_id = %s ORDER BY item_index", (iou['id'],))
                items = cursor.fetchall()
                cursor.execute("SELECT * FROM yif_payments WHERE ious_id = %s ORDER BY created_at", (iou['id'],))
                payments = cursor.fetchall()

                max_rows = max(len(items), len(payments), 1)
                for idx in range(max_rows):
                    row = [
                        iou['ious_date'] if idx == 0 else '',
                        float(iou['total_amount']) if idx == 0 else '',
                        float(iou['rest']) if idx == 0 else '',
                        items[idx]['client'] if idx < len(items) else '',
                        iou['user_code'] if idx == 0 else '',
                        iou['ious_id'] if idx == 0 else '',
                        items[idx]['ticket_number'] if idx < len(items) else '',
                        items[idx]['flight'] if idx < len(items) else '',
                        float(items[idx]['amount']) if idx < len(items) else '',
                        items[idx]['remark'] if idx < len(items) else '',
                        payments[idx]['payment_date'] if idx < len(payments) else '',
                        float(payments[idx]['amount']) if idx < len(payments) else '',
                        payments[idx]['payer_name'] if idx < len(payments) else '',
                        payments[idx]['remark'] if idx < len(payments) else ''
                    ]
                    ws.append(row)

        # Save to bytes
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"ious_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Export failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/export/payments")
async def export_payments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    payer_name: Optional[str] = None,
    target_worker_id: Optional[str] = None,  # Filter by worker_id (admin/manager only for team-data)
    user_id: int = Depends(verify_token)
):
    """Export payments to Excel"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        query = """
            SELECT
                p.payment_date,
                p.amount,
                p.payer_name,
                p.user_code,
                i.ious_id,
                p.remark
            FROM yif_payments p
            JOIN yif_ious i ON i.id = p.ious_id
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND p.payment_date >= %s"
            params.append(start_date)

        if end_date:
            query += " AND p.payment_date <= %s"
            params.append(end_date)

        if payer_name:
            query += " AND p.payer_name LIKE %s"
            params.append(f"%{payer_name}%")

        # worker_id filter: everyone exports their own payments by default
        # Admin/manager can pass target_worker_id="all" to export all
        if target_worker_id and user['role'] in ('admin', 'manager'):
            if target_worker_id.lower() != 'all':
                query += " AND p.worker_id = %s"
                params.append(int(target_worker_id))
        else:
            query += " AND p.worker_id = %s"
            params.append(user_id)

        query += " ORDER BY p.payment_date DESC, p.created_at DESC"

        cursor.execute(query, params)
        payments = cursor.fetchall()

        # Create Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Payments"

        ws.append(['Date', 'Amount', 'Payer', 'User', 'IOU ID', 'Remark'])
        for p in payments:
            ws.append([
                p['payment_date'],
                float(p['amount']),
                p['payer_name'],
                p['user_code'],
                p['ious_id'],
                p['remark']
            ])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"payments_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Export failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================
# Admin Endpoints
# ========================

@router.get("/admin/paid-off")
async def get_paid_off_ious(user_id: int = Depends(verify_token)):
    """Get all fully paid IOUs (for cleanup)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user or user['role'] not in ['admin', 'manager']:
            raise HTTPException(403, "Admin access required")

        set_rls_context(cursor, user_id, user['role'])

        cursor.execute("""
            SELECT
                i.*,
                COALESCE(SUM(p.amount), 0) as paid
            FROM yif_ious i
            LEFT JOIN yif_payments p ON p.ious_id = i.id
            WHERE i.status = 2
            GROUP BY i.id
            ORDER BY i.ious_date
        """)

        ious = cursor.fetchall()

        return {
            "success": True,
            "count": len(ious),
            "ious": [dict(i) for i in ious]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Query failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


class ClearPaidRequest(BaseModel):
    admin_password: str


@router.delete("/admin/clear-paid")
@limiter.limit("3/minute")
async def clear_paid_ious(http_request: Request, request: ClearPaidRequest, user_id: int = Depends(verify_token)):
    """Clear all fully paid IOUs (requires admin password)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user or user['role'] != 'admin':
            raise HTTPException(403, "Admin access required")

        # Verify admin password
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        cursor.execute("SELECT password_hash FROM yif_workers WHERE id = %s", (user_id,))
        result = cursor.fetchone()

        if not result or not pwd_context.verify(request.admin_password, result['password_hash']):
            raise HTTPException(401, "Invalid admin password")

        set_rls_context(cursor, user_id, user['role'])

        # Get count before delete
        cursor.execute("SELECT COUNT(*) FROM yif_ious WHERE status = 2")
        count = cursor.fetchone()['count']

        # Delete paid IOUs (cascade will delete items and payments)
        cursor.execute("DELETE FROM yif_ious WHERE status = 2")

        # Log
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, 'clear_paid', 'admin', 'batch', f"Cleared {count} paid IOUs"))

        conn.commit()

        return {
            "success": True,
            "message": f"Cleared {count} fully paid IOUs"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Clear failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================
# Excel Import Endpoint
# ========================

def classify_sheet_type(title: str) -> str:
    """Classify sheet type based on title (BSP format)"""
    if 'BSP国内' in title:
        return 'D'  # Domestic
    elif 'BSP国际' in title:
        return 'I'  # International
    elif 'cz' in title.lower():
        return 'C'  # CZ airline
    elif 'mu' in title.lower():
        return 'M'  # MU airline
    elif '外航' in title:
        return 'W'  # Foreign airlines
    return 'N'  # Unknown


def is_number(val) -> bool:
    """Check if value can be converted to float"""
    if isinstance(val, (int, float)):
        return True
    if not isinstance(val, str) or len(val) == 0:
        return False
    try:
        float(val)
        return True
    except (ValueError, TypeError):
        return False


@router.post("/ious/import-excel")
@limiter.limit("10/minute")
async def import_excel_ious(
    request: Request,
    file: UploadFile = File(...),
    sheet_name: str = Query(..., description="Sheet name to import"),
    user_code: str = Query(..., description="User code (2-3 letters)"),
    user_id: int = Depends(verify_token)
):
    """
    Import IOUs from BSP format Excel file.

    Excel format requirements:
    - Row 1: Title (contains type info like 'BSP国内', 'BSP国际', etc.)
    - Row 2, Col B: Number of tickets
    - Row 5, Col A: Date (YYMMDD)
    - Data starts from row 5:
      - Col B: Flight
      - Col C: Ticket number
      - Col D: Amount (应收款)
      - Col P: Client name
      - Col Q: IOU index number (1-99)
      - Col R: Remark
    """
    import xlrd

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # Validate user_code
        user_code = user_code.upper()
        if not user_code.isalpha():
            raise HTTPException(400, "User code must be letters only")
        while len(user_code) < 3:
            user_code = 'A' + user_code
        if len(user_code) > 3:
            user_code = user_code[:3]

        # Read Excel file
        content = await file.read()
        try:
            book = xlrd.open_workbook(file_contents=content)
        except Exception as e:
            raise HTTPException(400, f"Failed to read Excel file: {str(e)}")

        if sheet_name not in book.sheet_names():
            raise HTTPException(400, f"Sheet '{sheet_name}' not found. Available: {book.sheet_names()}")

        sheet = book.sheet_by_name(sheet_name)

        # Get sheet type from title
        title = str(sheet.cell_value(rowx=0, colx=0))
        sheet_type = classify_sheet_type(title)
        if sheet_type == 'N':
            raise HTTPException(400, f"Unknown sheet type. Title: {title}")

        # Get date from cell A5 (row 4, col 0)
        date_val = str(sheet.cell_value(4, 0)).strip()
        if not is_number(date_val):
            raise HTTPException(400, f"Invalid date format in A5: {date_val}")
        date = str(int(float(date_val)))
        if len(date) != 6:
            raise HTTPException(400, f"Date must be 6 digits (YYMMDD): {date}")

        # Get number of tickets
        num_tickets_val = str(sheet.cell_value(1, 1)).strip()
        if not is_number(num_tickets_val):
            raise HTTPException(400, f"Invalid ticket count in B2: {num_tickets_val}")
        num_tickets = int(float(num_tickets_val))

        if num_tickets == 0:
            return {"success": True, "message": "No tickets to import", "ious_created": 0}

        # Check if this type already imported for this user/date
        ious_id_prefix = f"{user_code}{date}{sheet_type}"
        cursor.execute("""
            SELECT COUNT(*) FROM yif_ious WHERE ious_id LIKE %s
        """, (f"{ious_id_prefix}%",))
        if cursor.fetchone()['count'] > 0:
            raise HTTPException(400, f"Already imported: {ious_id_prefix}xx. Delete existing IOUs first or use different user/date.")

        # Read data columns (starting from row 5, index 4)
        list_flight = sheet.col_values(colx=1)[4:4+num_tickets]
        list_ticket = sheet.col_values(colx=2)[4:4+num_tickets]
        list_amount = sheet.col_values(colx=3)[4:4+num_tickets]
        list_client = sheet.col_values(colx=15)[4:4+num_tickets]  # Column P
        list_iou_idx = sheet.col_values(colx=16)[4:4+num_tickets]  # Column Q
        list_remark = sheet.col_values(colx=17)[4:4+num_tickets]  # Column R

        # Pad lists to num_tickets
        def pad_list(lst, length):
            result = [str(x) if x is not None else '' for x in lst]
            while len(result) < length:
                result.append('')
            return result[:length]

        list_flight = pad_list(list_flight, num_tickets)
        list_ticket = pad_list(list_ticket, num_tickets)
        list_client = pad_list(list_client, num_tickets)
        list_remark = pad_list(list_remark, num_tickets)

        # Group items by IOU index
        ious_data = {}  # {iou_id: [items]}

        for i in range(num_tickets):
            idx_val = list_iou_idx[i]
            if idx_val == '' or idx_val is None:
                continue

            if not is_number(idx_val):
                raise HTTPException(400, f"Invalid IOU index at row {i+5}: {idx_val}")

            idx = int(float(str(idx_val)))
            if idx < 1 or idx > 99:
                raise HTTPException(400, f"IOU index must be 1-99: {idx}")

            iou_id = f"{ious_id_prefix}{idx:02d}"

            if iou_id not in ious_data:
                ious_data[iou_id] = []

            amount = list_amount[i]
            if not is_number(amount):
                raise HTTPException(400, f"Invalid amount at row {i+5}: {amount}")

            ious_data[iou_id].append({
                'client': list_client[i],
                'amount': float(amount),
                'flight': list_flight[i],
                'ticket_number': list_ticket[i],
                'remark': list_remark[i]
            })

        # Create IOUs
        created_ious = []
        for iou_id, items in ious_data.items():
            total_amount = sum(item['amount'] for item in items)
            status = 3 if total_amount < 0 else 0

            cursor.execute("""
                INSERT INTO yif_ious (ious_id, worker_id, user_code, ious_date, total_amount, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (iou_id, user_id, user_code, date, total_amount, status))

            iou_db_id = cursor.fetchone()['id']

            for idx, item in enumerate(items):
                cursor.execute("""
                    INSERT INTO yif_iou_items (ious_id, worker_id, item_index, client, amount, flight, ticket_number, remark)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (iou_db_id, user_id, idx, item['client'], item['amount'],
                      item['flight'], item['ticket_number'], item['remark']))

            created_ious.append({
                'id': iou_db_id,
                'ious_id': iou_id,
                'total_amount': total_amount,
                'items_count': len(items)
            })

        # Log
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, 'import_excel', 'iou', sheet_name,
              f"Imported {len(created_ious)} IOUs from {file.filename}, sheet: {sheet_name}"))

        conn.commit()

        return {
            "success": True,
            "message": f"Imported {len(created_ious)} IOUs from sheet '{sheet_name}'",
            "sheet_type": sheet_type,
            "date": date,
            "ious_created": len(created_ious),
            "ious": created_ious
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Import failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()
