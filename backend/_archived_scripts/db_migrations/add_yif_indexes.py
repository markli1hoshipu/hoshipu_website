"""
Add database indexes for YIF tables to improve query performance.
Run this once after tables are created.
"""

import psycopg2
from src.database import get_db_connection


def add_indexes():
    conn = get_db_connection()
    cursor = conn.cursor()

    indexes = [
        # yif_ious indexes
        ("idx_yif_ious_date", "yif_ious", "ious_date"),
        ("idx_yif_ious_status", "yif_ious", "status"),
        ("idx_yif_ious_ious_id", "yif_ious", "ious_id"),
        ("idx_yif_ious_user_code", "yif_ious", "user_code"),
        ("idx_yif_ious_date_status", "yif_ious", "ious_date, status"),

        # yif_iou_items indexes
        ("idx_yif_iou_items_ious_id", "yif_iou_items", "ious_id"),
        ("idx_yif_iou_items_client", "yif_iou_items", "LOWER(client)"),
        ("idx_yif_iou_items_ticket", "yif_iou_items", "ticket_number"),

        # yif_payments indexes
        ("idx_yif_payments_ious_id", "yif_payments", "ious_id"),
        ("idx_yif_payments_date", "yif_payments", "payment_date"),
        ("idx_yif_payments_payer", "yif_payments", "payer_name"),
    ]

    for idx_name, table, columns in indexes:
        try:
            sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({columns})"
            cursor.execute(sql)
            print(f"Created index: {idx_name}")
        except Exception as e:
            print(f"Failed to create {idx_name}: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    print("\nDone! Indexes created.")


if __name__ == "__main__":
    add_indexes()
