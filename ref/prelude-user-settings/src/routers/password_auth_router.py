"""
Password Authentication Router
==============================

Handles username+password authentication for users who don't use OAuth.
Provides registration and login endpoints that generate JWT tokens.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, validator
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import logging
import bcrypt
import jwt
from datetime import datetime, timedelta
import urllib.parse as urlparse
import secrets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/auth", tags=["Password Authentication"])

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Pydantic models for request/response
class RegisterRequest(BaseModel):
    """Request model for user registration"""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    confirm_password: str = Field(..., description="Password confirmation")
    email: Optional[str] = Field(None, description="Optional email address")

    @validator('username')
    def validate_username(cls, v):
        """Validate username format"""
        if '@' in v:
            raise ValueError('Username cannot contain @ symbol')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v.lower()  # Store usernames in lowercase

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Validate passwords match"""
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class LoginRequest(BaseModel):
    """Request model for password login"""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    """Response model for authentication"""
    success: bool
    id_token: str
    refresh_token: str
    expires_in: int
    user_info: dict


# Database configuration
def get_db_config() -> dict:
    """Load database configuration using SESSIONS_DB environment variables."""
    return {
        'host': os.getenv('SESSIONS_DB_HOST'),
        'port': int(os.getenv('SESSIONS_DB_PORT', 5432)),
        'user': os.getenv('SESSIONS_DB_USER'),
        'password': os.getenv('SESSIONS_DB_PASSWORD'),
        'database': 'prelude_user_analytics'
    }


def get_db_connection():
    """Create a database connection"""
    config = get_db_config()
    try:
        conn = psycopg2.connect(**config)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed"
        )


def create_user_database(username: str) -> str:
    """
    Create a dedicated database for the user.
    Returns the database name.
    """
    db_name = f"prelude_userdb_{username.lower()}"

    # Connect to postgres database to create new database
    config = get_db_config()
    postgres_config = {**config, 'database': 'postgres'}

    try:
        # Connect to postgres database
        conn = psycopg2.connect(**postgres_config)
        conn.autocommit = True  # Required for CREATE DATABASE
        cursor = conn.cursor()

        # Check if database already exists
        cursor.execute("""
            SELECT 1 FROM pg_database WHERE datname = %s
        """, (db_name,))

        if cursor.fetchone():
            logger.info(f"Database {db_name} already exists")
        else:
            # Create the database
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            logger.info(f"Created database: {db_name}")

        cursor.close()
        conn.close()

        return db_name

    except Exception as e:
        logger.error(f"Failed to create database {db_name}: {e}")
        # Don't fail registration if database creation fails
        # Fall back to a default database
        logger.warning(f"Using fallback database for user {username}")
        return "postgres"


def generate_jwt_token(user_data: dict) -> str:
    """Generate JWT ID token for user"""
    payload = {
        "email": user_data['email'],
        "name": user_data.get('name', user_data['username']),
        "username": user_data['username'],
        "company": user_data.get('company', user_data['username']),  # Default to username
        "role": user_data.get('role', 'user'),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_refresh_token(user_email: str) -> str:
    """Generate refresh token for user"""
    payload = {
        "email": user_email,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=30),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def sync_user_to_employee_info(user_data: dict) -> None:
    """
    Sync user_profiles data to employee_info table in user's dedicated database.
    Creates employee_info record if it doesn't exist.

    This ensures all logged-in users have an employee record for CRM/lead gen features.
    """
    try:
        # Get user's dedicated database name from user_profiles
        user_db_name = user_data.get('db_name')
        if not user_db_name:
            logger.warning(f"No db_name found for user {user_data['email']}, skipping sync")
            return

        config = get_db_config()
        # Connect to user's dedicated database where employee_info table should live
        user_db_config = {**config, 'database': user_db_name}
        conn = psycopg2.connect(**user_db_config)
        cursor = conn.cursor()

        # Check if employee_info record exists
        cursor.execute("""
            SELECT employee_id FROM employee_info WHERE email = %s
        """, (user_data['email'],))

        existing = cursor.fetchone()

        if existing:
            logger.info(f"Employee record already exists for {user_data['email']} in {user_db_name}")
            cursor.close()
            conn.close()
            return

        # Create employee_info record with data from user_profiles
        # Map fields: user_profiles → employee_info
        logger.info(f"Creating employee_info record for {user_data['email']} in {user_db_name}")

        cursor.execute("""
            INSERT INTO employee_info (
                name, role, department, email, location,
                hire_date, availability, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """, (
            user_data.get('name', user_data.get('username', 'User')),  # name
            user_data.get('role', 'user'),  # role
            user_data.get('company', 'General'),  # department (use company as department)
            user_data['email'],  # email
            '{}',  # location (empty JSON object)
            datetime.utcnow().date(),  # hire_date (use today)
            'available',  # availability
            datetime.utcnow(),  # created_at
            datetime.utcnow()  # updated_at
        ))

        conn.commit()
        logger.info(f"Successfully created employee_info record for {user_data['email']} in {user_db_name}")

        cursor.close()
        conn.close()

    except Exception as e:
        logger.error(f"Error syncing user to employee_info: {e}")
        # Don't fail login if sync fails - just log the error
        if 'conn' in locals():
            conn.rollback()
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@router.post("/register", response_model=AuthResponse)
async def register_user(request: RegisterRequest):
    """
    Register a new user with username and password.

    - If email is provided, it's validated and stored
    - If no email, system generates username@prelude.local
    - Username must be unique
    - Returns JWT tokens upon successful registration
    """
    conn = get_db_connection()

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Rate limiting: Check if last registration was less than 30 seconds ago
        cursor.execute("""
            SELECT created_at FROM user_profiles
            WHERE created_at IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
        """)

        last_registration = cursor.fetchone()
        if last_registration and last_registration['created_at']:
            last_registration_time = last_registration['created_at']

            # Remove timezone info if present for comparison
            if last_registration_time.tzinfo is not None:
                last_registration_time = last_registration_time.replace(tzinfo=None)

            current_time = datetime.utcnow()
            time_diff = (current_time - last_registration_time).total_seconds()

            if time_diff < 30:
                remaining_seconds = int(30 - time_diff)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Registration rate limit exceeded. Please wait {remaining_seconds} seconds before registering again."
                )

        # Check if username already exists
        cursor.execute("""
            SELECT email FROM user_profiles WHERE username = %s
        """, (request.username,))

        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken"
            )

        # Determine email (real or system-generated)
        if request.email:
            email = request.email
            has_real_email = True

            # Check if email already exists
            cursor.execute("""
                SELECT email FROM user_profiles WHERE email = %s
            """, (email,))

            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered"
                )
        else:
            # Generate system email
            email = f"{request.username}@prelude.local"
            has_real_email = False

            # Ensure generated email doesn't conflict
            cursor.execute("""
                SELECT email FROM user_profiles WHERE email = %s
            """, (email,))

            if cursor.fetchone():
                # Add random suffix if conflict
                email = f"{request.username}.{secrets.token_hex(4)}@prelude.local"

        # Hash password
        password_hash = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Create dedicated database for user
        user_db_name = create_user_database(request.username)
        logger.info(f"User {request.username} will use database: {user_db_name}")

        # Create user record
        cursor.execute("""
            INSERT INTO user_profiles
            (email, username, password_hash, has_real_email, name, company, role, db_name, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING email, username, name, company, role, db_name
        """, (
            email,
            request.username,
            password_hash,
            has_real_email,
            request.username,  # Use username as display name
            request.username,  # Company is username
            'user',  # Default role
            user_db_name,  # User's dedicated database
            datetime.utcnow()
        ))

        user = cursor.fetchone()
        conn.commit()

        # Sync new user to employee_info table
        sync_user_to_employee_info(dict(user))

        # Generate JWT tokens
        id_token = generate_jwt_token(dict(user))
        refresh_token = generate_refresh_token(user['email'])

        logger.info(f"User registered successfully: {request.username} ({email})")

        return AuthResponse(
            success=True,
            id_token=id_token,
            refresh_token=refresh_token,
            expires_in=JWT_EXPIRATION_HOURS * 3600,
            user_info={
                "email": user['email'],
                "username": user['username'],
                "name": user['name'],
                "company": user['company'],
                "role": user['role'],
                "has_real_email": has_real_email
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {e}")
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )
    finally:
        cursor.close()
        conn.close()


@router.post("/login-password", response_model=AuthResponse)
async def login_with_password(request: LoginRequest):
    """
    Login with username and password.

    Logic:
    - If username exists: verify password
      - Correct password → return JWT tokens
      - Incorrect password → reject with "Incorrect password"
    - If username doesn't exist → reject with "Username does not exist"
    """
    conn = get_db_connection()

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Look up user by username (case-insensitive)
        cursor.execute("""
            SELECT email, username, password_hash, name, company, role, db_name, has_real_email
            FROM user_profiles
            WHERE LOWER(username) = LOWER(%s)
        """, (request.username,))

        user = cursor.fetchone()

        # If username doesn't exist
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Username does not exist"
            )

        # If user exists but no password set (OAuth-only user)
        if not user['password_hash']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses OAuth login. Please use Google or Microsoft sign-in."
            )

        # Verify password
        if not bcrypt.checkpw(request.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )

        # Password correct - sync to employee_info and generate tokens
        sync_user_to_employee_info(dict(user))

        id_token = generate_jwt_token(dict(user))
        refresh_token = generate_refresh_token(user['email'])

        logger.info(f"User logged in successfully: {user['username']} ({user['email']})")

        return AuthResponse(
            success=True,
            id_token=id_token,
            refresh_token=refresh_token,
            expires_in=JWT_EXPIRATION_HOURS * 3600,
            user_info={
                "email": user['email'],
                "username": user['username'],
                "name": user['name'],
                "company": user['company'],
                "role": user['role'],
                "has_real_email": user['has_real_email']
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )
    finally:
        cursor.close()
        conn.close()


@router.post("/check-username")
async def check_username_availability(username: str):
    """Check if a username is available"""
    conn = get_db_connection()

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM user_profiles WHERE LOWER(username) = LOWER(%s)
        """, (username,))

        count = cursor.fetchone()[0]

        return {
            "username": username,
            "available": count == 0
        }

    except Exception as e:
        logger.error(f"Error checking username: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check username"
        )
    finally:
        cursor.close()
        conn.close()
