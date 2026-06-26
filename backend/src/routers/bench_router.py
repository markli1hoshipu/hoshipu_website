"""
EmbodyBench (benchmark-as-a-service) — auth + admin endpoints (Phase 0).

Mirrors the conventions of yif_router.py:
  - bcrypt + JWT (HS256, 8-hour expiry)
  - rate-limited /login
  - psycopg2 + RealDictCursor (matches the rest of the project's DB pattern)
  - Reuses get_db_connection from database and limiter from rate_limiter

Future phases will add /benchmarks, /setup/validate, /runs (+ partitioning),
worker-facing /workers/* and /jobs/* endpoints. This file stays the single
home for the embodybench module so it's easy to find.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, EmailStr
import psycopg2
from psycopg2.extras import RealDictCursor
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import os

from database import get_db_connection
from rate_limiter import limiter


router = APIRouter(prefix="/api/bench", tags=["embodybench"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8h, same as YIF


# ---------------------------------------------------------------------------
# JWT helpers (same shape as yif_router; isolated namespace per "sub" prefix)
# ---------------------------------------------------------------------------

def _get_secret_key() -> str:
    """Reuse the project's JWT secret. Set at runtime so .env is loaded."""
    key = os.getenv("JWT_SECRET_KEY")
    if not key or key == "CHANGE_ME_TO_A_SECURE_RANDOM_KEY":
        raise ValueError("JWT_SECRET_KEY must be set to a secure random value")
    return key


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _get_secret_key(), algorithm=ALGORITHM)


def verify_bench_user(authorization: Optional[str] = Header(None)) -> int:
    """Dependency that returns the bench_user_id from a valid bearer token.

    Uses "sub" = "bench:<id>" to namespace away from yif tokens — a stolen YIF
    token cannot accidentally authenticate against bench endpoints.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        payload = jwt.decode(token, _get_secret_key(), algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str) or not sub.startswith("bench:"):
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(sub.split(":", 1)[1])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user_id: int = Depends(verify_bench_user)) -> int:
    """Dependency layered on top of verify_bench_user that also checks role=admin."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            "SELECT role, is_active FROM embodybench_users WHERE id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row or not row["is_active"]:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        if row["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin role required")
        return user_id
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None
    role: str = "user"  # 'user' or 'admin'


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str]
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    """Email + password login. Rate-limited to 5 attempts/min/IP."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            SELECT id, email, password_hash, role, display_name, is_active
              FROM embodybench_users
             WHERE email = %s AND is_active = TRUE
            """,
            (body.email,),
        )
        user = cursor.fetchone()

        # Constant-time: always run bcrypt even on user-not-found.
        dummy_hash = "$2b$12$KKKKKKKKKKKKKKKKKKKKK.uJQ.8YcvGJYY5Y5Y5Y5Y5Y5Y5Y5Y5Y5K"
        hash_to_verify = user["password_hash"] if user else dummy_hash
        password_valid = _verify_password(body.password, hash_to_verify)

        if not user or not password_valid:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = _create_access_token(
            {"sub": f"bench:{user['id']}", "email": user["email"]},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "display_name": user["display_name"],
                "role": user["role"],
            },
        }
    finally:
        cursor.close()
        conn.close()


@router.get("/auth/me", response_model=UserOut)
async def me(user_id: int = Depends(verify_bench_user)):
    """Return the current user — used by the frontend's BenchAuthProvider to verify on mount."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            SELECT id, email, display_name, role, is_active
              FROM embodybench_users
             WHERE id = %s AND is_active = TRUE
            """,
            (user_id,),
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "role": user["role"],
        }
    finally:
        cursor.close()
        conn.close()


@router.post("/auth/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    user_id: int = Depends(verify_bench_user),
):
    """Change own password. Verifies current_password before rotating."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="new_password must be >=8 characters")

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            "SELECT password_hash FROM embodybench_users WHERE id = %s AND is_active = TRUE",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row or not _verify_password(body.current_password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Current password incorrect")

        cursor.execute(
            "UPDATE embodybench_users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
            (_hash_password(body.new_password), user_id),
        )
        conn.commit()
        return {"ok": True}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Admin endpoints — invite-only user creation (no public signup in v1)
# ---------------------------------------------------------------------------

@router.post("/admin/users", response_model=UserOut)
async def admin_create_user(
    body: CreateUserRequest,
    admin_id: int = Depends(require_admin),
):
    """Admin creates a new account. Role must be 'user' or 'admin'."""
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="role must be 'user' or 'admin'")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="password must be >=8 characters")

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            INSERT INTO embodybench_users (email, password_hash, display_name, role)
            VALUES (%s, %s, %s, %s)
            RETURNING id, email, display_name, role
            """,
            (body.email, _hash_password(body.password), body.display_name, body.role),
        )
        new_user = cursor.fetchone()
        conn.commit()
        return new_user
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="email already registered")
    finally:
        cursor.close()
        conn.close()
