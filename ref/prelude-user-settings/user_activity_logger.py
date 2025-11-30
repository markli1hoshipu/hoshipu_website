#!/usr/bin/env python3
"""
User Activity Logger
===================

Core logging service for tracking all user activities across the Prelude Platform.
Writes activity logs to the prelude_user_analytics PostgreSQL database.

Usage:
    from user_activity_logger import UserActivityLogger

    logger = UserActivityLogger()
    logger.log_page_view(
        user_email="user@company.com",
        page_url="/crm/customers",
        session_id="session-123",
        duration_ms=5000
    )
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class UserActivityLogger:
    """
    Core activity logger for tracking user actions across the platform.
    Connects to PostgreSQL database to store activity logs.
    """

    def __init__(self):
        """Initialize the UserActivityLogger with database connection."""
        self.use_local = os.getenv("USE_LOCAL_SERVICES", "false").lower() == "true"
        self.connection = None
        self._connect()

    def _connect(self):
        """Establish database connection."""
        try:
            if self.use_local:
                logger.info("UserActivityLogger: Using local mode (no database)")
                # In local mode, we don't connect to PostgreSQL
                return

            # Connect to PostgreSQL
            self.connection = psycopg2.connect(
                host=os.getenv("SESSIONS_DB_HOST"),
                port=int(os.getenv("SESSIONS_DB_PORT", 0)) or None,
                user=os.getenv("SESSIONS_DB_USER"),
                password=os.getenv("SESSIONS_DB_PASSWORD"),
                database=os.getenv("SESSIONS_DB_NAME")
            )
            logger.info("UserActivityLogger: Connected to PostgreSQL database")
        except Exception as e:
            logger.error(f"UserActivityLogger: Database connection failed: {e}")
            self.connection = None

    def _execute_query(self, query: str, params: tuple) -> bool:
        """
        Execute a database query safely.

        Args:
            query: SQL query to execute
            params: Query parameters

        Returns:
            bool: True if successful, False otherwise
        """
        if self.use_local or not self.connection:
            logger.debug(f"UserActivityLogger: Skipping database write (local mode or no connection)")
            return False

        try:
            with self.connection.cursor() as cursor:
                cursor.execute(query, params)
            self.connection.commit()
            return True
        except Exception as e:
            logger.error(f"UserActivityLogger: Query execution failed: {e}")
            self.connection.rollback()
            # Try to reconnect
            try:
                self._connect()
            except:
                pass
            return False

    def log_activity(
        self,
        user_email: str,
        action_type: str,
        action_name: str,
        session_id: Optional[str] = None,
        action_category: Optional[str] = None,
        page_url: Optional[str] = None,
        service_name: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        action_data: Optional[Dict[str, Any]] = None,
        result_status: str = "success",
        result_data: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None,
        tags: Optional[list] = None,
        timestamp: Optional[datetime] = None
    ) -> bool:
        """
        Log a user activity to the database.

        Args:
            user_email: User's email address
            action_type: Category (e.g., 'navigation', 'crm', 'chat')
            action_name: Specific action (e.g., 'page_view', 'customer_view')
            session_id: Browser/WebSocket session ID
            action_category: Optional sub-category
            page_url: Frontend page/route
            service_name: Backend service name
            user_agent: Browser/client information
            ip_address: User's IP address
            action_data: Additional data as JSON
            result_status: 'success', 'error', 'pending', 'timeout'
            result_data: Results or error information as JSON
            duration_ms: Duration in milliseconds
            tags: List of searchable tags
            timestamp: When the action occurred (defaults to now)

        Returns:
            bool: True if logged successfully, False otherwise
        """
        if timestamp is None:
            timestamp = datetime.now()

        query = """
            INSERT INTO user_activity_logs (
                user_email, session_id, action_type, action_name, action_category,
                page_url, service_name, user_agent, ip_address, action_data,
                result_status, result_data, duration_ms, tags, timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        params = (
            user_email,
            session_id,
            action_type,
            action_name,
            action_category,
            page_url,
            service_name,
            user_agent,
            ip_address,
            Json(action_data) if action_data else None,
            result_status,
            Json(result_data) if result_data else None,
            duration_ms,
            tags,
            timestamp
        )

        success = self._execute_query(query, params)

        if success:
            logger.debug(f"Activity logged: {action_type}/{action_name} for {user_email}")

        return success

    def log_page_view(
        self,
        user_email: str,
        page_url: str,
        session_id: Optional[str] = None,
        duration_ms: Optional[int] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        referrer: Optional[str] = None
    ) -> bool:
        """
        Log a page view activity.

        Args:
            user_email: User's email address
            page_url: URL/route of the page
            session_id: Browser session ID
            duration_ms: Time spent on page in milliseconds
            user_agent: Browser information
            ip_address: User's IP address
            referrer: Previous page URL

        Returns:
            bool: True if logged successfully
        """
        action_data = {}
        if referrer:
            action_data["referrer"] = referrer

        return self.log_activity(
            user_email=user_email,
            action_type="navigation",
            action_name="page_view",
            session_id=session_id,
            page_url=page_url,
            service_name="frontend",
            user_agent=user_agent,
            ip_address=ip_address,
            action_data=action_data if action_data else None,
            duration_ms=duration_ms,
            result_status="success"
        )

    def log_crm_action(
        self,
        user_email: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        session_id: Optional[str] = None,
        page_url: Optional[str] = None,
        action_data: Optional[Dict[str, Any]] = None,
        result_status: str = "success",
        result_data: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None
    ) -> bool:
        """
        Log a CRM-related action.

        Args:
            user_email: User's email address
            action: Action name (e.g., 'view_customer', 'create_deal')
            entity_type: Type of entity (e.g., 'customer', 'deal', 'email')
            entity_id: ID of the entity being acted upon
            session_id: Browser session ID
            page_url: Frontend page URL
            action_data: Additional action data
            result_status: Status of the action
            result_data: Result information
            duration_ms: Duration in milliseconds

        Returns:
            bool: True if logged successfully
        """
        # Add entity_id to action_data if provided
        if entity_id:
            if action_data is None:
                action_data = {}
            action_data["entity_id"] = entity_id
            action_data["entity_type"] = entity_type

        return self.log_activity(
            user_email=user_email,
            action_type="crm",
            action_name=action,
            action_category=entity_type,
            session_id=session_id,
            page_url=page_url,
            service_name="crm-service",
            action_data=action_data,
            result_status=result_status,
            result_data=result_data,
            duration_ms=duration_ms
        )

    def close(self):
        """Close the database connection."""
        if self.connection:
            try:
                self.connection.close()
                logger.info("UserActivityLogger: Database connection closed")
            except Exception as e:
                logger.error(f"UserActivityLogger: Error closing connection: {e}")

    def __del__(self):
        """Cleanup when object is destroyed."""
        self.close()


# Singleton instance for convenience
_logger_instance = None


def get_logger() -> UserActivityLogger:
    """Get or create the singleton UserActivityLogger instance."""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = UserActivityLogger()
    return _logger_instance


# Test function
def test_logger():
    """Test the UserActivityLogger."""
    print("=== TESTING USER ACTIVITY LOGGER ===")

    logger = UserActivityLogger()

    # Test page view
    success = logger.log_page_view(
        user_email="test@preludeos.com",
        page_url="/crm/customers",
        session_id="test-session-123",
        duration_ms=5000
    )
    print(f"[{'OK' if success else 'FAIL'}] Page view logged")

    # Test CRM action
    success = logger.log_crm_action(
        user_email="test@preludeos.com",
        action="view_customer",
        entity_type="customer",
        entity_id="456",
        session_id="test-session-123",
        page_url="/crm/customers/456"
    )
    print(f"[{'OK' if success else 'FAIL'}] CRM action logged")

    print("\n[SUCCESS] All tests completed!")
    logger.close()


if __name__ == "__main__":
    test_logger()
