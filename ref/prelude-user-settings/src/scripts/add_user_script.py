#!/usr/bin/env python3
"""
Add User Script for Team Invitations Database
=============================================

Script to safely add new users/emails to the user_profiles table.
Supports single user addition, batch import from CSV/JSON, and validation.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import json
import csv
from datetime import datetime
from typing import Dict, List, Optional, Any
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class UserManager:
    """Database user management with safe operations."""

    def __init__(self):
        """Initialize database connection."""
        self.config = {
            'host': os.getenv('SESSIONS_DB_HOST'),
            'port': int(os.getenv('SESSIONS_DB_PORT', 0)) or None,
            'user': os.getenv('SESSIONS_DB_USER'),
            'password': os.getenv('SESSIONS_DB_PASSWORD'),
            'database': 'prelude_user_analytics'
        }
        self.connection = None
        self.connect()
    
    def connect(self):
        """Connect to the database."""
        try:
            self.connection = psycopg2.connect(**self.config)
            logger.info(f"SUCCESS: Connected to database: {self.config['host']}:{self.config['port']}/{self.config['database']}")
        except Exception as e:
            logger.error(f"ERROR: Failed to connect to database: {e}")
            sys.exit(1)
    
    def execute_query(self, query: str, params: tuple = None, commit: bool = False) -> List[Dict[str, Any]]:
        """Execute a query with optional commit."""
        try:
            cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params or ())
            
            if commit:
                self.connection.commit()
                logger.info("SUCCESS: Changes committed to database")
            
            # For SELECT queries, return results
            if query.strip().upper().startswith('SELECT'):
                results = cursor.fetchall()
                cursor.close()
                return [dict(row) for row in results]
            else:
                cursor.close()
                return []
                
        except Exception as e:
            logger.error(f"ERROR: Query failed: {e}")
            if commit:
                self.connection.rollback()
                logger.info("INFO: Transaction rolled back")
            raise e
    
    def validate_email(self, email: str) -> bool:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def user_exists(self, email: str) -> bool:
        """Check if user already exists."""
        query = "SELECT email FROM user_profiles WHERE email = %s"
        results = self.execute_query(query, (email,))
        return len(results) > 0
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        query = "SELECT * FROM user_profiles WHERE email = %s"
        results = self.execute_query(query, (email,))
        return results[0] if results else None
    
    def validate_user_data(self, user_data: Dict[str, Any]) -> tuple[bool, str]:
        """Validate user data before insertion."""
        # Required fields
        if 'email' not in user_data or not user_data['email']:
            return False, "Email is required"
        
        # Validate email format
        if not self.validate_email(user_data['email']):
            return False, f"Invalid email format: {user_data['email']}"
        
        # Check if user already exists
        if self.user_exists(user_data['email']):
            return False, f"User with email {user_data['email']} already exists"
        
        # Validate company (optional but recommended)
        if 'company' in user_data and user_data['company']:
            if len(user_data['company']) > 255:
                return False, "Company name too long (max 255 characters)"
        
        # Validate role (optional)
        if 'role' in user_data and user_data['role']:
            valid_roles = ['admin', 'user', 'manager', 'viewer', 'editor', 'owner']
            if user_data['role'].lower() not in valid_roles:
                logger.warning(f"WARNING: Role '{user_data['role']}' is not in common roles: {valid_roles}")
        
        # Validate db_name (optional)
        if 'db_name' in user_data and user_data['db_name']:
            if len(user_data['db_name']) > 100:
                return False, "Database name too long (max 100 characters)"
        
        return True, "Valid"
    
    def add_user(self, user_data: Dict[str, Any], dry_run: bool = False) -> bool:
        """Add a single user to the database."""
        try:
            # Validate user data
            is_valid, message = self.validate_user_data(user_data)
            if not is_valid:
                logger.error(f"ERROR: {message}")
                return False
            
            # Prepare user data with defaults
            email = user_data['email']
            name = user_data.get('name', email.split('@')[0])  # Use email prefix if no name
            company = user_data.get('company', '')
            role = user_data.get('role', 'user')
            db_name = user_data.get('db_name', 'postgres')  # Default database
            
            # Build SQL query
            query = """
                INSERT INTO user_profiles (email, name, company, role, db_name, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            current_time = datetime.now()
            params = (email, name, company, role, db_name, current_time, current_time)
            
            logger.info(f"SQL Query: {query}")
            logger.info(f"Parameters: {params}")
            
            if dry_run:
                logger.info("DRY RUN: User would be added with the above query")
                return True
            
            # Execute the query
            self.execute_query(query, params, commit=True)
            logger.info(f"SUCCESS: User '{email}' added successfully")
            
            # Verify the user was added
            if self.user_exists(email):
                logger.info(f"VERIFIED: User '{email}' exists in database")
                return True
            else:
                logger.error(f"ERROR: User '{email}' was not found after addition")
                return False
                
        except Exception as e:
            logger.error(f"ERROR: Failed to add user: {e}")
            return False
    
    def add_multiple_users(self, users: List[Dict[str, Any]], dry_run: bool = False) -> tuple[int, int]:
        """Add multiple users to the database."""
        if not users:
            logger.warning("WARNING: No users provided")
            return 0, 0
        
        logger.info(f"INFO: Adding {len(users)} users to database")
        
        success_count = 0
        error_count = 0
        
        for i, user_data in enumerate(users, 1):
            email = user_data.get('email', f'Unknown-{i}')
            logger.info(f"INFO: Processing user {i}/{len(users)}: {email}")
            
            if self.add_user(user_data, dry_run):
                success_count += 1
            else:
                error_count += 1
                logger.error(f"ERROR: Failed to add user {i}: {email}")
        
        logger.info(f"SUMMARY: Successfully added {success_count}/{len(users)} users, {error_count} errors")
        return success_count, error_count
    
    def update_user(self, email: str, updates: Dict[str, Any], dry_run: bool = False) -> bool:
        """Update an existing user."""
        try:
            # Check if user exists
            if not self.user_exists(email):
                logger.error(f"ERROR: User '{email}' does not exist")
                return False
            
            # Build update query
            set_clauses = []
            params = []
            
            for field, value in updates.items():
                if field != 'email':  # Don't allow email updates
                    set_clauses.append(f"{field} = %s")
                    params.append(value)
            
            if not set_clauses:
                logger.warning("WARNING: No valid fields to update")
                return False
            
            # Add updated_at
            set_clauses.append("updated_at = %s")
            params.append(datetime.now())
            
            # Add email for WHERE clause
            params.append(email)
            
            query = f"UPDATE user_profiles SET {', '.join(set_clauses)} WHERE email = %s"
            
            logger.info(f"SQL Query: {query}")
            logger.info(f"Parameters: {params}")
            
            if dry_run:
                logger.info("DRY RUN: User would be updated with the above query")
                return True
            
            # Execute the query
            self.execute_query(query, tuple(params), commit=True)
            logger.info(f"SUCCESS: User '{email}' updated successfully")
            
            return True
                
        except Exception as e:
            logger.error(f"ERROR: Failed to update user: {e}")
            return False
    
    def delete_user(self, email: str, dry_run: bool = False) -> bool:
        """Delete a user (use with caution)."""
        try:
            # Check if user exists
            if not self.user_exists(email):
                logger.warning(f"WARNING: User '{email}' does not exist")
                return False
            
            query = "DELETE FROM user_profiles WHERE email = %s"
            
            logger.info(f"SQL Query: {query}")
            logger.info(f"Parameters: ({email},)")
            
            if dry_run:
                logger.info("DRY RUN: User would be deleted with the above query")
                return True
            
            # Execute the query
            self.execute_query(query, (email,), commit=True)
            logger.info(f"SUCCESS: User '{email}' deleted successfully")
            
            return True
                
        except Exception as e:
            logger.error(f"ERROR: Failed to delete user: {e}")
            return False
    
    def import_from_csv(self, filename: str) -> List[Dict[str, Any]]:
        """Import users from CSV file."""
        users = []
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row_num, row in enumerate(reader, 1):
                    # Clean up the row data
                    user_data = {k.strip(): v.strip() for k, v in row.items() if v.strip()}
                    
                    if 'email' in user_data:
                        users.append(user_data)
                    else:
                        logger.warning(f"WARNING: Row {row_num} missing email, skipping")
            
            logger.info(f"SUCCESS: Loaded {len(users)} users from CSV file")
            return users
            
        except Exception as e:
            logger.error(f"ERROR: Failed to import from CSV: {e}")
            return []
    
    def import_from_json(self, filename: str) -> List[Dict[str, Any]]:
        """Import users from JSON file."""
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            # Handle both array of users and single user
            if isinstance(data, list):
                users = data
            elif isinstance(data, dict):
                users = [data]
            else:
                logger.error("ERROR: JSON file must contain an array of users or a single user object")
                return []
            
            logger.info(f"SUCCESS: Loaded {len(users)} users from JSON file")
            return users
            
        except Exception as e:
            logger.error(f"ERROR: Failed to import from JSON: {e}")
            return []
    
    def export_to_csv(self, filename: str = 'users_export.csv'):
        """Export all users to CSV."""
        try:
            query = "SELECT email, name, company, role, db_name, created_at, updated_at FROM user_profiles ORDER BY company, email"
            users = self.execute_query(query)
            
            if not users:
                logger.warning("WARNING: No users to export")
                return
            
            with open(filename, 'w', newline='', encoding='utf-8') as file:
                fieldnames = ['email', 'name', 'company', 'role', 'db_name', 'created_at', 'updated_at']
                writer = csv.DictWriter(file, fieldnames=fieldnames)
                
                writer.writeheader()
                for user in users:
                    # Convert datetime objects to strings
                    user_data = {}
                    for key, value in user.items():
                        if isinstance(value, datetime):
                            user_data[key] = value.isoformat()
                        else:
                            user_data[key] = value
                    writer.writerow(user_data)
            
            logger.info(f"SUCCESS: Exported {len(users)} users to {filename}")
            
        except Exception as e:
            logger.error(f"ERROR: Failed to export to CSV: {e}")
    
    def get_user_stats(self):
        """Get user statistics."""
        stats = {}
        
        # Total users
        total_query = "SELECT COUNT(*) as count FROM user_profiles"
        result = self.execute_query(total_query)
        stats['total_users'] = result[0]['count'] if result else 0
        
        # Users by company
        company_query = """
            SELECT company, COUNT(*) as count 
            FROM user_profiles 
            WHERE company IS NOT NULL AND company != ''
            GROUP BY company 
            ORDER BY count DESC
        """
        stats['by_company'] = self.execute_query(company_query)
        
        # Users by role
        role_query = """
            SELECT role, COUNT(*) as count 
            FROM user_profiles 
            WHERE role IS NOT NULL AND role != ''
            GROUP BY role 
            ORDER BY count DESC
        """
        stats['by_role'] = self.execute_query(role_query)
        
        # Users by database
        db_query = """
            SELECT db_name, COUNT(*) as count 
            FROM user_profiles 
            WHERE db_name IS NOT NULL AND db_name != ''
            GROUP BY db_name 
            ORDER BY count DESC
        """
        stats['by_database'] = self.execute_query(db_query)
        
        return stats
    
    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed.")

def main():
    """Main interactive function."""
    manager = UserManager()
    
    try:
        while True:
            print("\n" + "="*70)
            print(" DATABASE USER MANAGER")
            print("="*70)
            print("1. Add single user")
            print("2. Add multiple users (manual entry)")
            print("3. Import users from CSV")
            print("4. Import users from JSON")
            print("5. Update existing user")
            print("6. Delete user (DANGER)")
            print("7. View user statistics")
            print("8. Export users to CSV")
            print("9. Search/view user")
            print("10. Quick add template users")
            print("0. Exit")
            print("-"*70)
            
            choice = input("Enter your choice (0-10): ").strip()
            
            if choice == '0':
                break
            
            elif choice == '1':
                print("\nAdd Single User:")
                email = input("Email (required): ").strip()
                if not email:
                    print("ERROR: Email is required")
                    continue
                
                name = input(f"Name (optional, default: {email.split('@')[0]}): ").strip()
                company = input("Company (optional): ").strip()
                role = input("Role (optional, default: user): ").strip()
                db_name = input("Database name (optional, default: postgres): ").strip()
                
                user_data = {'email': email}
                if name: user_data['name'] = name
                if company: user_data['company'] = company
                if role: user_data['role'] = role
                if db_name: user_data['db_name'] = db_name
                
                dry_run = input("Dry run first? (Y/n): ").strip().lower() != 'n'
                
                if dry_run:
                    manager.add_user(user_data, dry_run=True)
                    
                    confirm = input("Execute for real? (y/N): ").strip().lower()
                    if confirm == 'y':
                        manager.add_user(user_data, dry_run=False)
                else:
                    manager.add_user(user_data, dry_run=False)
            
            elif choice == '2':
                users = []
                print("\nAdd Multiple Users (press Enter with empty email to finish):")
                
                while True:
                    print(f"\n--- User {len(users) + 1} ---")
                    email = input("Email (or Enter to finish): ").strip()
                    if not email:
                        break
                    
                    name = input(f"Name (optional): ").strip()
                    company = input("Company (optional): ").strip()
                    role = input("Role (optional): ").strip()
                    db_name = input("Database name (optional): ").strip()
                    
                    user_data = {'email': email}
                    if name: user_data['name'] = name
                    if company: user_data['company'] = company
                    if role: user_data['role'] = role
                    if db_name: user_data['db_name'] = db_name
                    
                    users.append(user_data)
                
                if users:
                    print(f"\nWill add {len(users)} users:")
                    for user in users:
                        print(f"  - {user['email']} ({user.get('company', 'No company')})")
                    
                    dry_run = input("Dry run first? (Y/n): ").strip().lower() != 'n'
                    
                    if dry_run:
                        manager.add_multiple_users(users, dry_run=True)
                        
                        confirm = input("Execute for real? (y/N): ").strip().lower()
                        if confirm == 'y':
                            manager.add_multiple_users(users, dry_run=False)
                    else:
                        manager.add_multiple_users(users, dry_run=False)
            
            elif choice == '3':
                filename = input("Enter CSV filename: ").strip()
                if os.path.exists(filename):
                    users = manager.import_from_csv(filename)
                    if users:
                        print(f"\nLoaded {len(users)} users from CSV:")
                        for i, user in enumerate(users[:5], 1):  # Show first 5
                            print(f"  {i}. {user.get('email', 'No email')} - {user.get('company', 'No company')}")
                        if len(users) > 5:
                            print(f"  ... and {len(users) - 5} more")
                        
                        confirm = input(f"\nAdd all {len(users)} users? (y/N): ").strip().lower()
                        if confirm == 'y':
                            manager.add_multiple_users(users, dry_run=False)
                else:
                    print(f"ERROR: File '{filename}' not found")
            
            elif choice == '4':
                filename = input("Enter JSON filename: ").strip()
                if os.path.exists(filename):
                    users = manager.import_from_json(filename)
                    if users:
                        print(f"\nLoaded {len(users)} users from JSON:")
                        for i, user in enumerate(users[:5], 1):  # Show first 5
                            print(f"  {i}. {user.get('email', 'No email')} - {user.get('company', 'No company')}")
                        if len(users) > 5:
                            print(f"  ... and {len(users) - 5} more")
                        
                        confirm = input(f"\nAdd all {len(users)} users? (y/N): ").strip().lower()
                        if confirm == 'y':
                            manager.add_multiple_users(users, dry_run=False)
                else:
                    print(f"ERROR: File '{filename}' not found")
            
            elif choice == '5':
                email = input("Enter email of user to update: ").strip()
                if not email:
                    continue
                
                # Show current user data
                user = manager.get_user_by_email(email)
                if not user:
                    print(f"ERROR: User '{email}' not found")
                    continue
                
                print(f"\nCurrent user data for {email}:")
                for key, value in user.items():
                    print(f"  {key}: {value}")
                
                print("\nEnter new values (press Enter to keep current value):")
                updates = {}
                
                for field in ['name', 'company', 'role', 'db_name']:
                    current_value = user.get(field, '')
                    new_value = input(f"{field} (current: {current_value}): ").strip()
                    if new_value and new_value != current_value:
                        updates[field] = new_value
                
                if updates:
                    print(f"\nWill update: {updates}")
                    confirm = input("Proceed? (y/N): ").strip().lower()
                    if confirm == 'y':
                        manager.update_user(email, updates, dry_run=False)
                else:
                    print("No changes to make")
            
            elif choice == '6':
                email = input("Enter email of user to delete: ").strip()
                if not email:
                    continue
                
                # Show user data
                user = manager.get_user_by_email(email)
                if not user:
                    print(f"ERROR: User '{email}' not found")
                    continue
                
                print(f"\nUser to delete:")
                for key, value in user.items():
                    print(f"  {key}: {value}")
                
                print(f"\nWARNING: This will permanently delete user '{email}'!")
                confirm1 = input("Are you sure? (yes/no): ").strip().lower()
                if confirm1 != 'yes':
                    print("Operation cancelled.")
                    continue
                
                confirm2 = input(f"Type the email '{email}' to confirm: ").strip()
                if confirm2 != email:
                    print("Confirmation failed. Operation cancelled.")
                    continue
                
                manager.delete_user(email, dry_run=False)
            
            elif choice == '7':
                stats = manager.get_user_stats()
                
                print(f"\nUser Statistics:")
                print(f"Total Users: {stats['total_users']}")
                
                print("\nBy Company:")
                for item in stats['by_company'][:10]:  # Top 10
                    print(f"  {item['company']}: {item['count']} users")
                
                print("\nBy Role:")
                for item in stats['by_role']:
                    print(f"  {item['role']}: {item['count']} users")
                
                print("\nBy Database:")
                for item in stats['by_database']:
                    print(f"  {item['db_name']}: {item['count']} users")
            
            elif choice == '8':
                filename = input("Enter filename for export (default: users_export.csv): ").strip()
                if not filename:
                    filename = 'users_export.csv'
                
                manager.export_to_csv(filename)
            
            elif choice == '9':
                email = input("Enter email to search: ").strip()
                if email:
                    user = manager.get_user_by_email(email)
                    if user:
                        print(f"\nUser found:")
                        for key, value in user.items():
                            print(f"  {key}: {value}")
                    else:
                        print(f"ERROR: User '{email}' not found")
            
            elif choice == '10':
                print("\nQuick Add Template Users:")
                print("1. Test users (test1@example.com, test2@example.com)")
                print("2. Admin users (admin@company.com)")
                print("3. Demo company users")
                
                template_choice = input("Enter choice (1-3): ").strip()
                
                template_users = {
                    '1': [
                        {'email': 'test1@example.com', 'name': 'Test User 1', 'company': 'Test Company', 'role': 'user'},
                        {'email': 'test2@example.com', 'name': 'Test User 2', 'company': 'Test Company', 'role': 'user'}
                    ],
                    '2': [
                        {'email': 'admin@company.com', 'name': 'Admin User', 'company': 'Your Company', 'role': 'admin'}
                    ],
                    '3': [
                        {'email': 'john@demo.com', 'name': 'John Smith', 'company': 'Demo Corp', 'role': 'manager'},
                        {'email': 'jane@demo.com', 'name': 'Jane Doe', 'company': 'Demo Corp', 'role': 'user'},
                        {'email': 'bob@demo.com', 'name': 'Bob Johnson', 'company': 'Demo Corp', 'role': 'viewer'}
                    ]
                }
                
                if template_choice in template_users:
                    users = template_users[template_choice]
                    
                    print(f"\nWill add {len(users)} template users:")
                    for user in users:
                        print(f"  - {user['email']} ({user['role']} at {user['company']})")
                    
                    confirm = input("\nProceed? (y/N): ").strip().lower()
                    if confirm == 'y':
                        manager.add_multiple_users(users, dry_run=False)
            
            else:
                print("ERROR: Invalid choice. Please try again.")
            
            input("\nPress Enter to continue...")
    
    except KeyboardInterrupt:
        print("\n\nExiting...")
    
    finally:
        manager.close()

if __name__ == "__main__":
    print("Database User Manager")
    print("====================")
    print("This script allows you to safely add/manage users in the user_profiles table.")
    print("Supports single user addition, batch import, and user management operations.")
    print()
    
    main()