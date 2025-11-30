"""
Invitations Router for User Management
======================================

This module handles API endpoints for managing user invitations and team members.
It connects to the PostgreSQL database to manage the user_profiles table.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import logging
from datetime import datetime
import urllib.parse as urlparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/invitations", tags=["invitations"])

# Router debug info
import logging
logger = logging.getLogger(__name__)
logger.info(f"INIT: Invitations router initialized with prefix: {router.prefix}")

# Pydantic models for request/response
class InvitationCreate(BaseModel):
    email: EmailStr
    company: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., min_length=2, max_length=50)
    database_name: str = Field(..., min_length=2, max_length=100)

class InvitationUpdate(BaseModel):
    company: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[str] = Field(None, min_length=2, max_length=50)
    database_name: Optional[str] = Field(None, min_length=2, max_length=100)

class InvitationResponse(BaseModel):
    email: str
    company: str
    role: str
    database_name: str
    created_at: datetime
    updated_at: Optional[datetime]

# Database configuration
def get_db_config() -> dict:
    """Load database configuration from environment variables."""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        # Parse DATABASE_URL
        parsed = urlparse.urlparse(database_url)
        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'user': parsed.username,
            'password': urlparse.unquote(parsed.password) if parsed.password else None,
            'database': 'prelude_user_analytics'
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

def get_db_connection():
    """Create a database connection."""
    config = get_db_config()
    try:
        conn = psycopg2.connect(**config)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed"
        )

# API Endpoints

@router.get("/user/{email}", response_model=Dict[str, Any])
async def get_user_invitations(email: str):
    """
    Get invitations for a specific user email and all team members in their company.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # First, get the user's information
        cursor.execute("""
            SELECT email, name, company, role, db_name as database_name, created_at, updated_at
            FROM user_profiles
            WHERE email = %s
        """, (email,))
        
        user_info = cursor.fetchone()
        
        if not user_info:
            # User not found
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email {email} not found"
            )
        
        # Get all users from the same company
        cursor.execute("""
            SELECT email, name, company, role, db_name as database_name, created_at, updated_at
            FROM user_profiles
            WHERE company = %s
            ORDER BY email
        """, (user_info['company'],))
        
        company_users = cursor.fetchall()
        
        # Convert datetime objects to strings for JSON serialization
        for user in company_users:
            if user['created_at']:
                user['created_at'] = user['created_at'].isoformat()
            if user['updated_at']:
                user['updated_at'] = user['updated_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        return {
            "user": dict(user_info),
            "invitations": [dict(row) for row in company_users]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user invitations: {e}")
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch invitations"
        )

@router.get("/company/{company}", response_model=Dict[str, Any])
async def get_company_invitations(company: str):
    """
    Get all invitations for a specific company.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT email, name, company, role, db_name as database_name, created_at, updated_at
            FROM user_profiles
            WHERE company = %s
            ORDER BY email
        """, (company,))
        
        invitations = cursor.fetchall()
        
        # Convert datetime objects to strings for JSON serialization
        for inv in invitations:
            if inv['created_at']:
                inv['created_at'] = inv['created_at'].isoformat()
            if inv['updated_at']:
                inv['updated_at'] = inv['updated_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        return {"invitations": [dict(row) for row in invitations]}
        
    except Exception as e:
        logger.error(f"Error fetching company invitations: {e}")
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch company invitations"
        )

@router.post("", response_model=Dict[str, Any])
async def create_invitation(invitation: InvitationCreate):
    """
    Create a new invitation (add a new user to the database).
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if email already exists
        cursor.execute("""
            SELECT email FROM user_profiles
            WHERE email = %s
        """, (invitation.email,))
        
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email {invitation.email} already exists"
            )
        
        # Insert new invitation
        cursor.execute("""
            INSERT INTO user_profiles (email, company, role, db_name, name)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING email, company, role, db_name as database_name, created_at
        """, (
            invitation.email,
            invitation.company,
            invitation.role,
            invitation.database_name,
            invitation.email.split('@')[0]  # Use email prefix as default name
        ))
        
        new_invitation = cursor.fetchone()
        conn.commit()
        
        # Convert datetime to string for JSON serialization
        if new_invitation['created_at']:
            new_invitation['created_at'] = new_invitation['created_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": f"Successfully invited {invitation.email}",
            "invitation": dict(new_invitation)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invitation: {e}")
        conn.rollback()
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invitation"
        )

@router.put("/{email}", response_model=Dict[str, Any])
async def update_invitation(email: str, update_data: InvitationUpdate):
    """
    Update an existing invitation.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if user exists
        cursor.execute("""
            SELECT email FROM user_profiles
            WHERE email = %s
        """, (email,))
        
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email {email} not found"
            )
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if update_data.company is not None:
            update_fields.append("company = %s")
            values.append(update_data.company)
        
        if update_data.role is not None:
            update_fields.append("role = %s")
            values.append(update_data.role)
        
        if update_data.database_name is not None:
            update_fields.append("db_name = %s")
            values.append(update_data.database_name)
        
        if not update_fields:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Add updated_at timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        values.append(email)
        
        # Execute update
        query = f"""
            UPDATE user_profiles
            SET {', '.join(update_fields)}
            WHERE email = %s
            RETURNING email, company, role, db_name as database_name, created_at, updated_at
        """
        
        cursor.execute(query, values)
        updated_invitation = cursor.fetchone()
        conn.commit()
        
        # Convert datetime to string for JSON serialization
        if updated_invitation['created_at']:
            updated_invitation['created_at'] = updated_invitation['created_at'].isoformat()
        if updated_invitation['updated_at']:
            updated_invitation['updated_at'] = updated_invitation['updated_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": f"Successfully updated {email}",
            "invitation": dict(updated_invitation)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invitation: {e}")
        conn.rollback()
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update invitation"
        )

@router.delete("/{email}", response_model=Dict[str, Any])
async def delete_invitation(email: str):
    """
    Delete an invitation (remove a user from the database).
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("""
            SELECT email FROM user_profiles
            WHERE email = %s
        """, (email,))
        
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email {email} not found"
            )
        
        # Delete the user
        cursor.execute("""
            DELETE FROM user_profiles
            WHERE email = %s
        """, (email,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": f"Successfully deleted {email}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invitation: {e}")
        conn.rollback()
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete invitation"
        )

@router.get("/check/{email}", response_model=Dict[str, bool])
async def check_user_exists(email: str):
    """
    Check if a user exists in the database.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT email FROM user_profiles
            WHERE email = %s
        """, (email,))
        
        exists = cursor.fetchone() is not None
        
        cursor.close()
        conn.close()
        
        return {"exists": exists}
        
    except Exception as e:
        logger.error(f"Error checking user existence: {e}")
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check user existence"
        )