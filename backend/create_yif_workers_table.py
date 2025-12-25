"""
创建YIF款项管理系统用户表 (Workers)
Enhanced with bcrypt password hashing
"""

import psycopg2
import os
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def create_yif_workers_table():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        # Create workers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yif_workers (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(200),
                user_code VARCHAR(10),
                email VARCHAR(200),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # Create index on username for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_yif_workers_username
            ON yif_workers(username);
        """)

        # Insert default user - use environment variable for password
        default_password = os.getenv('DEFAULT_ADMIN_PASSWORD', '200631')
        password_hash = hash_password(default_password)

        cursor.execute("""
            INSERT INTO yif_workers (username, password_hash, display_name, is_active)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (username) DO NOTHING;
        """, ('hoshipu', password_hash, 'Administrator', True))

        conn.commit()
        print("YIF workers table created successfully!")
        print(f"Default user created: username=hoshipu")
        print("IMPORTANT: Change the default password in production!")

    except Exception as e:
        conn.rollback()
        print(f"Failed to create table: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_yif_workers_table()
