"""
API router for contact form email
"""
import os
import resend
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "")  # Your email to receive messages

router = APIRouter(prefix="/api/contact", tags=["contact"])


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    message: str


class ContactResponse(BaseModel):
    success: bool
    message: str


@router.post("/", response_model=ContactResponse)
async def send_contact_email(form: ContactForm):
    """
    Send contact form email

    - **name**: Sender's name
    - **email**: Sender's email address
    - **message**: Message content
    """
    if not RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Email service not configured")

    if not CONTACT_EMAIL:
        raise HTTPException(status_code=500, detail="Contact email not configured")

    resend.api_key = RESEND_API_KEY

    try:
        # Send email to site owner
        resend.Emails.send({
            "from": "Hoshipu Contact Form <onboarding@resend.dev>",
            "to": [CONTACT_EMAIL],
            "subject": f"New Contact Form Message from {form.name}",
            "html": f"""
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> {form.name}</p>
            <p><strong>Email:</strong> {form.email}</p>
            <p><strong>Message:</strong></p>
            <p>{form.message.replace(chr(10), '<br>')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
                This email was sent from the contact form on hoshipu.top
            </p>
            """
        })

        return ContactResponse(success=True, message="Message sent successfully")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
