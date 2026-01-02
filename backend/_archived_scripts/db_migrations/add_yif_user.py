"""
添加新的YIF用户
"""

import psycopg2
import os
import hashlib
from dotenv import load_dotenv

load_dotenv()

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def add_yif_user(username: str, password: str):
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(password)
        
        cursor.execute("""
            INSERT INTO yif_users (username, password_hash)
            VALUES (%s, %s)
            ON CONFLICT (username) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                updated_at = NOW();
        """, (username, password_hash))
        
        conn.commit()
        print(f"User '{username}' added/updated successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Failed to add user: {e}")
        raise
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_yif_user('likan', '710408')
