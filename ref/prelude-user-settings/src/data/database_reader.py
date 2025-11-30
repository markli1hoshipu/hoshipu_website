#!/usr/bin/env python3
"""
Database Reader for Team Invitations Service
===========================================

Utility script to easily read and explore the user_profiles database.
Provides various functions to query and display data from the database.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

class DatabaseReader:
    """Database reader with various query methods."""

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
            print(f"SUCCESS: Connected to database: {self.config['host']}:{self.config['port']}/{self.config['database']}")
        except Exception as e:
            print(f"ERROR: Failed to connect to database: {e}")
            sys.exit(1)
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return results."""
        try:
            cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params or ())
            results = cursor.fetchall()
            cursor.close()
            return [dict(row) for row in results]
        except Exception as e:
            print(f"ERROR: Query failed: {e}")
            return []
    
    def get_all_tables(self) -> List[str]:
        """Get all tables in the database."""
        query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """
        results = self.execute_query(query)
        return [row['table_name'] for row in results]
    
    def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """Get schema information for a table."""
        query = """
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
        """
        return self.execute_query(query, (table_name,))
    
    def get_all_users(self, limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all users from user_profiles table with pagination."""
        query = """
            SELECT email, name, company, role, db_name, created_at, updated_at
            FROM user_profiles
            ORDER BY company, email
        """
        if limit:
            query += f" LIMIT {limit} OFFSET {offset}"
        return self.execute_query(query)
    
    def get_users_by_company(self, company: str) -> List[Dict[str, Any]]:
        """Get users by company."""
        query = """
            SELECT email, name, company, role, db_name, created_at, updated_at
            FROM user_profiles
            WHERE company = %s
            ORDER BY email
        """
        return self.execute_query(query, (company,))
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get specific user by email."""
        query = """
            SELECT email, name, company, role, db_name, created_at, updated_at
            FROM user_profiles
            WHERE email = %s
        """
        results = self.execute_query(query, (email,))
        return results[0] if results else None
    
    def get_companies(self) -> List[Dict[str, Any]]:
        """Get list of companies with user counts."""
        query = """
            SELECT 
                company,
                COUNT(*) as user_count,
                STRING_AGG(DISTINCT role, ', ') as roles,
                STRING_AGG(DISTINCT db_name, ', ') as databases
            FROM user_profiles
            GROUP BY company
            ORDER BY user_count DESC, company
        """
        return self.execute_query(query)
    
    def get_database_usage(self) -> List[Dict[str, Any]]:
        """Get database usage statistics."""
        query = """
            SELECT 
                db_name,
                COUNT(*) as user_count,
                STRING_AGG(DISTINCT company, ', ') as companies
            FROM user_profiles
            WHERE db_name IS NOT NULL
            GROUP BY db_name
            ORDER BY user_count DESC
        """
        return self.execute_query(query)
    
    def search_users(self, search_term: str) -> List[Dict[str, Any]]:
        """Search users by email, name, company, or role."""
        query = """
            SELECT email, name, company, role, db_name, created_at, updated_at
            FROM user_profiles
            WHERE 
                email ILIKE %s OR 
                name ILIKE %s OR 
                company ILIKE %s OR 
                role ILIKE %s
            ORDER BY company, email
        """
        search_pattern = f"%{search_term}%"
        return self.execute_query(query, (search_pattern, search_pattern, search_pattern, search_pattern))
    
    def get_table_row_count(self, table_name: str) -> int:
        """Get row count for a table."""
        query = f"SELECT COUNT(*) as count FROM {table_name}"
        results = self.execute_query(query)
        return results[0]['count'] if results else 0
    
    def get_table_content(self, table_name: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Get table content with pagination. If limit is very large (>500), get all records."""
        if limit >= 500:
            # For large limits, get all records without limit
            query = f"SELECT * FROM {table_name} ORDER BY 1"
        else:
            query = f"SELECT * FROM {table_name} ORDER BY 1 LIMIT {limit} OFFSET {offset}"
        return self.execute_query(query)
    
    def migrate_data_from_user_management(self) -> int:
        """Migrate data from prelude_user_management.user_informations to prelude_user_analytics.user_profiles."""
        try:
            # Connect to source database (prelude_user_management)
            source_config = self.config.copy()
            source_config['database'] = 'prelude_user_management'
            source_conn = psycopg2.connect(**source_config)
            
            print(f"SUCCESS: Connected to source database: prelude_user_management")
            
            # Read data from user_informations table
            source_cursor = source_conn.cursor(cursor_factory=RealDictCursor)
            source_cursor.execute("""
                SELECT id, email, company, role, database_name, level, created_at, updated_at
                FROM user_informations
                ORDER BY id
            """)
            source_data = source_cursor.fetchall()
            source_cursor.close()
            source_conn.close()
            
            print(f"INFO: Found {len(source_data)} records in source database")
            
            if not source_data:
                print("WARNING: No data found in source database")
                return 0
            
            # Insert data into target database (prelude_user_analytics)
            target_cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            
            inserted_count = 0
            updated_count = 0
            
            for row in source_data:
                try:
                    # Check if email already exists in target
                    target_cursor.execute("""
                        SELECT email FROM user_profiles WHERE email = %s
                    """, (row['email'],))
                    
                    existing_user = target_cursor.fetchone()
                    
                    if existing_user:
                        # Update existing record
                        target_cursor.execute("""
                            UPDATE user_profiles 
                            SET name = %s, company = %s, role = %s, db_name = %s, updated_at = %s
                            WHERE email = %s
                        """, (
                            row['email'].split('@')[0],  # Use email prefix as name
                            row['company'],
                            row['role'],
                            row['database_name'],  # map database_name to db_name
                            row['updated_at'],
                            row['email']
                        ))
                        updated_count += 1
                        print(f"SUCCESS: Updated: {row['email']}")
                    else:
                        # Insert new record
                        target_cursor.execute("""
                            INSERT INTO user_profiles (email, name, company, role, db_name, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            row['email'],
                            row['email'].split('@')[0],  # Use email prefix as name
                            row['company'],
                            row['role'],
                            row['database_name'],  # map database_name to db_name
                            row['created_at'],
                            row['updated_at']
                        ))
                        inserted_count += 1
                        print(f"SUCCESS: Migrated: {row['email']}")
                    
                except Exception as e:
                    print(f"ERROR: Failed to migrate {row['email']}: {e}")
                    continue
            
            self.connection.commit()
            target_cursor.close()
            
            print(f"\nINFO: Migration Summary:")
            print(f"   SUCCESS: Inserted: {inserted_count}")
            print(f"   SUCCESS: Updated: {updated_count}")
            print(f"   INFO: Total processed: {len(source_data)}")
            
            return inserted_count + updated_count
            
        except Exception as e:
            print(f"ERROR: Migration failed: {e}")
            if hasattr(self, 'connection'):
                self.connection.rollback()
            return 0
    
    def print_formatted_results(self, results: List[Dict[str, Any]], title: str = "Results"):
        """Print results in a formatted way."""
        print(f"\n{'='*60}")
        print(f" {title}")
        print(f"{'='*60}")
        
        if not results:
            print("No results found.")
            return
        
        print(f"Found {len(results)} record(s):\n")
        
        for i, row in enumerate(results, 1):
            print(f"--- Record {i} ---")
            for key, value in row.items():
                if isinstance(value, datetime):
                    value = value.strftime("%Y-%m-%d %H:%M:%S")
                print(f"  {key}: {value}")
            print()
    
    def export_to_json(self, results: List[Dict[str, Any]], filename: str):
        """Export results to JSON file."""
        # Convert datetime objects to strings for JSON serialization
        json_results = []
        for row in results:
            json_row = {}
            for key, value in row.items():
                if isinstance(value, datetime):
                    json_row[key] = value.isoformat()
                else:
                    json_row[key] = value
            json_results.append(json_row)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(json_results, f, indent=2, ensure_ascii=False)
        
        print(f"SUCCESS: Results exported to: {filename}")
    
    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            print("Database connection closed.")

def main():
    """Main interactive function."""
    reader = DatabaseReader()
    
    try:
        while True:
            print("\n" + "="*60)
            print(" DATABASE READER MENU")
            print("="*60)
            print("1. Show all tables")
            print("2. Show table schema")
            print("3. Show all users")
            print("4. Get users by company")
            print("5. Get user by email")
            print("6. Show companies summary")
            print("7. Show database usage")
            print("8. Search users")
            print("9. Run custom query")
            print("10. Export data to JSON")
            print("11. View table content with pagination")
            print("12. Migrate data from prelude_user_management")
            print("0. Exit")
            print("-"*60)
            
            choice = input("Enter your choice (0-12): ").strip()
            
            if choice == '0':
                break
            elif choice == '1':
                tables = reader.get_all_tables()
                print(f"\nTables in database ({len(tables)}):")
                for i, table in enumerate(tables, 1):
                    count = reader.get_table_row_count(table)
                    print(f"  {i}. {table} ({count} rows)")
                
                # Allow user to select a table to view all content
                print("\nEnter table number to view all content (or press Enter to skip):")
                try:
                    table_choice = input("Table number: ").strip()
                    if table_choice and table_choice.isdigit():
                        table_index = int(table_choice) - 1
                        if 0 <= table_index < len(tables):
                            selected_table = tables[table_index]
                            print(f"\nLoading all content from '{selected_table}'...")
                            
                            # Get all content
                            all_content = reader.get_table_content(selected_table, limit=1000)  # Large limit to get all
                            total_count = reader.get_table_row_count(selected_table)
                            
                            title = f"All content from table '{selected_table}' ({len(all_content)} of {total_count} records)"
                            reader.print_formatted_results(all_content, title)
                        else:
                            print("ERROR: Invalid table number")
                except (ValueError, EOFError):
                    pass  # User pressed Enter or invalid input
            
            elif choice == '2':
                table_name = input("Enter table name: ").strip()
                if table_name:
                    schema = reader.get_table_schema(table_name)
                    reader.print_formatted_results(schema, f"Schema for table '{table_name}'")
            
            elif choice == '3':
                # Get pagination preferences
                try:
                    limit = input("Enter number of records to show (default 20, 0 for all): ").strip()
                    limit = int(limit) if limit and limit != '0' else None
                    offset = 0
                    if limit:
                        offset_input = input("Enter starting record number (default 0): ").strip()
                        offset = int(offset_input) if offset_input else 0
                    
                    users = reader.get_all_users(limit, offset)
                    total_count = reader.get_table_row_count('user_profiles')
                    
                    title = f"Users (showing {len(users)} of {total_count} total)"
                    if limit:
                        title += f" - Records {offset + 1} to {offset + len(users)}"
                    
                    reader.print_formatted_results(users, title)
                except ValueError:
                    print("ERROR: Invalid input. Please enter numbers only.")
            
            elif choice == '4':
                company = input("Enter company name: ").strip()
                if company:
                    users = reader.get_users_by_company(company)
                    reader.print_formatted_results(users, f"Users from '{company}'")
            
            elif choice == '5':
                email = input("Enter email address: ").strip()
                if email:
                    user = reader.get_user_by_email(email)
                    if user:
                        reader.print_formatted_results([user], f"User '{email}'")
                    else:
                        print(f"ERROR: User '{email}' not found")
            
            elif choice == '6':
                companies = reader.get_companies()
                reader.print_formatted_results(companies, "Companies Summary")
            
            elif choice == '7':
                db_usage = reader.get_database_usage()
                reader.print_formatted_results(db_usage, "Database Usage")
            
            elif choice == '8':
                search_term = input("Enter search term: ").strip()
                if search_term:
                    results = reader.search_users(search_term)
                    reader.print_formatted_results(results, f"Search results for '{search_term}'")
            
            elif choice == '9':
                print("Enter your SQL query (press Enter twice to execute):")
                query_lines = []
                while True:
                    line = input()
                    if line.strip() == '' and query_lines:
                        break
                    query_lines.append(line)
                
                query = '\n'.join(query_lines).strip()
                if query:
                    results = reader.execute_query(query)
                    reader.print_formatted_results(results, "Custom Query Results")
            
            elif choice == '10':
                print("Export options:")
                print("1. All users")
                print("2. Companies summary")
                print("3. Database usage")
                
                export_choice = input("Enter export choice (1-3): ").strip()
                if export_choice == '1':
                    users = reader.get_all_users()
                    reader.export_to_json(users, 'all_users.json')
                elif export_choice == '2':
                    companies = reader.get_companies()
                    reader.export_to_json(companies, 'companies_summary.json')
                elif export_choice == '3':
                    db_usage = reader.get_database_usage()
                    reader.export_to_json(db_usage, 'database_usage.json')
            
            elif choice == '11':
                table_name = input("Enter table name: ").strip()
                if table_name:
                    try:
                        limit = input("Enter number of records to show (default 20): ").strip()
                        limit = int(limit) if limit else 20
                        offset_input = input("Enter starting record number (default 0): ").strip()
                        offset = int(offset_input) if offset_input else 0
                        
                        content = reader.get_table_content(table_name, limit, offset)
                        total_count = reader.get_table_row_count(table_name)
                        
                        title = f"Table '{table_name}' (showing {len(content)} of {total_count} total)"
                        title += f" - Records {offset + 1} to {offset + len(content)}"
                        
                        reader.print_formatted_results(content, title)
                    except ValueError:
                        print("ERROR: Invalid input. Please enter numbers only.")
            
            elif choice == '12':
                print("INFO: Starting data migration from prelude_user_management...")
                print("This will copy user_informations -> user_profiles")
                confirm = input("Continue? (y/N): ").strip().lower()
                if confirm == 'y':
                    migrated_count = reader.migrate_data_from_user_management()
                    if migrated_count > 0:
                        print(f"\nSUCCESS: Migration completed! {migrated_count} records migrated.")
                    else:
                        print("\nERROR: Migration failed or no new records to migrate.")
                else:
                    print("Migration cancelled.")
            
            else:
                print("ERROR: Invalid choice. Please try again.")
            
            input("\nPress Enter to continue...")
    
    except KeyboardInterrupt:
        print("\n\nExiting...")
    
    finally:
        reader.close()

if __name__ == "__main__":
    main()