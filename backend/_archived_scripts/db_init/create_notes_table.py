"""
创建 hoshipu_notes 表 - 用于生活管理系统的任务/备忘录功能
"""
import os
import psycopg2
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def create_notes_table():
    """创建 hoshipu_notes 表"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # 创建表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hoshipu_notes (
                id SERIAL PRIMARY KEY,
                type VARCHAR(20) NOT NULL,        -- 'daily' 或 'longterm'
                content TEXT NOT NULL,            -- 任务内容
                is_completed BOOLEAN DEFAULT FALSE,
                date DATE,                        -- 每日任务的日期（用于自动重置）
                created_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP            -- 完成时间
            );
        """)

        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_hoshipu_notes_type
            ON hoshipu_notes(type);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_hoshipu_notes_date
            ON hoshipu_notes(date);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_hoshipu_notes_type_date
            ON hoshipu_notes(type, date);
        """)

        conn.commit()
        print("[OK] hoshipu_notes table created successfully!")
        print("   - Index: idx_hoshipu_notes_type")
        print("   - Index: idx_hoshipu_notes_date")
        print("   - Index: idx_hoshipu_notes_type_date")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Failed to create table: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    create_notes_table()
