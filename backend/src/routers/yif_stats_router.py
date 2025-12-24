"""
YIF Statistics API Router
Provides dashboard statistics and chart data
Updated: 2025-12-23
"""

from fastapi import APIRouter, HTTPException, Depends
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

from database import get_db_connection
from routers.yif_router import verify_token

router = APIRouter(prefix="/api/yif/stats", tags=["yif-stats"])


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


@router.get("/dashboard")
async def get_dashboard_stats(user_id: int = Depends(verify_token)):
    """
    Get dashboard statistics:
    - Summary: total unpaid amount, IOU counts by status, monthly payments
    - 2-month trend: daily cumulative unpaid amount
    - Weekly stats: daily new IOUs and payments (count and amount)
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        user = get_user_info(cursor, user_id)
        if not user:
            raise HTTPException(401, "User not found")

        set_rls_context(cursor, user_id, user['role'] or 'user')

        # ===== SUMMARY STATISTICS =====
        # Dashboard only shows current user's own data (filtered by worker_id)

        # Get comprehensive stats in one query (filtered by worker_id)
        cursor.execute("""
            SELECT
                COUNT(*) as total_ious,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COUNT(*) FILTER (WHERE status IN (0, 1)) as unpaid_count,
                COUNT(*) FILTER (WHERE status = 2) as paid_count,
                COUNT(*) FILTER (WHERE status = 3) as negative_count
            FROM yif_ious
            WHERE worker_id = %s
        """, (user_id,))
        iou_stats = cursor.fetchone()

        # Get item count (for current user's IOUs only)
        cursor.execute("""
            SELECT COUNT(*) as item_count
            FROM yif_iou_items ii
            JOIN yif_ious i ON ii.ious_id = i.id
            WHERE i.worker_id = %s
        """, (user_id,))
        item_count = cursor.fetchone()['item_count']

        # Get payment stats (for current user only)
        cursor.execute("""
            SELECT
                COUNT(*) as payment_count,
                COALESCE(SUM(amount), 0) as total_paid
            FROM yif_payments
            WHERE worker_id = %s
        """, (user_id,))
        payment_stats = cursor.fetchone()

        # Calculate total unpaid
        total_amount = float(iou_stats['total_amount'])
        total_paid = float(payment_stats['total_paid'])
        total_unpaid = total_amount - total_paid

        # This month's payments (for current user only)
        today = datetime.now()
        month_start = today.strftime('%y%m01')
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as monthly_payments
            FROM yif_payments
            WHERE payment_date >= %s AND worker_id = %s
        """, (month_start, user_id))
        monthly_payments = float(cursor.fetchone()['monthly_payments'])

        summary = {
            'total_ious': iou_stats['total_ious'],
            'item_count': item_count,
            'payment_count': payment_stats['payment_count'],
            'total_amount': total_amount,
            'total_paid': total_paid,
            'total_unpaid': total_unpaid,
            'unpaid_count': iou_stats['unpaid_count'],
            'paid_count': iou_stats['paid_count'],
            'negative_count': iou_stats['negative_count'],
            'monthly_payments': monthly_payments
        }

        # ===== 2-MONTH TREND (Daily cumulative unpaid amount) =====

        # Get date range (60 days ago to today)
        two_months_ago = (today - timedelta(days=60)).strftime('%y%m%d')
        today_str = today.strftime('%y%m%d')

        # Get all IOUs and payments within range, then calculate cumulative (filtered by worker_id)
        cursor.execute("""
            WITH date_series AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '60 days',
                    CURRENT_DATE,
                    '1 day'::interval
                )::date as date
            ),
            daily_ious AS (
                SELECT
                    TO_DATE('20' || ious_date, 'YYYYMMDD') as date,
                    SUM(total_amount) as amount
                FROM yif_ious
                WHERE ious_date >= %s AND worker_id = %s
                GROUP BY ious_date
            ),
            daily_payments AS (
                SELECT
                    TO_DATE('20' || payment_date, 'YYYYMMDD') as date,
                    SUM(amount) as amount
                FROM yif_payments
                WHERE payment_date >= %s AND worker_id = %s
                GROUP BY payment_date
            )
            SELECT
                ds.date,
                COALESCE(di.amount, 0) as new_ious,
                COALESCE(dp.amount, 0) as new_payments
            FROM date_series ds
            LEFT JOIN daily_ious di ON di.date = ds.date
            LEFT JOIN daily_payments dp ON dp.date = ds.date
            ORDER BY ds.date
        """, (two_months_ago, user_id, two_months_ago, user_id))

        daily_data = cursor.fetchall()

        # Calculate initial unpaid amount (before 60 days ago, for current user only)
        cursor.execute("""
            SELECT
                COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(p.paid), 0) as initial_unpaid
            FROM yif_ious i
            LEFT JOIN (
                SELECT ious_id, SUM(amount) as paid
                FROM yif_payments
                WHERE payment_date < %s AND worker_id = %s
                GROUP BY ious_id
            ) p ON p.ious_id = i.id
            WHERE i.ious_date < %s AND i.worker_id = %s
        """, (two_months_ago, user_id, two_months_ago, user_id))
        initial_unpaid = float(cursor.fetchone()['initial_unpaid'] or 0)

        # Build cumulative trend
        two_month_trend = []
        cumulative = initial_unpaid
        for row in daily_data:
            cumulative += float(row['new_ious']) - float(row['new_payments'])
            two_month_trend.append({
                'date': row['date'].strftime('%m-%d'),
                'amount': round(cumulative, 2)
            })

        # ===== WEEKLY STATS (Daily new IOUs and payments) =====

        seven_days_ago = (today - timedelta(days=6)).strftime('%y%m%d')

        # Daily new IOU count and amount (filtered by worker_id)
        cursor.execute("""
            WITH date_series AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '6 days',
                    CURRENT_DATE,
                    '1 day'::interval
                )::date as date
            ),
            daily_ious AS (
                SELECT
                    TO_DATE('20' || ious_date, 'YYYYMMDD') as date,
                    COUNT(*) as count,
                    SUM(total_amount) as amount
                FROM yif_ious
                WHERE ious_date >= %s AND worker_id = %s
                GROUP BY ious_date
            ),
            daily_payments AS (
                SELECT
                    TO_DATE('20' || payment_date, 'YYYYMMDD') as date,
                    COUNT(*) as count,
                    SUM(amount) as amount
                FROM yif_payments
                WHERE payment_date >= %s AND worker_id = %s
                GROUP BY payment_date
            )
            SELECT
                ds.date,
                COALESCE(di.count, 0) as iou_count,
                COALESCE(di.amount, 0) as iou_amount,
                COALESCE(dp.count, 0) as payment_count,
                COALESCE(dp.amount, 0) as payment_amount
            FROM date_series ds
            LEFT JOIN daily_ious di ON di.date = ds.date
            LEFT JOIN daily_payments dp ON dp.date = ds.date
            ORDER BY ds.date
        """, (seven_days_ago, user_id, seven_days_ago, user_id))

        weekly_data = cursor.fetchall()

        weekly_counts = []
        weekly_amounts = []
        for row in weekly_data:
            date_str = row['date'].strftime('%m-%d')
            weekly_counts.append({
                'date': date_str,
                'ious': int(row['iou_count']),
                'payments': int(row['payment_count'])
            })
            weekly_amounts.append({
                'date': date_str,
                'ious': round(float(row['iou_amount']), 2),
                'payments': round(float(row['payment_amount']), 2)
            })

        return {
            "success": True,
            "summary": summary,
            "two_month_trend": two_month_trend,
            "weekly_counts": weekly_counts,
            "weekly_amounts": weekly_amounts
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get stats: {str(e)}")
    finally:
        cursor.close()
        conn.close()
