#!/usr/bin/env python3
"""
Add Column Script for Team Invitations Database
==============================================

Script to safely add new columns to database tables with proper validation and rollback.
Supports various PostgreSQL data types and constraints.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ColumnManager:
    """Database column management with safe operations."""

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
    
    def get_table_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """Get existing columns for a table."""
        query = """
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns
            WHERE table_name = %s AND table_schema = 'public'
            ORDER BY ordinal_position
        """
        return self.execute_query(query, (table_name,))
    
    def column_exists(self, table_name: str, column_name: str) -> bool:
        """Check if column exists in table."""
        query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s AND table_schema = 'public'
        """
        results = self.execute_query(query, (table_name, column_name))
        return len(results) > 0
    
    def table_exists(self, table_name: str) -> bool:
        """Check if table exists."""
        query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = %s AND table_schema = 'public'
        """
        results = self.execute_query(query, (table_name,))
        return len(results) > 0
    
    def validate_column_definition(self, column_def: Dict[str, Any]) -> bool:
        """Validate column definition before adding."""
        required_fields = ['name', 'type']
        for field in required_fields:
            if field not in column_def:
                logger.error(f"ERROR: Missing required field '{field}' in column definition")
                return False
        
        # Validate column name (basic validation)
        column_name = column_def['name']
        if not column_name.replace('_', '').isalnum():
            logger.error(f"ERROR: Invalid column name '{column_name}'. Use only letters, numbers, and underscores.")
            return False
        
        # Validate data type
        valid_types = [
            'VARCHAR', 'TEXT', 'INTEGER', 'BIGINT', 'SMALLINT', 
            'DECIMAL', 'NUMERIC', 'REAL', 'DOUBLE PRECISION',
            'BOOLEAN', 'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ',
            'JSON', 'JSONB', 'UUID'
        ]
        
        data_type = column_def['type'].upper()
        if not any(data_type.startswith(valid_type) for valid_type in valid_types):
            logger.error(f"ERROR: Invalid data type '{data_type}'. Supported types: {', '.join(valid_types)}")
            return False
        
        return True
    
    def build_add_column_query(self, table_name: str, column_def: Dict[str, Any]) -> str:
        """Build ADD COLUMN SQL query."""
        column_name = column_def['name']
        data_type = column_def['type']
        
        query_parts = [f"ALTER TABLE {table_name} ADD COLUMN {column_name} {data_type}"]
        
        # Add constraints
        if column_def.get('not_null', False):
            query_parts.append("NOT NULL")
        
        if 'default' in column_def:
            default_value = column_def['default']
            if isinstance(default_value, str) and default_value.upper() not in ['NULL', 'CURRENT_TIMESTAMP', 'NOW()']:
                default_value = f"'{default_value}'"
            query_parts.append(f"DEFAULT {default_value}")
        
        if column_def.get('unique', False):
            query_parts.append("UNIQUE")
        
        return " ".join(query_parts)
    
    def add_column(self, table_name: str, column_def: Dict[str, Any], dry_run: bool = False) -> bool:
        """Add a new column to a table."""
        try:
            # Validate inputs
            if not self.table_exists(table_name):
                logger.error(f"ERROR: Table '{table_name}' does not exist")
                return False
            
            if not self.validate_column_definition(column_def):
                return False
            
            column_name = column_def['name']
            
            # Check if column already exists
            if self.column_exists(table_name, column_name):
                logger.warning(f"WARNING: Column '{column_name}' already exists in table '{table_name}'")
                return False
            
            # Build SQL query
            sql_query = self.build_add_column_query(table_name, column_def)
            logger.info(f"SQL Query: {sql_query}")
            
            if dry_run:
                logger.info("DRY RUN: Column would be added with the above query")
                return True
            
            # Execute the query
            self.execute_query(sql_query, commit=True)
            logger.info(f"SUCCESS: Column '{column_name}' added to table '{table_name}'")
            
            # Verify the column was added
            if self.column_exists(table_name, column_name):
                logger.info(f"VERIFIED: Column '{column_name}' exists in table '{table_name}'")
                return True
            else:
                logger.error(f"ERROR: Column '{column_name}' was not found after addition")
                return False
                
        except Exception as e:
            logger.error(f"ERROR: Failed to add column: {e}")
            return False
    
    def add_multiple_columns(self, table_name: str, columns: List[Dict[str, Any]], dry_run: bool = False) -> bool:
        """Add multiple columns to a table."""
        if not columns:
            logger.warning("WARNING: No columns provided")
            return False
        
        logger.info(f"INFO: Adding {len(columns)} columns to table '{table_name}'")
        
        success_count = 0
        for i, column_def in enumerate(columns, 1):
            logger.info(f"INFO: Processing column {i}/{len(columns)}: {column_def.get('name', 'Unknown')}")
            
            if self.add_column(table_name, column_def, dry_run):
                success_count += 1
            else:
                logger.error(f"ERROR: Failed to add column {i}: {column_def.get('name', 'Unknown')}")
        
        logger.info(f"SUMMARY: Successfully added {success_count}/{len(columns)} columns")
        return success_count == len(columns)
    
    def remove_column(self, table_name: str, column_name: str, dry_run: bool = False) -> bool:
        """Remove a column from a table (use with caution)."""
        try:
            # Validate inputs
            if not self.table_exists(table_name):
                logger.error(f"ERROR: Table '{table_name}' does not exist")
                return False
            
            if not self.column_exists(table_name, column_name):
                logger.warning(f"WARNING: Column '{column_name}' does not exist in table '{table_name}'")
                return False
            
            sql_query = f"ALTER TABLE {table_name} DROP COLUMN {column_name}"
            logger.info(f"SQL Query: {sql_query}")
            
            if dry_run:
                logger.info("DRY RUN: Column would be removed with the above query")
                return True
            
            # Show warning
            logger.warning(f"WARNING: This will permanently delete column '{column_name}' and all its data!")
            
            # Execute the query
            self.execute_query(sql_query, commit=True)
            logger.info(f"SUCCESS: Column '{column_name}' removed from table '{table_name}'")
            
            return True
                
        except Exception as e:
            logger.error(f"ERROR: Failed to remove column: {e}")
            return False
    
    def show_table_info(self, table_name: str):
        """Show table structure and sample data."""
        if not self.table_exists(table_name):
            logger.error(f"ERROR: Table '{table_name}' does not exist")
            return
        
        # Get columns
        columns = self.get_table_columns(table_name)
        logger.info(f"\nTable '{table_name}' structure:")
        logger.info("-" * 80)
        logger.info(f"{'Column Name':<20} {'Data Type':<15} {'Nullable':<10} {'Default':<15}")
        logger.info("-" * 80)
        
        for col in columns:
            default = col['column_default'] or 'NULL'
            if len(str(default)) > 14:
                default = str(default)[:11] + '...'
            
            logger.info(f"{col['column_name']:<20} {col['data_type']:<15} {col['is_nullable']:<10} {default:<15}")
        
        # Get row count
        count_query = f"SELECT COUNT(*) as count FROM {table_name}"
        count_result = self.execute_query(count_query)
        row_count = count_result[0]['count'] if count_result else 0
        
        logger.info(f"\nTotal rows: {row_count}")
    
    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed.")

def main():
    """Main interactive function."""
    manager = ColumnManager()
    
    try:
        while True:
            print("\n" + "="*70)
            print(" DATABASE COLUMN MANAGER")
            print("="*70)
            print("1. Show table structure")
            print("2. Add single column")
            print("3. Add multiple columns")
            print("4. Remove column (DANGER)")
            print("5. List all tables")
            print("6. Quick add common columns")
            print("7. Dry run mode (test without changes)")
            print("0. Exit")
            print("-"*70)
            
            choice = input("Enter your choice (0-7): ").strip()
            
            if choice == '0':
                break
            
            elif choice == '1':
                table_name = input("Enter table name: ").strip()
                if table_name:
                    manager.show_table_info(table_name)
            
            elif choice == '2':
                table_name = input("Enter table name: ").strip()
                if not table_name:
                    continue
                
                print("\nColumn Definition:")
                column_name = input("Column name: ").strip()
                if not column_name:
                    continue
                
                print("\nData type examples:")
                print("  VARCHAR(255), TEXT, INTEGER, BIGINT, BOOLEAN")
                print("  DECIMAL(10,2), TIMESTAMP, DATE, JSON, UUID")
                
                data_type = input("Data type: ").strip()
                if not data_type:
                    continue
                
                # Optional constraints
                not_null = input("Not null? (y/N): ").strip().lower() == 'y'
                unique = input("Unique? (y/N): ").strip().lower() == 'y'
                
                default_value = input("Default value (optional, press Enter to skip): ").strip()
                
                column_def = {
                    'name': column_name,
                    'type': data_type,
                    'not_null': not_null,
                    'unique': unique
                }
                
                if default_value:
                    column_def['default'] = default_value
                
                dry_run = input("Dry run first? (Y/n): ").strip().lower() != 'n'
                
                if dry_run:
                    manager.add_column(table_name, column_def, dry_run=True)
                    
                    confirm = input("Execute for real? (y/N): ").strip().lower()
                    if confirm == 'y':
                        manager.add_column(table_name, column_def, dry_run=False)
                else:
                    manager.add_column(table_name, column_def, dry_run=False)
            
            elif choice == '3':
                table_name = input("Enter table name: ").strip()
                if not table_name:
                    continue
                
                columns = []
                print("\nEnter column definitions (press Enter with empty name to finish):")
                
                while True:
                    print(f"\n--- Column {len(columns) + 1} ---")
                    column_name = input("Column name (or Enter to finish): ").strip()
                    if not column_name:
                        break
                    
                    data_type = input("Data type: ").strip()
                    if not data_type:
                        continue
                    
                    not_null = input("Not null? (y/N): ").strip().lower() == 'y'
                    unique = input("Unique? (y/N): ").strip().lower() == 'y'
                    default_value = input("Default value (optional): ").strip()
                    
                    column_def = {
                        'name': column_name,
                        'type': data_type,
                        'not_null': not_null,
                        'unique': unique
                    }
                    
                    if default_value:
                        column_def['default'] = default_value
                    
                    columns.append(column_def)
                
                if columns:
                    dry_run = input("Dry run first? (Y/n): ").strip().lower() != 'n'
                    
                    if dry_run:
                        manager.add_multiple_columns(table_name, columns, dry_run=True)
                        
                        confirm = input("Execute for real? (y/N): ").strip().lower()
                        if confirm == 'y':
                            manager.add_multiple_columns(table_name, columns, dry_run=False)
                    else:
                        manager.add_multiple_columns(table_name, columns, dry_run=False)
            
            elif choice == '4':
                table_name = input("Enter table name: ").strip()
                if not table_name:
                    continue
                
                # Show current columns
                manager.show_table_info(table_name)
                
                column_name = input("\nEnter column name to remove: ").strip()
                if not column_name:
                    continue
                
                print(f"\nWARNING: This will permanently delete column '{column_name}' and ALL its data!")
                confirm1 = input("Are you sure? (yes/no): ").strip().lower()
                if confirm1 != 'yes':
                    print("Operation cancelled.")
                    continue
                
                confirm2 = input(f"Type the column name '{column_name}' to confirm: ").strip()
                if confirm2 != column_name:
                    print("Confirmation failed. Operation cancelled.")
                    continue
                
                dry_run = input("Dry run first? (Y/n): ").strip().lower() != 'n'
                
                if dry_run:
                    manager.remove_column(table_name, column_name, dry_run=True)
                    
                    final_confirm = input("Execute removal for real? (yes/no): ").strip().lower()
                    if final_confirm == 'yes':
                        manager.remove_column(table_name, column_name, dry_run=False)
                else:
                    manager.remove_column(table_name, column_name, dry_run=False)
            
            elif choice == '5':
                query = """
                    SELECT table_name, 
                           (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
                    FROM information_schema.tables t
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """
                tables = manager.execute_query(query)
                
                print(f"\nTables in database ({len(tables)}):")
                print("-" * 40)
                for table in tables:
                    print(f"  {table['table_name']} ({table['column_count']} columns)")
            
            elif choice == '6':
                table_name = input("Enter table name: ").strip()
                if not table_name:
                    continue
                
                print("\nQuick Add Options:")
                print("1. Timestamps (created_at, updated_at)")
                print("2. Status tracking (status, is_active)")
                print("3. User tracking (created_by, updated_by)")
                print("4. Soft delete (deleted_at, is_deleted)")
                print("5. Metadata (metadata JSON, notes TEXT)")
                
                quick_choice = input("Enter choice (1-5): ").strip()
                
                quick_columns = {
                    '1': [
                        {'name': 'created_at', 'type': 'TIMESTAMP', 'default': 'CURRENT_TIMESTAMP'},
                        {'name': 'updated_at', 'type': 'TIMESTAMP', 'default': 'CURRENT_TIMESTAMP'}
                    ],
                    '2': [
                        {'name': 'status', 'type': 'VARCHAR(50)', 'default': 'active'},
                        {'name': 'is_active', 'type': 'BOOLEAN', 'default': 'true'}
                    ],
                    '3': [
                        {'name': 'created_by', 'type': 'VARCHAR(255)'},
                        {'name': 'updated_by', 'type': 'VARCHAR(255)'}
                    ],
                    '4': [
                        {'name': 'deleted_at', 'type': 'TIMESTAMP'},
                        {'name': 'is_deleted', 'type': 'BOOLEAN', 'default': 'false'}
                    ],
                    '5': [
                        {'name': 'metadata', 'type': 'JSON'},
                        {'name': 'notes', 'type': 'TEXT'}
                    ]
                }
                
                if quick_choice in quick_columns:
                    columns = quick_columns[quick_choice]
                    
                    print(f"\nWill add {len(columns)} columns:")
                    for col in columns:
                        constraints = []
                        if col.get('not_null'): constraints.append('NOT NULL')
                        if col.get('unique'): constraints.append('UNIQUE')
                        if col.get('default'): constraints.append(f"DEFAULT {col['default']}")
                        
                        constraint_str = ' '.join(constraints)
                        print(f"  {col['name']} {col['type']} {constraint_str}")
                    
                    confirm = input("\nProceed? (y/N): ").strip().lower()
                    if confirm == 'y':
                        manager.add_multiple_columns(table_name, columns, dry_run=False)
            
            elif choice == '7':
                print("\nDry run mode allows you to test operations without making changes.")
                print("This is automatically offered in other options, but you can also")
                print("use this to just see what would happen with various operations.")
            
            else:
                print("ERROR: Invalid choice. Please try again.")
            
            input("\nPress Enter to continue...")
    
    except KeyboardInterrupt:
        print("\n\nExiting...")
    
    finally:
        manager.close()

if __name__ == "__main__":
    print("Database Column Manager")
    print("======================")
    print("This script allows you to safely add/remove columns from database tables.")
    print("Always use dry run mode first to test your changes!")
    print()
    
    main()