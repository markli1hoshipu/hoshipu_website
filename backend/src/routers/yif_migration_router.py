"""
YIF Data Migration Router
- Import pickle/txt data
- Export SQL data to pickle/txt format
- Clear user data
"""

import os
import sys
import pickle
import tempfile
import zipfile
import logging
from io import BytesIO
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import json
import uuid
from threading import Lock
from pydantic import BaseModel
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

logger = logging.getLogger(__name__)

# Add parent path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import get_db_connection
from routers.yif_router import verify_token

router = APIRouter(prefix="/api/yif/migration", tags=["YIF Migration"])

# Progress tracking for imports
_import_progress = {}
_import_progress_lock = Lock()


# ============ Pickle Data Classes (matching ious_system1.3) ============
# These classes match the desktop app format for pickle serialization

class ious:
    """IOU class matching desktop app format"""
    def __init__(self, user, date, lclient, id, lmoney, lflight, ltktnum, lremark):
        self.id = id
        self.user = user
        self.date = str(date)
        self.lclient = lclient
        self.client = lclient[0] if lclient else ''
        self.lmoney = [float(m) for m in lmoney]
        self.total_money = sum(self.lmoney)
        self.lflight = lflight
        self.ltktnum = [str(t) for t in ltktnum]
        self.remark = lremark
        self.rem = lremark[0] if lremark else ''


class payment:
    """Payment class matching desktop app format"""
    def __init__(self, user, date, client, amount, ious_id, remark):
        self.user = user
        self.date = str(date)
        self.client = client
        self.amount = float(amount)
        self.ious_id = ious_id
        self.remark = remark


class business:
    """Business class matching desktop app format"""
    def __init__(self, ious_obj, list_payment):
        self.ious = ious_obj
        self.list_payment = list_payment
        self.paid = sum(p.amount for p in list_payment)
        self.rest = ious_obj.total_money - self.paid

        # Determine type
        if self.rest == 0:
            self.type = '已付清'
        elif self.rest > 0:
            self.type = '未付款' if len(list_payment) == 0 else '未付清'
        else:
            self.type = '初始欠条为负' if ious_obj.total_money < 0 else '已超额支付'


# Register classes in sys.modules for pickle to find them
# The desktop app saves with module name 'business'
import types
_business_module = types.ModuleType('business')
_business_module.ious = ious
_business_module.payment = payment
_business_module.business = business
sys.modules['business'] = _business_module

# Also register for __main__ in case pickle used that
sys.modules.setdefault('__main__', types.ModuleType('__main__'))
if not hasattr(sys.modules['__main__'], 'ious'):
    sys.modules['__main__'].ious = ious
    sys.modules['__main__'].payment = payment
    sys.modules['__main__'].business = business


# ============ API Endpoints ============

def _parse_pickle_data(content: bytes) -> tuple:
    """Parse pickle data and return (data_dict, iou_list, total_items, total_payments)"""
    data = pickle.loads(content)

    if not isinstance(data, dict):
        raise ValueError("Invalid data format: expected dict with date keys")

    imported_ious = set()
    iou_list = []
    total_items = 0
    total_payments = 0

    for date, businesses in data.items():
        if not isinstance(businesses, list):
            continue

        for biz in businesses:
            if not hasattr(biz, 'ious'):
                continue

            iou = biz.ious

            # Skip duplicates
            if iou.id in imported_ious:
                continue
            imported_ious.add(iou.id)

            # Calculate status
            paid = sum(p.amount for p in biz.list_payment)
            rest = iou.total_money - paid
            if iou.total_money < 0:
                status = 3
            elif rest == 0:
                status = 2
            elif rest < 0:
                status = 4
            elif len(biz.list_payment) > 0:
                status = 1
            else:
                status = 0

            # Collect items
            items = []
            for idx in range(len(iou.lmoney)):
                items.append({
                    'idx': idx,
                    'client': iou.lclient[idx] if idx < len(iou.lclient) else '',
                    'amount': float(iou.lmoney[idx]),
                    'flight': iou.lflight[idx] if idx < len(iou.lflight) else '',
                    'ticket': str(iou.ltktnum[idx]) if idx < len(iou.ltktnum) else '',
                    'remark': iou.remark[idx] if idx < len(iou.remark) else ''
                })
            total_items += len(items)

            # Collect payments
            payments = []
            for pay in biz.list_payment:
                payments.append({
                    'user': pay.user,
                    'date': pay.date,
                    'client': pay.client,
                    'amount': float(pay.amount),
                    'remark': pay.remark
                })
            total_payments += len(payments)

            iou_list.append({
                'ious_id': iou.id,
                'user_code': iou.user,
                'date': iou.date,
                'total': iou.total_money,
                'status': status,
                'items': items,
                'payments': payments
            })

    return data, iou_list, total_items, total_payments


@router.post("/import/preview")
async def preview_import(
    file: UploadFile = File(...),
    user_id: int = Depends(verify_token)
):
    """
    Preview import: parse file and return counts without importing
    """
    if not file.filename.endswith(('.txt', '.pkl')):
        raise HTTPException(400, "File must be .txt or .pkl (pickle format)")

    try:
        content = await file.read()
        _, iou_list, total_items, total_payments = _parse_pickle_data(content)

        return {
            "success": True,
            "total_ious": len(iou_list),
            "total_items": total_items,
            "total_payments": total_payments,
            "file_size": len(content)
        }
    except Exception as e:
        logger.error(f"Preview failed: {e}")
        raise HTTPException(400, f"Failed to parse file: {str(e)}")


@router.get("/import/progress/{task_id}")
async def get_import_progress(task_id: str):
    """Get import progress for a task"""
    with _import_progress_lock:
        progress = _import_progress.get(task_id)

    if not progress:
        raise HTTPException(404, "Task not found")

    return progress


@router.post("/import")
async def import_pickle_data(
    file: UploadFile = File(...),
    user_id: int = Depends(verify_token)
):
    """
    Import pickle data from business_data.txt
    Only imports data for the current worker
    Uses batch inserts for better performance
    Returns a task_id for progress tracking
    """
    if not file.filename.endswith(('.txt', '.pkl')):
        raise HTTPException(400, "File must be .txt or .pkl (pickle format)")

    worker_id = user_id
    task_id = str(uuid.uuid4())
    logger.info(f"Starting import for worker {worker_id}, task {task_id}")

    # Initialize progress
    with _import_progress_lock:
        _import_progress[task_id] = {
            "status": "parsing",
            "total_ious": 0,
            "current": 0,
            "percent": 0,
            "message": "正在解析文件..."
        }

    try:
        content = await file.read()
        logger.info(f"File read, size: {len(content)} bytes")

        # Update progress
        with _import_progress_lock:
            _import_progress[task_id]["message"] = "正在解析数据..."

        _, iou_list, total_items, total_payments = _parse_pickle_data(content)
        total_ious = len(iou_list)
        logger.info(f"Parsed {total_ious} IOUs, {total_items} items, {total_payments} payments")

        # Update progress
        with _import_progress_lock:
            _import_progress[task_id].update({
                "status": "importing",
                "total_ious": total_ious,
                "total_items": total_items,
                "total_payments": total_payments,
                "message": f"开始导入 {total_ious} 条欠条..."
            })

    except Exception as e:
        logger.error(f"Failed to parse pickle: {e}")
        with _import_progress_lock:
            _import_progress[task_id].update({
                "status": "error",
                "message": f"解析失败: {str(e)}"
            })
        raise HTTPException(400, f"Failed to parse pickle file: {str(e)}")

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        ious_created = 0
        items_created = 0
        payments_created = 0

        # Process in batches
        batch_size = 50  # Smaller batch for more frequent progress updates
        for i in range(0, len(iou_list), batch_size):
            batch = iou_list[i:i+batch_size]

            for iou_data in batch:
                # Insert IOU
                cursor.execute("""
                    INSERT INTO yif_ious (ious_id, worker_id, user_code, ious_date, total_amount, status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (iou_data['ious_id'], worker_id, iou_data['user_code'],
                      iou_data['date'], iou_data['total'], iou_data['status']))

                iou_db_id = cursor.fetchone()['id']
                ious_created += 1

                # Batch insert items
                if iou_data['items']:
                    item_values = [
                        (iou_db_id, worker_id, it['idx'], it['client'],
                         it['amount'], it['flight'], it['ticket'], it['remark'])
                        for it in iou_data['items']
                    ]
                    execute_values(cursor, """
                        INSERT INTO yif_iou_items (ious_id, worker_id, item_index, client, amount, flight, ticket_number, remark)
                        VALUES %s
                    """, item_values)
                    items_created += len(item_values)

                # Batch insert payments
                if iou_data['payments']:
                    payment_values = [
                        (iou_db_id, worker_id, p['user'], p['date'],
                         p['client'], p['amount'], p['remark'])
                        for p in iou_data['payments']
                    ]
                    execute_values(cursor, """
                        INSERT INTO yif_payments (ious_id, worker_id, user_code, payment_date, payer_name, amount, remark)
                        VALUES %s
                    """, payment_values)
                    payments_created += len(payment_values)

            # Commit each batch
            conn.commit()

            # Update progress
            percent = int((ious_created / total_ious) * 100) if total_ious > 0 else 100
            with _import_progress_lock:
                _import_progress[task_id].update({
                    "current": ious_created,
                    "percent": percent,
                    "items_created": items_created,
                    "payments_created": payments_created,
                    "message": f"已导入 {ious_created}/{total_ious} 条欠条 ({percent}%)"
                })
            logger.info(f"Progress: {ious_created}/{total_ious} ({percent}%)")

        # Log
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (worker_id, 'import', 'migration', 'pickle',
              f"Imported {ious_created} IOUs, {items_created} items, {payments_created} payments"))
        conn.commit()

        logger.info(f"Import complete: {ious_created} IOUs, {items_created} items, {payments_created} payments")

        # Final progress update
        with _import_progress_lock:
            _import_progress[task_id].update({
                "status": "complete",
                "current": ious_created,
                "percent": 100,
                "message": "导入完成！"
            })

        return {
            "success": True,
            "task_id": task_id,
            "message": "Import completed",
            "ious_created": ious_created,
            "items_created": items_created,
            "payments_created": payments_created
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Import failed: {e}")
        with _import_progress_lock:
            _import_progress[task_id].update({
                "status": "error",
                "message": f"导入失败: {str(e)}"
            })
        raise HTTPException(500, f"Import failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()
        # Clean up progress after a delay (keep for 5 minutes)
        # In production, you'd use a background task or Redis with TTL


@router.get("/export")
async def export_to_pickle(
    user_id: int = Depends(verify_token)
):
    """
    Export current worker's data to pickle format (business_data.txt)
    Returns a zip file containing both .txt (pickle) and readable .json
    """
    worker_id = user_id

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get all IOUs for this worker
        cursor.execute("""
            SELECT i.*,
                   COALESCE(json_agg(
                       json_build_object(
                           'client', it.client,
                           'amount', it.amount,
                           'flight', it.flight,
                           'ticket_number', it.ticket_number,
                           'remark', it.remark
                       ) ORDER BY it.item_index
                   ) FILTER (WHERE it.id IS NOT NULL), '[]') as items
            FROM yif_ious i
            LEFT JOIN yif_iou_items it ON it.ious_id = i.id
            WHERE i.worker_id = %s
            GROUP BY i.id
            ORDER BY i.ious_date, i.ious_id
        """, (worker_id,))
        ious_rows = cursor.fetchall()

        # Get all payments
        cursor.execute("""
            SELECT * FROM yif_payments
            WHERE worker_id = %s
            ORDER BY payment_date
        """, (worker_id,))
        payments_rows = cursor.fetchall()

        # Build payment lookup by ious_id
        payments_by_iou = {}
        for p in payments_rows:
            iou_id = p['ious_id']
            if iou_id not in payments_by_iou:
                payments_by_iou[iou_id] = []
            payments_by_iou[iou_id].append(p)

        # Build business_data dict (grouped by date)
        business_data = {}

        for row in ious_rows:
            date = row['ious_date']
            items = row['items'] if row['items'] else []

            # Create ious object
            lclient = [it['client'] for it in items]
            lmoney = [it['amount'] for it in items]
            lflight = [it['flight'] for it in items]
            ltktnum = [it['ticket_number'] for it in items]
            lremark = [it['remark'] for it in items]

            iou_obj = ious(
                user=row['user_code'],
                date=row['ious_date'],
                lclient=lclient,
                id=row['ious_id'],
                lmoney=lmoney,
                lflight=lflight,
                ltktnum=ltktnum,
                lremark=lremark
            )

            # Create payment objects
            list_payment = []
            for p in payments_by_iou.get(row['id'], []):
                pay_obj = payment(
                    user=p['user_code'],
                    date=p['payment_date'],
                    client=p['payer_name'],
                    amount=p['amount'],
                    ious_id=row['ious_id'],
                    remark=p['remark'] or ''
                )
                list_payment.append(pay_obj)

            # Create business object
            biz = business(iou_obj, list_payment)

            if date not in business_data:
                business_data[date] = []
            business_data[date].append(biz)

        # Create zip with pickle and readable txt
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Pickle file (business_data.txt)
            pickle_bytes = pickle.dumps(business_data)
            zf.writestr('business_data.txt', pickle_bytes)

            # Readable summary
            summary_lines = []
            summary_lines.append(f"Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            summary_lines.append(f"Worker ID: {worker_id}")
            summary_lines.append(f"Total IOUs: {len(ious_rows)}")
            summary_lines.append(f"Total Payments: {len(payments_rows)}")
            summary_lines.append("")
            summary_lines.append("=" * 60)

            for date in sorted(business_data.keys()):
                for biz in business_data[date]:
                    summary_lines.append(f"\n[{biz.ious.id}] {biz.ious.date} - {biz.type}")
                    summary_lines.append(f"  User: {biz.ious.user}, Total: {biz.ious.total_money}")
                    for i, client in enumerate(biz.ious.lclient):
                        summary_lines.append(f"    {i+1}. {client}: {biz.ious.lmoney[i]}")
                    if biz.list_payment:
                        summary_lines.append(f"  Payments ({len(biz.list_payment)}):")
                        for p in biz.list_payment:
                            summary_lines.append(f"    - {p.date} {p.client}: {p.amount}")

            zf.writestr('summary.txt', '\n'.join(summary_lines))

        zip_buffer.seek(0)

        # Log export
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (worker_id, 'export', 'migration', 'pickle',
              f"Exported {len(ious_rows)} IOUs, {len(payments_rows)} payments"))
        conn.commit()

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=yif_export_{worker_id}_{datetime.now().strftime('%Y%m%d')}.zip"}
        )

    except Exception as e:
        raise HTTPException(500, f"Export failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


class ClearRequest(BaseModel):
    password: str


def _build_export_data(worker_id: int) -> dict:
    """Helper function to build export data for a worker"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get all IOUs for this worker
        cursor.execute("""
            SELECT i.*,
                   COALESCE(json_agg(
                       json_build_object(
                           'client', it.client,
                           'amount', it.amount,
                           'flight', it.flight,
                           'ticket_number', it.ticket_number,
                           'remark', it.remark
                       ) ORDER BY it.item_index
                   ) FILTER (WHERE it.id IS NOT NULL), '[]') as items
            FROM yif_ious i
            LEFT JOIN yif_iou_items it ON it.ious_id = i.id
            WHERE i.worker_id = %s
            GROUP BY i.id
            ORDER BY i.ious_date, i.ious_id
        """, (worker_id,))
        ious_rows = cursor.fetchall()

        # Get all payments
        cursor.execute("""
            SELECT * FROM yif_payments
            WHERE worker_id = %s
            ORDER BY payment_date
        """, (worker_id,))
        payments_rows = cursor.fetchall()

        # Build payment lookup by ious_id
        payments_by_iou = {}
        for p in payments_rows:
            iou_id = p['ious_id']
            if iou_id not in payments_by_iou:
                payments_by_iou[iou_id] = []
            payments_by_iou[iou_id].append(p)

        # Build business_data dict (grouped by date)
        business_data = {}

        for row in ious_rows:
            date = row['ious_date']
            items = row['items'] if row['items'] else []

            # Create ious object
            lclient = [it['client'] for it in items]
            lmoney = [it['amount'] for it in items]
            lflight = [it['flight'] for it in items]
            ltktnum = [it['ticket_number'] for it in items]
            lremark = [it['remark'] for it in items]

            iou_obj = ious(
                user=row['user_code'],
                date=row['ious_date'],
                lclient=lclient,
                id=row['ious_id'],
                lmoney=lmoney,
                lflight=lflight,
                ltktnum=ltktnum,
                lremark=lremark
            )

            # Create payment objects
            list_payment = []
            for p in payments_by_iou.get(row['id'], []):
                pay_obj = payment(
                    user=p['user_code'],
                    date=p['payment_date'],
                    client=p['payer_name'],
                    amount=p['amount'],
                    ious_id=row['ious_id'],
                    remark=p['remark'] or ''
                )
                list_payment.append(pay_obj)

            # Create business object
            biz = business(iou_obj, list_payment)

            if date not in business_data:
                business_data[date] = []
            business_data[date].append(biz)

        return {
            'business_data': business_data,
            'ious_count': len(ious_rows),
            'payments_count': len(payments_rows)
        }
    finally:
        cursor.close()
        conn.close()


@router.post("/clear")
async def clear_user_data(
    request: ClearRequest,
    user_id: int = Depends(verify_token)
):
    """
    Clear all data for the current worker (IOUs, items, payments)
    Requires password verification
    Automatically exports data before clearing as backup
    """
    import bcrypt

    worker_id = user_id

    # Verify password
    password_hash = os.getenv('YIF_CLEAR_PASSWORD_HASH', '')
    if not password_hash:
        raise HTTPException(500, "Clear password not configured")

    if not bcrypt.checkpw(request.password.encode(), password_hash.encode()):
        raise HTTPException(401, "密码错误")

    logger.info(f"Clear requested for worker {worker_id}, password verified")

    # First, export data as backup
    try:
        export_result = _build_export_data(worker_id)
        business_data = export_result['business_data']

        # Create backup zip
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Pickle file
            pickle_bytes = pickle.dumps(business_data)
            zf.writestr('business_data.txt', pickle_bytes)

            # Summary
            summary_lines = [
                f"Backup before clear - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                f"Worker ID: {worker_id}",
                f"Total IOUs: {export_result['ious_count']}",
                f"Total Payments: {export_result['payments_count']}",
            ]
            zf.writestr('backup_summary.txt', '\n'.join(summary_lines))

        backup_bytes = zip_buffer.getvalue()
        logger.info(f"Backup created, size: {len(backup_bytes)} bytes")
    except Exception as e:
        logger.error(f"Failed to create backup: {e}")
        raise HTTPException(500, f"导出备份失败: {str(e)}")

    # Now clear the data
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Count before delete
        cursor.execute("SELECT COUNT(*) as count FROM yif_ious WHERE worker_id = %s", (worker_id,))
        ious_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM yif_iou_items WHERE worker_id = %s", (worker_id,))
        items_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM yif_payments WHERE worker_id = %s", (worker_id,))
        payments_count = cursor.fetchone()['count']

        # Delete in order (foreign keys)
        cursor.execute("DELETE FROM yif_payments WHERE worker_id = %s", (worker_id,))
        cursor.execute("DELETE FROM yif_iou_items WHERE worker_id = %s", (worker_id,))
        cursor.execute("DELETE FROM yif_ious WHERE worker_id = %s", (worker_id,))

        # Log
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (worker_id, 'clear', 'migration', 'all',
              f"Cleared {ious_count} IOUs, {items_count} items, {payments_count} payments (backup exported)"))

        conn.commit()

        logger.info(f"Clear complete: {ious_count} IOUs, {items_count} items, {payments_count} payments")

        # Return success with backup data as base64
        import base64
        backup_base64 = base64.b64encode(backup_bytes).decode()

        return {
            "success": True,
            "message": "数据已清空，备份已生成",
            "ious_deleted": ious_count,
            "items_deleted": items_count,
            "payments_deleted": payments_count,
            "backup_data": backup_base64,
            "backup_filename": f"yif_backup_{worker_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Clear failed: {e}")
        raise HTTPException(500, f"Clear failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/stats")
async def get_migration_stats(
    user_id: int = Depends(verify_token)
):
    """Get current data statistics for the worker"""
    worker_id = user_id

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT COUNT(*) as count FROM yif_ious WHERE worker_id = %s", (worker_id,))
        ious_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM yif_iou_items WHERE worker_id = %s", (worker_id,))
        items_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM yif_payments WHERE worker_id = %s", (worker_id,))
        payments_count = cursor.fetchone()['count']

        cursor.execute("""
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM yif_ious WHERE worker_id = %s
        """, (worker_id,))
        total_amount = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total
            FROM yif_payments WHERE worker_id = %s
        """, (worker_id,))
        total_paid = cursor.fetchone()['total']

        return {
            "success": True,
            "stats": {
                "ious": ious_count,
                "items": items_count,
                "payments": payments_count,
                "total_amount": float(total_amount),
                "total_paid": float(total_paid),
                "remaining": float(total_amount) - float(total_paid)
            }
        }

    finally:
        cursor.close()
        conn.close()
