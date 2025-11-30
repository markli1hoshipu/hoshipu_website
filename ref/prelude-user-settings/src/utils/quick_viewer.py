#!/usr/bin/env python3
"""
Quick Viewer for Team Invitations Database
"""

import sys
from database_reader import DatabaseReader

def show_menu():
    """Show available options."""
    print("\n" + "="*60)
    print(" TEAM INVITATIONS DATABASE QUICK VIEWER")
    print("="*60)
    print("\nUsage: python quick_viewer.py [option]")
    print("\nOptions:")
    print("  tables    - Show all tables with row counts")
    print("  users     - Show all users")
    print("  companies - Show companies summary")
    print("  database  - Show database usage by table")
    print("  email <email> - Get specific user by email")
    print("  company <name> - Get users from specific company")
    print("\nExample: python quick_viewer.py users")

def main():
    """Main function."""
    if len(sys.argv) < 2:
        show_menu()
        return
    
    command = sys.argv[1].lower()
    reader = DatabaseReader()
    
    try:
        if command == "tables":
            tables = reader.get_all_tables()
            print(f"\nTables in database ({len(tables)}):")
            print("="*60)
            for i, table in enumerate(tables, 1):
                count = reader.get_table_row_count(table)
                print(f"  {i}. {table} ({count} rows)")
        
        elif command == "users":
            users = reader.get_all_users(limit=None)
            total_count = reader.get_table_row_count('user_profiles')
            print(f"\nAll Users ({len(users)} of {total_count} total)")
            print("="*60)
            for user in users:
                print(f"  - {user['email']} | {user['name']} | {user['company']} | {user['role']}")
        
        elif command == "companies":
            companies = reader.get_companies()
            print(f"\nCompanies Summary ({len(companies)} companies)")
            print("="*60)
            for company in companies:
                print(f"  - {company['company']}: {company['user_count']} users")
        
        elif command == "database":
            db_usage = reader.get_database_usage()
            print(f"\nDatabase Usage by Table")
            print("="*60)
            for usage in db_usage:
                print(f"  - {usage['db_name']}: {usage['user_count']} users")
        
        elif command == "email" and len(sys.argv) > 2:
            email = sys.argv[2]
            user = reader.get_user_by_email(email)
            if user:
                print(f"\nUser Details for '{email}'")
                print("="*60)
                for key, value in user.items():
                    print(f"  {key}: {value}")
            else:
                print(f"ERROR: User '{email}' not found")
        
        elif command == "company" and len(sys.argv) > 2:
            company = " ".join(sys.argv[2:])
            users = reader.get_users_by_company(company)
            print(f"\nUsers from '{company}' ({len(users)} users)")
            print("="*60)
            for user in users:
                print(f"  - {user['email']} | {user['name']} | {user['role']}")
        
        else:
            print(f"ERROR: Unknown command '{command}'")
            show_menu()
    
    except Exception as e:
        print(f"ERROR: {e}")
    
    finally:
        reader.close()

if __name__ == "__main__":
    main()