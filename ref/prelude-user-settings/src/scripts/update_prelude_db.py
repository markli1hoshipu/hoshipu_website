#!/usr/bin/env python3
"""
Quick script to update prelude@preludeos.com db_name to prelude_panacea
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from add_user_script import UserManager

def main():
    """Update prelude@preludeos.com db_name to prelude_panacea"""
    manager = UserManager()

    try:
        email = "prelude@preludeos.com"
        new_db_name = "prelude_panacea"

        print(f"\nUpdating {email} database to {new_db_name}...")

        # Check if user exists
        user = manager.get_user_by_email(email)
        if not user:
            print(f"ERROR: User {email} not found in database")
            return

        print(f"\nCurrent user data:")
        print(f"  Email: {user['email']}")
        print(f"  Name: {user.get('name', 'N/A')}")
        print(f"  Company: {user.get('company', 'N/A')}")
        print(f"  Role: {user.get('role', 'N/A')}")
        print(f"  Current DB: {user.get('db_name', 'N/A')}")

        # Update db_name
        updates = {'db_name': new_db_name}

        print(f"\nUpdating db_name to: {new_db_name}")
        success = manager.update_user(email, updates, dry_run=False)

        if success:
            # Verify update
            updated_user = manager.get_user_by_email(email)
            print(f"\nVerified! New db_name: {updated_user.get('db_name', 'N/A')}")
            print("✓ Update completed successfully")
        else:
            print("✗ Update failed")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        manager.close()

if __name__ == "__main__":
    main()
