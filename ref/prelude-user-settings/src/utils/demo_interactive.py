#!/usr/bin/env python3
"""
Demo Interactive Table Selection
=================================

Demonstrates the interactive table selection functionality.
Shows how option 1 now allows selecting a table to view all content.
"""

import sys
import os

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from database_reader import DatabaseReader

def demo_interactive_selection():
    """Demo the interactive table selection."""
    print("Demo: Interactive Table Selection")
    print("=" * 50)
    
    reader = DatabaseReader()
    
    try:
        # Simulate option 1 behavior
        tables = reader.get_all_tables()
        print(f"\nTables in database ({len(tables)}):")
        for i, table in enumerate(tables, 1):
            count = reader.get_table_row_count(table)
            print(f"  {i}. {table} ({count} rows)")
        
        # Simulate selecting table 4 (user_profiles)
        print(f"\nSimulating selection of table 4 (user_profiles)...")
        selected_table = tables[3]  # user_profiles
        print(f"Loading all content from '{selected_table}'...")
        
        # Get all content
        all_content = reader.get_table_content(selected_table, limit=1000)
        total_count = reader.get_table_row_count(selected_table)
        
        print(f"Retrieved {len(all_content)} of {total_count} total records from '{selected_table}'")
        
        # Show formatted results
        print(f"\nAll content from table '{selected_table}' ({len(all_content)} of {total_count} records)")
        print("=" * 80)
        
        if all_content:
            # Show first 10 records in detail
            for i, record in enumerate(all_content[:10], 1):
                print(f"--- Record {i} ---")
                for key, value in record.items():
                    print(f"  {key}: {value}")
                print()
        
        print(f"SUCCESS: Demo completed! The database reader now:")
        print(f"  1. Shows numbered table list")
        print(f"  2. Allows interactive selection")
        print(f"  3. Displays all content from selected table")
        print(f"  4. Handles large datasets efficiently")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Demo failed: {e}")
        return False
        
    finally:
        reader.close()

if __name__ == "__main__":
    success = demo_interactive_selection()
    sys.exit(0 if success else 1)