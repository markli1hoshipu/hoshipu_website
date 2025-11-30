"""
Email Training Router
=====================
Handles email personality training for AI-powered email generation.
Stores user email samples in employee_info.training_emails JSONB column.
Also analyzes and updates writing style based on training emails.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import psycopg2
from psycopg2.extras import Json
import os
import urllib.parse as urlparse
import sys
import json

# Import writing style service
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services'))
from writing_style_service import analyze_writing_style_with_ai

# Import database router for multi-tenant routing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))
try:
    from database_router import get_database_router
    DATABASE_ROUTER_AVAILABLE = True
except ImportError:
    DATABASE_ROUTER_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/email-training", tags=["Email Training"])

class EmailTrainingRequest(BaseModel):
    user_email: str = Field(..., description="User's email address")
    subject1: str = Field(..., min_length=1, description="First email subject")
    body1: str = Field(..., min_length=1, description="First email body")
    subject2: str = Field(..., min_length=1, description="Second email subject")
    body2: str = Field(..., min_length=1, description="Second email body")
    subject3: str = Field(..., min_length=1, description="Third email subject")
    body3: str = Field(..., min_length=1, description="Third email body")

class EmailTrainingResponse(BaseModel):
    user_email: str
    subject1: str
    body1: str
    subject2: str
    body2: str
    subject3: str
    body3: str
    created_at: datetime
    updated_at: datetime

class SuccessResponse(BaseModel):
    success: bool
    message: str

def get_db_connection(user_email: str = None):
    """Create a database connection, routing to user's database if available."""
    database_name = 'postgres'  # Default

    if user_email and DATABASE_ROUTER_AVAILABLE:
        try:
            router = get_database_router()
            database_name = router.get_database_name_for_user(user_email)
            logger.info(f"Email training router: Routed {user_email} to database: {database_name}")
        except Exception as e:
            logger.warning(f"Database routing failed for {user_email}: {e}, using default")

    try:
        conn = psycopg2.connect(
            host=os.getenv('SESSIONS_DB_HOST'),
            port=int(os.getenv('SESSIONS_DB_PORT', 5432)),
            user=os.getenv('SESSIONS_DB_USER'),
            password=os.getenv('SESSIONS_DB_PASSWORD'),
            database=database_name
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@router.post("/", response_model=EmailTrainingResponse)
async def save_email_training(request: EmailTrainingRequest):
    """Save email samples to employee_info.training_emails JSONB column and analyze writing style."""
    conn = None
    try:
        conn = get_db_connection(request.user_email)
        with conn.cursor() as cursor:
            training_data = [
                {"subject": request.subject1, "body": request.body1},
                {"subject": request.subject2, "body": request.body2},
                {"subject": request.subject3, "body": request.body3}
            ]

            update_sql = """
            UPDATE employee_info
            SET training_emails = %s, updated_at = CURRENT_TIMESTAMP
            WHERE email = %s
            RETURNING email, training_emails, created_at, updated_at, employee_id
            """

            cursor.execute(update_sql, (Json(training_data), request.user_email))
            result = cursor.fetchone()
            conn.commit()

            if result:
                emails = result[1] if result[1] else []
                employee_id = result[4]

                # Analyze and update writing style based on training emails
                try:
                    logger.info(f"Analyzing writing style for {request.user_email} from training emails")
                    writing_style = await analyze_writing_style_with_ai(training_data)

                    # Update writing_style column
                    cursor.execute("""
                        UPDATE employee_info
                        SET writing_style = %s
                        WHERE employee_id = %s
                    """, (Json(writing_style), employee_id))
                    conn.commit()

                    logger.info(f"✓ Writing style updated for {request.user_email}")
                except Exception as style_error:
                    logger.error(f"Failed to update writing style for {request.user_email}: {style_error}")
                    # Continue anyway - training emails were saved successfully

                return EmailTrainingResponse(
                    user_email=result[0],
                    subject1=emails[0]['subject'] if len(emails) > 0 else "",
                    body1=emails[0]['body'] if len(emails) > 0 else "",
                    subject2=emails[1]['subject'] if len(emails) > 1 else "",
                    body2=emails[1]['body'] if len(emails) > 1 else "",
                    subject3=emails[2]['subject'] if len(emails) > 2 else "",
                    body3=emails[2]['body'] if len(emails) > 2 else "",
                    created_at=result[2],
                    updated_at=result[3]
                )
            else:
                raise HTTPException(status_code=404, detail="Employee not found")

    except Exception as e:
        logger.error(f"Error saving email training: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/", response_model=EmailTrainingResponse)
async def get_email_training(user_email: str = Query(..., description="User's email address")):
    """Get email training data from employee_info.training_emails."""
    conn = None
    try:
        conn = get_db_connection(user_email)
        with conn.cursor() as cursor:
            select_sql = """
            SELECT email, training_emails, created_at, updated_at
            FROM employee_info
            WHERE email = %s
            """

            cursor.execute(select_sql, (user_email,))
            result = cursor.fetchone()

            if result and result[1]:
                emails = result[1]
                return EmailTrainingResponse(
                    user_email=result[0],
                    subject1=emails[0]['subject'] if len(emails) > 0 else "",
                    body1=emails[0]['body'] if len(emails) > 0 else "",
                    subject2=emails[1]['subject'] if len(emails) > 1 else "",
                    body2=emails[1]['body'] if len(emails) > 1 else "",
                    subject3=emails[2]['subject'] if len(emails) > 2 else "",
                    body3=emails[2]['body'] if len(emails) > 2 else "",
                    created_at=result[2],
                    updated_at=result[3]
                )
            else:
                raise HTTPException(status_code=404, detail="No email training found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching email training: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.delete("/", response_model=SuccessResponse)
async def delete_email_training(user_email: str = Query(..., description="User's email address")):
    """Clear training_emails from employee_info."""
    conn = None
    try:
        conn = get_db_connection(user_email)
        with conn.cursor() as cursor:
            delete_sql = """
            UPDATE employee_info
            SET training_emails = '[]'::jsonb
            WHERE email = %s
            """

            cursor.execute(delete_sql, (user_email,))
            conn.commit()

            return SuccessResponse(
                success=True,
                message="Email training deleted successfully"
            )

    except Exception as e:
        logger.error(f"Error deleting email training: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
