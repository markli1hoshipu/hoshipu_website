"""
YIF Payment Management System API Router
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
from database import get_db_connection

router = APIRouter(prefix="/api/yif", tags=["yif"])

class LoginRequest(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/login")
async def login(request: LoginRequest):
    """
    验证用户登录
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        password_hash = hash_password(request.password)
        
        cursor.execute("""
            SELECT id, username, is_active
            FROM yif_users
            WHERE username = %s AND password_hash = %s AND is_active = TRUE
        """, (request.username, password_hash))
        
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(401, "Invalid username or password")
        
        return {
            "success": True,
            "user": {
                "id": user['id'],
                "username": user['username']
            },
            "message": "Login successful"
        }
        
    finally:
        cursor.close()
        conn.close()

@router.get("/verify")
async def verify_session():
    """
    验证会话（未来可扩展为JWT token验证）
    """
    return {"success": True, "message": "Session valid"}
