"""
为 YIF 表添加 RLS (Row Level Security) 保护
- admin/manager: 可以看到所有数据
- user: 只能看到自己创建的数据
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def add_rls():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        # ========================================
        # 1. 给 yif_iou_items 添加 worker_id
        # ========================================
        cursor.execute("""
            ALTER TABLE yif_iou_items
            ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES yif_workers(id);
        """)
        print("[OK] Added worker_id to yif_iou_items")

        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_iou_items_worker_id
            ON yif_iou_items(worker_id);
        """)
        print("[OK] Created index for yif_iou_items.worker_id")

        # 用 yif_ious 的 worker_id 填充现有记录
        cursor.execute("""
            UPDATE yif_iou_items i
            SET worker_id = o.worker_id
            FROM yif_ious o
            WHERE i.ious_id = o.id AND i.worker_id IS NULL;
        """)
        print("[OK] Populated worker_id for existing yif_iou_items")

        # ========================================
        # 2. 启用 RLS
        # ========================================
        tables = ['yif_ious', 'yif_iou_items', 'yif_payments', 'yif_logs']

        for table in tables:
            cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
            print(f"[OK] Enabled RLS on {table}")

        # ========================================
        # 3. 创建 RLS 策略
        # ========================================

        # 策略逻辑：
        # - admin/manager: 可以访问所有行
        # - user: 只能访问 worker_id 匹配的行
        #
        # 使用 current_setting 存储当前用户信息

        for table in tables:
            # 删除已存在的策略
            cursor.execute(f"DROP POLICY IF EXISTS {table}_select_policy ON {table};")
            cursor.execute(f"DROP POLICY IF EXISTS {table}_insert_policy ON {table};")
            cursor.execute(f"DROP POLICY IF EXISTS {table}_update_policy ON {table};")
            cursor.execute(f"DROP POLICY IF EXISTS {table}_delete_policy ON {table};")

            # SELECT 策略
            cursor.execute(f"""
                CREATE POLICY {table}_select_policy ON {table}
                FOR SELECT
                USING (
                    current_setting('app.user_role', true) IN ('admin', 'manager')
                    OR worker_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                );
            """)

            # INSERT 策略
            cursor.execute(f"""
                CREATE POLICY {table}_insert_policy ON {table}
                FOR INSERT
                WITH CHECK (
                    worker_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                );
            """)

            # UPDATE 策略
            cursor.execute(f"""
                CREATE POLICY {table}_update_policy ON {table}
                FOR UPDATE
                USING (
                    current_setting('app.user_role', true) IN ('admin', 'manager')
                    OR worker_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                );
            """)

            # DELETE 策略
            cursor.execute(f"""
                CREATE POLICY {table}_delete_policy ON {table}
                FOR DELETE
                USING (
                    current_setting('app.user_role', true) IN ('admin', 'manager')
                    OR worker_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                );
            """)

            print(f"[OK] Created RLS policies for {table}")

        # ========================================
        # 4. 创建辅助函数设置用户上下文
        # ========================================
        cursor.execute("""
            CREATE OR REPLACE FUNCTION set_yif_user_context(
                p_user_id INTEGER,
                p_user_role VARCHAR
            ) RETURNS VOID AS $$
            BEGIN
                PERFORM set_config('app.user_id', p_user_id::TEXT, false);
                PERFORM set_config('app.user_role', p_user_role, false);
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("[OK] Created function: set_yif_user_context")

        conn.commit()
        print("\n" + "="*50)
        print("RLS setup completed successfully!")
        print("="*50)
        print("\nUsage in Python:")
        print('  cursor.execute("SELECT set_yif_user_context(%s, %s)", (user_id, role))')
        print("\nRoles:")
        print("  - admin/manager: Full access to all data")
        print("  - user: Access only to own data (worker_id match)")

    except Exception as e:
        conn.rollback()
        print(f"Failed: {e}")
        raise

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    add_rls()
