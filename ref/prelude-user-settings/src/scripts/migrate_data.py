#!/usr/bin/env python3
"""
Data Migration Script
=====================

Migrates data from prelude_user_management.user_informations 
to prelude_user_analytics.user_profiles
"""

import sys
import os

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from database_reader import DatabaseReader

def main():
    """Main migration function."""
    print("Starting data migration...")
    print("Source: prelude_user_management.user_informations")
    print("Target: prelude_user_analytics.user_profiles")
    print("=" * 50)
    
    reader = DatabaseReader()
    
    try:
        # Perform migration
        migrated_count = reader.migrate_data_from_user_management()
        
        if migrated_count > 0:
            print(f"\nSUCCESS: Migration completed! {migrated_count} records migrated.")
            
            # Show current user_profiles count
            total_count = reader.get_table_row_count('user_profiles')
            print(f"INFO: Total records in user_profiles table: {total_count}")
            
            # Show some sample data
            print("\nSample migrated data:")
            users = reader.get_all_users(limit=5)
            for user in users:
                print(f"  - {user['email']} ({user['company']}) -> {user['db_name']}")
            
        else:
            print("\nWARNING: No new records migrated.")
        
        return migrated_count > 0
        
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        return False
        
    finally:
        reader.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)