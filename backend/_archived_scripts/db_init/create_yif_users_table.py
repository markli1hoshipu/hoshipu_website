"""
创建YIF款项管理系统用户表
"""

import psycopg2
import os
import hashlib
from dotenv import load_dotenv

load_dotenv()

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_yif_users_table():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    
    try:
        # 创建用户表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yif_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # 插入默认用户 hoshipu
        password_hash = hash_password('200631')
        cursor.execute("""
            INSERT INTO yif_users (username, password_hash)
            VALUES (%s, %s)
            ON CONFLICT (username) DO NOTHING;
        """, ('hoshipu', password_hash))
        
        conn.commit()
        print("YIF users table created successfully!")
        print(f"Default user created: username=hoshipu")
        
    except Exception as e:
        conn.rollback()
        print(f"Failed to create table: {e}")
        raise
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_yif_users_table()
