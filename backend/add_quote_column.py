"""
Add quote column to messages table to support reply feature
"""
import sys
import os

# Add src directory to path
src_path = os.path.join(os.path.dirname(__file__), 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from sqlalchemy import create_engine, Column, Integer, inspect, text
from database import DATABASE_URL

def add_quote_column():
    engine = create_engine(DATABASE_URL)

    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('messages')]

    if 'quote_id' in columns:
        print("Column 'quote_id' already exists in messages table")
        return

    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE messages ADD COLUMN quote_id INTEGER;'))
        conn.execute(text('ALTER TABLE messages ADD CONSTRAINT fk_quote_id FOREIGN KEY (quote_id) REFERENCES messages(id);'))
        conn.commit()
        print("Successfully added quote_id column to messages table")

if __name__ == "__main__":
    add_quote_column()
