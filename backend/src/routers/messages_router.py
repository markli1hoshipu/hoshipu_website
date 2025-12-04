"""
API router for messages/comments
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Message
from schemas import MessageCreate, MessageResponse, MessageDelete

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/", response_model=List[MessageResponse])
def get_messages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get all visible messages, ordered by most recent first

    - **skip**: Number of messages to skip (for pagination)
    - **limit**: Maximum number of messages to return
    """
    messages = db.query(Message).filter(Message.is_visible == True).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    return messages


@router.post("/", response_model=MessageResponse, status_code=201)
def create_message(message: MessageCreate, db: Session = Depends(get_db)):
    """
    Create a new message

    - **content**: Message content (1-1000 characters)
    """
    # Create new message
    db_message = Message(content=message.content)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)

    return db_message


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(message_id: int, db: Session = Depends(get_db)):
    """
    Get a specific message by ID
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.delete("/{message_id}", status_code=204)
def delete_message(message_id: int, delete_data: MessageDelete, db: Session = Depends(get_db)):
    """
    Soft delete a message by ID (requires password)

    - **message_id**: ID of the message to delete
    - **password**: Password required to delete (200631)
    """
    # Verify password
    if delete_data.password != "200631":
        raise HTTPException(status_code=403, detail="Invalid password")

    # Find message
    message = db.query(Message).filter(Message.id == message_id).first()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    # Soft delete - set is_visible to False
    message.is_visible = False
    db.commit()
    return None
