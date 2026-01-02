"""
创建YIF款项管理系统核心数据表
分层设计：欠条主表 + 欠条明细表 + 付款表 + 日志表
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def create_yif_tables():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        # ========================================
        # 1. 欠条主表 (yif_ious)
        # ========================================
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yif_ious (
                id SERIAL PRIMARY KEY,
                ious_id VARCHAR(50) UNIQUE NOT NULL,  -- 欠单号，如 "QFF230811D01"
                worker_id INTEGER NOT NULL REFERENCES yif_workers(id),
                user_code VARCHAR(10) NOT NULL,       -- 用户代码，如 "QFF"
                ious_date VARCHAR(6) NOT NULL,        -- 日期，格式 YYMMDD
                total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                status INTEGER NOT NULL DEFAULT 0,    -- 0:未付款, 1:未付清, 2:已付清, 3:初始为负, 4:超额支付
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("[OK] Created table: yif_ious")

        # 欠条主表索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_ious_worker_id ON yif_ious(worker_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_ious_ious_id ON yif_ious(ious_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_ious_date ON yif_ious(ious_date);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_ious_status ON yif_ious(status);
        """)
        print("[OK] Created indexes for yif_ious")

        # ========================================
        # 2. 欠条明细表 (yif_iou_items)
        # ========================================
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yif_iou_items (
                id SERIAL PRIMARY KEY,
                ious_id INTEGER NOT NULL REFERENCES yif_ious(id) ON DELETE CASCADE,
                item_index INTEGER NOT NULL DEFAULT 0,  -- 同一欠条内的序号
                client VARCHAR(200) NOT NULL,           -- 欠款客户
                amount DECIMAL(12,2) NOT NULL,          -- 金额
                flight VARCHAR(100),                    -- 航段
                ticket_number VARCHAR(100),             -- 票号
                remark TEXT,                            -- 备注
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("[OK] Created table: yif_iou_items")

        # 欠条明细表索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_iou_items_ious_id ON yif_iou_items(ious_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_iou_items_client ON yif_iou_items(client);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_iou_items_ticket ON yif_iou_items(ticket_number);
        """)
        print("[OK] Created indexes for yif_iou_items")

        # ========================================
        # 3. 付款表 (yif_payments)
        # ========================================
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yif_payments (
                id SERIAL PRIMARY KEY,
                ious_id INTEGER NOT NULL REFERENCES yif_ious(id) ON DELETE CASCADE,
                worker_id INTEGER NOT NULL REFERENCES yif_workers(id),
                user_code VARCHAR(10) NOT NULL,         -- 操作员代码
                payment_date VARCHAR(6) NOT NULL,       -- 付款日期 YYMMDD
                payer_name VARCHAR(200) NOT NULL,       -- 付款人
                amount DECIMAL(12,2) NOT NULL,          -- 付款金额
                remark TEXT,                            -- 备注
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("[OK] Created table: yif_payments")

        # 付款表索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_payments_ious_id ON yif_payments(ious_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_payments_worker_id ON yif_payments(worker_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_payments_date ON yif_payments(payment_date);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_payments_payer ON yif_payments(payer_name);
        """)
        print("[OK] Created indexes for yif_payments")

        # ========================================
        # 4. 操作日志表 (yif_logs)
        # ========================================
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yif_logs (
                id SERIAL PRIMARY KEY,
                worker_id INTEGER REFERENCES yif_workers(id),
                action VARCHAR(50) NOT NULL,            -- 操作类型
                target_type VARCHAR(50),                -- 目标类型: iou, payment, import
                target_id VARCHAR(100),                 -- 目标ID
                details TEXT,                           -- 详细信息
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("[OK] Created table: yif_logs")

        # 日志表索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_logs_worker_id ON yif_logs(worker_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_logs_action ON yif_logs(action);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_logs_created_at ON yif_logs(created_at);
        """)
        print("[OK] Created indexes for yif_logs")

        # ========================================
        # 5. 创建更新 updated_at 的触发器函数
        # ========================================
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_yif_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        # 为 yif_ious 添加触发器
        cursor.execute("""
            DROP TRIGGER IF EXISTS trigger_yif_ious_updated_at ON yif_ious;
        """)
        cursor.execute("""
            CREATE TRIGGER trigger_yif_ious_updated_at
                BEFORE UPDATE ON yif_ious
                FOR EACH ROW
                EXECUTE FUNCTION update_yif_updated_at();
        """)
        print("[OK] Created update trigger for yif_ious")

        # ========================================
        # 6. 创建计算欠条状态的函数
        # ========================================
        cursor.execute("""
            CREATE OR REPLACE FUNCTION calculate_iou_status(
                p_total_amount DECIMAL,
                p_paid_amount DECIMAL
            ) RETURNS INTEGER AS $$
            BEGIN
                IF p_total_amount < 0 THEN
                    RETURN 3;  -- 初始为负
                ELSIF p_paid_amount = 0 THEN
                    RETURN 0;  -- 未付款
                ELSIF p_paid_amount < p_total_amount THEN
                    RETURN 1;  -- 未付清
                ELSIF p_paid_amount = p_total_amount THEN
                    RETURN 2;  -- 已付清
                ELSE
                    RETURN 4;  -- 超额支付
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("[OK] Created function: calculate_iou_status")

        # ========================================
        # 7. 创建更新欠条状态的触发器
        # ========================================
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_iou_status_on_payment()
            RETURNS TRIGGER AS $$
            DECLARE
                v_total_amount DECIMAL;
                v_paid_amount DECIMAL;
                v_new_status INTEGER;
            BEGIN
                -- 获取欠条总金额
                SELECT total_amount INTO v_total_amount
                FROM yif_ious WHERE id = COALESCE(NEW.ious_id, OLD.ious_id);

                -- 计算已付款总额
                SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
                FROM yif_payments WHERE ious_id = COALESCE(NEW.ious_id, OLD.ious_id);

                -- 计算新状态
                v_new_status := calculate_iou_status(v_total_amount, v_paid_amount);

                -- 更新欠条状态
                UPDATE yif_ious
                SET status = v_new_status
                WHERE id = COALESCE(NEW.ious_id, OLD.ious_id);

                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
        """)

        cursor.execute("""
            DROP TRIGGER IF EXISTS trigger_update_iou_status ON yif_payments;
        """)
        cursor.execute("""
            CREATE TRIGGER trigger_update_iou_status
                AFTER INSERT OR UPDATE OR DELETE ON yif_payments
                FOR EACH ROW
                EXECUTE FUNCTION update_iou_status_on_payment();
        """)
        print("[OK] Created trigger: auto-update IOU status on payment changes")

        conn.commit()
        print("\n" + "="*50)
        print("All YIF tables created successfully!")
        print("="*50)
        print("\nTables created:")
        print("  - yif_ious (欠条主表)")
        print("  - yif_iou_items (欠条明细表)")
        print("  - yif_payments (付款表)")
        print("  - yif_logs (操作日志表)")
        print("\nFunctions & Triggers:")
        print("  - update_yif_updated_at() - 自动更新时间戳")
        print("  - calculate_iou_status() - 计算欠条状态")
        print("  - trigger_update_iou_status - 付款后自动更新状态")

    except Exception as e:
        conn.rollback()
        print(f"Failed to create tables: {e}")
        raise

    finally:
        cursor.close()
        conn.close()


def show_table_info():
    """显示表结构信息"""
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    tables = ['yif_ious', 'yif_iou_items', 'yif_payments', 'yif_logs']

    print("\n" + "="*60)
    print("TABLE STRUCTURE SUMMARY")
    print("="*60)

    for table in tables:
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position;
        """, (table,))

        columns = cursor.fetchall()
        if columns:
            print(f"\n{table}:")
            print("-" * 50)
            for col in columns:
                nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col[3]}" if col[3] else ""
                print(f"  {col[0]:20} {col[1]:15} {nullable}{default}")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    create_yif_tables()
    show_table_info()
