"""
Email Signature Router
======================
Handles email signature management with logo upload to GCS.
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import psycopg2
import os
import urllib.parse as urlparse
from pathlib import Path
from google.cloud import storage
import sys

# Import database router for multi-tenant routing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))
try:
    from database_router import get_database_router
    DATABASE_ROUTER_AVAILABLE = True
except ImportError:
    DATABASE_ROUTER_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/signature", tags=["Email Signature"])

# GCS Configuration
GCS_BUCKET_NAME = os.getenv('GCS_SIGNATURE_BUCKET', 'prelude-signature-logos')
gcs_client = storage.Client()
logger.info(f"GCS client initialized for bucket: {GCS_BUCKET_NAME}")

# Pydantic models
class SignatureRequest(BaseModel):
    user_email: str
    signature: str = Field(..., max_length=500)
    logo_url: str | None = None
    font_size: int = Field(default=12, ge=8, le=20)
    logo_height: int = Field(default=50, ge=30, le=100)

class SignatureResponse(BaseModel):
    user_email: str
    signature: str
    logo_url: str | None = None
    font_size: int
    logo_height: int
    updated_at: datetime

class LogoUploadResponse(BaseModel):
    success: bool
    logo_url: str

# Database configuration with multi-tenant routing

def get_db_connection(user_email: str = None):
    """Create a database connection, routing to user's database if available."""
    database_name = 'postgres'  # Default

    if user_email and DATABASE_ROUTER_AVAILABLE:
        try:
            router = get_database_router()
            database_name = router.get_database_name_for_user(user_email)
            logger.info(f"Signature router: Routed {user_email} to database: {database_name}")
        except Exception as e:
            logger.warning(f"Database routing failed for {user_email}: {e}, using default")

    try:
        conn = psycopg2.connect(
            host=os.getenv('SESSIONS_DB_HOST'),
            port=int(os.getenv('SESSIONS_DB_PORT', 0)) or None,
            user=os.getenv('SESSIONS_DB_USER'),
            password=os.getenv('SESSIONS_DB_PASSWORD'),
            database=database_name
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

# Endpoints

@router.post("/upload-logo", response_model=LogoUploadResponse)
async def upload_logo(user_email: str = Query(...), file: UploadFile = File(...)):
    """Upload signature logo to Google Cloud Storage."""
    try:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files allowed")

        ext = Path(file.filename).suffix
        filename = f"signatures/{user_email.replace('@', '_').replace('.', '_')}_{int(datetime.now().timestamp())}{ext}"

        bucket = gcs_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(filename)

        file.file.seek(0)
        blob.upload_from_file(file.file, content_type=file.content_type)

        logo_url = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{filename}"
        logger.info(f"Logo uploaded to GCS: {logo_url}")

        return LogoUploadResponse(success=True, logo_url=logo_url)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading logo: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload logo: {str(e)}")


@router.post("/", response_model=SignatureResponse)
async def save_signature(request: SignatureRequest):
    """Save or update email signature for user."""
    conn = None
    try:
        conn = get_db_connection(request.user_email)
        with conn.cursor() as cursor:
            # Update employee_info table
            update_sql = """
            UPDATE employee_info
            SET email_signature = %s,
                signature_logo_url = %s,
                signature_font_size = %s,
                signature_logo_height = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = %s
            RETURNING email, email_signature, signature_logo_url, signature_font_size, signature_logo_height, updated_at
            """
            cursor.execute(update_sql, (
                request.signature,
                request.logo_url,
                request.font_size,
                request.logo_height,
                request.user_email
            ))
            result = cursor.fetchone()
            conn.commit()

            if result:
                return SignatureResponse(
                    user_email=result[0],
                    signature=result[1],
                    logo_url=result[2],
                    font_size=result[3],
                    logo_height=result[4],
                    updated_at=result[5]
                )
            else:
                raise HTTPException(status_code=404, detail="Employee not found for this email")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving signature: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/", response_model=SignatureResponse)
async def get_signature(user_email: str = Query(..., description="User's email address")):
    """Get email signature for a user."""
    conn = None
    try:
        conn = get_db_connection(user_email)
        with conn.cursor() as cursor:
            select_sql = """
            SELECT email, email_signature, signature_logo_url, signature_font_size, signature_logo_height, updated_at
            FROM employee_info
            WHERE email = %s
            """

            cursor.execute(select_sql, (user_email,))
            result = cursor.fetchone()

            if result and result[1]:
                return SignatureResponse(
                    user_email=result[0],
                    signature=result[1],
                    logo_url=result[2],
                    font_size=result[3] or 12,
                    logo_height=result[4] or 50,
                    updated_at=result[5]
                )
            else:
                raise HTTPException(status_code=404, detail="No signature found for this user")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching signature: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


