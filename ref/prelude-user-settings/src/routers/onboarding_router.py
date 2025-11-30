#!/usr/bin/env python3
"""
Personal Onboarding Router
Handles database table initialization checks for new users
"""

import os
import logging
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
import psycopg2
from typing import List, Dict, Optional
import sys
import urllib.parse as urlparse

# Set up logger first
logger = logging.getLogger(__name__)

# Import authentication
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'auth'))
try:
    from providers import verify_auth_token
    AUTH_AVAILABLE = True
except ImportError:
    AUTH_AVAILABLE = False
    logger.warning("Authentication not available")

# Import the database router for user-specific database routing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))
try:
    from database_router import get_database_router
    DATABASE_ROUTER_AVAILABLE = True
except ImportError:
    DATABASE_ROUTER_AVAILABLE = False
    logger.warning("Database router not available - will use default database")

# Create router
router = APIRouter(prefix="/api/onboarding")

# Expected tables that should exist in the database (based on postgres reference)
EXPECTED_TABLES = [
    "batch_job_stats",
    "clients_details",
    "clients_info",
    "company_analyses",
    "deals",
    "email_access_permissions",
    "email_sync_state",
    "employee_client_links",
    "employee_client_notes",
    "employee_info",
    "employee_performance",
    "employee_tasks",
    "enrichment_history",
    "events",
    "gmail_watch",
    "interaction_details",
    "interaction_summaries",
    "lead_activity_log",
    "lead_emails",
    "lead_status_history",
    "leads",
    "oauth_tokens",
    "personnel",
    "precomputed_dashboard_metrics",
    "prelude_insights",
    "sessions"
]

# Table descriptions for the checklist (based on postgres reference)
TABLE_DESCRIPTIONS = {
    "batch_job_stats": "Batch job statistics and monitoring",
    "clients_details": "Detailed client information",
    "clients_info": "Basic client information",
    "company_analyses": "Company analysis and insights",
    "deals": "Sales deals and opportunities",
    "email_access_permissions": "Email access permissions",
    "email_sync_state": "Email synchronization state",
    "employee_client_links": "Employee-client relationships",
    "employee_client_notes": "Notes on client interactions",
    "employee_info": "Employee information",
    "employee_performance": "Employee performance metrics",
    "employee_tasks": "Employee task management",
    "enrichment_history": "Data enrichment history",
    "events": "System events and activities",
    "gmail_watch": "Gmail watch notifications",
    "interaction_details": "Detailed interaction records",
    "interaction_summaries": "Summarized interaction data",
    "lead_activity_log": "Lead activity tracking",
    "lead_emails": "Lead email communications",
    "lead_status_history": "Lead status change history",
    "leads": "Lead information and management",
    "oauth_tokens": "OAuth authentication tokens",
    "personnel": "Personnel directory",
    "precomputed_dashboard_metrics": "Dashboard metrics cache",
    "prelude_insights": "Business insights and analytics",
    "sessions": "User sessions"
}

class TableCheckItem(BaseModel):
    """Model for a single table check item"""
    table_name: str
    exists: bool
    description: str

class TableChecklistResponse(BaseModel):
    """Response model for table checklist"""
    total_tables: int
    existing_tables: int
    missing_tables: int
    checklist: List[TableCheckItem]
    completion_percentage: float

def get_database_for_user(user_email: str = None) -> str:
    """
    Get the appropriate database name for a user.
    
    Args:
        user_email: User's email address
        
    Returns:
        Database name to use for the user
    """
    if user_email and DATABASE_ROUTER_AVAILABLE:
        try:
            router = get_database_router()
            db_name = router.get_database_name_for_user(user_email)
            logger.info(f"Database router: User {user_email} -> Database {db_name}")
            return db_name
        except Exception as e:
            logger.warning(f"Database router failed for {user_email}: {e}")
    
    # Fallback to default database from environment
    default_db = os.getenv('SESSIONS_DB_NAME')
    if not default_db:
        raise ValueError("SESSIONS_DB_NAME environment variable is required")
    logger.info(f"Using default database: {default_db}")
    return default_db

def get_db_connection(database_name: str = None):
    """Get database connection using SESSIONS_DB environment variables."""
    return psycopg2.connect(
        host=os.getenv('SESSIONS_DB_HOST'),
        port=int(os.getenv('SESSIONS_DB_PORT', 0)) or None,
        user=os.getenv('SESSIONS_DB_USER'),
        password=os.getenv('SESSIONS_DB_PASSWORD'),
        database=database_name or os.getenv('SESSIONS_DB_NAME')
    )

def get_existing_tables(database_name: str = None) -> List[str]:
    """Get list of all existing tables in the database"""
    try:
        logger.info(f"Attempting to connect to database for table check: {database_name or 'default'}")
        conn = get_db_connection(database_name)
        logger.info("Database connection successful")
        
        cursor = conn.cursor()

        query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """

        cursor.execute(query)
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found {len(tables)} tables in database")

        cursor.close()
        conn.close()

        return tables

    except Exception as e:
        logger.error(f"Error fetching existing tables: {e}")
        logger.error(f"Environment variables: DATABASE_URL exists: {bool(os.getenv('DATABASE_URL'))}")
        logger.error(f"SESSIONS_DB_HOST: {os.getenv('SESSIONS_DB_HOST', 'NOT SET')}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch tables: {str(e)}")

@router.get("/table-checklist", response_model=TableChecklistResponse)
async def get_table_checklist(
    database: Optional[str] = Query(None, description="Specific database name to check (overrides user routing)"),
    authenticated_user: dict = Depends(verify_auth_token) if AUTH_AVAILABLE else None
):
    """
    Get a checklist of all expected database tables and their existence status.
    Uses authenticated user's email to route to the correct database.

    Args:
        database: Optional specific database name to check (overrides user routing)
        authenticated_user: Authenticated user information (injected by auth system)

    Returns:
        TableChecklistResponse with detailed checklist of tables
    """
    try:
        # Extract user email from authentication
        user_email = None
        if authenticated_user and AUTH_AVAILABLE:
            user_email = authenticated_user.get('email', '')
            logger.info(f"Authenticated user: {user_email}")
        
        # Determine which database to check
        if database:
            # Use explicitly provided database
            target_database = database
            logger.info(f"Using explicit database: {target_database}")
        elif user_email:
            # Use database router to find user's database
            target_database = get_database_for_user(user_email)
            logger.info(f"Routed user {user_email} to database: {target_database}")
        else:
            # Use default database (postgres)
            target_database = get_database_for_user()
            logger.info(f"Using default database: {target_database}")
        
        # Get existing tables from database
        existing_tables_set = set(get_existing_tables(target_database))

        # Build checklist
        checklist = []
        for table_name in EXPECTED_TABLES:
            exists = table_name in existing_tables_set
            description = TABLE_DESCRIPTIONS.get(table_name, "No description available")

            checklist.append(TableCheckItem(
                table_name=table_name,
                exists=exists,
                description=description
            ))

        # Calculate statistics
        total_tables = len(EXPECTED_TABLES)
        existing_count = sum(1 for item in checklist if item.exists)
        missing_count = total_tables - existing_count
        completion_percentage = (existing_count / total_tables * 100) if total_tables > 0 else 0

        return TableChecklistResponse(
            total_tables=total_tables,
            existing_tables=existing_count,
            missing_tables=missing_count,
            checklist=checklist,
            completion_percentage=round(completion_percentage, 2)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating table checklist: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate checklist: {str(e)}")

@router.get("/table-checklist-dev", response_model=TableChecklistResponse)
async def get_table_checklist_dev(
    database: Optional[str] = Query(None, description="Specific database name to check"),
    user_email: Optional[str] = Query(None, description="User email for database routing")
):
    """
    Development endpoint for table checklist without authentication requirement.
    
    Args:
        database: Optional specific database name to check
        user_email: Optional user email for database routing
    
    Returns:
        TableChecklistResponse with detailed checklist of tables
    """
    try:
        # Determine which database to check
        if database:
            # Use explicitly provided database
            target_database = database
            logger.info(f"DEV: Using explicit database: {target_database}")
        elif user_email:
            # Use database router to find user's database
            target_database = get_database_for_user(user_email)
            logger.info(f"DEV: Routed user {user_email} to database: {target_database}")
        else:
            # Use default database (postgres)
            target_database = get_database_for_user()
            logger.info(f"DEV: Using default database: {target_database}")
        
        # Get existing tables from database
        existing_tables_set = set(get_existing_tables(target_database))

        # Build checklist
        checklist = []
        for table_name in EXPECTED_TABLES:
            exists = table_name in existing_tables_set
            description = TABLE_DESCRIPTIONS.get(table_name, "No description available")

            checklist.append(TableCheckItem(
                table_name=table_name,
                exists=exists,
                description=description
            ))

        # Calculate statistics
        total_tables = len(EXPECTED_TABLES)
        existing_count = sum(1 for item in checklist if item.exists)
        missing_count = total_tables - existing_count
        completion_percentage = (existing_count / total_tables * 100) if total_tables > 0 else 0

        return TableChecklistResponse(
            total_tables=total_tables,
            existing_tables=existing_count,
            missing_tables=missing_count,
            checklist=checklist,
            completion_percentage=round(completion_percentage, 2)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating table checklist (dev): {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate checklist: {str(e)}")

@router.get("/database-status")
async def get_database_status(
    database: Optional[str] = Query(None, description="Specific database name to check (overrides user routing)"),
    authenticated_user: dict = Depends(verify_auth_token) if AUTH_AVAILABLE else None
):
    """
    Get overall database status including table count and connection info.
    Uses authenticated user's email to route to the correct database.

    Args:
        database: Optional specific database name to check (overrides user routing)
        authenticated_user: Authenticated user information (injected by auth system)

    Returns:
        Database status summary
    """
    try:
        # Extract user email from authentication
        user_email = None
        if authenticated_user and AUTH_AVAILABLE:
            user_email = authenticated_user.get('email', '')
            logger.info(f"Authenticated user for status check: {user_email}")
        
        # Determine which database to check
        if database:
            # Use explicitly provided database
            target_database = database
            logger.info(f"Using explicit database for status: {target_database}")
        elif user_email:
            # Use database router to find user's database
            target_database = get_database_for_user(user_email)
            logger.info(f"Routed user {user_email} to database for status: {target_database}")
        else:
            # Use default database (postgres)
            target_database = get_database_for_user()
            logger.info(f"Using default database for status: {target_database}")
        
        existing_tables = get_existing_tables(target_database)

        return {
            "connected": True,
            "database_name": target_database,
            "total_tables": len(existing_tables),
            "expected_tables": len(EXPECTED_TABLES),
            "tables_match": set(existing_tables) == set(EXPECTED_TABLES),
            "user_email": user_email,
            "routing_method": "explicit" if database else ("user_email" if user_email else "default")
        }

    except Exception as e:
        logger.error(f"Error getting database status: {e}")
        return {
            "connected": False,
            "error": str(e)
        }

@router.get("/database-status-dev")
async def get_database_status_dev(
    database: Optional[str] = Query(None, description="Specific database name to check"),
    user_email: Optional[str] = Query(None, description="User email for database routing")
):
    """
    Development endpoint for database status without authentication requirement.

    Args:
        database: Optional specific database name to check
        user_email: Optional user email for database routing

    Returns:
        Database status summary
    """
    try:
        # Determine which database to check
        if database:
            # Use explicitly provided database
            target_database = database
            logger.info(f"DEV: Using explicit database for status: {target_database}")
        elif user_email:
            # Use database router to find user's database
            target_database = get_database_for_user(user_email)
            logger.info(f"DEV: Routed user {user_email} to database for status: {target_database}")
        else:
            # Use default database (postgres)
            target_database = get_database_for_user()
            logger.info(f"DEV: Using default database for status: {target_database}")
        
        existing_tables = get_existing_tables(target_database)

        return {
            "connected": True,
            "database_name": target_database,
            "total_tables": len(existing_tables),
            "expected_tables": len(EXPECTED_TABLES),
            "tables_match": set(existing_tables) == set(EXPECTED_TABLES),
            "user_email": user_email,
            "routing_method": "explicit" if database else ("user_email" if user_email else "default")
        }

    except Exception as e:
        logger.error(f"Error getting database status (dev): {e}")
        return {
            "connected": False,
            "error": str(e)
        }

def get_table_schema_from_postgres(table_name: str) -> Optional[str]:
    """
    Get the CREATE TABLE statement for a table from the postgres database.

    Args:
        table_name: Name of the table to get schema for

    Returns:
        CREATE TABLE SQL statement or None if not found
    """
    try:
        logger.info(f"Fetching schema for table: {table_name} from postgres database")
        conn = get_db_connection('postgres')
        cursor = conn.cursor()

        # Get table definition using pg_dump-like approach
        # First, get column definitions
        cursor.execute("""
            SELECT
                a.attname AS column_name,
                pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
                a.attnotnull AS not_null,
                pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_value
            FROM pg_catalog.pg_attribute a
            LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid = d.adrelid AND a.attnum = d.adnum)
            WHERE a.attrelid = %s::regclass
            AND a.attnum > 0
            AND NOT a.attisdropped
            ORDER BY a.attnum;
        """, (table_name,))

        columns = cursor.fetchall()

        if not columns:
            logger.warning(f"Table {table_name} not found in postgres database")
            cursor.close()
            conn.close()
            return None

        # Build column definitions
        column_defs = []
        for col_name, data_type, not_null, default_value in columns:
            col_def = f"{col_name} {data_type}"
            if default_value:
                col_def += f" DEFAULT {default_value}"
            if not_null:
                col_def += " NOT NULL"
            column_defs.append(col_def)

        # Get primary key constraint
        cursor.execute("""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass
            AND i.indisprimary;
        """, (table_name,))

        pk_columns = [row[0] for row in cursor.fetchall()]
        if pk_columns:
            column_defs.append(f"PRIMARY KEY ({', '.join(pk_columns)})")

        # Get foreign key constraints using pg_catalog with proper position matching
        cursor.execute("""
            SELECT
                con.conname AS constraint_name,
                string_agg(att.attname, ', ' ORDER BY u.pos) AS columns,
                fc.relname AS foreign_table,
                string_agg(fatt.attname, ', ' ORDER BY u.pos) AS foreign_columns
            FROM pg_constraint con
            JOIN pg_class c ON con.conrelid = c.oid
            JOIN pg_class fc ON con.confrelid = fc.oid
            JOIN unnest(con.conkey, con.confkey) WITH ORDINALITY AS u(key, fkey, pos) ON true
            JOIN pg_attribute att ON att.attrelid = c.oid AND att.attnum = u.key
            JOIN pg_attribute fatt ON fatt.attrelid = fc.oid AND fatt.attnum = u.fkey
            WHERE c.relname = %s
            AND con.contype = 'f'
            GROUP BY con.conname, fc.relname;
        """, (table_name,))

        fk_constraints = cursor.fetchall()
        for constraint_name, columns, foreign_table, foreign_columns in fk_constraints:
            fk_def = f"FOREIGN KEY ({columns}) REFERENCES {foreign_table}({foreign_columns})"
            column_defs.append(fk_def)

        # Get unique constraints (excluding primary key)
        cursor.execute("""
            SELECT
                con.conname AS constraint_name,
                array_agg(att.attname ORDER BY u.attposition) AS columns
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS u(attnum, attposition) ON true
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum
            WHERE rel.relname = %s
            AND con.contype = 'u'
            AND NOT con.conname LIKE '%%_pkey'
            GROUP BY con.conname;
        """, (table_name,))

        unique_constraints = cursor.fetchall()
        for constraint_name, columns in unique_constraints:
            unique_def = f"UNIQUE ({', '.join(columns)})"
            column_defs.append(unique_def)

        # Build CREATE TABLE statement
        create_statement = f"CREATE TABLE IF NOT EXISTS {table_name} (\n    "
        create_statement += ",\n    ".join(column_defs)
        create_statement += "\n);"

        cursor.close()
        conn.close()

        logger.info(f"Successfully generated schema for table: {table_name}")
        return create_statement

    except Exception as e:
        logger.error(f"Error fetching table schema for {table_name}: {e}")
        return None

def create_sequences_for_table(conn, create_statement: str):
    """
    Extract and create sequences referenced in CREATE TABLE statement.

    Args:
        conn: Database connection
        create_statement: The CREATE TABLE SQL statement
    """
    import re

    # Find all nextval() references in the CREATE TABLE statement
    sequences = re.findall(r"nextval\('([^']+)'", create_statement)

    if not sequences:
        return

    cursor = conn.cursor()
    try:
        for seq in sequences:
            seq_name = seq.replace('::regclass', '').strip()
            try:
                cursor.execute(f"CREATE SEQUENCE IF NOT EXISTS {seq_name}")
                logger.info(f"Created sequence: {seq_name}")
            except Exception as e:
                logger.debug(f"Sequence {seq_name} may already exist: {e}")

        conn.commit()
    finally:
        cursor.close()

@router.post("/create-table-dev")
async def create_table_dev(
    table_name: str = Query(..., description="Name of the table to create"),
    user_email: Optional[str] = Query(None, description="User email for database routing"),
    database: Optional[str] = Query(None, description="Specific database name to use (overrides user routing)")
):
    """
    Development endpoint to create a missing table by copying schema from postgres database.

    Args:
        table_name: Name of the table to create
        user_email: Optional user email for database routing
        database: Optional specific database name (overrides user routing)

    Returns:
        Success message or error details
    """
    try:
        # Validate table name is in expected tables list
        if table_name not in EXPECTED_TABLES:
            raise HTTPException(
                status_code=400,
                detail=f"Table '{table_name}' is not in the expected tables list"
            )

        # Determine target database
        if database:
            target_database = database
            logger.info(f"DEV: Using explicit database: {target_database}")
        elif user_email:
            target_database = get_database_for_user(user_email)
            logger.info(f"DEV: Routed user {user_email} to database: {target_database}")
        else:
            target_database = get_database_for_user()
            logger.info(f"DEV: Using default database: {target_database}")

        # Check if table already exists in target database
        existing_tables = get_existing_tables(target_database)
        if table_name in existing_tables:
            return {
                "success": False,
                "message": f"Table '{table_name}' already exists in database '{target_database}'",
                "table_name": table_name,
                "database": target_database
            }

        # Get table schema from postgres
        create_statement = get_table_schema_from_postgres(table_name)

        if not create_statement:
            raise HTTPException(
                status_code=404,
                detail=f"Could not find schema for table '{table_name}' in postgres database"
            )

        logger.info(f"Creating table '{table_name}' in database '{target_database}'")
        logger.info(f"SQL: {create_statement}")

        # Create table in target database
        conn = get_db_connection(target_database)
        cursor = conn.cursor()

        try:
            # Create any sequences referenced in the table schema
            create_sequences_for_table(conn, create_statement)

            cursor.execute(create_statement)
            conn.commit()
            logger.info(f"Successfully created table '{table_name}' in database '{target_database}'")

            cursor.close()
            conn.close()

            return {
                "success": True,
                "message": f"Successfully created table '{table_name}' in database '{target_database}'",
                "table_name": table_name,
                "database": target_database,
                "sql": create_statement
            }

        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            logger.error(f"Failed to create table '{table_name}': {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create table: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_table_dev: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create table: {str(e)}"
        )

@router.post("/create-all-tables-dev")
async def create_all_tables_dev(
    user_email: Optional[str] = Query(None, description="User email for database routing"),
    database: Optional[str] = Query(None, description="Specific database name to use (overrides user routing)")
):
    """
    Development endpoint to create all missing tables with automatic dependency handling.
    Uses a retry loop to handle foreign key dependencies by creating tables in the correct order.

    Args:
        user_email: Optional user email for database routing
        database: Optional specific database name (overrides user routing)

    Returns:
        Detailed results of table creation process
    """
    try:
        # Determine target database
        if database:
            target_database = database
            logger.info(f"DEV: Using explicit database for bulk creation: {target_database}")
        elif user_email:
            target_database = get_database_for_user(user_email)
            logger.info(f"DEV: Routed user {user_email} to database for bulk creation: {target_database}")
        else:
            target_database = get_database_for_user()
            logger.info(f"DEV: Using default database for bulk creation: {target_database}")

        # Get existing tables
        existing_tables = set(get_existing_tables(target_database))

        # Find missing tables
        missing_tables = [table for table in EXPECTED_TABLES if table not in existing_tables]

        if not missing_tables:
            return {
                "success": True,
                "message": "All tables already exist",
                "database": target_database,
                "total_tables": len(EXPECTED_TABLES),
                "created_tables": [],
                "failed_tables": [],
                "already_existed": len(EXPECTED_TABLES)
            }

        logger.info(f"Found {len(missing_tables)} missing tables to create: {missing_tables}")

        # Track creation results
        created_tables = []
        failed_tables = {}
        tables_to_create = missing_tables.copy()

        # Maximum retry attempts (prevent infinite loops)
        max_iterations = len(missing_tables) + 5
        iteration = 0

        # Retry loop - keep trying until all tables are created or no progress is made
        while tables_to_create and iteration < max_iterations:
            iteration += 1
            logger.info(f"Iteration {iteration}: Attempting to create {len(tables_to_create)} tables")

            progress_made = False
            still_failing = []

            for table_name in tables_to_create:
                try:
                    # Get table schema from postgres
                    create_statement = get_table_schema_from_postgres(table_name)

                    if not create_statement:
                        failed_tables[table_name] = "Schema not found in postgres database"
                        logger.warning(f"Could not find schema for {table_name}")
                        continue

                    # Try to create the table
                    conn = get_db_connection(target_database)
                    cursor = conn.cursor()

                    try:
                        # Create any sequences referenced in the table schema
                        create_sequences_for_table(conn, create_statement)

                        cursor.execute(create_statement)
                        conn.commit()
                        cursor.close()
                        conn.close()

                        created_tables.append(table_name)
                        progress_made = True
                        logger.info(f"Successfully created table: {table_name}")

                    except psycopg2.Error as db_error:
                        conn.rollback()
                        cursor.close()
                        conn.close()

                        error_msg = str(db_error)

                        # Check if it's a foreign key dependency error
                        if "does not exist" in error_msg and "relation" in error_msg:
                            # This table depends on another table that doesn't exist yet
                            # Add it back to the list to retry later
                            still_failing.append(table_name)
                            logger.info(f"Table {table_name} has unmet dependencies, will retry")
                        else:
                            # Different error - mark as failed
                            failed_tables[table_name] = error_msg
                            logger.error(f"Failed to create {table_name}: {error_msg}")

                except Exception as e:
                    logger.error(f"Error processing table {table_name}: {e}")
                    failed_tables[table_name] = str(e)

            # Update the list of tables to create for next iteration
            tables_to_create = still_failing

            # If no progress was made, stop trying
            if not progress_made and tables_to_create:
                logger.warning(f"No progress made in iteration {iteration}, stopping")
                for table_name in tables_to_create:
                    if table_name not in failed_tables:
                        failed_tables[table_name] = "Could not resolve dependencies after multiple attempts"
                break

        # Final summary
        success = len(created_tables) > 0 and len(failed_tables) == 0

        return {
            "success": success,
            "message": f"Created {len(created_tables)} tables, {len(failed_tables)} failed",
            "database": target_database,
            "total_missing": len(missing_tables),
            "created_tables": created_tables,
            "failed_tables": failed_tables,
            "iterations": iteration
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_all_tables_dev: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create tables: {str(e)}"
        )


@router.get("/table-content-dev")
async def get_table_content_dev(
    table_name: str = Query(..., description="Name of the table to query"),
    user_email: Optional[str] = Query(None, description="User email for database routing"),
    database: Optional[str] = Query(None, description="Specific database name to use"),
    limit: int = Query(100, description="Maximum number of rows to return")
):
    """
    Get the content of a specific table (development endpoint - no auth required)
    Returns rows, columns, and metadata about the table.
    """
    try:
        # Determine which database to use
        target_database = None

        if database:
            # Use explicitly provided database name
            target_database = database
            logger.info(f"Using explicitly provided database: {target_database}")
        elif user_email and DATABASE_ROUTER_AVAILABLE:
            # Route to user's database
            db_router = get_database_router()
            target_database = db_router.get_user_database(user_email)
            logger.info(f"Routed user {user_email} to database: {target_database}")
        else:
            # Fallback to default postgres database
            target_database = os.getenv('DB_NAME', 'postgres')
            logger.info(f"Using default database: {target_database}")

        # Connect to the determined database
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            parsed = urlparse.urlparse(database_url)
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                user=parsed.username,
                password=parsed.password,
                database=target_database
            )
        else:
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", 5432)),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", ""),
                database=target_database
            )

        cursor = conn.cursor()

        # First, check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = %s
            );
        """, (table_name,))

        table_exists = cursor.fetchone()[0]

        if not table_exists:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=404,
                detail=f"Table '{table_name}' does not exist in database '{target_database}'"
            )

        # Get column names
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table_name,))

        columns = [row[0] for row in cursor.fetchall()]

        # Get total row count
        cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
        total_rows = cursor.fetchone()[0]

        # Get actual data (limited)
        cursor.execute(f'SELECT * FROM "{table_name}" LIMIT %s', (limit,))
        rows = cursor.fetchall()

        # Convert rows to list of dictionaries
        rows_as_dicts = []
        for row in rows:
            row_dict = {}
            for i, column in enumerate(columns):
                value = row[i]
                # Handle special data types
                if value is not None:
                    # Convert to string if it's a complex type
                    if isinstance(value, (list, dict)):
                        row_dict[column] = value
                    else:
                        row_dict[column] = value
                else:
                    row_dict[column] = None
            rows_as_dicts.append(row_dict)

        cursor.close()
        conn.close()

        return {
            "success": True,
            "table_name": table_name,
            "database": target_database,
            "columns": columns,
            "rows": rows_as_dicts,
            "row_count": total_rows,
            "column_count": len(columns),
            "showing": len(rows_as_dicts),
            "limit": limit
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching table content for {table_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch table content: {str(e)}"
        )


logger.info("INIT: Onboarding router initialized with prefix: /api/onboarding")
