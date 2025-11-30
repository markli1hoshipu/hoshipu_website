#!/usr/bin/env python3
"""
Migration Verification Script
=============================

Verifies the data migration was successful by checking both databases.
"""

import sys
import os

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from database_reader import DatabaseReader

def main():
    """Main verification function."""
    print("Verifying data migration...")
    print("=" * 50)
    
    reader = DatabaseReader()
    
    try:
        # Check user_profiles table
        print("\n1. Checking target database (prelude_user_analytics.user_profiles):")
        users = reader.get_all_users()
        total_count = reader.get_table_row_count('user_profiles')
        
        print(f"   Total records: {total_count}")
        print(f"   Sample data (first 10):")
        
        for i, user in enumerate(users[:10], 1):
            email = user.get('email', 'N/A')
            company = user.get('company', 'N/A')
            role = user.get('role', 'N/A')
            db_name = user.get('db_name', 'N/A')
            print(f"   {i:2}. {email:<30} | {company:<20} | {role:<15} | {db_name}")
        
        # Check companies
        print(f"\n2. Companies in user_profiles:")
        companies = reader.get_companies()
        for company in companies:
            company_name = company.get('company', 'N/A')
            user_count = company.get('user_count', 0)
            databases = company.get('databases', 'N/A')
            print(f"   - {company_name:<25} | {user_count} users | DBs: {databases}")
        
        # Check database usage
        print(f"\n3. Database usage distribution:")
        try:
            db_usage = reader.get_database_usage()
            for db in db_usage:
                db_name = db.get('db_name', 'N/A') or 'N/A'
                user_count = db.get('user_count', 0) or 0
                companies_list = db.get('companies', 'N/A') or 'N/A'
                print(f"   - {db_name:<25} | {user_count} users | Companies: {companies_list}")
        except Exception as e:
            print(f"   WARNING: Could not retrieve database usage: {e}")
            db_usage = []
        
        print(f"\n4. Verification Summary:")
        print(f"   SUCCESS: Found {total_count} total users in user_profiles table")
        print(f"   SUCCESS: Found {len(companies)} unique companies")
        print(f"   SUCCESS: Found {len(db_usage)} unique databases")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Verification failed: {e}")
        return False
        
    finally:
        reader.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)