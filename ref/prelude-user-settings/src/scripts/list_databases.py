#!/usr/bin/env python3
"""
List All Databases Script
=========================

This script lists all databases on the PostgreSQL server.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.parse as urlparse

def list_databases():
    """List all databases on the PostgreSQL server."""
    try:
        # Connect to the default postgres database to list all databases
        database_url = os.getenv('DATABASE_URL')

        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")

        parsed = urlparse.urlparse(database_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database='postgres'  # Connect to default postgres db to list all
        )
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query all databases
        cursor.execute("""
            SELECT datname as database_name,
                   pg_size_pretty(pg_database_size(datname)) as size,
                   datcollate as collation,
                   datctype as character_type
            FROM pg_database 
            WHERE datistemplate = false
            ORDER BY datname;
        """)
        
        databases = cursor.fetchall()
        
        print("=== ALL DATABASES ON SERVER ===")
        print(f"{'Database Name':<30} {'Size':<15} {'Collation':<20}")
        print("-" * 70)
        
        for db in databases:
            print(f"{db['database_name']:<30} {db['size']:<15} {db['collation']:<20}")
        
        print(f"\nTotal databases: {len(databases)}")
        
        cursor.close()
        conn.close()
        
        return [db['database_name'] for db in databases]
        
    except Exception as e:
        print(f"[ERROR] Failed to list databases: {e}")
        return []

def test_database_tables(database_name):
    """Test connecting to a specific database and count tables."""
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
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        """)
        
        table_count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return table_count
        
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    databases = list_databases()
    
    if databases:
        print(f"\n=== TABLE COUNTS BY DATABASE ===")
        for db_name in databases:
            if db_name in ['template0', 'template1']:
                continue  # Skip template databases
                
            table_count = test_database_tables(db_name)
            print(f"{db_name:<30} {table_count} tables")
    
    print(f"\nNote: The onboarding check might be looking in the wrong database!")
    print(f"Expected tables should be in user-specific databases, not in 'prelude_user_analytics'.")