"""
SQLAlchemy models for database tables
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base


class Message(Base):
    """
    Message model for storing user messages/comments
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_visible = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<Message(id={self.id}, created_at={self.created_at})>"
