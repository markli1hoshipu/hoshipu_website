"""
AI Preferences Repository
Handles all database operations for user AI preferences
Uses dynamic database routing based on user email
"""

import os
import logging
import json
import sys
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Import database utilities
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'utils'))
from database_utils import get_user_db_connection


class AIPreferencesRepository:
    """Repository for AI preferences database operations."""

    @staticmethod
    def save_preferences(
        email: str,
        tone_dict: dict,
        guardrails_dict: dict,
        audience_dict: dict,
        additional_context_dict: dict,
        ai_summary: str
    ) -> dict:
        """
        Save or update user AI preferences.
        Connects to user's specific database based on email routing.

        Args:
            email: User email
            tone_dict: Tone preferences
            guardrails_dict: Guardrails preferences
            audience_dict: Audience preferences
            additional_context_dict: Additional context
            ai_summary: LLM-generated summary

        Returns:
            dict with success status and preference data
        """
        # Get connection to user's specific database via dynamic routing
        conn = get_user_db_connection(email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            # Check if preferences already exist
            cursor.execute(
                "SELECT id FROM user_preferences WHERE email = %s",
                (email,)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing preferences
                cursor.execute("""
                    UPDATE user_preferences
                    SET tone = %s,
                        guardrails = %s,
                        audience = %s,
                        additional_context = %s,
                        ai_summary = %s,
                        is_complete = true,
                        updated_at = NOW()
                    WHERE email = %s
                    RETURNING id
                """, (
                    json.dumps(tone_dict),
                    json.dumps(guardrails_dict),
                    json.dumps(audience_dict),
                    json.dumps(additional_context_dict),
                    ai_summary,
                    email
                ))
                logger.info(f"Updated existing preferences for {email}")
            else:
                # Insert new preferences
                cursor.execute("""
                    INSERT INTO user_preferences (
                        email, tone, guardrails, audience, additional_context,
                        ai_summary, is_complete
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, true)
                    RETURNING id
                """, (
                    email,
                    json.dumps(tone_dict),
                    json.dumps(guardrails_dict),
                    json.dumps(audience_dict),
                    json.dumps(additional_context_dict),
                    ai_summary
                ))
                logger.info(f"Created new preferences for {email}")

            conn.commit()

            return {
                "success": True,
                "preferences": {
                    "tone": tone_dict,
                    "guardrails": guardrails_dict,
                    "audience": audience_dict,
                    "additional_context": additional_context_dict,
                    "ai_summary": ai_summary
                }
            }

        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving preferences: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_preferences(email: str) -> Optional[dict]:
        """
        Get user AI preferences by email.
        Connects to user's specific database based on email routing.

        Args:
            email: User email

        Returns:
            dict with preference data or None if not found
        """
        # Get connection to user's specific database via dynamic routing
        conn = get_user_db_connection(email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cursor.execute("""
                SELECT tone, guardrails, audience, additional_context, ai_summary,
                       is_complete, created_at, updated_at
                FROM user_preferences
                WHERE email = %s
            """, (email,))

            result = cursor.fetchone()

            if not result:
                return None

            return {
                "tone": result['tone'],
                "guardrails": result['guardrails'],
                "audience": result['audience'],
                "additional_context": result['additional_context'],
                "ai_summary": result['ai_summary'],
                "is_complete": result['is_complete'],
                "created_at": result['created_at'].isoformat() if result['created_at'] else None,
                "updated_at": result['updated_at'].isoformat() if result['updated_at'] else None
            }

        except Exception as e:
            logger.error(f"Error fetching preferences: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def delete_preferences(email: str) -> bool:
        """
        Delete user AI preferences by email.
        Connects to user's specific database based on email routing.

        Args:
            email: User email

        Returns:
            bool indicating if preferences were deleted
        """
        # Get connection to user's specific database via dynamic routing
        conn = get_user_db_connection(email)
        cursor = conn.cursor()

        try:
            cursor.execute(
                "DELETE FROM user_preferences WHERE email = %s RETURNING id",
                (email,)
            )

            deleted = cursor.fetchone()
            conn.commit()

            return deleted is not None

        except Exception as e:
            conn.rollback()
            logger.error(f"Error deleting preferences: {e}")
            raise
        finally:
            cursor.close()
            conn.close()
