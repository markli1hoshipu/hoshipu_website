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
