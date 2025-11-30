"""
Database connection utilities for Team Invitations Service
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.parse as urlparse
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def get_database_config() -> dict:
    """Get database configuration from SESSIONS_DB environment variables."""
    return {
        'host': os.getenv('SESSIONS_DB_HOST'),
        'port': int(os.getenv('SESSIONS_DB_PORT', 0)) or None,
        'user': os.getenv('SESSIONS_DB_USER'),
        'password': os.getenv('SESSIONS_DB_PASSWORD'),
        'database': os.getenv('SESSIONS_DB_NAME')
    }


def get_database_connection():
    """Get a database connection using SESSIONS_DB environment variables."""
    try:
        connection = psycopg2.connect(
            **get_database_config(),
            cursor_factory=RealDictCursor
        )
        logger.info("Database connection established successfully")
        return connection
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise