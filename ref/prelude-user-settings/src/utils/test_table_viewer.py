#!/usr/bin/env python3
"""
Test Table Viewer
==================

Tests the enhanced table viewing functionality.
"""

import sys
import os

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from database_reader import DatabaseReader

def main():
    """Test the table viewing functionality."""
    print("Testing Enhanced Table Viewer")
    print("=" * 40)
    
    reader = DatabaseReader()
    
    try:
        # Test 1: Get all tables
        print("\n1. Getting all tables:")
        tables = reader.get_all_tables()
        print(f"Found {len(tables)} tables:")
        for i, table in enumerate(tables, 1):
            count = reader.get_table_row_count(table)
            print(f"  {i}. {table} ({count} rows)")
        
        # Test 2: Show all content from user_profiles table
        print(f"\n2. Getting all content from 'user_profiles' table:")
        all_content = reader.get_table_content('user_profiles', limit=1000)
        total_count = reader.get_table_row_count('user_profiles')
        
        print(f"Retrieved {len(all_content)} of {total_count} total records")
        print("First 3 records:")
        for i, record in enumerate(all_content[:3], 1):
            print(f"  {i}. {record.get('email', 'N/A')} | {record.get('company', 'N/A')} | {record.get('db_name', 'N/A')}")
        
        # Test 3: Test pagination
        print(f"\n3. Testing pagination (first 5 records):")
        paginated_content = reader.get_table_content('user_profiles', limit=5, offset=0)
        for i, record in enumerate(paginated_content, 1):
            print(f"  {i}. {record.get('email', 'N/A')} | {record.get('company', 'N/A')}")
        
        print(f"\nSUCCESS: All tests passed!")
        return True
        
    except Exception as e:
        print(f"ERROR: Test failed: {e}")
        return False
        
    finally:
        reader.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)