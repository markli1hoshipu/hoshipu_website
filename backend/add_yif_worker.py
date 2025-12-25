"""
添加新的YIF Worker (用户)
Enhanced with bcrypt password hashing
IMPORTANT: Do NOT hardcode passwords in this file!
"""

import psycopg2
import os
from passlib.context import CryptContext
from dotenv import load_dotenv
import getpass

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def add_yif_worker(username: str, password: str, display_name: str = None, user_code: str = None, email: str = None):
    """
    Add a new YIF worker to the database

    Args:
        username: Unique username for login
        password: Plain text password (will be hashed)
        display_name: Display name (optional)
        user_code: Short code like QFF, MAR, LZY (optional)
        email: Email address (optional)
    """
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        password_hash = hash_password(password)

        cursor.execute("""
            INSERT INTO yif_workers (username, password_hash, display_name, user_code, email)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (username) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                display_name = EXCLUDED.display_name,
                user_code = EXCLUDED.user_code,
                email = EXCLUDED.email,
                updated_at = NOW();
        """, (username, password_hash, display_name, user_code, email))

        conn.commit()
        print(f"User '{username}' added/updated successfully!")
        if user_code:
            print(f"User code: {user_code}")

    except Exception as e:
        conn.rollback()
        print(f"Failed to add user: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    # Interactive mode - prompt for credentials
    print("=== Add YIF Worker ===")
    username = input("Username: ").strip()
    password = getpass.getpass("Password: ")
    display_name = input("Display Name (optional): ").strip() or None
    user_code = input("User Code (e.g., QFF, MAR, optional): ").strip() or None
    email = input("Email (optional): ").strip() or None

    if not username or not password:
        print("Error: Username and password are required!")
        exit(1)

    add_yif_worker(username, password, display_name, user_code, email)
