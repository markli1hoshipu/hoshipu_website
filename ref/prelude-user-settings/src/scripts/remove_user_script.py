#!/usr/bin/env python3
"""
Remove User Script for Team Invitations Database
===============================================

Script to safely remove users/rows from the user_profiles table.
Supports single deletion, bulk operations, filtering, and backup before deletion.
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

class UserRemover:
    """Database user removal with safety features."""

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
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        query = "SELECT * FROM user_profiles WHERE email = %s"
        results = self.execute_query(query, (email,))
        return results[0] if results else None
    
    def user_exists(self, email: str) -> bool:
        """Check if user exists."""
        return self.get_user_by_email(email) is not None
    
    def search_users(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search users by various criteria."""
        where_clauses = []
        params = []
        
        for field, value in criteria.items():
            if value and field in ['email', 'name', 'company', 'role', 'db_name']:
                if field in ['email', 'name', 'company', 'role']:
                    # Use ILIKE for partial matching on text fields
                    where_clauses.append(f"{field} ILIKE %s")
                    params.append(f"%{value}%")
                else:
                    # Exact match for db_name
                    where_clauses.append(f"{field} = %s")
                    params.append(value)
        
        if not where_clauses:
            query = "SELECT * FROM user_profiles ORDER BY company, email"
            params = []
        else:
            query = f"SELECT * FROM user_profiles WHERE {' AND '.join(where_clauses)} ORDER BY company, email"
        
        return self.execute_query(query, tuple(params))
    
    def get_users_by_company(self, company: str) -> List[Dict[str, Any]]:
        """Get all users by company."""
        query = "SELECT * FROM user_profiles WHERE company ILIKE %s ORDER BY email"
        return self.execute_query(query, (f"%{company}%",))
    
    def get_users_by_role(self, role: str) -> List[Dict[str, Any]]:
        """Get all users by role."""
        query = "SELECT * FROM user_profiles WHERE role ILIKE %s ORDER BY company, email"
        return self.execute_query(query, (f"%{role}%",))
    
    def get_users_by_database(self, db_name: str) -> List[Dict[str, Any]]:
        """Get all users by database."""
        query = "SELECT * FROM user_profiles WHERE db_name = %s ORDER BY company, email"
        return self.execute_query(query, (db_name,))
    
    def backup_user(self, email: str, backup_file: str = None) -> bool:
        """Backup a user before deletion."""
        try:
            user = self.get_user_by_email(email)
            if not user:
                logger.error(f"ERROR: User '{email}' not found for backup")
                return False
            
            if not backup_file:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                safe_email = email.replace('@', '_at_').replace('.', '_')
                backup_file = f"backup_user_{safe_email}_{timestamp}.json"
            
            # Convert datetime objects to strings
            backup_data = {}
            for key, value in user.items():
                if isinstance(value, datetime):
                    backup_data[key] = value.isoformat()
                else:
                    backup_data[key] = value
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"SUCCESS: User backed up to {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"ERROR: Failed to backup user: {e}")
            return False
    
    def backup_users(self, users: List[Dict[str, Any]], backup_file: str = None) -> bool:
        """Backup multiple users before deletion."""
        try:
            if not users:
                logger.warning("WARNING: No users to backup")
                return False
            
            if not backup_file:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_file = f"backup_users_{len(users)}_users_{timestamp}.json"
            
            # Convert datetime objects to strings
            backup_data = []
            for user in users:
                user_data = {}
                for key, value in user.items():
                    if isinstance(value, datetime):
                        user_data[key] = value.isoformat()
                    else:
                        user_data[key] = value
                backup_data.append(user_data)
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"SUCCESS: {len(users)} users backed up to {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"ERROR: Failed to backup users: {e}")
            return False
    
    def remove_user(self, email: str, backup: bool = True, dry_run: bool = False) -> bool:
        """Remove a single user from the database."""
        try:
            # Check if user exists
            user = self.get_user_by_email(email)
            if not user:
                logger.warning(f"WARNING: User '{email}' does not exist")
                return False
            
            # Backup user before deletion
            if backup and not dry_run:
                if not self.backup_user(email):
                    logger.error("ERROR: Backup failed, aborting deletion")
                    return False
            
            query = "DELETE FROM user_profiles WHERE email = %s"
            
            logger.info(f"SQL Query: {query}")
            logger.info(f"Parameters: ({email},)")
            
            if dry_run:
                logger.info("DRY RUN: User would be deleted with the above query")
                return True
            
            # Execute the query
            self.execute_query(query, (email,), commit=True)
            logger.info(f"SUCCESS: User '{email}' removed successfully")
            
            # Verify deletion
            if not self.user_exists(email):
                logger.info(f"VERIFIED: User '{email}' no longer exists in database")
                return True
            else:
                logger.error(f"ERROR: User '{email}' still exists after deletion attempt")
                return False
                
        except Exception as e:
            logger.error(f"ERROR: Failed to remove user: {e}")
            return False
    
    def remove_users_by_criteria(self, criteria: Dict[str, Any], backup: bool = True, dry_run: bool = False) -> tuple[int, int]:
        """Remove multiple users based on criteria."""
        try:
            # Find users matching criteria
            users = self.search_users(criteria)
            
            if not users:
                logger.warning("WARNING: No users found matching criteria")
                return 0, 0
            
            logger.info(f"INFO: Found {len(users)} users matching criteria")
            
            # Show users to be deleted
            print(f"\nUsers to be deleted ({len(users)}):")
            for i, user in enumerate(users, 1):
                print(f"  {i}. {user['email']} - {user.get('name', 'No name')} ({user.get('company', 'No company')})")
            
            if not dry_run:
                # Backup users before deletion
                if backup:
                    if not self.backup_users(users):
                        logger.error("ERROR: Backup failed, aborting bulk deletion")
                        return 0, len(users)
            
            # Build WHERE clause
            where_clauses = []
            params = []
            
            for field, value in criteria.items():
                if value and field in ['email', 'name', 'company', 'role', 'db_name']:
                    if field in ['email', 'name', 'company', 'role']:
                        where_clauses.append(f"{field} ILIKE %s")
                        params.append(f"%{value}%")
                    else:
                        where_clauses.append(f"{field} = %s")
                        params.append(value)
            
            if not where_clauses:
                logger.error("ERROR: No valid criteria provided")
                return 0, len(users)
            
            query = f"DELETE FROM user_profiles WHERE {' AND '.join(where_clauses)}"
            
            logger.info(f"SQL Query: {query}")
            logger.info(f"Parameters: {params}")
            
            if dry_run:
                logger.info(f"DRY RUN: {len(users)} users would be deleted with the above query")
                return len(users), 0
            
            # Execute deletion
            self.execute_query(query, tuple(params), commit=True)
            
            # Verify deletions
            remaining_users = self.search_users(criteria)
            deleted_count = len(users) - len(remaining_users)
            
            logger.info(f"SUCCESS: {deleted_count} users removed successfully")
            
            if remaining_users:
                logger.warning(f"WARNING: {len(remaining_users)} users still exist (may not have matched exact criteria)")
            
            return deleted_count, len(remaining_users)
                
        except Exception as e:
            logger.error(f"ERROR: Failed to remove users: {e}")
            return 0, len(users) if 'users' in locals() else 0
    
    def remove_users_from_list(self, emails: List[str], backup: bool = True, dry_run: bool = False) -> tuple[int, int]:
        """Remove multiple users by email list."""
        if not emails:
            logger.warning("WARNING: No emails provided")
            return 0, 0
        
        logger.info(f"INFO: Processing {len(emails)} emails for deletion")
        
        # Find existing users
        existing_users = []
        missing_emails = []
        
        for email in emails:
            user = self.get_user_by_email(email)
            if user:
                existing_users.append(user)
            else:
                missing_emails.append(email)
        
        if missing_emails:
            logger.warning(f"WARNING: {len(missing_emails)} emails not found in database:")
            for email in missing_emails:
                logger.warning(f"  - {email}")
        
        if not existing_users:
            logger.warning("WARNING: No valid users found for deletion")
            return 0, len(missing_emails)
        
        logger.info(f"INFO: Found {len(existing_users)} existing users to delete")
        
        # Show users to be deleted
        print(f"\nUsers to be deleted ({len(existing_users)}):")
        for i, user in enumerate(existing_users, 1):
            print(f"  {i}. {user['email']} - {user.get('name', 'No name')} ({user.get('company', 'No company')})")
        
        if not dry_run:
            # Backup users
            if backup:
                if not self.backup_users(existing_users):
                    logger.error("ERROR: Backup failed, aborting deletion")
                    return 0, len(emails)
        
        # Delete users one by one for better error handling
        success_count = 0
        error_count = 0
        
        for user in existing_users:
            email = user['email']
            
            try:
                query = "DELETE FROM user_profiles WHERE email = %s"
                
                if dry_run:
                    logger.info(f"DRY RUN: Would delete {email}")
                    success_count += 1
                else:
                    self.execute_query(query, (email,), commit=True)
                    
                    # Verify deletion
                    if not self.user_exists(email):
                        success_count += 1
                        logger.info(f"SUCCESS: Deleted {email}")
                    else:
                        error_count += 1
                        logger.error(f"ERROR: Failed to delete {email} (still exists)")
                        
            except Exception as e:
                error_count += 1
                logger.error(f"ERROR: Failed to delete {email}: {e}")
        
        logger.info(f"SUMMARY: Successfully deleted {success_count}/{len(existing_users)} users, {error_count} errors")
        return success_count, error_count + len(missing_emails)
    
    def get_deletion_stats(self) -> Dict[str, Any]:
        """Get statistics useful for deletion decisions."""
        stats = {}
        
        # Total users
        total_query = "SELECT COUNT(*) as count FROM user_profiles"
        result = self.execute_query(total_query)
        stats['total_users'] = result[0]['count'] if result else 0
        
        # Users without company
        no_company_query = "SELECT COUNT(*) as count FROM user_profiles WHERE company IS NULL OR company = ''"
        result = self.execute_query(no_company_query)
        stats['users_without_company'] = result[0]['count'] if result else 0
        
        # Users without role
        no_role_query = "SELECT COUNT(*) as count FROM user_profiles WHERE role IS NULL OR role = ''"
        result = self.execute_query(no_role_query)
        stats['users_without_role'] = result[0]['count'] if result else 0
        
        # Duplicate companies
        dup_companies_query = """
            SELECT company, COUNT(*) as count 
            FROM user_profiles 
            WHERE company IS NOT NULL AND company != ''
            GROUP BY company 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """
        stats['duplicate_companies'] = self.execute_query(dup_companies_query)
        
        # Recent vs old users
        recent_query = "SELECT COUNT(*) as count FROM user_profiles WHERE created_at >= NOW() - INTERVAL '30 days'"
        result = self.execute_query(recent_query)
        stats['recent_users'] = result[0]['count'] if result else 0
        
        old_query = "SELECT COUNT(*) as count FROM user_profiles WHERE created_at < NOW() - INTERVAL '365 days'"
        result = self.execute_query(old_query)
        stats['old_users'] = result[0]['count'] if result else 0
        
        return stats
    
    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed.")

def main():
    """Main interactive function."""
    remover = UserRemover()
    
    try:
        while True:
            print("\n" + "="*70)
            print(" DATABASE USER REMOVER")
            print("="*70)
            print("1. Remove single user by email")
            print("2. Remove users by company")
            print("3. Remove users by role")
            print("4. Remove users by database")
            print("5. Remove users from email list")
            print("6. Remove users by custom criteria")
            print("7. View deletion statistics")
            print("8. Search users (preview before deletion)")
            print("9. Remove test/demo users")
            print("10. Remove users without company/role")
            print("0. Exit")
            print("-"*70)
            print("NOTE: All operations include backup by default")
            
            choice = input("Enter your choice (0-10): ").strip()
            
            if choice == '0':
                break
            
            elif choice == '1':
                email = input("Enter email to remove: ").strip()
                if not email:
                    continue
                
                # Show user info
                user = remover.get_user_by_email(email)
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
                
                dry_run = input("Dry run first? (Y/n): ").strip().lower() != 'n'
                
                if dry_run:
                    remover.remove_user(email, backup=True, dry_run=True)
                    
                    final_confirm = input("Execute for real? (yes/no): ").strip().lower()
                    if final_confirm == 'yes':
                        remover.remove_user(email, backup=True, dry_run=False)
                else:
                    confirm2 = input(f"Type the email '{email}' to confirm: ").strip()
                    if confirm2 == email:
                        remover.remove_user(email, backup=True, dry_run=False)
                    else:
                        print("Confirmation failed. Operation cancelled.")
            
            elif choice == '2':
                company = input("Enter company name (partial match): ").strip()
                if not company:
                    continue
                
                users = remover.get_users_by_company(company)
                if not users:
                    print(f"No users found for company '{company}'")
                    continue
                
                print(f"\nFound {len(users)} users for company '{company}':")
                for i, user in enumerate(users[:10], 1):  # Show first 10
                    print(f"  {i}. {user['email']} - {user.get('name', 'No name')}")
                if len(users) > 10:
                    print(f"  ... and {len(users) - 10} more")
                
                confirm = input(f"\nDelete all {len(users)} users? (yes/no): ").strip().lower()
                if confirm == 'yes':
                    criteria = {'company': company}
                    remover.remove_users_by_criteria(criteria, backup=True, dry_run=False)
            
            elif choice == '3':
                role = input("Enter role (partial match): ").strip()
                if not role:
                    continue
                
                users = remover.get_users_by_role(role)
                if not users:
                    print(f"No users found with role '{role}'")
                    continue
                
                print(f"\nFound {len(users)} users with role '{role}':")
                for i, user in enumerate(users[:10], 1):
                    print(f"  {i}. {user['email']} - {user.get('company', 'No company')}")
                if len(users) > 10:
                    print(f"  ... and {len(users) - 10} more")
                
                confirm = input(f"\nDelete all {len(users)} users? (yes/no): ").strip().lower()
                if confirm == 'yes':
                    criteria = {'role': role}
                    remover.remove_users_by_criteria(criteria, backup=True, dry_run=False)
            
            elif choice == '4':
                db_name = input("Enter database name: ").strip()
                if not db_name:
                    continue
                
                users = remover.get_users_by_database(db_name)
                if not users:
                    print(f"No users found for database '{db_name}'")
                    continue
                
                print(f"\nFound {len(users)} users for database '{db_name}':")
                for i, user in enumerate(users[:10], 1):
                    print(f"  {i}. {user['email']} - {user.get('company', 'No company')}")
                if len(users) > 10:
                    print(f"  ... and {len(users) - 10} more")
                
                confirm = input(f"\nDelete all {len(users)} users? (yes/no): ").strip().lower()
                if confirm == 'yes':
                    criteria = {'db_name': db_name}
                    remover.remove_users_by_criteria(criteria, backup=True, dry_run=False)
            
            elif choice == '5':
                print("Enter email addresses to remove (one per line, empty line to finish):")
                emails = []
                while True:
                    email = input().strip()
                    if not email:
                        break
                    emails.append(email)
                
                if emails:
                    print(f"\nWill attempt to remove {len(emails)} emails")
                    dry_run = input("Dry run first? (Y/n): ").strip().lower() != 'n'
                    
                    if dry_run:
                        remover.remove_users_from_list(emails, backup=True, dry_run=True)
                        
                        confirm = input("Execute for real? (yes/no): ").strip().lower()
                        if confirm == 'yes':
                            remover.remove_users_from_list(emails, backup=True, dry_run=False)
                    else:
                        confirm = input("Are you sure? (yes/no): ").strip().lower()
                        if confirm == 'yes':
                            remover.remove_users_from_list(emails, backup=True, dry_run=False)
            
            elif choice == '6':
                print("Custom criteria (leave empty to skip):")
                criteria = {}
                
                email_pattern = input("Email pattern: ").strip()
                if email_pattern: criteria['email'] = email_pattern
                
                name_pattern = input("Name pattern: ").strip()
                if name_pattern: criteria['name'] = name_pattern
                
                company_pattern = input("Company pattern: ").strip()
                if company_pattern: criteria['company'] = company_pattern
                
                role_pattern = input("Role pattern: ").strip()
                if role_pattern: criteria['role'] = role_pattern
                
                db_pattern = input("Database name: ").strip()
                if db_pattern: criteria['db_name'] = db_pattern
                
                if criteria:
                    users = remover.search_users(criteria)
                    if users:
                        print(f"\nFound {len(users)} users matching criteria:")
                        for i, user in enumerate(users[:10], 1):
                            print(f"  {i}. {user['email']} - {user.get('company', 'No company')}")
                        if len(users) > 10:
                            print(f"  ... and {len(users) - 10} more")
                        
                        confirm = input(f"\nDelete all {len(users)} users? (yes/no): ").strip().lower()
                        if confirm == 'yes':
                            remover.remove_users_by_criteria(criteria, backup=True, dry_run=False)
                    else:
                        print("No users found matching criteria")
                else:
                    print("No criteria provided")
            
            elif choice == '7':
                stats = remover.get_deletion_stats()
                
                print(f"\nDeletion Statistics:")
                print(f"Total Users: {stats['total_users']}")
                print(f"Users without company: {stats['users_without_company']}")
                print(f"Users without role: {stats['users_without_role']}")
                print(f"Recent users (30 days): {stats['recent_users']}")
                print(f"Old users (1+ years): {stats['old_users']}")
                
                if stats['duplicate_companies']:
                    print(f"\nCompanies with multiple users:")
                    for item in stats['duplicate_companies'][:10]:
                        print(f"  {item['company']}: {item['count']} users")
            
            elif choice == '8':
                print("Search users (preview before deletion):")
                email_pattern = input("Email pattern (optional): ").strip()
                company_pattern = input("Company pattern (optional): ").strip()
                role_pattern = input("Role pattern (optional): ").strip()
                
                criteria = {}
                if email_pattern: criteria['email'] = email_pattern
                if company_pattern: criteria['company'] = company_pattern
                if role_pattern: criteria['role'] = role_pattern
                
                users = remover.search_users(criteria)
                
                print(f"\nFound {len(users)} users:")
                for i, user in enumerate(users[:20], 1):  # Show first 20
                    print(f"  {i}. {user['email']} - {user.get('name', 'No name')} ({user.get('company', 'No company')}) [{user.get('role', 'No role')}]")
                if len(users) > 20:
                    print(f"  ... and {len(users) - 20} more")
            
            elif choice == '9':
                print("Remove test/demo users:")
                print("1. All users with 'test' in email")
                print("2. All users with 'demo' in email or company")
                print("3. All users from 'example.com' domain")
                print("4. All users with 'Test Company' or 'Demo Corp'")
                
                test_choice = input("Enter choice (1-4): ").strip()
                
                test_criteria = {
                    '1': {'email': 'test'},
                    '2': {'email': 'demo'},  # Will also search company due to search logic
                    '3': {'email': 'example.com'},
                    '4': {'company': 'Test Company'}
                }
                
                if test_choice in test_criteria:
                    criteria = test_criteria[test_choice]
                    users = remover.search_users(criteria)
                    
                    if users:
                        print(f"\nFound {len(users)} test/demo users:")
                        for i, user in enumerate(users[:10], 1):
                            print(f"  {i}. {user['email']} - {user.get('company', 'No company')}")
                        if len(users) > 10:
                            print(f"  ... and {len(users) - 10} more")
                        
                        confirm = input(f"\nDelete all {len(users)} test/demo users? (yes/no): ").strip().lower()
                        if confirm == 'yes':
                            remover.remove_users_by_criteria(criteria, backup=True, dry_run=False)
                    else:
                        print("No test/demo users found")
            
            elif choice == '10':
                print("Remove users without company/role:")
                print("1. Users without company")
                print("2. Users without role")
                print("3. Users without both company and role")
                
                cleanup_choice = input("Enter choice (1-3): ").strip()
                
                if cleanup_choice == '1':
                    query = "SELECT * FROM user_profiles WHERE company IS NULL OR company = '' ORDER BY email"
                    users = remover.execute_query(query)
                elif cleanup_choice == '2':
                    query = "SELECT * FROM user_profiles WHERE role IS NULL OR role = '' ORDER BY email"
                    users = remover.execute_query(query)
                elif cleanup_choice == '3':
                    query = """
                        SELECT * FROM user_profiles 
                        WHERE (company IS NULL OR company = '') 
                        AND (role IS NULL OR role = '') 
                        ORDER BY email
                    """
                    users = remover.execute_query(query)
                else:
                    continue
                
                if users:
                    print(f"\nFound {len(users)} users to clean up:")
                    for i, user in enumerate(users[:10], 1):
                        print(f"  {i}. {user['email']} - Company: '{user.get('company', '')}' Role: '{user.get('role', '')}'")
                    if len(users) > 10:
                        print(f"  ... and {len(users) - 10} more")
                    
                    confirm = input(f"\nDelete all {len(users)} users? (yes/no): ").strip().lower()
                    if confirm == 'yes':
                        # Extract emails for deletion
                        emails = [user['email'] for user in users]
                        remover.remove_users_from_list(emails, backup=True, dry_run=False)
                else:
                    print("No users found matching cleanup criteria")
            
            else:
                print("ERROR: Invalid choice. Please try again.")
            
            input("\nPress Enter to continue...")
    
    except KeyboardInterrupt:
        print("\n\nExiting...")
    
    finally:
        remover.close()

if __name__ == "__main__":
    print("Database User Remover")
    print("====================")
    print("This script allows you to safely remove users from the user_profiles table.")
    print("All operations include automatic backup before deletion.")
    print("Use dry run mode to preview changes before executing.")
    print()
    
    main()