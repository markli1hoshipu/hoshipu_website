import os
import re
import json
import csv
import io
import hashlib
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/accounting", tags=["accounting"])

ACCOUNTING_PASSWORD = os.getenv("ACCOUNTING_PASSWORD", "")
DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


def generate_dup_hash(date: str, description: str, amount: float) -> str:
    """Generate MD5 hash for duplicate detection"""
    content = f"{date}|{description}|{amount}"
    return hashlib.md5(content.encode()).hexdigest()


# ========== Schemas ==========

class VerifyRequest(BaseModel):
    password: str


class CategoryCreate(BaseModel):
    category: str
    keywords: List[str] = []


class CategoryUpdate(BaseModel):
    keywords: List[str]


class TransactionCreate(BaseModel):
    date: str  # YYYY-MM-DD
    description: str
    amount: float
    category: Optional[str] = None
    source: str
    currency: str = "CAD"
    exchange_rate: float = 1.0
    remark: Optional[str] = None
    original_desc: Optional[str] = None


class ImportResult(BaseModel):
    imported: int
    duplicates: List[dict]
    errors: List[str]


# ========== Auth ==========

@router.post("/verify")
async def verify_password(data: VerifyRequest):
    """Verify accounting module password"""
    if not ACCOUNTING_PASSWORD:
        raise HTTPException(status_code=500, detail="Password not configured")

    if data.password != ACCOUNTING_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    return {"success": True, "message": "Password verified"}


# ========== Categories ==========

@router.get("/categories")
async def get_categories():
    """Get all categories with keywords"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT * FROM hoshipu_accounting_categories ORDER BY id")
        categories = cursor.fetchall()
        return {"success": True, "categories": categories}
    finally:
        cursor.close()
        conn.close()


@router.post("/categories")
async def create_category(data: CategoryCreate):
    """Create a new category"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """INSERT INTO hoshipu_accounting_categories (category, keywords)
               VALUES (%s, %s) RETURNING *""",
            (data.category, json.dumps(data.keywords))
        )
        category = cursor.fetchone()
        conn.commit()
        return {"success": True, "category": category}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Category already exists")
    finally:
        cursor.close()
        conn.close()


@router.put("/categories/{category_id}")
async def update_category(category_id: int, data: CategoryUpdate):
    """Update category keywords"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """UPDATE hoshipu_accounting_categories
               SET keywords = %s WHERE id = %s RETURNING *""",
            (json.dumps(data.keywords), category_id)
        )
        category = cursor.fetchone()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        conn.commit()
        return {"success": True, "category": category}
    finally:
        cursor.close()
        conn.close()


@router.delete("/categories/{category_id}")
async def delete_category(category_id: int):
    """Delete a category"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM hoshipu_accounting_categories WHERE id = %s", (category_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        conn.commit()
        return {"success": True, "message": "Category deleted"}
    finally:
        cursor.close()
        conn.close()


# ========== Transactions ==========

@router.get("/transactions")
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    categories: Optional[str] = None,
    source: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0
):
    """Get transactions with filters. If limit is not provided, returns all records.
    categories: comma-separated list of category names to filter by.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = "SELECT * FROM hoshipu_accounting_transactions WHERE 1=1"
        params = []

        if start_date:
            query += " AND date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND date <= %s"
            params.append(end_date)
        if categories:
            category_list = [c.strip() for c in categories.split(",") if c.strip()]
            if category_list:
                placeholders = ",".join(["%s"] * len(category_list))
                query += f" AND category IN ({placeholders})"
                params.extend(category_list)
        if source:
            query += " AND source = %s"
            params.append(source)

        # Get total count
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()['count']

        # Get results (paginated or all)
        query += " ORDER BY date DESC, id DESC"
        if limit is not None and limit > 0:
            query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])
        cursor.execute(query, params)
        transactions = cursor.fetchall()

        # Convert Decimal to float for JSON serialization
        for t in transactions:
            t['amount'] = float(t['amount'])
            t['exchange_rate'] = float(t['exchange_rate'])
            t['date'] = t['date'].isoformat() if t['date'] else None

        return {"success": True, "transactions": transactions, "total": total}
    finally:
        cursor.close()
        conn.close()


@router.post("/transactions")
async def create_transaction(data: TransactionCreate):
    """Create a single transaction"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        dup_hash = generate_dup_hash(data.date, data.description, data.amount)

        # Check for duplicates
        cursor.execute(
            "SELECT id, date, description, amount FROM hoshipu_accounting_transactions WHERE dup_hash = %s",
            (dup_hash,)
        )
        duplicate = cursor.fetchone()

        cursor.execute(
            """INSERT INTO hoshipu_accounting_transactions
               (date, description, amount, category, source, currency, exchange_rate, remark, original_desc, dup_hash)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (data.date, data.description, data.amount, data.category, data.source,
             data.currency, data.exchange_rate, data.remark, data.original_desc, dup_hash)
        )
        transaction = cursor.fetchone()
        conn.commit()

        result = {"success": True, "transaction": transaction}
        if duplicate:
            result["warning"] = "Duplicate entry detected"
            result["duplicate"] = duplicate

        return result
    finally:
        cursor.close()
        conn.close()


class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    source: Optional[str] = None
    currency: Optional[str] = None
    remark: Optional[str] = None


@router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: int, data: TransactionUpdate):
    """Update a transaction"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Build dynamic update query
        updates = []
        params = []

        if data.date is not None:
            updates.append("date = %s")
            params.append(data.date)
        if data.description is not None:
            updates.append("description = %s")
            params.append(data.description)
        if data.amount is not None:
            updates.append("amount = %s")
            params.append(data.amount)
        if data.category is not None:
            updates.append("category = %s")
            params.append(data.category if data.category else None)
        if data.source is not None:
            updates.append("source = %s")
            params.append(data.source)
        if data.currency is not None:
            updates.append("currency = %s")
            params.append(data.currency)
        if data.remark is not None:
            updates.append("remark = %s")
            params.append(data.remark if data.remark else None)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(transaction_id)
        query = f"UPDATE hoshipu_accounting_transactions SET {', '.join(updates)} WHERE id = %s RETURNING *"

        cursor.execute(query, params)
        transaction = cursor.fetchone()

        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        conn.commit()

        # Convert types for JSON
        transaction['amount'] = float(transaction['amount'])
        transaction['exchange_rate'] = float(transaction['exchange_rate'])
        transaction['date'] = transaction['date'].isoformat() if transaction['date'] else None

        return {"success": True, "transaction": transaction}
    finally:
        cursor.close()
        conn.close()


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int):
    """Delete a transaction"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM hoshipu_accounting_transactions WHERE id = %s", (transaction_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        conn.commit()
        return {"success": True, "message": "Transaction deleted"}
    finally:
        cursor.close()
        conn.close()


# ========== Import ==========

def clean_description(desc: str) -> str:
    """Clean transaction description"""
    # Remove common prefixes
    cleaned = re.sub(r'Point of Sale - (Interac|Visa Debit)\s*', '', desc)
    cleaned = re.sub(r'RETAIL PURCHASE\s*\d*\s*', '', cleaned)
    cleaned = re.sub(r'VISA DEBIT (RETAIL )?PURCHASE\s*', '', cleaned)
    cleaned = re.sub(r'Internet Banking E-TRANSFER\s*\d+\s*', 'E-Transfer ', cleaned)
    cleaned = re.sub(r'Electronic Funds Transfer PREAUTHORIZED DEBIT\s*', '', cleaned)
    cleaned = re.sub(r'Branch Transaction CREDIT MEMO', 'Credit Memo', cleaned)
    cleaned = re.sub(r'Internet Banking INTERNET BILL PAY\s*\d+\s*', 'Bill Pay ', cleaned)
    cleaned = re.sub(r'\d+\.\d+ USD @ \d+\.\d+', '', cleaned)  # Remove USD conversion info
    cleaned = re.sub(r'INTL VISA DEB\s*', '', cleaned)
    cleaned = re.sub(r'MDSE RETURN\s*\d*\s*', 'Return ', cleaned)
    cleaned = re.sub(r'CORRECTION\s*', 'Correction ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def auto_categorize(description: str, categories: list) -> Optional[str]:
    """Auto-categorize based on keywords"""
    desc_upper = description.upper()
    for cat in categories:
        keywords = cat.get('keywords', [])
        if isinstance(keywords, str):
            keywords = json.loads(keywords)
        for keyword in keywords:
            if keyword.upper() in desc_upper:
                return cat['category']
    return None


@router.post("/preview/csv")
async def preview_csv(
    file: UploadFile = File(...),
    source: str = Form(...)
):
    """Preview CSV file before importing"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        content = await file.read()
        text_content = content.decode('utf-8')

        # Use csv module to properly parse quoted fields
        csv_reader = csv.reader(io.StringIO(text_content))
        rows = list(csv_reader)

        cursor.execute("SELECT * FROM hoshipu_accounting_categories")
        categories = cursor.fetchall()

        preview_items = []
        errors = []

        for i, row in enumerate(rows):
            try:
                if len(row) < 3:
                    errors.append(f"Line {i+1}: Invalid format (need at least 3 columns)")
                    continue

                date_str = row[0].strip()
                description = row[1].strip()
                debit = row[2].strip() if len(row) > 2 else ""
                credit = row[3].strip() if len(row) > 3 else ""

                if debit:
                    amount = -float(debit)
                elif credit:
                    amount = float(credit)
                else:
                    errors.append(f"Line {i+1}: No amount found")
                    continue

                cleaned_desc = clean_description(description)
                dup_hash = generate_dup_hash(date_str, cleaned_desc, amount)

                # Check for duplicates
                cursor.execute(
                    "SELECT id FROM hoshipu_accounting_transactions WHERE dup_hash = %s",
                    (dup_hash,)
                )
                is_duplicate = cursor.fetchone() is not None

                # Auto-categorize
                category = auto_categorize(cleaned_desc, categories)

                preview_items.append({
                    "line": i + 1,
                    "date": date_str,
                    "description": cleaned_desc,
                    "original_desc": description,
                    "amount": amount,
                    "category": category,
                    "source": source,
                    "is_duplicate": is_duplicate
                })

            except Exception as e:
                errors.append(f"Line {i+1}: {str(e)}")

        return {
            "success": True,
            "items": preview_items,
            "errors": errors,
            "total_lines": len(rows)
        }

    finally:
        cursor.close()
        conn.close()


@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    source: str = Form(...),
    currency: str = Form("CAD"),
    skip_duplicates: bool = Form(True)
):
    """Import transactions from CSV file (CIBC format)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')

        # Use csv module to properly parse quoted fields
        csv_reader = csv.reader(io.StringIO(text_content))
        rows = list(csv_reader)

        # Get categories for auto-categorization
        cursor.execute("SELECT * FROM hoshipu_accounting_categories")
        categories = cursor.fetchall()

        imported = 0
        duplicates = []
        errors = []

        for i, row in enumerate(rows):
            try:
                # Parse CSV row (date, description, debit, credit)
                if len(row) < 3:
                    errors.append(f"Line {i+1}: Invalid format")
                    continue

                date_str = row[0].strip()
                description = row[1].strip()
                debit = row[2].strip() if len(row) > 2 else ""
                credit = row[3].strip() if len(row) > 3 else ""

                # Determine amount (negative for debit, positive for credit)
                if debit:
                    amount = -float(debit)
                elif credit:
                    amount = float(credit)
                else:
                    errors.append(f"Line {i+1}: No amount found")
                    continue

                # Clean description
                cleaned_desc = clean_description(description)

                # Generate hash
                dup_hash = generate_dup_hash(date_str, cleaned_desc, amount)

                # Check for duplicates
                cursor.execute(
                    "SELECT id, date, description, amount FROM hoshipu_accounting_transactions WHERE dup_hash = %s",
                    (dup_hash,)
                )
                existing = cursor.fetchone()

                if existing:
                    duplicates.append({
                        "line": i + 1,
                        "date": date_str,
                        "description": cleaned_desc,
                        "amount": amount,
                        "existing_id": existing['id']
                    })
                    if skip_duplicates:
                        continue

                # Auto-categorize
                category = auto_categorize(cleaned_desc, categories)

                # Insert
                cursor.execute(
                    """INSERT INTO hoshipu_accounting_transactions
                       (date, description, amount, category, source, currency, exchange_rate, original_desc, dup_hash)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (date_str, cleaned_desc, amount, category, source, currency, 1.0, description, dup_hash)
                )
                imported += 1

            except Exception as e:
                errors.append(f"Line {i+1}: {str(e)}")

        conn.commit()

        return {
            "success": True,
            "imported": imported,
            "duplicates": duplicates,
            "errors": errors,
            "total_lines": len(rows)
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ========== Statistics ==========

@router.get("/stats")
async def get_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get spending statistics"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        params = []
        date_filter = ""

        if start_date:
            date_filter += " AND date >= %s"
            params.append(start_date)
        if end_date:
            date_filter += " AND date <= %s"
            params.append(end_date)

        # Total income and expense
        cursor.execute(f"""
            SELECT
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_expense,
                COUNT(*) as total_count
            FROM hoshipu_accounting_transactions
            WHERE 1=1 {date_filter}
        """, params)
        totals = cursor.fetchone()

        # By category
        cursor.execute(f"""
            SELECT category, SUM(amount) as total, COUNT(*) as count
            FROM hoshipu_accounting_transactions
            WHERE 1=1 {date_filter}
            GROUP BY category
            ORDER BY total ASC
        """, params)
        by_category = cursor.fetchall()

        # By source
        cursor.execute(f"""
            SELECT source, SUM(amount) as total, COUNT(*) as count
            FROM hoshipu_accounting_transactions
            WHERE 1=1 {date_filter}
            GROUP BY source
            ORDER BY total ASC
        """, params)
        by_source = cursor.fetchall()

        # Convert Decimals
        for item in by_category + by_source:
            item['total'] = float(item['total']) if item['total'] else 0

        return {
            "success": True,
            "totals": {
                "income": float(totals['total_income'] or 0),
                "expense": float(totals['total_expense'] or 0),
                "net": float((totals['total_income'] or 0) + (totals['total_expense'] or 0)),
                "count": totals['total_count']
            },
            "by_category": by_category,
            "by_source": by_source
        }
    finally:
        cursor.close()
        conn.close()
