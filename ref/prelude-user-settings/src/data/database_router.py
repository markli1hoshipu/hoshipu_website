#!/usr/bin/env python3
"""
Database Router Utility
=======================

This module provides email-based database routing functionality.
It queries the user_informations table to determine which database
each user should connect to based on their email.

Usage:
    from shared_utils.database_router import get_database_for_user
    
    db_name = get_database_for_user("user@example.com")
    connection_config = get_database_config_for_user("user@example.com")
"""

import os
import sys
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
import urllib.parse as urlparse
from functools import lru_cache
import time

# Configure logging
logger = logging.getLogger(__name__)

# Cache settings
CACHE_TTL = 300  # 5 minutes
_cache = {}
_cache_timestamps = {}

class DatabaseRouter:
    """
    Handles email-based database routing by querying the user_informations table.
    """
    
    def __init__(self):
        """Initialize the database router."""
        self.user_management_config = self._get_user_management_db_config()
        self.base_db_config = self._get_base_db_config()
    
    def _get_user_management_db_config(self) -> Dict[str, Any]:
        """Get configuration for the user management database."""
        database_url = os.getenv('DATABASE_URL')
        
        if database_url:
            # Parse DATABASE_URL
            parsed = urlparse.urlparse(database_url)
            return {
                'host': parsed.hostname,
                'port': parsed.port or 5432,
                'user': parsed.username,
                'password': urlparse.unquote(parsed.password) if parsed.password else None,
                'database': 'prelude_user_analytics'  # Changed to use user_analytics DB with user_profiles table
            }
        else:
            # Use individual environment variables - no fallbacks
            return {
                'host': os.getenv('SESSIONS_DB_HOST'),
                'port': int(os.getenv('SESSIONS_DB_PORT', 0)) or None,
                'user': os.getenv('SESSIONS_DB_USER'),
                'password': os.getenv('SESSIONS_DB_PASSWORD'),
                'database': 'prelude_user_analytics'
            }
    
    def _get_base_db_config(self) -> Dict[str, Any]:
        """Get base database configuration (without database name)."""
        config = self.user_management_config.copy()
        config.pop('database', None)  # Remove database key
        return config
    
    def _is_cache_valid(self, email: str) -> bool:
        """Check if cached result is still valid."""
        if email not in _cache_timestamps:
            return False
        
        return (time.time() - _cache_timestamps[email]) < CACHE_TTL
    
    def _get_cached_result(self, email: str) -> Optional[str]:
        """Get cached database name for email."""
        if self._is_cache_valid(email):
            return _cache.get(email)
        return None
    
    def _cache_result(self, email: str, database_name: str):
        """Cache the database name for email."""
        _cache[email] = database_name
        _cache_timestamps[email] = time.time()
    
    def get_database_name_for_user(self, email: str) -> str:
        """
        Get the database name for a given user email.
        
        Args:
            email: User's email address
            
        Returns:
            Database name for the user, or 'postgres' as default
        """
        if not email:
            logger.warning("No email provided, using default database 'postgres'")
            return 'postgres'
        
        # Check cache first
        cached_result = self._get_cached_result(email)
        if cached_result:
            logger.debug(f"DATABASE_ROUTER: Cache hit for {email}: {cached_result}")
            print(f"[DATABASE_ROUTER] Cache hit for {email}: {cached_result}")
            return cached_result

        try:
            # Connect to user management database with debug logging
            logger.debug(f"DATABASE_ROUTER: Connecting to user management DB: {self.user_management_config['host']}:{self.user_management_config['port']}/{self.user_management_config['database']}")
            print(f"[DATABASE_ROUTER] Connecting to user management DB: {self.user_management_config['host']}:{self.user_management_config['port']}/{self.user_management_config['database']} for user {email}")
            
            conn = psycopg2.connect(
                host=self.user_management_config['host'],
                port=self.user_management_config['port'],
                user=self.user_management_config['user'],
                password=self.user_management_config['password'],
                database=self.user_management_config['database']
            )
            
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Query user_profiles table with db_name column
            cursor.execute("""
                SELECT db_name, company, role, name
                FROM user_profiles 
                WHERE email = %s
                LIMIT 1
            """, (email,))
            
            result = cursor.fetchone()
            
            if result and result['db_name']:
                database_name = result['db_name']
                logger.info(f"DATABASE_ROUTER: User {email} -> Database: {database_name} (Company: {result['company']}, Role: {result['role']})")
                print(f"[DATABASE_ROUTER] User {email} -> Database: {database_name} (Company: {result['company']}, Role: {result['role']}, Name: {result.get('name', 'N/A')})")

                # Cache the result
                self._cache_result(email, database_name)

                cursor.close()
                conn.close()
                return database_name
            else:
                logger.warning(f"DATABASE_ROUTER: User {email} not found in user_profiles table or has no db_name, using default 'postgres'")
                print(f"[DATABASE_ROUTER] User {email} not found in user_profiles table or has no db_name, using default 'postgres'")
                
                # Cache the default result
                self._cache_result(email, 'postgres')
                
                cursor.close()
                conn.close()
                return 'postgres'
                
        except Exception as e:
            logger.error(f"DATABASE_ROUTER: Failed to query user database for {email}: {e}")
            print(f"[DATABASE_ROUTER] Failed to query user database for {email}: {e}")
            logger.warning("DATABASE_ROUTER: Falling back to default database 'postgres'")
            print(f"[DATABASE_ROUTER] Falling back to default database 'postgres' for {email}")
            return 'postgres'
    
    def get_database_config_for_user(self, email: str) -> Dict[str, Any]:
        """
        Get complete database configuration for a user.
        
        Args:
            email: User's email address
            
        Returns:
            Database configuration dictionary
        """
        database_name = self.get_database_name_for_user(email)
        
        config = self.base_db_config.copy()
        config['database'] = database_name

        logger.debug(f"DATABASE_ROUTER: Generated config for {email}: {config['host']}:{config['port']}/{database_name}")
        print(f"[DATABASE_ROUTER] Generated config for {email}: {config['host']}:{config['port']}/{database_name}")

        return config
    
    def get_database_url_for_user(self, email: str) -> str:
        """
        Get database URL for a user.
        
        Args:
            email: User's email address
            
        Returns:
            PostgreSQL connection URL
        """
        config = self.get_database_config_for_user(email)
        
        return (
            f"postgresql://{config['user']}:{config['password']}"
            f"@{config['host']}:{config['port']}/{config['database']}"
        )
    
    def get_user_info(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get complete user information from user_informations table.
        
        Args:
            email: User's email address
            
        Returns:
            User information dictionary or None if not found
        """
        try:
            # Connect to user management database
            conn = psycopg2.connect(
                host=self.user_management_config['host'],
                port=self.user_management_config['port'],
                user=self.user_management_config['user'],
                password=self.user_management_config['password'],
                database=self.user_management_config['database']
            )
            
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Query user_profiles table
            cursor.execute("""
                SELECT email, name, company, role, db_name, created_at, updated_at
                FROM user_profiles 
                WHERE email = %s
                LIMIT 1
            """, (email,))
            
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            return dict(result) if result else None
            
        except Exception as e:
            logger.error(f"Failed to get user info for {email}: {e}")
            return None
    
    @staticmethod
    def clear_cache():
        """Clear the database name cache."""
        global _cache, _cache_timestamps
        _cache.clear()
        _cache_timestamps.clear()
        logger.info("Database router cache cleared")

# Global instance
_router_instance = None

def get_database_router() -> DatabaseRouter:
    """Get the global database router instance."""
    global _router_instance
    if _router_instance is None:
        _router_instance = DatabaseRouter()
    return _router_instance

# Convenience functions
def get_database_for_user(email: str) -> str:
    """
    Get database name for a user email.
    
    Args:
        email: User's email address
        
    Returns:
        Database name for the user
    """
    return get_database_router().get_database_name_for_user(email)

def get_database_config_for_user(email: str) -> Dict[str, Any]:
    """
    Get database configuration for a user email.
    
    Args:
        email: User's email address
        
    Returns:
        Database configuration dictionary
    """
    return get_database_router().get_database_config_for_user(email)

def get_database_url_for_user(email: str) -> str:
    """
    Get database URL for a user email.
    
    Args:
        email: User's email address
        
    Returns:
        PostgreSQL connection URL
    """
    return get_database_router().get_database_url_for_user(email)

def get_user_info(email: str) -> Optional[Dict[str, Any]]:
    """
    Get user information for an email.
    
    Args:
        email: User's email address
        
    Returns:
        User information dictionary or None
    """
    return get_database_router().get_user_info(email)

def clear_database_cache():
    """Clear the database routing cache."""
    DatabaseRouter.clear_cache()

# Example usage and testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    
    # Test the database router
    router = DatabaseRouter()
    
    test_emails = [
        "admin@prelude.com",
        "john.doe@techcorp.com",
        "nonexistent@example.com"
    ]
    
    for email in test_emails:
        print(f"\n--- Testing {email} ---")
        db_name = router.get_database_name_for_user(email)
        print(f"Database: {db_name}")
        
        config = router.get_database_config_for_user(email)
        print(f"Config: {config}")
        
        url = router.get_database_url_for_user(email)
        print(f"URL: {url[:50]}...")
        
        user_info = router.get_user_info(email)
        if user_info:
            print(f"User Info: {user_info['company']} - {user_info['role']} (Level {user_info['level']})")
        else:
            print("User Info: Not found")