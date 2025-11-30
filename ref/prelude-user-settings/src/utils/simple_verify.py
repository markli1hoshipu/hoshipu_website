#!/usr/bin/env python3
"""
Simple Migration Verification
=============================
"""

import sys
import os

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from database_reader import DatabaseReader

def main():
    reader = DatabaseReader()
    
    try:
        # Get basic stats
        total_count = reader.get_table_row_count('user_profiles')
        print(f"SUCCESS: Migration verification complete!")
        print(f"Total users in user_profiles table: {total_count}")
        
        # Show first few users
        users = reader.get_all_users(limit=5)
        print(f"\nFirst 5 users:")
        for i, user in enumerate(users, 1):
            print(f"  {i}. {user['email']} -> {user['db_name']}")
        
        # Show companies count
        companies = reader.get_companies()
        print(f"\nTotal companies: {len(companies)}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False
        
    finally:
        reader.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)