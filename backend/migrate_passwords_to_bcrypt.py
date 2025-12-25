"""
Migrate existing SHA256 passwords to bcrypt
Run this script manually when needed.

Usage:
    python migrate_passwords_to_bcrypt.py <username> <password>

Example:
    python migrate_passwords_to_bcrypt.py admin mypassword123
"""

import psycopg2
import os
import sys
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def migrate_password(username: str, password: str):
    """
    Migrate a single user's password to bcrypt
    """
    if not username or not password:
        print("Error: Username and password are required")
        print("Usage: python migrate_passwords_to_bcrypt.py <username> <password>")
        sys.exit(1)

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        # Hash password using bcrypt
        new_hash = pwd_context.hash(password)

        # Update the database
        cursor.execute("""
            UPDATE yif_workers
            SET password_hash = %s,
                updated_at = NOW()
            WHERE username = %s;
        """, (new_hash, username))

        if cursor.rowcount > 0:
            print(f"[OK] Updated password for user: {username}")
            conn.commit()
        else:
            print(f"[SKIP] User not found: {username}")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python migrate_passwords_to_bcrypt.py <username> <password>")
        print("Example: python migrate_passwords_to_bcrypt.py admin mypassword123")
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]

    response = input(f"Are you sure you want to update password for '{username}'? (yes/no): ")
    if response.lower() == 'yes':
        migrate_password(username, password)
    else:
        print("Migration cancelled.")
