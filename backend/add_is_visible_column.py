"""
Migration script to add is_visible column to messages table
"""
import sys
import os

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy import text
from database import engine

def migrate():
    """Add is_visible column to messages table"""
    with engine.connect() as conn:
        try:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='messages' AND column_name='is_visible'
            """))

            if result.fetchone():
                print("Column 'is_visible' already exists. No migration needed.")
                return

            # Add the column
            conn.execute(text("""
                ALTER TABLE messages
                ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE
            """))
            conn.commit()
            print("Successfully added 'is_visible' column to messages table.")

        except Exception as e:
            print(f"Error during migration: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate()
