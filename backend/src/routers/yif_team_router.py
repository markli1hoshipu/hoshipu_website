"""
YIF Team Management API Router
Handles user CRUD operations - Admin only
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from psycopg2.extras import RealDictCursor
from passlib.context import CryptContext

from database import get_db_connection
from routers.yif_router import verify_token

router = APIRouter(prefix="/api/yif/team", tags=["yif-team"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ========================
# Pydantic Models
# ========================

class UserCreate(BaseModel):
    username: str
    password: str
    user_code: str
    display_name: str
    role: Optional[str] = "user"


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    user_code: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    new_password: str


# ========================
# Helper Functions
# ========================

def get_user_info(cursor, user_id: int):
    """Get user info including role"""
    cursor.execute("""
        SELECT id, username, user_code, role, display_name
        FROM yif_workers
        WHERE id = %s AND is_active = TRUE
    """, (user_id,))
    return cursor.fetchone()


def require_admin(cursor, user_id: int):
    """Check if user is admin, raise exception if not"""
    user = get_user_info(cursor, user_id)
    if not user:
        raise HTTPException(401, "User not found")
    if user['role'] != 'admin':
        raise HTTPException(403, "Admin access required")
    return user


# ========================
# Endpoints
# ========================

def require_admin_or_manager(cursor, user_id: int):
    """Check if user is admin or manager, raise exception if not"""
    user = get_user_info(cursor, user_id)
    if not user:
        raise HTTPException(401, "User not found")
    if user['role'] not in ('admin', 'manager'):
        raise HTTPException(403, "Admin or manager access required")
    return user


@router.get("/users")
async def list_users(user_id: int = Depends(verify_token)):
    """List all users - Admin and Manager"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        require_admin_or_manager(cursor, user_id)

        cursor.execute("""
            SELECT id, username, user_code, display_name, role, is_active, created_at
            FROM yif_workers
            ORDER BY id
        """)
        users = cursor.fetchall()

        return {
            "success": True,
            "users": [dict(u) for u in users]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to list users: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.post("/users")
async def create_user(user_data: UserCreate, user_id: int = Depends(verify_token)):
    """Create a new user - Admin only"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        require_admin(cursor, user_id)

        # Validate role
        if user_data.role not in ['admin', 'manager', 'user']:
            raise HTTPException(400, "Invalid role. Must be admin, manager, or user")

        # Validate user_code
        user_code = user_data.user_code.upper()
        if not user_code.isalpha() or len(user_code) < 2 or len(user_code) > 3:
            raise HTTPException(400, "User code must be 2-3 letters")

        # Check if username exists
        cursor.execute("SELECT id FROM yif_workers WHERE username = %s", (user_data.username,))
        if cursor.fetchone():
            raise HTTPException(400, f"Username '{user_data.username}' already exists")

        # Check if user_code exists
        cursor.execute("SELECT id FROM yif_workers WHERE user_code = %s", (user_code,))
        if cursor.fetchone():
            raise HTTPException(400, f"User code '{user_code}' already exists")

        # Hash password
        password_hash = pwd_context.hash(user_data.password)

        # Insert user
        cursor.execute("""
            INSERT INTO yif_workers (username, password_hash, user_code, display_name, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, username, user_code, display_name, role, is_active, created_at
        """, (user_data.username, password_hash, user_code, user_data.display_name, user_data.role))

        new_user = cursor.fetchone()
        conn.commit()

        return {
            "success": True,
            "message": "User created successfully",
            "user": dict(new_user)
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to create user: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.put("/users/{target_user_id}")
async def update_user(target_user_id: int, user_data: UserUpdate, user_id: int = Depends(verify_token)):
    """Update a user - Admin only"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        require_admin(cursor, user_id)

        # Check if target user exists
        cursor.execute("SELECT id FROM yif_workers WHERE id = %s", (target_user_id,))
        if not cursor.fetchone():
            raise HTTPException(404, "User not found")

        # Build update query
        updates = []
        params = []

        if user_data.display_name is not None:
            updates.append("display_name = %s")
            params.append(user_data.display_name)

        if user_data.user_code is not None:
            user_code = user_data.user_code.upper()
            if not user_code.isalpha() or len(user_code) < 2 or len(user_code) > 3:
                raise HTTPException(400, "User code must be 2-3 letters")
            # Check if user_code is taken by another user
            cursor.execute("SELECT id FROM yif_workers WHERE user_code = %s AND id != %s", (user_code, target_user_id))
            if cursor.fetchone():
                raise HTTPException(400, f"User code '{user_code}' already exists")
            updates.append("user_code = %s")
            params.append(user_code)

        if user_data.role is not None:
            if user_data.role not in ['admin', 'manager', 'user']:
                raise HTTPException(400, "Invalid role")
            updates.append("role = %s")
            params.append(user_data.role)

        if user_data.is_active is not None:
            updates.append("is_active = %s")
            params.append(user_data.is_active)

        if not updates:
            raise HTTPException(400, "No fields to update")

        updates.append("updated_at = NOW()")
        params.append(target_user_id)

        cursor.execute(f"""
            UPDATE yif_workers
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id, username, user_code, display_name, role, is_active
        """, params)

        updated_user = cursor.fetchone()
        conn.commit()

        return {
            "success": True,
            "message": "User updated successfully",
            "user": dict(updated_user)
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to update user: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.put("/users/{target_user_id}/password")
async def change_password(target_user_id: int, pwd_data: PasswordChange, user_id: int = Depends(verify_token)):
    """Change a user's password - Admin only"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        require_admin(cursor, user_id)

        # Check if target user exists
        cursor.execute("SELECT id FROM yif_workers WHERE id = %s", (target_user_id,))
        if not cursor.fetchone():
            raise HTTPException(404, "User not found")

        # Validate password length
        if len(pwd_data.new_password) < 6:
            raise HTTPException(400, "Password must be at least 6 characters")

        # Hash and update password
        password_hash = pwd_context.hash(pwd_data.new_password)

        cursor.execute("""
            UPDATE yif_workers
            SET password_hash = %s, updated_at = NOW()
            WHERE id = %s
        """, (password_hash, target_user_id))

        conn.commit()

        return {
            "success": True,
            "message": "Password changed successfully"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to change password: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.delete("/users/{target_user_id}")
async def delete_user(target_user_id: int, user_id: int = Depends(verify_token)):
    """Delete (deactivate) a user - Admin only"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        admin = require_admin(cursor, user_id)

        # Prevent self-deletion
        if target_user_id == user_id:
            raise HTTPException(400, "Cannot delete yourself")

        # Check if target user exists
        cursor.execute("SELECT id, username FROM yif_workers WHERE id = %s", (target_user_id,))
        target = cursor.fetchone()
        if not target:
            raise HTTPException(404, "User not found")

        # Soft delete (set is_active = false)
        cursor.execute("""
            UPDATE yif_workers
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = %s
        """, (target_user_id,))

        conn.commit()

        return {
            "success": True,
            "message": f"User '{target['username']}' has been deactivated"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Failed to delete user: {str(e)}")
    finally:
        cursor.close()
        conn.close()
