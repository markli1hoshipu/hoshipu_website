#!/usr/bin/env python3
"""
Postgres Database Table Check
============================

A script to check tables specifically in the postgres database.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.parse as urlparse

def check_postgres_tables():
    """Check tables in the postgres database."""
    print("=== POSTGRES DATABASE TABLE CHECK ===")
    
    database_name = "postgres"
    
    try:
        database_url = os.getenv('DATABASE_URL')

        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")

        parsed = urlparse.urlparse(database_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=database_name
        )
        
        print(f"[SUCCESS] Connected to {database_name}!")
        
        # Test basic query
        cursor = conn.cursor()
        cursor.execute("SELECT current_database(), version();")
        db_name, version = cursor.fetchone()
        print(f"Database: {db_name}")
        print(f"PostgreSQL: {version[:100]}...")
        
        # List tables in alphabetical order
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\n[TABLES] Found {len(tables)} tables in postgres:")
        print("-" * 50)
        
        for i, table_name in enumerate(tables, 1):
            print(f"{i:2d}. {table_name}")
        
        print(f"\n=== PYTHON LIST FORMAT ===")
        print("EXPECTED_TABLES = [")
        for table in tables:
            print(f'    "{table}",')
        print("]")
        
        cursor.close()
        conn.close()
        
        return tables
        
    except Exception as e:
        print(f"[ERROR] Failed to connect to postgres database: {e}")
        return []

if __name__ == "__main__":
    tables = check_postgres_tables()
    
    print(f"\n=== SUMMARY ===")
    if tables:
        print(f"Postgres database has {len(tables)} tables.")
        print("Use the EXPECTED_TABLES list above to update the onboarding router.")
    else:
        print("Could not access postgres database or no tables found.")