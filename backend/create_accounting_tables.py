"""
Create accounting tables for hoshipu_website
Tables:
- hoshipu_accounting_categories: Category keyword mappings (JSON array)
- hoshipu_accounting_transactions: Transaction records
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL")

def create_tables():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Create categories table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hoshipu_accounting_categories (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL UNIQUE,
                keywords JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Created table: hoshipu_accounting_categories")

        # Create transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hoshipu_accounting_transactions (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(12, 2) NOT NULL,
                category VARCHAR(50),
                source VARCHAR(50) NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
                exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1.0,
                remark TEXT,
                original_desc TEXT,
                dup_hash VARCHAR(32) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Created table: hoshipu_accounting_transactions")

        # Create index on dup_hash for duplicate detection
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_accounting_dup_hash
            ON hoshipu_accounting_transactions(dup_hash);
        """)
        print("Created index: idx_accounting_dup_hash")

        # Create index on date for efficient date range queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_accounting_date
            ON hoshipu_accounting_transactions(date);
        """)
        print("Created index: idx_accounting_date")

        # Insert default categories
        default_categories = [
            ("生活", ["SHOPPERS", "IKEA", "AMZN", "SPORT", "WINNERS"]),
            ("餐饮", ["SUPERMARKET", "COSTCO", "WALMART", "METRO", "FARM BOY", "McDonalds",
                     "STARBUCK", "TIM HORTONS", "KFC", "BURGER", "Subway", "RESTAURANT",
                     "FANTUAN", "NENE CHICKEN", "COCO FRESH TEA", "MARY BROWN"]),
            ("交通", ["PRESTO", "UBER", "LYFT", "BIKE SHARE", "TAXI", "GAS", "PARKING"]),
            ("娱乐", ["STEAM", "NETFLIX", "SPOTIFY", "GAME", "MOVIE", "THEATRE"]),
            ("房租水电", ["RENT", "HYDRO", "ELECTRICITY", "WATER", "INTERNET", "ROGERS",
                        "KOODO", "BELL", "TSCC", "PROPERTY TAX"]),
            ("学习工作", ["TUITION", "BOOK", "OFFICE", "YORKU"]),
            ("其他", [])
        ]

        import json
        for category, keywords in default_categories:
            cursor.execute("""
                INSERT INTO hoshipu_accounting_categories (category, keywords)
                VALUES (%s, %s)
                ON CONFLICT (category) DO UPDATE SET keywords = EXCLUDED.keywords;
            """, (category, json.dumps(keywords)))
        print(f"Inserted {len(default_categories)} default categories")

        conn.commit()
        print("\nAll tables created successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    create_tables()
