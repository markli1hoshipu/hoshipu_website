#!/usr/bin/env python3
"""
Activity Logging Router
======================

API endpoints for logging user activities across the platform.
Handles page views, navigation tracking, and activity queries.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import sys
import os
import logging

# Add parent directory to path to import UserActivityLogger
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, parent_dir)

from user_activity_logger import get_logger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/activity", tags=["Activity Logging"])


# Pydantic models for request/response
class PageViewRequest(BaseModel):
    """Request model for logging a page view."""
    user_email: str = Field(..., description="User's email address")
    page_url: str = Field(..., description="URL/route of the page")
    session_id: Optional[str] = Field(None, description="Browser session ID")
    duration_ms: Optional[int] = Field(None, description="Time spent on page in milliseconds")
    referrer: Optional[str] = Field(None, description="Previous page URL")


class ActivityLogRequest(BaseModel):
    """Request model for logging a generic activity."""
    user_email: str = Field(..., description="User's email address")
    action_type: str = Field(..., description="Activity type (e.g., 'navigation', 'crm')")
    action_name: str = Field(..., description="Specific action (e.g., 'page_view', 'customer_view')")
    session_id: Optional[str] = Field(None, description="Browser/WebSocket session ID")
    action_category: Optional[str] = Field(None, description="Optional sub-category")
    page_url: Optional[str] = Field(None, description="Frontend page/route")
    service_name: Optional[str] = Field(None, description="Backend service name")
    action_data: Optional[Dict[str, Any]] = Field(None, description="Additional data as JSON")
    result_status: str = Field("success", description="Status: 'success', 'error', 'pending'")
    result_data: Optional[Dict[str, Any]] = Field(None, description="Results or error info")
    duration_ms: Optional[int] = Field(None, description="Duration in milliseconds")
    tags: Optional[List[str]] = Field(None, description="Searchable tags")


class ActivityLogResponse(BaseModel):
    """Response model for activity logging."""
    success: bool
    message: str


@router.post("/page-view", response_model=ActivityLogResponse)
async def log_page_view(request: PageViewRequest, req: Request):
    """
    Log a page view activity.

    This endpoint is called by the frontend to track page views and duration.
    """
    try:
        activity_logger = get_logger()

        # Extract user agent and IP from request
        user_agent = req.headers.get("user-agent")
        ip_address = req.client.host if req.client else None

        success = activity_logger.log_page_view(
            user_email=request.user_email,
            page_url=request.page_url,
            session_id=request.session_id,
            duration_ms=request.duration_ms,
            user_agent=user_agent,
            ip_address=ip_address,
            referrer=request.referrer
        )

        if success:
            return ActivityLogResponse(
                success=True,
                message="Page view logged successfully"
            )
        else:
            return ActivityLogResponse(
                success=False,
                message="Failed to log page view (local mode or database error)"
            )

    except Exception as e:
        logger.error(f"Error logging page view: {e}")
        raise HTTPException(status_code=500, detail=f"Error logging page view: {str(e)}")


@router.post("/log", response_model=ActivityLogResponse)
async def log_activity(request: ActivityLogRequest, req: Request):
    """
    Log a generic user activity.

    This endpoint can be used to log any type of activity with custom data.
    """
    try:
        activity_logger = get_logger()

        # Extract user agent and IP from request
        user_agent = req.headers.get("user-agent")
        ip_address = req.client.host if req.client else None

        success = activity_logger.log_activity(
            user_email=request.user_email,
            action_type=request.action_type,
            action_name=request.action_name,
            session_id=request.session_id,
            action_category=request.action_category,
            page_url=request.page_url,
            service_name=request.service_name,
            user_agent=user_agent,
            ip_address=ip_address,
            action_data=request.action_data,
            result_status=request.result_status,
            result_data=request.result_data,
            duration_ms=request.duration_ms,
            tags=request.tags
        )

        if success:
            return ActivityLogResponse(
                success=True,
                message="Activity logged successfully"
            )
        else:
            return ActivityLogResponse(
                success=False,
                message="Failed to log activity (local mode or database error)"
            )

    except Exception as e:
        logger.error(f"Error logging activity: {e}")
        raise HTTPException(status_code=500, detail=f"Error logging activity: {str(e)}")


@router.get("/recent")
async def get_recent_activities(
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    limit: int = Query(50, ge=1, le=500, description="Number of activities to return"),
    days: int = Query(7, ge=1, le=90, description="Number of days to look back")
):
    """
    Get recent user activities.

    Returns a list of recent activities, optionally filtered by user and type.
    """
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        connection = psycopg2.connect(
            host=os.getenv("SESSIONS_DB_HOST"),
            port=int(os.getenv("SESSIONS_DB_PORT", 0)) or None,
            user=os.getenv("SESSIONS_DB_USER"),
            password=os.getenv("SESSIONS_DB_PASSWORD"),
            database=os.getenv("SESSIONS_DB_NAME")
        )

        query = """
            SELECT
                id, user_email, session_id, action_type, action_name,
                page_url, service_name, action_data, result_status,
                duration_ms, timestamp
            FROM user_activity_logs
            WHERE timestamp >= NOW() - INTERVAL '%s days'
        """

        params = [days]

        if user_email:
            query += " AND user_email = %s"
            params.append(user_email)

        if action_type:
            query += " AND action_type = %s"
            params.append(action_type)

        query += " ORDER BY timestamp DESC LIMIT %s"
        params.append(limit)

        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            results = cursor.fetchall()

        connection.close()

        # Convert datetime objects to ISO format strings
        for row in results:
            if row.get('timestamp'):
                row['timestamp'] = row['timestamp'].isoformat()
            if row.get('created_at'):
                row['created_at'] = row['created_at'].isoformat()

        return {
            "success": True,
            "count": len(results),
            "activities": results
        }

    except Exception as e:
        logger.error(f"Error fetching recent activities: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching activities: {str(e)}")


@router.get("/summary")
async def get_activity_summary(
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    days: int = Query(7, ge=1, le=90, description="Number of days to analyze")
):
    """
    Get activity summary statistics.

    Returns aggregated statistics about user activities.
    """
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        connection = psycopg2.connect(
            host=os.getenv("SESSIONS_DB_HOST"),
            port=int(os.getenv("SESSIONS_DB_PORT", 0)) or None,
            user=os.getenv("SESSIONS_DB_USER"),
            password=os.getenv("SESSIONS_DB_PASSWORD"),
            database=os.getenv("SESSIONS_DB_NAME")
        )

        # Get activity counts by type
        query = """
            SELECT
                action_type,
                COUNT(*) as count,
                AVG(duration_ms) as avg_duration_ms,
                COUNT(DISTINCT user_email) as unique_users
            FROM user_activity_logs
            WHERE timestamp >= NOW() - INTERVAL '%s days'
        """

        params = [days]

        if user_email:
            query += " AND user_email = %s"
            params.append(user_email)

        query += " GROUP BY action_type ORDER BY count DESC"

        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            by_type = cursor.fetchall()

        # Get top pages
        page_query = """
            SELECT
                page_url,
                COUNT(*) as views,
                AVG(duration_ms) as avg_duration_ms
            FROM user_activity_logs
            WHERE timestamp >= NOW() - INTERVAL '%s days'
                AND page_url IS NOT NULL
        """

        page_params = [days]

        if user_email:
            page_query += " AND user_email = %s"
            page_params.append(user_email)

        page_query += " GROUP BY page_url ORDER BY views DESC LIMIT 10"

        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(page_query, page_params)
            top_pages = cursor.fetchall()

        connection.close()

        # Convert Decimal to float for JSON serialization
        for item in by_type:
            if item.get('avg_duration_ms'):
                item['avg_duration_ms'] = float(item['avg_duration_ms'])

        for item in top_pages:
            if item.get('avg_duration_ms'):
                item['avg_duration_ms'] = float(item['avg_duration_ms'])

        return {
            "success": True,
            "days": days,
            "by_type": by_type,
            "top_pages": top_pages
        }

    except Exception as e:
        logger.error(f"Error fetching activity summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching summary: {str(e)}")
