"""
Migrate pickle data from ious_system1.3 to PostgreSQL.

This script reads the pickle files from the desktop app and imports them into
the PostgreSQL database.

Usage:
    python migrate_pickle_to_postgres.py --worker-id 1

Arguments:
    --worker-id: The worker ID to assign to all migrated records
    --dry-run: Show what would be imported without actually importing
"""

import os
import sys
import pickle
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

PICKLE_DIR = os.path.join(os.path.dirname(__file__), '..', 'ious_system1.3')


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "hoshipu"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "")
    )


def load_pickle_data(filename):
    """Load data from pickle file"""
    filepath = os.path.join(PICKLE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"[WARN] File not found: {filepath}")
        return None

    try:
        with open(filepath, 'rb') as f:
            return pickle.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load {filename}: {e}")
        return None


def get_status_code(business):
    """Convert business type to status code"""
    type_map = {
        '未付款': 0,      # Unpaid
        '未付清': 1,      # Partial
        '已付清': 2,      # Paid
        '初始欠条为负': 3, # Negative initial
        '已超额支付': 4   # Overpaid
    }
    return type_map.get(business.type, 0)


def migrate_data(worker_id: int, dry_run: bool = False):
    """Migrate pickle data to PostgreSQL"""

    # Load business_data.txt (main data)
    data = load_pickle_data('business_data.txt')
    if data is None:
        print("[ERROR] Could not load business_data.txt")
        return

    # Load past_data.txt (cleared/paid data) if exists
    past_data = load_pickle_data('past_data.txt') or {}

    # Combine data
    all_data = {}
    for date, businesses in data.items():
        if date not in all_data:
            all_data[date] = []
        all_data[date].extend(businesses)

    for date, businesses in past_data.items():
        if date not in all_data:
            all_data[date] = []
        all_data[date].extend(businesses)

    # Count records
    total_ious = sum(len(businesses) for businesses in all_data.values())
    total_items = sum(
        len(b.ious.lmoney) for businesses in all_data.values() for b in businesses
    )
    total_payments = sum(
        len(b.list_payment) for businesses in all_data.values() for b in businesses
    )

    print(f"\n=== Migration Summary ===")
    print(f"Total IOUs: {total_ious}")
    print(f"Total IOU Items: {total_items}")
    print(f"Total Payments: {total_payments}")
    print(f"Worker ID: {worker_id}")

    if dry_run:
        print("\n[DRY RUN] No changes made to database")
        return

    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Check if IOUs already exist
        cursor.execute("SELECT COUNT(*) as count FROM yif_ious")
        existing_count = cursor.fetchone()['count']
        if existing_count > 0:
            print(f"\n[WARN] Database already has {existing_count} IOUs")
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                print("Aborted.")
                return

        # Track imported IDs to avoid duplicates
        imported_ious = set()
        ious_created = 0
        items_created = 0
        payments_created = 0

        for date, businesses in all_data.items():
            for business in businesses:
                ious = business.ious

                # Skip if already imported
                if ious.id in imported_ious:
                    print(f"[SKIP] Duplicate IOU: {ious.id}")
                    continue
                imported_ious.add(ious.id)

                # Calculate status
                status = get_status_code(business)

                # Insert IOU
                cursor.execute("""
                    INSERT INTO yif_ious (ious_id, worker_id, user_code, ious_date, total_amount, status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (ious.id, worker_id, ious.user, ious.date, ious.total_money, status))

                iou_db_id = cursor.fetchone()['id']
                ious_created += 1

                # Insert IOU items
                for idx in range(len(ious.lmoney)):
                    client = ious.lclient[idx] if idx < len(ious.lclient) else ''
                    amount = float(ious.lmoney[idx])
                    flight = ious.lflight[idx] if idx < len(ious.lflight) else ''
                    ticket = str(ious.ltktnum[idx]) if idx < len(ious.ltktnum) else ''
                    remark = ious.remark[idx] if idx < len(ious.remark) else ''

                    cursor.execute("""
                        INSERT INTO yif_iou_items (ious_id, worker_id, item_index, client, amount, flight, ticket_number, remark)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (iou_db_id, worker_id, idx, client, amount, flight, ticket, remark))
                    items_created += 1

                # Insert payments
                for payment in business.list_payment:
                    cursor.execute("""
                        INSERT INTO yif_payments (ious_id, worker_id, user_code, payment_date, payer_name, amount, remark)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (iou_db_id, worker_id, payment.user, payment.date,
                          payment.client, float(payment.amount), payment.remark))
                    payments_created += 1

                if ious_created % 100 == 0:
                    print(f"[PROGRESS] Imported {ious_created} IOUs...")

        # Log migration
        cursor.execute("""
            INSERT INTO yif_logs (worker_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (worker_id, 'migrate', 'system', 'pickle',
              f"Migrated {ious_created} IOUs, {items_created} items, {payments_created} payments from pickle"))

        conn.commit()

        print(f"\n=== Migration Complete ===")
        print(f"IOUs created: {ious_created}")
        print(f"Items created: {items_created}")
        print(f"Payments created: {payments_created}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def main():
    parser = argparse.ArgumentParser(description='Migrate pickle data to PostgreSQL')
    parser.add_argument('--worker-id', type=int, required=True,
                        help='Worker ID to assign to migrated records')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be imported without importing')

    args = parser.parse_args()

    print("=== Pickle to PostgreSQL Migration ===")
    print(f"Pickle directory: {PICKLE_DIR}")

    migrate_data(args.worker_id, args.dry_run)


if __name__ == "__main__":
    main()
