"""
Writing Style Service - Stateless version (no sample storage)
Updates writing style immediately when emails are sent
"""

import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import httpx
import os

logger = logging.getLogger(__name__)


async def analyze_writing_style_with_ai(emails: List[Dict[str, str]]) -> Dict:
    """
    Analyze writing style using OpenAI API

    Args:
        emails: List of dicts with 'subject' and 'body' keys

    Returns:
        Writing style analysis dict
    """
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured")

    model = os.getenv('GPT_4_1_MINI_MODEL', 'gpt-4.1-mini')

    # Build prompt with all emails
    email_list = []
    for i, email in enumerate(emails, 1):
        subject = email.get('subject', 'No subject')
        body = email.get('body', '')

        # Truncate very long emails
        if len(body) > 1000:
            body = body[:1000] + "..."

        email_list.append(f"""<email>
  <subject>{subject}</subject>
  <body>{body}</body>
</email>""")

    emails_xml = "\n".join(email_list)

    system_prompt = """You are a writing style analyst specializing in email communication patterns.

Analyze the user's writing style based on their sent emails. Identify patterns in their
communication style and create a personalized style guide with these elements:

- Typical Length: Average length of their emails (e.g., "2-3 sentences", "1-2 paragraphs")

- Formality: Whether their style is formal, informal, or mixed (e.g., "Informal with professional undertones")

- Common Greeting: Standard opening pattern (e.g., "Hi," or "Hey [name]," or "No greeting - starts directly")

- Notable Traits: Distinctive characteristics like:
  - Frequent use of contractions
  - Beginning sentences with conjunctions
  - Concise direct responses
  - Use of exclamation points
  - Minimal closings
  - Using abbreviations
  - Including personal context
  - Using line breaks for multiple points
  - Tone (friendly, serious, casual, etc.)

- Examples: 2-3 representative sentences or phrases from their emails that showcase their style

Return ONLY valid JSON with this exact structure (no markdown, no code blocks)."""

    user_prompt = f"""Analyze the writing style from these emails:

<emails>
{emails_xml}
</emails>

Return ONLY this JSON structure:
{{
  "typicalLength": "string description",
  "formality": "string description",
  "commonGreeting": "string description",
  "notableTraits": ["trait1", "trait2", "trait3"],
  "examples": ["example1", "example2", "example3"]
}}"""

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000,
                    "response_format": {"type": "json_object"}  # Force JSON response
                }
            )
            response.raise_for_status()
            result = response.json()

        content = result['choices'][0]['message']['content'].strip()
        logger.info(f"AI response received: {content[:200]}...")

        # Parse JSON response
        try:
            style_data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: try to extract JSON from markdown code blocks
            logger.warning("Failed to parse JSON directly, attempting to extract from markdown")
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            style_data = json.loads(content)

        # Validate required fields
        required_fields = ['typicalLength', 'formality', 'commonGreeting', 'notableTraits', 'examples']
        for field in required_fields:
            if field not in style_data:
                logger.warning(f"Missing required field: {field}, adding default")
                if field in ['notableTraits', 'examples']:
                    style_data[field] = []
                else:
                    style_data[field] = "Not specified"

        # Add metadata
        style_data['metadata'] = {
            'lastUpdated': datetime.now().isoformat(),
            'emailsSampled': len(emails),
            'model': model
        }

        logger.info(f"Successfully analyzed writing style from {len(emails)} emails")
        return style_data

    except httpx.HTTPError as e:
        logger.error(f"HTTP error during writing style analysis: {e}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}, content: {content[:500]}")
        raise
    except Exception as e:
        logger.error(f"Error analyzing writing style: {e}")
        raise


async def update_employee_writing_style(
    db_conn,
    employee_id: int,
    new_emails: List[Dict[str, str]]
) -> Dict:
    """
    Update employee's writing style by analyzing new emails + existing style

    Args:
        db_conn: Database connection
        employee_id: Employee ID
        new_emails: List of NEW emails just sent (dicts with 'subject', 'body')

    Returns:
        Updated writing style dict
    """
    try:
        logger.info(f"Updating writing style for employee {employee_id} with {len(new_emails)} new emails")

        # 1. Fetch existing writing style
        result = await db_conn.fetch_one("""
            SELECT writing_style
            FROM employee_info
            WHERE employee_id = :emp_id
        """, {'emp_id': employee_id})

        existing_style = result['writing_style'] if result else None

        # Parse existing style if it's a string
        if existing_style and isinstance(existing_style, str):
            existing_style = json.loads(existing_style)

        # 2. Build email list for analysis
        emails_for_analysis = new_emails.copy()  # Start with new emails

        # If existing style has examples, include them for context (up to 3)
        if existing_style and existing_style.get('examples'):
            for example in existing_style['examples'][:3]:
                emails_for_analysis.append({
                    'subject': '(Previous email)',
                    'body': example
                })
            logger.info(f"Including {min(3, len(existing_style['examples']))} examples from existing style")

        # 3. Analyze writing style with AI (single API call)
        logger.info(f"Analyzing {len(emails_for_analysis)} total emails (new + context)")
        writing_style = await analyze_writing_style_with_ai(emails_for_analysis)

        # 4. Update employee_info table
        await db_conn.execute("""
            UPDATE employee_info
            SET writing_style = :style
            WHERE employee_id = :emp_id
        """, {
            'style': json.dumps(writing_style),
            'emp_id': employee_id
        })

        logger.info(f"Successfully updated writing style for employee {employee_id}")
        return writing_style

    except Exception as e:
        logger.error(f"Error updating writing style for employee {employee_id}: {e}")
        raise


async def get_employee_writing_style(db_conn, employee_id: int) -> Optional[Dict]:
    """
    Get employee's current writing style

    Args:
        db_conn: Database connection
        employee_id: Employee ID

    Returns:
        Writing style dict or None if not set
    """
    try:
        result = await db_conn.fetch_one("""
            SELECT writing_style
            FROM employee_info
            WHERE employee_id = :emp_id
        """, {'emp_id': employee_id})

        if not result or not result['writing_style']:
            logger.info(f"No writing style found for employee {employee_id}")
            return None

        style = result['writing_style']

        # Handle both JSONB (dict) and string formats
        if isinstance(style, str):
            style = json.loads(style)

        logger.info(f"Retrieved writing style for employee {employee_id}")
        return style

    except Exception as e:
        logger.error(f"Error fetching writing style for employee {employee_id}: {e}")
        return None


def format_writing_style_for_prompt(writing_style: Optional[Dict]) -> str:
    """
    Format writing style dict into prompt text

    Args:
        writing_style: Writing style dict or None

    Returns:
        Formatted string to inject into email generation prompt
    """
    if not writing_style:
        return ""

    try:
        traits_list = "\n".join(f"- {trait}" for trait in writing_style.get('notableTraits', []))
        examples_list = "\n".join(f'- "{ex}"' for ex in writing_style.get('examples', []))

        return f"""
<writing_style>
Typical Length: {writing_style.get('typicalLength', 'N/A')}
Formality: {writing_style.get('formality', 'N/A')}
Common Greeting: {writing_style.get('commonGreeting', 'N/A')}

Notable Traits:
{traits_list}

Example Phrases from Past Emails:
{examples_list}
</writing_style>

CRITICAL INSTRUCTION: Match the user's writing style EXACTLY. Use their:
- Typical email length and structure
- Level of formality
- Greeting style (or lack thereof)
- Notable traits (contractions, punctuation, brevity, etc.)
- Tone and phrasing from the examples above

Generate an email that sounds like the user wrote it, not a generic AI assistant.
"""
    except Exception as e:
        logger.error(f"Error formatting writing style for prompt: {e}")
        return ""


async def fetch_writing_style_by_email(user_email: str) -> Optional[Dict]:
    """
    Fetch writing style for a user by their email address.

    Args:
        user_email: User's email address

    Returns:
        Writing style dict or None if not found
    """
    try:
        import psycopg2
        import urllib.parse as urlparse
        import sys

        # Determine database using database router
        database_name = None
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))
            from database_router import get_database_router
            router = get_database_router()
            database_name = router.get_database_name_for_user(user_email)
            logger.info(f"Routed {user_email} to database: {database_name}")
        except Exception as e:
            logger.error(f"Database routing failed for {user_email}: {e}")
            return None

        # Get connection using SESSIONS_DB environment variables
        conn = psycopg2.connect(
            host=os.getenv('SESSIONS_DB_HOST'),
            port=int(os.getenv('SESSIONS_DB_PORT', 5432)),
            user=os.getenv('SESSIONS_DB_USER'),
            password=os.getenv('SESSIONS_DB_PASSWORD'),
            database=database_name
        )

        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT employee_id, writing_style
                FROM employee_info
                WHERE email = %s
            """, (user_email,))

            result = cursor.fetchone()
            cursor.close()

            if not result:
                logger.info(f"No employee found for email {user_email}")
                return None

            writing_style = result[1]

            if not writing_style:
                logger.info(f"No writing style found for {user_email}")
                return None

            # Handle both JSONB (dict) and string formats
            if isinstance(writing_style, str):
                writing_style = json.loads(writing_style)

            logger.info(f"✓ Fetched writing style for {user_email}")
            return writing_style

        finally:
            conn.close()

    except Exception as e:
        logger.warning(f"Failed to fetch writing style for {user_email}: {e}")
        return None
