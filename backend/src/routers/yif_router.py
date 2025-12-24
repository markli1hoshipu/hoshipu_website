"""
YIF Payment Management System API Router
Enhanced with bcrypt password hashing and JWT authentication
Updated: 2025-12-23 - Added role to login/verify responses
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from database import get_db_connection
from rate_limiter import limiter
import os

router = APIRouter(prefix="/api/yif", tags=["yif"])

# Security configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

def get_secret_key():
    """Get JWT secret key at runtime to ensure .env is loaded"""
    key = os.getenv("JWT_SECRET_KEY")
    if not key or key == "CHANGE_ME_TO_A_SECURE_RANDOM_KEY":
        raise ValueError("JWT_SECRET_KEY must be set to a secure random value in environment variables")
    return key

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")

        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, login_data: LoginRequest):
    """
    User login with bcrypt password verification and JWT token generation
    Rate limited to 5 attempts per minute per IP address
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("""
            SELECT id, username, password_hash, role, is_active
            FROM yif_workers
            WHERE username = %s AND is_active = TRUE
        """, (login_data.username,))

        user = cursor.fetchone()

        # Prevent timing attack: always verify password even if user not found
        # Use a dummy hash to ensure constant time comparison
        dummy_hash = "$2b$12$K4A8Y5Y5Y5Y5Y5Y5Y5Y5YuJQ.8YcvGJYY5Y5Y5Y5Y5Y5Y5Y5Y5Y5K"
        hash_to_verify = user['password_hash'] if user else dummy_hash
        password_valid = verify_password(login_data.password, hash_to_verify)

        if not user or not password_valid:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user['id']), "username": user['username']},
            expires_delta=access_token_expires
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "username": user['username'],
                "role": user['role']
            }
        }

    finally:
        cursor.close()
        conn.close()

@router.get("/verify")
async def verify_session(user_id: int = Depends(verify_token)):
    """
    Verify JWT token validity
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("""
            SELECT id, username, role, is_active
            FROM yif_workers
            WHERE id = %s AND is_active = TRUE
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        return {
            "success": True,
            "user": {
                "id": user['id'],
                "username": user['username'],
                "role": user['role']
            }
        }

    finally:
        cursor.close()
        conn.close()

@router.get("/me")
async def get_current_user(user_id: int = Depends(verify_token)):
    """
    Get current authenticated user information
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("""
            SELECT id, username, role, created_at, updated_at
            FROM yif_workers
            WHERE id = %s AND is_active = TRUE
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "success": True,
            "user": user
        }

    finally:
        cursor.close()
        conn.close()
