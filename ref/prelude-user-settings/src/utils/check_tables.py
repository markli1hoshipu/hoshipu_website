#!/usr/bin/env python3
"""
Quick script to check tables in the database
"""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

# Database connection parameters - all required, no fallbacks
DB_CONFIG = {
    'host': os.getenv('SESSIONS_DB_HOST'),
    'port': os.getenv('SESSIONS_DB_PORT'),
    'user': os.getenv('SESSIONS_DB_USER'),
    'password': os.getenv('SESSIONS_DB_PASSWORD'),
    'database': os.getenv('SESSIONS_DB_NAME')
}

def get_all_tables():
    """Get all tables in the database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Query to get all tables in the public schema
        query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """

        cursor.execute(query)
        tables = cursor.fetchall()

        print(f"\n{'='*60}")
        print(f"Tables in database '{DB_CONFIG['database']}':")
        print(f"{'='*60}\n")

        for i, (table_name,) in enumerate(tables, 1):
            print(f"{i:2d}. {table_name}")

        print(f"\n{'='*60}")
        print(f"Total tables: {len(tables)}")
        print(f"{'='*60}\n")

        cursor.close()
        conn.close()

        return [table[0] for table in tables]

    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    tables = get_all_tables()
