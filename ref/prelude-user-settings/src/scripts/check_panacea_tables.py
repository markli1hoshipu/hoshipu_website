#!/usr/bin/env python3
"""
Panacea Database Table Check
===========================

A script to check tables specifically in the Panacea database.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.parse as urlparse

def check_panacea_tables():
    """Check tables in the Panacea database."""
    print("=== PANACEA DATABASE TABLE CHECK ===")
    
    database_name = "prelude_panacea"
    
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
        
        # List tables with details
        cursor.execute("""
            SELECT 
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_name = t.table_name AND table_schema = 'public') as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\n[TABLES] Found {len(tables)} tables in Panacea:")
        print("-" * 50)
        print(f"{'Table Name':<30} {'Columns'}")
        print("-" * 50)
        
        for i, (table_name, col_count) in enumerate(tables, 1):
            print(f"{i:2d}. {table_name:<25} {col_count} cols")
        
        # Check if it matches expected tables
        expected_tables = [
            "app_states", "batch_job_stats", "clients_details", "clients_info",
            "customer_feedback", "deals", "email_access_permissions", "email_sync_state",
            "employee_client_links", "employee_client_notes", "employee_info", 
            "employee_performance", "enrichment_history", "events", "interaction_details",
            "interaction_summaries", "lead_activity_log", "lead_emails", "lead_personnel",
            "lead_status_history", "leads", "pending_leads", "personnel", "sales_data",
            "scraping_sessions", "scraping_step_logs", "sessions", "user_states",
            "yellowpages_search_history"
        ]
        
        actual_table_names = [table[0] for table in tables]
        matching_tables = set(actual_table_names) & set(expected_tables)
        missing_tables = set(expected_tables) - set(actual_table_names)
        extra_tables = set(actual_table_names) - set(expected_tables)
        
        print(f"\n=== COMPARISON WITH EXPECTED TABLES ===")
        print(f"Expected tables: {len(expected_tables)}")
        print(f"Actual tables: {len(actual_table_names)}")
        print(f"Matching tables: {len(matching_tables)}")
        print(f"Missing tables: {len(missing_tables)}")
        print(f"Extra tables: {len(extra_tables)}")
        print(f"Completion: {len(matching_tables)/len(expected_tables)*100:.1f}%")
        
        if missing_tables:
            print(f"\n[MISSING] Tables not found in Panacea:")
            for table in sorted(missing_tables):
                print(f"  - {table}")
                
        if extra_tables:
            print(f"\n[EXTRA] Additional tables in Panacea:")
            for table in sorted(extra_tables):
                print(f"  + {table}")
        
        cursor.close()
        conn.close()
        
        return len(tables)
        
    except Exception as e:
        print(f"[ERROR] Failed to connect to Panacea database: {e}")
        return 0

if __name__ == "__main__":
    table_count = check_panacea_tables()
    
    print(f"\n=== SUMMARY ===")
    if table_count > 0:
        print(f"Panacea database has {table_count} tables.")
    else:
        print("Could not access Panacea database or no tables found.")