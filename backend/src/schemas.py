"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    content: str = Field(..., min_length=1, max_length=1000, description="Message content")
    quote_id: Optional[int] = Field(None, description="ID of message being replied to")


class MessageResponse(BaseModel):
    """Schema for message response"""
    id: int
    content: str
    created_at: datetime
    quote_id: Optional[int]

    class Config:
        from_attributes = True


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


class TravelTemplateCreate(BaseModel):
    """Schema for creating a new travel template"""
    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, max_length=500, description="Template description")
    config_json: str = Field(..., min_length=1, description="Template configuration JSON")
    password: str = Field(..., description="Password required to create template")


class TravelTemplateUpdate(BaseModel):
    """Schema for updating a travel template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, max_length=500, description="Template description")
    config_json: Optional[str] = Field(None, min_length=1, description="Template configuration JSON")
    is_active: Optional[bool] = Field(None, description="Whether template is active")
    password: str = Field(..., description="Password required to update template")


class TravelTemplateDelete(BaseModel):
    """Schema for deleting a travel template"""
    password: str = Field(..., description="Password required to delete template")


class TravelTemplateResponse(BaseModel):
    """Schema for travel template response"""
    id: int
    name: str
    description: Optional[str]
    config_json: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TravelAirlineCreate(BaseModel):
    """Schema for creating a new airline"""
    code: str = Field(..., min_length=1, max_length=10, description="Airline code")
    name: str = Field(..., min_length=1, max_length=255, description="Airline name")
    password: str = Field(..., description="Password required to create airline")


class TravelAirlineUpdate(BaseModel):
    """Schema for updating an airline"""
    code: Optional[str] = Field(None, min_length=1, max_length=10, description="Airline code")
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Airline name")
    is_active: Optional[bool] = Field(None, description="Whether airline is active")
    password: str = Field(..., description="Password required to update airline")


class TravelAirlineDelete(BaseModel):
    """Schema for deleting an airline"""
    password: str = Field(..., description="Password required to delete airline")


class TravelAirlineResponse(BaseModel):
    """Schema for airline response"""
    id: int
    code: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TravelAirportCreate(BaseModel):
    """Schema for creating a new airport"""
    code: str = Field(..., min_length=1, max_length=10, description="Airport code")
    name: str = Field(..., min_length=1, max_length=255, description="Airport name")
    password: str = Field(..., description="Password required to create airport")


class TravelAirportUpdate(BaseModel):
    """Schema for updating an airport"""
    code: Optional[str] = Field(None, min_length=1, max_length=10, description="Airport code")
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Airport name")
    is_active: Optional[bool] = Field(None, description="Whether airport is active")
    password: str = Field(..., description="Password required to update airport")


class TravelAirportDelete(BaseModel):
    """Schema for deleting an airport"""
    password: str = Field(..., description="Password required to delete airport")


class TravelAirportResponse(BaseModel):
    """Schema for airport response"""
    id: int
    code: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
