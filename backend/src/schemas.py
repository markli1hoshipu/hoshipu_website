"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    content: str = Field(..., min_length=1, max_length=1000, description="Message content")


class MessageResponse(BaseModel):
    """Schema for message response"""
    id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models


class MessageDelete(BaseModel):
    """Schema for deleting a message (requires password)"""
    password: str = Field(..., description="Password required to delete message")


class PdfTemplateCreate(BaseModel):
    """Schema for creating a new PDF template"""
    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    template_string: str = Field(..., min_length=1, description="Template string with placeholders")
    password: str = Field(..., description="Password required to create template")


class PdfTemplateUpdate(BaseModel):
    """Schema for updating a PDF template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Template name")
    template_string: Optional[str] = Field(None, min_length=1, description="Template string with placeholders")
    password: str = Field(..., description="Password required to update template")


class PdfTemplateDelete(BaseModel):
    """Schema for deleting a PDF template"""
    password: str = Field(..., description="Password required to delete template")


class PdfTemplateResponse(BaseModel):
    """Schema for PDF template response"""
    id: int
    name: str
    template_string: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
