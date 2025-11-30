#!/usr/bin/env python3
"""
Database Tables Listing Script
==============================

This script connects to the database and lists all tables with detailed information.
It helps verify table existence and compare with expected tables.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.parse as urlparse
from typing import List, Dict, Any
import argparse
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

def get_database_connection(database_name: str = None):
    """
    Get database connection using environment variables.
    
    Args:
        database_name: Specific database name to connect to (optional)
    """
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")

    # Parse DATABASE_URL
    parsed = urlparse.urlparse(database_url)
    db_name = database_name or parsed.path[1:]  # Remove leading slash
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        database=db_name
    )

def get_database_info(database_name: str = None) -> Dict[str, Any]:
    """Get basic database information."""
    try:
        conn = get_database_connection(database_name)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get database name
        cursor.execute("SELECT current_database();")
        current_db = cursor.fetchone()[0]
        
        # Get PostgreSQL version
        cursor.execute("SELECT version();")
        pg_version = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {
            'database_name': current_db,
            'postgresql_version': pg_version,
            'connection_successful': True
        }
    except Exception as e:
        return {
            'database_name': database_name or 'unknown',
            'error': str(e),
            'connection_successful': False
        }

def list_all_tables(database_name: str = None) -> List[Dict[str, Any]]:
    """
    Get detailed information about all tables in the database.
    
    Returns:
        List of dictionaries containing table information
    """
    try:
        conn = get_database_connection(database_name)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query for all tables with detailed information
        query = """
        SELECT 
            t.table_name,
            t.table_schema,
            t.table_type,
            c.column_count,
            COALESCE(s.n_tup_ins, 0) as estimated_row_count,
            obj_description(pgc.oid) as table_comment
        FROM information_schema.tables t
        LEFT JOIN (
            SELECT 
                table_name, 
                COUNT(*) as column_count
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            GROUP BY table_name
        ) c ON t.table_name = c.table_name
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        LEFT JOIN pg_class pgc ON pgc.relname = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name;
        """
        
        cursor.execute(query)
        tables = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(table) for table in tables]
        
    except Exception as e:
        print(f"Error fetching tables: {e}")
        return []

def get_expected_tables() -> List[str]:
    """Get the list of expected tables from the onboarding router."""
    return [
        "app_states",
        "batch_job_stats", 
        "clients_details",
        "clients_info",
        "customer_feedback",
        "deals",
        "email_access_permissions",
        "email_sync_state",
        "employee_client_links",
        "employee_client_notes",
        "employee_info",
        "employee_performance",
        "enrichment_history",
        "events",
        "interaction_details",
        "interaction_summaries",
        "lead_activity_log",
        "lead_emails",
        "lead_personnel",
        "lead_status_history",
        "leads",
        "pending_leads",
        "personnel",
        "sales_data",
        "scraping_sessions",
        "scraping_step_logs",
        "sessions",
        "user_states",
        "yellowpages_search_history"
    ]

def compare_tables(actual_tables: List[str], expected_tables: List[str]) -> Dict[str, Any]:
    """Compare actual vs expected tables."""
    actual_set = set(actual_tables)
    expected_set = set(expected_tables)
    
    return {
        'total_expected': len(expected_tables),
        'total_actual': len(actual_tables),
        'missing_tables': sorted(list(expected_set - actual_set)),
        'extra_tables': sorted(list(actual_set - expected_set)),
        'matching_tables': sorted(list(actual_set & expected_set)),
        'completion_percentage': (len(actual_set & expected_set) / len(expected_set) * 100) if expected_set else 0
    }

def print_table_summary(tables: List[Dict[str, Any]], database_info: Dict[str, Any]):
    """Print a formatted summary of tables."""
    print("=" * 80)
    print(f"DATABASE TABLE ANALYSIS - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    if not database_info['connection_successful']:
        print(f"[ERROR] CONNECTION FAILED: {database_info.get('error', 'Unknown error')}")
        return
    
    print(f"[DB] Database: {database_info['database_name']}")
    print(f"[PG] PostgreSQL: {database_info['postgresql_version'][:50]}...")
    print()
    
    if not tables:
        print("[WARN] No tables found in the database!")
        return
    
    print(f"[TABLES] Found {len(tables)} tables:")
    print("-" * 80)
    print(f"{'Table Name':<30} {'Columns':<8} {'Est. Rows':<12} {'Comment':<20}")
    print("-" * 80)
    
    for table in tables:
        table_name = table['table_name'][:29]
        column_count = table.get('column_count', 0) or 0
        row_count = table.get('estimated_row_count', 0) or 0
        comment = (table.get('table_comment', '') or '')[:19]
        
        print(f"{table_name:<30} {column_count:<8} {row_count:<12} {comment:<20}")
    
    print("-" * 80)

def print_comparison_analysis(comparison: Dict[str, Any]):
    """Print comparison analysis between actual and expected tables."""
    print("\n" + "=" * 80)
    print("EXPECTED VS ACTUAL TABLES COMPARISON")
    print("=" * 80)
    
    print(f"[STATS] Total Expected: {comparison['total_expected']}")
    print(f"[STATS] Total Actual: {comparison['total_actual']}")
    print(f"[MATCH] Matching: {len(comparison['matching_tables'])}")
    print(f"[MISS] Missing: {len(comparison['missing_tables'])}")
    print(f"[EXTRA] Extra: {len(comparison['extra_tables'])}")
    print(f"[PCT] Completion: {comparison['completion_percentage']:.1f}%")
    
    if comparison['missing_tables']:
        print(f"\n[MISSING] Missing Tables ({len(comparison['missing_tables'])}):")
        for i, table in enumerate(comparison['missing_tables'], 1):
            print(f"   {i:2d}. {table}")
    
    if comparison['extra_tables']:
        print(f"\n[EXTRA] Extra Tables ({len(comparison['extra_tables'])}):")
        for i, table in enumerate(comparison['extra_tables'], 1):
            print(f"   {i:2d}. {table}")
    
    if comparison['matching_tables']:
        print(f"\n[MATCH] Matching Tables ({len(comparison['matching_tables'])}):")
        for i, table in enumerate(comparison['matching_tables'], 1):
            print(f"   {i:2d}. {table}")

def main():
    """Main function to run the table analysis."""
    parser = argparse.ArgumentParser(description='List and analyze database tables')
    parser.add_argument('--database', '-d', 
                       help='Specific database name to connect to')
    parser.add_argument('--compare', '-c', action='store_true',
                       help='Compare with expected tables list')
    parser.add_argument('--simple', '-s', action='store_true',
                       help='Simple table names only output')
    
    args = parser.parse_args()
    
    try:
        # Get database info
        database_info = get_database_info(args.database)
        
        if not database_info['connection_successful']:
            print(f"[ERROR] Failed to connect to database: {database_info.get('error')}")
            return 1
        
        # Get table information
        tables = list_all_tables(args.database)
        table_names = [table['table_name'] for table in tables]
        
        if args.simple:
            # Simple output - just table names
            for table_name in sorted(table_names):
                print(table_name)
        else:
            # Detailed output
            print_table_summary(tables, database_info)
            
            if args.compare:
                expected_tables = get_expected_tables()
                comparison = compare_tables(table_names, expected_tables)
                print_comparison_analysis(comparison)
        
        return 0
        
    except Exception as e:
        print(f"[ERROR] Error running table analysis: {e}")
        return 1

if __name__ == "__main__":
    exit(main())