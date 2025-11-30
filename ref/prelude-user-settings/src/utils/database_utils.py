"""
Database Utilities
==================
Common database connection and routing utilities for user-settings service.
Provides dynamic database routing based on user email.
"""

import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.parse as urlparse
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def get_user_management_db_config() -> dict:
    """
    Get configuration for the database containing user_profiles table.
    This database is specified by the SESSIONS_DB_NAME environment variable.

    Returns:
        dict: Database configuration with keys: host, port, user, password, database

    Raises:
        ValueError: If SESSIONS_DB_NAME environment variable is not set
    """
    database_url = os.getenv('DATABASE_URL')

    if database_url:
        # Parse DATABASE_URL
        parsed = urlparse.urlparse(database_url)
        db_name = os.getenv('SESSIONS_DB_NAME')

        if not db_name:
            raise ValueError("SESSIONS_DB_NAME environment variable is required")

        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'user': parsed.username,
            'password': urlparse.unquote(parsed.password) if parsed.password else None,
            'database': db_name
        }
    else:
        # Use individual environment variables
        db_name = os.getenv('SESSIONS_DB_NAME')
        if not db_name:
            raise ValueError("SESSIONS_DB_NAME environment variable is required")

        return {
            'host': os.getenv('SESSIONS_DB_HOST'),
            'port': int(os.getenv('SESSIONS_DB_PORT', 0)) or None,
            'user': os.getenv('SESSIONS_DB_USER'),
            'password': os.getenv('SESSIONS_DB_PASSWORD'),
            'database': db_name
        }


def get_database_name_for_user(email: str) -> str:
    """
    Query user_profiles table to get the database name for a user.

    This function:
    1. Connects to the database specified in SESSIONS_DB_NAME
    2. Queries user_profiles table for the user's email
    3. Returns the db_name column value

    Args:
        email: User email address

    Returns:
        str: Database name for the user

    Raises:
        ValueError: If user not found or SESSIONS_DB_NAME not set
        psycopg2.Error: If database connection fails
    """
    if not email:
        raise ValueError("Email is required for database routing")

    config = get_user_management_db_config()

    try:
        logger.info(f"[DB_ROUTING] Querying database for user: {email}")
        logger.info(f"[DB_ROUTING] Connecting to: {config['host']}:{config['port']}/{config['database']}")

        conn = psycopg2.connect(**config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Query user_profiles table for db_name
        cursor.execute("""
            SELECT db_name
            FROM user_profiles
            WHERE email = %s
            LIMIT 1
        """, (email,))

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result and result['db_name']:
            database_name = result['db_name']
            logger.info(f"[DB_ROUTING] User {email} -> Database: {database_name}")
            return database_name
        else:
            logger.warning(f"[DB_ROUTING] No database mapping found for user: {email}")
            raise ValueError(f"No database mapping found for user: {email}")

    except psycopg2.Error as e:
        logger.error(f"[DB_ROUTING] Database error while routing user {email}: {e}")
        raise
    except Exception as e:
        logger.error(f"[DB_ROUTING] Error getting database for user {email}: {e}")
        raise


def get_user_db_connection(email: str):
    """
    Create a database connection to the user's specific database.

    This is the main function to use for getting database connections
    with dynamic routing. It will:
    1. Look up the user's database name
    2. Return a connection to that specific database

    Args:
        email: User email address

    Returns:
        psycopg2.connection: Database connection to user's database

    Raises:
        ValueError: If user not found or configuration invalid
        psycopg2.Error: If database connection fails

    Example:
        >>> conn = get_user_db_connection('user@example.com')
        >>> cursor = conn.cursor()
        >>> cursor.execute("SELECT * FROM user_preferences WHERE email = %s", (email,))
    """
    # Get the user's database name via routing
    database_name = get_database_name_for_user(email)

    # Get base connection config
    config = get_user_management_db_config()

    # Override with user's specific database
    config['database'] = database_name

    logger.info(f"[DB_CONNECTION] Connecting to user database: {config['host']}:{config['port']}/{database_name}")

    try:
        conn = psycopg2.connect(**config)
        logger.info(f"[DB_CONNECTION] Successfully connected to {database_name} for {email}")
        return conn
    except psycopg2.Error as e:
        logger.error(f"[DB_CONNECTION] Connection failed for {email} -> {database_name}: {e}")
        raise


def get_management_db_connection():
    """
    Get a direct connection to the user management database.

    Use this when you need to query the user_informations table directly
    or perform operations on the management database.

    Returns:
        psycopg2.connection: Connection to management database

    Raises:
        ValueError: If SESSIONS_DB_NAME not set
        psycopg2.Error: If connection fails
    """
    config = get_user_management_db_config()

    try:
        conn = psycopg2.connect(**config)
        logger.info(f"[DB_CONNECTION] Connected to management database: {config['database']}")
        return conn
    except psycopg2.Error as e:
        logger.error(f"[DB_CONNECTION] Failed to connect to management database: {e}")
        raise
