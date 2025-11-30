#!/usr/bin/env python3
"""
Simple Database Table Check
===========================

A simple script to debug database connection and list tables.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.parse as urlparse

def test_connection():
    """Test database connection with detailed debugging."""
    print("=== DATABASE CONNECTION TEST ===")
    
    # Check environment variables
    database_url = os.getenv('DATABASE_URL')
    print(f"DATABASE_URL exists: {bool(database_url)}")
    
    if database_url:
        print(f"DATABASE_URL: {database_url[:50]}...")
        parsed = urlparse.urlparse(database_url)
        config = {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'user': parsed.username,
            'database': parsed.path[1:] if parsed.path else 'postgres'
        }
        print(f"Parsed config: host={config['host']}, port={config['port']}, user={config['user']}, db={config['database']}")
    else:
        # Use individual environment variables - no fallbacks
        config = {
            'host': os.getenv('SESSIONS_DB_HOST'),
            'port': int(os.getenv('SESSIONS_DB_PORT', 0)) or None,
            'user': os.getenv('SESSIONS_DB_USER'),
            'password': os.getenv('SESSIONS_DB_PASSWORD'),
            'database': os.getenv('SESSIONS_DB_NAME')
        }
        print(f"Using config: host={config['host']}, port={config['port']}, user={config['user']}, db={config['database']}")
    
    try:
        if database_url:
            parsed = urlparse.urlparse(database_url)
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                user=parsed.username,
                password=parsed.password,
                database=parsed.path[1:] if parsed.path else 'postgres'
            )
        else:
            conn = psycopg2.connect(**config)
        
        print("[SUCCESS] Connected to database!")
        
        # Test basic query
        cursor = conn.cursor()
        cursor.execute("SELECT current_database(), version();")
        db_name, version = cursor.fetchone()
        print(f"Database: {db_name}")
        print(f"PostgreSQL: {version[:100]}...")
        
        # List tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\nFound {len(tables)} tables:")
        
        for i, table in enumerate(tables, 1):
            print(f"  {i:2d}. {table}")
        
        cursor.close()
        conn.close()
        
        return tables
        
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return []

if __name__ == "__main__":
    tables = test_connection()
    
    if tables:
        print(f"\n=== SUMMARY ===")
        print(f"Successfully found {len(tables)} tables in the database.")
    else:
        print(f"\n=== SUMMARY ===")
        print("No tables found or connection failed.")