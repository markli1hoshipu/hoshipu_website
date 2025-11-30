"""
Email Template Router
=====================
Handles email template management for template-based email system.
Includes AI generation for templates.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID, uuid4
import logging
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from psycopg2.extensions import register_adapter, AsIs
import os
import urllib.parse as urlparse
import re
import sys
from services.email_generator import generate_email_with_ai, build_template_generation_prompt, build_leadgen_template_generation_prompt

# Import database router for multi-tenant routing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))
try:
    from database_router import get_database_router
    DATABASE_ROUTER_AVAILABLE = True
except ImportError:
    DATABASE_ROUTER_AVAILABLE = False

# Register UUID adapter for psycopg2
def adapt_uuid(uuid_obj):
    return AsIs(f"'{str(uuid_obj)}'")

try:
    from uuid import UUID as PyUUID
    register_adapter(PyUUID, adapt_uuid)
except:
    pass

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["Email Templates"])

# Valid tokens by template type
VALID_CRM_TOKENS = {'name', 'primary_contact', 'industry', 'email', 'phone'}
VALID_LEADGEN_TOKENS = {'company', 'location', 'industry', 'website', 'phone'}

# Legacy reference (for backwards compatibility)
VALID_TOKENS = VALID_CRM_TOKENS

# Pydantic Models

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    channel: str = Field(default="email")
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    template_type: str = Field(default="crm")
    is_shared: bool = Field(default=False, description="If True, template is shared with all users (created_by = NULL)")

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    is_active: Optional[bool] = None

class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    channel: str
    subject: str
    body: str
    tokens: List[str]
    is_active: bool
    is_archived: bool
    performance_stats: Dict
    created_by: Optional[int]
    is_shared: bool
    created_at: datetime
    updated_at: datetime

class SendTrackingRequest(BaseModel):
    total_sends: int
    successful_sends: int
    failed_sends: int

class PreviewRequest(BaseModel):
    client_id: int

class TemplateGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, description="User's instructions for generating the template")

class TemplateGenerateResponse(BaseModel):
    subject: str
    body: str
    tokens: List[str]

# Token Utilities

def extract_tokens(text: str) -> List[str]:
    """Extract [token] patterns from text"""
    pattern = r'\[(\w+)\]'
    tokens = re.findall(pattern, text)
    return list(set(tokens))

def validate_tokens(tokens: List[str], template_type: str = 'crm') -> Dict[str, List[str]]:
    """Check if tokens are valid based on template type"""
    valid_token_set = VALID_LEADGEN_TOKENS if template_type == 'leadgen' else VALID_CRM_TOKENS
    invalid = [t for t in tokens if t not in valid_token_set]
    return {
        "valid": [t for t in tokens if t in valid_token_set],
        "invalid": invalid,
        "valid_token_set": valid_token_set
    }

def render_template(template: str, client_data: dict) -> str:
    """Replace [tokens] with actual data"""
    result = template
    for token, value in client_data.items():
        if value is None:
            value = ''
        result = result.replace(f"[{token}]", str(value))
    return result

# Database Configuration with multi-tenant routing

def get_db_connection(user_email: str = None):
    """Create a database connection, routing to user's database if available."""
    database_name = 'postgres'  # Default

    if user_email and DATABASE_ROUTER_AVAILABLE:
        try:
            router = get_database_router()
            database_name = router.get_database_name_for_user(user_email)
            logger.info(f"Template router: Routed {user_email} to database: {database_name}")
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

# API Endpoints

@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    user_email: str = Query(..., description="User's email address"),
    channel: str = Query(default="email"),
    is_active: bool = Query(default=True),
    template_type: Optional[str] = Query(default=None, description="Filter by template type (crm/leadgen)")
):
    """List templates: shared templates (is_shared = true) + user's own templates, optionally filtered by type"""
    conn = None
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get employee_id from email
        cursor.execute("SELECT employee_id FROM employee_info WHERE email = %s", (user_email,))
        emp_result = cursor.fetchone()
        employee_id = emp_result['employee_id'] if emp_result else None

        # Build query: show shared templates (is_shared = true) + user's own templates
        query = """
            SELECT * FROM templates
            WHERE channel = %s
            AND is_active = %s
            AND is_archived = false
            AND (is_shared = true OR created_by = %s)
        """
        params = [channel, is_active, employee_id]

        # Add template_type filter if provided
        if template_type:
            query += " AND template_type = %s"
            params.append(template_type)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        return [TemplateResponse(**row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.post("", response_model=TemplateResponse)
async def create_template(
    request: TemplateCreate,
    user_email: str = Query(..., description="User's email address")
):
    """
    Create a new template.

    Sharing Logic:
    - If is_shared=True: created_by=NULL (visible to all users, read-only)
    - If is_shared=False: created_by=employee_id (visible only to creator, editable)
    """
    conn = None
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get employee_id from email
        cursor.execute("SELECT employee_id FROM employee_info WHERE email = %s", (user_email,))
        emp_result = cursor.fetchone()
        employee_id = emp_result['employee_id'] if emp_result else None

        # Extract & validate tokens based on template type
        all_tokens = list(set(extract_tokens(request.subject) + extract_tokens(request.body)))
        validation = validate_tokens(all_tokens, request.template_type)
        if validation['invalid']:
            raise HTTPException(400, f"Invalid tokens: {validation['invalid']}. Valid tokens: {list(validation['valid_token_set'])}")

        # Always store created_by for ownership tracking
        # is_shared controls visibility to all users
        created_by_value = employee_id

        # Insert template
        cursor.execute("""
            INSERT INTO templates
            (id, name, channel, subject, body, tokens, created_by, performance_stats, generation_level, description, template_type, is_shared)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s)
            RETURNING *
        """, (
            uuid4(), request.name, request.channel, request.subject, request.body,
            Json(all_tokens), created_by_value,
            Json({"total_sends": 0, "successful_sends": 0, "failed_sends": 0, "success_rate": 100.0}),
            request.description, request.template_type, request.is_shared
        ))

        row = cursor.fetchone()
        conn.commit()

        logger.info(f"Created template '{request.name}' by {user_email}")
        return TemplateResponse(**row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    user_email: str = Query(..., description="User's email address")
):
    """Get a single template by ID"""
    conn = None
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT * FROM templates WHERE id = %s", (template_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, "Template not found")

        return TemplateResponse(**row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    request: TemplateUpdate,
    user_email: str = Query(..., description="User's email address")
):
    """Update an existing template - only personal templates can be edited"""
    conn = None
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get employee_id from email
        cursor.execute("SELECT employee_id FROM employee_info WHERE email = %s", (user_email,))
        emp_result = cursor.fetchone()
        employee_id = emp_result['employee_id'] if emp_result else None

        # Check ownership: cannot edit shared templates
        cursor.execute("SELECT created_by, is_shared FROM templates WHERE id = %s", (template_id,))
        template = cursor.fetchone()
        if not template:
            raise HTTPException(404, "Template not found")
        if template['is_shared']:
            raise HTTPException(403, "Cannot edit shared templates. Shared templates are read-only.")
        if template['created_by'] != employee_id:
            raise HTTPException(403, "Can only edit your own templates")

        # Build dynamic UPDATE
        updates = []
        params = []

        if request.name:
            updates.append("name = %s")
            params.append(request.name)
        if request.subject:
            updates.append("subject = %s")
            params.append(request.subject)
        if request.body:
            updates.append("body = %s")
            params.append(request.body)
        if request.description is not None:
            updates.append("description = %s")
            params.append(request.description)
        if request.is_active is not None:
            updates.append("is_active = %s")
            params.append(request.is_active)

        if not updates:
            raise HTTPException(400, "No fields to update")

        # Re-extract tokens if subject/body changed
        if request.subject or request.body:
            cursor.execute("SELECT subject, body, template_type FROM templates WHERE id = %s", (template_id,))
            current = cursor.fetchone()
            if not current:
                raise HTTPException(404, "Template not found")

            subj = request.subject or current['subject']
            bod = request.body or current['body']
            tokens = list(set(extract_tokens(subj) + extract_tokens(bod)))

            # Get template_type for validation
            template_type = current.get('template_type', 'crm')

            # Validate new tokens based on template type
            validation = validate_tokens(tokens, template_type)
            if validation['invalid']:
                raise HTTPException(400, f"Invalid tokens: {validation['invalid']}. Valid tokens: {list(validation['valid_token_set'])}")

            updates.append("tokens = %s")
            params.append(Json(tokens))

        updates.append("updated_at = NOW()")
        params.append(template_id)

        cursor.execute(f"""
            UPDATE templates SET {', '.join(updates)}
            WHERE id = %s
            RETURNING *
        """, params)

        row = cursor.fetchone()
        conn.commit()

        logger.info(f"Updated template {template_id}")
        return TemplateResponse(**row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating template: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    user_email: str = Query(..., description="User's email address")
):
    """Delete a template (only user's own templates, not shared)"""
    conn = None
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get employee_id
        cursor.execute("SELECT employee_id FROM employee_info WHERE email = %s", (user_email,))
        emp = cursor.fetchone()
        employee_id = emp['employee_id'] if emp else None

        # Check ownership: only delete if created_by = employee_id
        cursor.execute("SELECT created_by FROM templates WHERE id = %s", (template_id,))
        template = cursor.fetchone()
        if not template:
            raise HTTPException(404, "Template not found")
        if template['created_by'] != employee_id:
            raise HTTPException(403, "Can only delete your own templates")

        # Delete
        cursor.execute("DELETE FROM templates WHERE id = %s", (template_id,))
        conn.commit()
        logger.info(f"Deleted template {template_id} by {user_email}")
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting template: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.post("/{template_id}/preview")
async def preview_template(
    template_id: str,
    request: PreviewRequest,
    user_email: str = Query(..., description="User's email address")
):
    """Preview template with actual client data"""
    conn = None
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get template
        cursor.execute("SELECT subject, body FROM templates WHERE id = %s", (template_id,))
        template = cursor.fetchone()
        if not template:
            raise HTTPException(404, "Template not found")

        # Get client data from CRM database
        # Note: This assumes clients_info is in same database
        cursor.execute("""
            SELECT name, primary_contact, industry, email, phone
            FROM clients_info
            WHERE client_id = %s
        """, (request.client_id,))

        client = cursor.fetchone()
        if not client:
            raise HTTPException(404, "Client not found")

        client_data = {
            'name': client['name'],
            'primary_contact': client['primary_contact'],
            'industry': client['industry'],
            'email': client['email'],
            'phone': client['phone']
        }

        # Render template
        rendered_subject = render_template(template['subject'], client_data)
        rendered_body = render_template(template['body'], client_data)

        return {
            "subject": rendered_subject,
            "body": rendered_body
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.post("/{template_id}/track-send")
async def track_send(
    template_id: str,
    request: SendTrackingRequest,
    user_email: str = Query(..., description="User's email address")
):
    """Update template performance statistics"""
    conn = None
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get current stats
        cursor.execute("SELECT performance_stats FROM templates WHERE id = %s", (template_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Template not found")

        current_stats = row['performance_stats'] if row else {}

        # Increment stats
        new_total = current_stats.get('total_sends', 0) + request.total_sends
        new_successful = current_stats.get('successful_sends', 0) + request.successful_sends
        new_failed = current_stats.get('failed_sends', 0) + request.failed_sends
        success_rate = (new_successful / new_total * 100) if new_total > 0 else 100.0

        # Update performance stats
        cursor.execute("""
            UPDATE templates
            SET performance_stats = %s, updated_at = NOW()
            WHERE id = %s
        """, (Json({
            "total_sends": new_total,
            "successful_sends": new_successful,
            "failed_sends": new_failed,
            "success_rate": round(success_rate, 1),
            "last_used_at": datetime.now().isoformat()
        }), template_id))

        conn.commit()
        logger.info(f"Updated stats for template {template_id}: {new_total} total sends")
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking sends: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.post("/generate", response_model=TemplateGenerateResponse)
async def generate_template(
    request: TemplateGenerateRequest,
    user_email: str = Query(..., description="User's email address"),
    template_type: str = Query(default="crm", description="Template type: crm or leadgen")
):
    """
    Generate email template using AI based on user's prompt and type.

    This endpoint generates a template with tokens appropriate for the type:
    - CRM: [name], [primary_contact], [industry], [email], [phone]
    - Lead Gen: [company], [location], [industry], [website], [phone]
    """
    try:
        logger.info(f"Generating {template_type} template for {user_email} with prompt length: {len(request.prompt)}")

        # Fetch writing style
        from services.writing_style_service import fetch_writing_style_by_email, format_writing_style_for_prompt

        writing_style_data = await fetch_writing_style_by_email(user_email)
        writing_style_text = format_writing_style_for_prompt(writing_style_data)

        if writing_style_data:
            logger.info(f"✓ Using writing style for template generation")
        else:
            logger.info(f"No writing style found for {user_email}, generating without style guidance")

        # Build prompt based on template type
        if template_type == "leadgen":
            prompt = build_leadgen_template_generation_prompt(request.prompt, writing_style_text)
        else:
            prompt = build_template_generation_prompt(request.prompt, writing_style_text)

        # Generate with AI
        result = await generate_email_with_ai(prompt)

        # Extract tokens from generated content
        all_tokens = list(set(extract_tokens(result['subject']) + extract_tokens(result['body'])))

        logger.info(f"✅ Generated template with {len(all_tokens)} tokens: {all_tokens}")

        return TemplateGenerateResponse(
            subject=result['subject'],
            body=result['body'],
            tokens=all_tokens
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating template: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")
