"""
Writing Style Router
Handles writing style initialization and management for employee onboarding
"""

import os
import logging
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import sys

# Add services path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services'))
from writing_style_service import (
    analyze_writing_style_with_ai,
    update_employee_writing_style,
    get_employee_writing_style
)

# Set up logger
logger = logging.getLogger(__name__)

# Import authentication - use absolute import from parent
try:
    from auth.providers import verify_auth_token
    AUTH_AVAILABLE = True
except ImportError:
    AUTH_AVAILABLE = False
    logger.warning("Authentication not available for writing style router")

# Import database connection
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))
try:
    from database_router import get_database_router
    DATABASE_ROUTER_AVAILABLE = True
except ImportError:
    DATABASE_ROUTER_AVAILABLE = False
    logger.warning("Database router not available")

# Create router
router = APIRouter(prefix="/api/user-settings/writing-style", tags=["writing-style"])


# Request/Response Models
class EmailSample(BaseModel):
    """Single email sample"""
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=10, max_length=5000)


class InitializeWritingStyleRequest(BaseModel):
    """Request to initialize writing style"""
    email_samples: List[EmailSample] = Field(..., min_items=3, max_items=20)


class WritingStyleResponse(BaseModel):
    """Response with writing style data"""
    success: bool
    writing_style: Optional[Dict] = None
    message: Optional[str] = None


# Dependency: Get database connection
async def get_db_connection(employee_id: int = None, user_email: str = None):
    """Get database connection for employee"""
    import psycopg2
    import urllib.parse as urlparse

    # Determine database
    database_name = 'postgres'  # Default

    if user_email and DATABASE_ROUTER_AVAILABLE:
        try:
            router = get_database_router()
            database_name = router.get_database_name_for_user(user_email)
            logger.info(f"Routed {user_email} to database: {database_name}")
        except Exception as e:
            logger.warning(f"Database routing failed: {e}, using default")

    # Get connection using SESSIONS_DB environment variables
    conn = psycopg2.connect(
        host=os.getenv('SESSIONS_DB_HOST'),
        port=int(os.getenv('SESSIONS_DB_PORT', 5432)),
        user=os.getenv('SESSIONS_DB_USER'),
        password=os.getenv('SESSIONS_DB_PASSWORD'),
        database=database_name
    )

    return conn


# Helper: Get employee_id from email
async def get_employee_id_from_email(db_conn, email: str) -> Optional[int]:
    """Get employee_id from email address"""
    try:
        cursor = db_conn.cursor()
        cursor.execute("""
            SELECT employee_id FROM employee_info WHERE email = %s
        """, (email,))
        result = cursor.fetchone()
        cursor.close()

        if result:
            return result[0]
        return None
    except Exception as e:
        logger.error(f"Error getting employee_id for {email}: {e}")
        return None


# Endpoints

@router.post("/initialize", response_model=WritingStyleResponse)
async def initialize_writing_style(
    request: InitializeWritingStyleRequest,
    authenticated_user: dict = Depends(verify_auth_token) if AUTH_AVAILABLE else None
):
    """
    Initialize writing style for a new employee

    Requires 3-20 email samples to analyze writing style
    """
    try:
        # Get user email from auth
        user_email = None
        if authenticated_user and AUTH_AVAILABLE:
            user_email = authenticated_user.get('email')
            logger.info(f"Initializing writing style for user: {user_email}")

        if not user_email:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Get database connection
        db_conn = await get_db_connection(user_email=user_email)

        # Get employee_id
        employee_id = await get_employee_id_from_email(db_conn, user_email)

        if not employee_id:
            db_conn.close()
            raise HTTPException(status_code=404, detail=f"Employee not found for email: {user_email}")

        # Convert email samples to dict format
        email_samples = [
            {'subject': sample.subject, 'body': sample.body}
            for sample in request.email_samples
        ]

        logger.info(f"Analyzing {len(email_samples)} email samples for employee {employee_id}")

        # Analyze writing style
        writing_style = await analyze_writing_style_with_ai(email_samples)

        # Save to database
        cursor = db_conn.cursor()
        cursor.execute("""
            UPDATE employee_info
            SET writing_style = %s
            WHERE employee_id = %s
        """, (json.dumps(writing_style), employee_id))
        db_conn.commit()
        cursor.close()
        db_conn.close()

        logger.info(f"Successfully initialized writing style for employee {employee_id}")

        return WritingStyleResponse(
            success=True,
            writing_style=writing_style,
            message="Writing style initialized successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing writing style: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize writing style: {str(e)}")


@router.get("", response_model=WritingStyleResponse)
async def get_writing_style(
    authenticated_user: dict = Depends(verify_auth_token) if AUTH_AVAILABLE else None
):
    """
    Get current writing style for authenticated employee
    """
    try:
        # Get user email from auth
        user_email = None
        if authenticated_user and AUTH_AVAILABLE:
            user_email = authenticated_user.get('email')
            logger.info(f"Fetching writing style for user: {user_email}")

        if not user_email:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Get database connection
        db_conn = await get_db_connection(user_email=user_email)

        # Get employee_id
        employee_id = await get_employee_id_from_email(db_conn, user_email)

        if not employee_id:
            db_conn.close()
            raise HTTPException(status_code=404, detail=f"Employee not found for email: {user_email}")

        # Get writing style (need to adapt for sync db)
        cursor = db_conn.cursor()
        cursor.execute("""
            SELECT writing_style FROM employee_info WHERE employee_id = %s
        """, (employee_id,))
        result = cursor.fetchone()
        cursor.close()
        db_conn.close()

        if not result or not result[0]:
            return WritingStyleResponse(
                success=True,
                writing_style=None,
                message="No writing style set for this employee"
            )

        writing_style = result[0]
        if isinstance(writing_style, str):
            import json
            writing_style = json.loads(writing_style)

        return WritingStyleResponse(
            success=True,
            writing_style=writing_style
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching writing style: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch writing style: {str(e)}")


@router.post("/refresh", response_model=WritingStyleResponse)
async def refresh_writing_style(
    request: InitializeWritingStyleRequest,
    authenticated_user: dict = Depends(verify_auth_token) if AUTH_AVAILABLE else None
):
    """
    Manually refresh writing style with new email samples

    Useful if employee's writing style has changed significantly
    """
    try:
        # Get user email from auth
        user_email = None
        if authenticated_user and AUTH_AVAILABLE:
            user_email = authenticated_user.get('email')
            logger.info(f"Refreshing writing style for user: {user_email}")

        if not user_email:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Get database connection
        db_conn = await get_db_connection(user_email=user_email)

        # Get employee_id
        employee_id = await get_employee_id_from_email(db_conn, user_email)

        if not employee_id:
            db_conn.close()
            raise HTTPException(status_code=404, detail=f"Employee not found for email: {user_email}")

        # Convert email samples to dict format
        email_samples = [
            {'subject': sample.subject, 'body': sample.body}
            for sample in request.email_samples
        ]

        logger.info(f"Re-analyzing writing style with {len(email_samples)} samples for employee {employee_id}")

        # Re-analyze writing style (no context from existing)
        writing_style = await analyze_writing_style_with_ai(email_samples)

        # Update database
        cursor = db_conn.cursor()
        cursor.execute("""
            UPDATE employee_info
            SET writing_style = %s
            WHERE employee_id = %s
        """, (json.dumps(writing_style), employee_id))
        db_conn.commit()
        cursor.close()
        db_conn.close()

        logger.info(f"Successfully refreshed writing style for employee {employee_id}")

        return WritingStyleResponse(
            success=True,
            writing_style=writing_style,
            message="Writing style refreshed successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing writing style: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh writing style: {str(e)}")


# Development endpoints (no auth required)

@router.post("/initialize-dev", response_model=WritingStyleResponse)
async def initialize_writing_style_dev(
    request: InitializeWritingStyleRequest,
    employee_id: int
):
    """
    Development endpoint to initialize writing style without authentication
    """
    try:
        logger.info(f"DEV: Initializing writing style for employee {employee_id}")

        # Get database connection
        db_conn = await get_db_connection(employee_id=employee_id)

        # Convert email samples
        email_samples = [
            {'subject': sample.subject, 'body': sample.body}
            for sample in request.email_samples
        ]

        # Analyze writing style
        writing_style = await analyze_writing_style_with_ai(email_samples)

        # Save to database
        cursor = db_conn.cursor()
        cursor.execute("""
            UPDATE employee_info
            SET writing_style = %s
            WHERE employee_id = %s
        """, (json.dumps(writing_style), employee_id))
        db_conn.commit()
        cursor.close()
        db_conn.close()

        logger.info(f"DEV: Successfully initialized writing style for employee {employee_id}")

        return WritingStyleResponse(
            success=True,
            writing_style=writing_style,
            message="Writing style initialized successfully"
        )

    except Exception as e:
        logger.error(f"DEV: Error initializing writing style: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize writing style: {str(e)}")


@router.get("/dev")
async def get_writing_style_dev(employee_id: int):
    """
    Development endpoint to get writing style without authentication
    """
    try:
        logger.info(f"DEV: Fetching writing style for employee {employee_id}")

        # Get database connection
        db_conn = await get_db_connection(employee_id=employee_id)

        # Get writing style
        cursor = db_conn.cursor()
        cursor.execute("""
            SELECT writing_style FROM employee_info WHERE employee_id = %s
        """, (employee_id,))
        result = cursor.fetchone()
        cursor.close()
        db_conn.close()

        if not result or not result[0]:
            return {
                "success": True,
                "writing_style": None,
                "message": "No writing style set"
            }

        writing_style = result[0]
        if isinstance(writing_style, str):
            import json
            writing_style = json.loads(writing_style)

        return {
            "success": True,
            "writing_style": writing_style
        }

    except Exception as e:
        logger.error(f"DEV: Error fetching writing style: {e}")
        raise HTTPException(status_code=500, detail=str(e))


logger.info("INIT: Writing style router initialized with prefix: /api/user-settings/writing-style")
