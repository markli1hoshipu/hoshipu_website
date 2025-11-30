"""
AI Email Template Generator
============================
Generates email templates with tokens using OpenAI.
Moved from CRM service for centralized template management.
"""

import os
import json
import logging
from typing import Dict
from datetime import datetime
from fastapi import HTTPException

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)


def build_template_generation_prompt(custom_prompt: str, writing_style: str = "") -> str:
    """
    Build prompt for CRM template generation with CRM-specific tokens.

    Args:
        custom_prompt: User's instructions for the template
        writing_style: Optional formatted writing style string

    Returns:
        Complete prompt string for AI generation
    """
    current_date = datetime.now().strftime("%Y-%m-%d")

    prompt = f"""Email Template Generator for CRM Mass Email (Existing Customers)

CRITICAL CONTEXT

You are generating an email TEMPLATE for a MASS EMAIL campaign to multiple CRM clients.
This template will be sent to MULTIPLE different companies, so it must be generic enough to work for all of them.

Date: {current_date}

USER'S CUSTOM INSTRUCTIONS:
{custom_prompt}
{writing_style}
INSTRUCTIONS

1. Generate a template that works for MULTIPLE clients, not just one specific client.
2. Use ONLY these exact placeholders: [name], [primary_contact], [industry], [email], [phone]
3. DO NOT create any other placeholders or tokens (e.g., NO [your_company_name], NO [sender_name], etc.)
4. Do NOT reference specific past conversations (this is a mass email to multiple clients).
5. Keep tone professional and relationship-focused (existing CRM clients, not cold outreach).
6. Focus on value proposition and continued partnership.
7. Make the email easy to personalize with placeholders.
8. Keep email body to 80-120 words maximum.

AVAILABLE PLACEHOLDERS (use these liberally, but ONLY these)

- [name] - company name (REQUIRED - use this multiple times in the email)
- [primary_contact] - primary contact person
- [industry] - business industry
- [email] - client email address
- [phone] - phone number

CRITICAL: Do NOT invent new placeholders. Use ONLY the 5 placeholders listed above.

STYLE GUIDELINES

1. Start with "Hi [primary_contact]," (with two newlines after comma).
2. Use [name] placeholder naturally throughout the email:
   GOOD: "I wanted to check in on how things are going at [name]."
   GOOD: "We're committed to supporting [name] as you continue to grow."
   BAD: "I wanted to check in on how things are going." (not personalized enough)
3. Keep subject lines short and include placeholders:
   GOOD: "Quick check-in for [name]"
   GOOD: "Supporting [name]'s success in [industry]"
   BAD: "Quick check-in" (too generic, no placeholder)
4. Always end with "Regards," (no name or signature - it will be added automatically).
5. Be human and authentic. Avoid corporate jargon.

OUTPUT FORMAT

CRITICAL INSTRUCTIONS:
1. Use NEWLINE CHARACTERS (\\n) for line breaks, NOT HTML tags like <br>
2. Use plain text format ONLY - no HTML markup
3. Separate paragraphs with double newlines (\\n\\n)
4. The email body will be plain text with newline characters

Return your response as a JSON object with this EXACT structure:
{{
  "subject": "Email subject line with [placeholders]",
  "body": "Email body with [placeholders] throughout.\\n\\nMake sure to use [name] and [primary_contact] multiple times for personalization.\\n\\nRegards,"
}}

EXAMPLE of correct newline usage in JSON:
{{
  "subject": "Quick check-in for [name]",
  "body": "Hi [primary_contact],\\n\\nHope all is well at [name]! Just checking in to see how things are going.\\n\\nRegards,"
}}

CRITICAL: Use \\n for newlines (NOT <br> tags). Ensure JSON is valid. Use double quotes for strings.
"""

    return prompt


def build_leadgen_template_generation_prompt(custom_prompt: str, writing_style: str = "") -> str:
    """
    Build prompt for Lead Gen template generation with Lead Gen-specific tokens.

    Args:
        custom_prompt: User's instructions for the template
        writing_style: Optional formatted writing style string

    Returns:
        Complete prompt string for AI generation
    """
    current_date = datetime.now().strftime("%Y-%m-%d")

    prompt = f"""Email Template Generator for LEAD GENERATION Mass Email (Prospects)

CRITICAL CONTEXT

You are generating an email TEMPLATE for LEAD GENERATION (cold outreach to prospects).
This template will be sent to MULTIPLE different leads/prospects, so it must be generic enough to work for all of them.

Date: {current_date}

USER'S CUSTOM INSTRUCTIONS:
{custom_prompt}
{writing_style}
INSTRUCTIONS

1. Generate a template for LEAD GENERATION (cold outreach, not existing clients).
2. Use ONLY these exact placeholders: [company], [location], [industry], [website], [phone]
3. DO NOT create any other placeholders or tokens (e.g., NO [your_company_name], NO [sender_name], etc.)
4. Keep tone professional but approachable for cold outreach.
5. Focus on value proposition and why they should consider your offering.
6. Keep email body to 80-120 words maximum.

AVAILABLE PLACEHOLDERS (use these liberally, but ONLY these)

- [company] - company name (REQUIRED - use this multiple times in the email)
- [location] - company location
- [industry] - business industry
- [website] - company website
- [phone] - phone number

CRITICAL: Do NOT invent new placeholders. Use ONLY the 5 placeholders listed above.

STYLE GUIDELINES

1. Start with "Hi there," or "Hi [company] team," (with two newlines after).
2. Use [company] placeholder naturally throughout the email:
   GOOD: "I noticed [company] operates in the [industry] space."
   GOOD: "We help companies like [company] achieve [value prop]."
   BAD: "I wanted to reach out." (not personalized enough)
3. Keep subject lines short and include placeholders:
   GOOD: "Quick question about [company]"
   GOOD: "Helping [industry] companies in [location]"
   BAD: "Quick question" (too generic, no placeholder)
4. Always end with "Regards," (no name or signature - it will be added automatically).
5. Be human and authentic. Avoid corporate jargon.

OUTPUT FORMAT

CRITICAL INSTRUCTIONS:
1. Use NEWLINE CHARACTERS (\\n) for line breaks, NOT HTML tags like <br>
2. Use plain text format ONLY - no HTML markup
3. Separate paragraphs with double newlines (\\n\\n)
4. The email body will be plain text with newline characters

Return your response as a JSON object with this EXACT structure:
{{
  "subject": "Email subject line with [placeholders]",
  "body": "Email body with [placeholders] throughout.\\n\\nMake sure to use [company] multiple times for personalization.\\n\\nRegards,"
}}

EXAMPLE of correct newline usage in JSON:
{{
  "subject": "Quick question about [company]",
  "body": "Hi [company] team,\\n\\nI noticed [company] operates in the [industry] space. We help companies in [industry] achieve [value prop].\\n\\nWould love to connect and see if there's a fit.\\n\\nRegards,"
}}

CRITICAL: Use \\n for newlines (NOT <br> tags). Ensure JSON is valid. Use double quotes for strings.
"""

    return prompt


async def generate_email_with_ai(prompt: str) -> Dict:
    """
    Generate email template using OpenAI API.

    Args:
        prompt: Complete prompt for email generation

    Returns:
        Dict with subject, body, and metadata
    """
    # Check OpenAI availability
    if not OPENAI_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="OpenAI not available. Install with: pip install openai"
        )

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
        )

    model = os.getenv('GPT_4_1_MINI_MODEL', 'gpt-4o-mini')

    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)

        # Make API call
        logger.info(f"Generating email template with model: {model}")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert customer success manager writing professional, personalized email templates for CRM mass email campaigns. Always use placeholders like [name], [primary_contact], [industry] to make templates reusable."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=800,
            response_format={"type": "json_object"}
        )

        # Extract response
        content = response.choices[0].message.content.strip()
        logger.info(f"AI response received, length: {len(content)}")
        logger.info(f"AI RAW RESPONSE: {repr(content)}")

        # Parse JSON response
        try:
            result = json.loads(content)
            subject = result.get('subject', '')
            body = result.get('body', '')
            logger.info(f"PARSED BODY (repr): {repr(body)}")
            logger.info(f"PARSED BODY contains <br>: {'<br>' in body}")
            logger.info(f"PARSED BODY contains \\n: {chr(10) in body}")
        except json.JSONDecodeError:
            # Fallback: Try to extract subject and body from text
            logger.warning("Failed to parse JSON, attempting text extraction")
            subject = ""
            body = content

            # Try to find SUBJECT: and BODY: markers
            if "SUBJECT:" in content.upper():
                subject_start = content.upper().find("SUBJECT:") + len("SUBJECT:")
                subject_end = content.find("\n", subject_start)
                if subject_end == -1:
                    subject_end = len(content)
                subject = content[subject_start:subject_end].strip()

            if "BODY:" in content.upper():
                body_start = content.upper().find("BODY:") + len("BODY:")
                body = content[body_start:].strip()

        # Clean subject
        subject = subject.replace('"', '').replace("'", "").replace('*', '').strip()

        # Clean body
        if body:
            # Remove code block markers if present
            body = body.replace('```json', '').replace('```', '').strip()

        logger.info(f"Email template generated successfully - Subject: {subject[:50]}...")

        return {
            "subject": subject,
            "body": body
        }

    except Exception as e:
        logger.error(f"Error generating email template with AI: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate email template: {str(e)}"
        )
