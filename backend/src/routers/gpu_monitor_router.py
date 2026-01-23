import os
import jwt
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/gpu-monitor", tags=["gpu-monitor"])

GPU_MONITOR_PASSWORD = os.getenv("GPU_MONITOR_PASSWORD", "")
GPU_MONITOR_API_KEY = os.getenv("GPU_MONITOR_API_KEY", "")
GPU_MONITOR_SECRET = os.getenv("GPU_MONITOR_SECRET_KEY", os.getenv("JWT_SECRET_KEY", "fallback-gpu-monitor-secret"))
TOKEN_EXPIRE_DAYS = 30
TOKEN_EXPIRE_HOURS_SHORT = 8
DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


def init_gpu_monitor_table():
    """Create gpu_metrics table if not exists"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gpu_metrics (
                id SERIAL PRIMARY KEY,
                hostname VARCHAR(255) NOT NULL,
                gpu_index INTEGER NOT NULL,
                gpu_name VARCHAR(255),
                utilization REAL,
                memory_used REAL,
                memory_total REAL,
                temperature REAL,
                power_draw REAL,
                power_limit REAL,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_gpu_metrics_hostname_ts
            ON gpu_metrics(hostname, timestamp DESC);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_gpu_metrics_timestamp
            ON gpu_metrics(timestamp DESC);
        """)
        conn.commit()
    finally:
        cursor.close()
        conn.close()


# Initialize table on module load
try:
    init_gpu_monitor_table()
except Exception:
    pass


# ========== Schemas ==========

class LoginRequest(BaseModel):
    password: str
    remember_device: bool = False


class GpuData(BaseModel):
    index: int
    name: str = ""
    utilization: float = 0.0
    memory_used: float = 0.0
    memory_total: float = 0.0
    temperature: float = 0.0
    power_draw: float = 0.0
    power_limit: float = 0.0


class PushRequest(BaseModel):
    hostname: str
    gpus: List[GpuData]


# ========== Auth Helpers ==========

def verify_jwt(authorization: Optional[str]) -> bool:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, GPU_MONITOR_SECRET, algorithms=["HS256"])
        if payload.get("type") != "gpu_monitor":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return True
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ========== Auth Endpoints ==========

@router.post("/login")
async def login(data: LoginRequest):
    """Login with password and get JWT token"""
    if not GPU_MONITOR_PASSWORD:
        raise HTTPException(status_code=500, detail="Password not configured")

    if data.password != GPU_MONITOR_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    if data.remember_device:
        expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS_SHORT)

    token = jwt.encode(
        {"exp": expire, "type": "gpu_monitor", "iat": datetime.now(timezone.utc)},
        GPU_MONITOR_SECRET,
        algorithm="HS256"
    )

    return {
        "success": True,
        "token": token,
        "expires_at": expire.isoformat(),
        "remember_device": data.remember_device
    }


@router.get("/verify-token")
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token validity"""
    verify_jwt(authorization)
    return {"success": True, "valid": True}


# ========== Push Endpoint (API Key auth) ==========

@router.post("/push")
async def push_metrics(data: PushRequest, x_api_key: Optional[str] = Header(None)):
    """Receive GPU metrics from remote machines"""
    if not GPU_MONITOR_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")

    if x_api_key != GPU_MONITOR_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if not data.gpus:
        raise HTTPException(status_code=400, detail="No GPU data provided")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        for gpu in data.gpus:
            cursor.execute("""
                INSERT INTO gpu_metrics
                    (hostname, gpu_index, gpu_name, utilization, memory_used, memory_total, temperature, power_draw, power_limit)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data.hostname, gpu.index, gpu.name, gpu.utilization,
                gpu.memory_used, gpu.memory_total, gpu.temperature,
                gpu.power_draw, gpu.power_limit
            ))
        conn.commit()
        return {"success": True, "count": len(data.gpus)}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ========== Data Endpoints (JWT auth) ==========

@router.get("/machines")
async def get_machines(authorization: Optional[str] = Header(None)):
    """Get list of distinct hostnames with latest timestamp"""
    verify_jwt(authorization)

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT hostname, MAX(timestamp) as last_seen
            FROM gpu_metrics
            GROUP BY hostname
            ORDER BY last_seen DESC
        """)
        machines = cursor.fetchall()
        result = []
        for m in machines:
            result.append({
                "hostname": m["hostname"],
                "last_seen": m["last_seen"].isoformat() if m["last_seen"] else None
            })
        return {"success": True, "machines": result}
    finally:
        cursor.close()
        conn.close()


@router.get("/status")
async def get_status(hostname: str, authorization: Optional[str] = Header(None)):
    """Get latest metrics for all GPUs on a machine"""
    verify_jwt(authorization)

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT DISTINCT ON (gpu_index)
                gpu_index, gpu_name, utilization, memory_used, memory_total,
                temperature, power_draw, power_limit, timestamp
            FROM gpu_metrics
            WHERE hostname = %s
            ORDER BY gpu_index, timestamp DESC
        """, (hostname,))
        gpus = cursor.fetchall()
        result = []
        for g in gpus:
            result.append({
                "gpu_index": g["gpu_index"],
                "gpu_name": g["gpu_name"],
                "utilization": g["utilization"],
                "memory_used": g["memory_used"],
                "memory_total": g["memory_total"],
                "temperature": g["temperature"],
                "power_draw": g["power_draw"],
                "power_limit": g["power_limit"],
                "timestamp": g["timestamp"].isoformat() if g["timestamp"] else None
            })
        return {"success": True, "hostname": hostname, "gpus": result}
    finally:
        cursor.close()
        conn.close()


@router.get("/history")
async def get_history(
    hostname: str,
    gpu_index: int = 0,
    hours: int = 24,
    authorization: Optional[str] = Header(None)
):
    """Get time-series data for a specific GPU"""
    verify_jwt(authorization)

    if hours > 168:
        hours = 168  # Max 7 days

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT utilization, memory_used, memory_total, temperature,
                   power_draw, power_limit, timestamp
            FROM gpu_metrics
            WHERE hostname = %s AND gpu_index = %s
              AND timestamp >= NOW() - INTERVAL '%s hours'
            ORDER BY timestamp ASC
        """, (hostname, gpu_index, hours))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "utilization": r["utilization"],
                "memory_used": r["memory_used"],
                "memory_total": r["memory_total"],
                "temperature": r["temperature"],
                "power_draw": r["power_draw"],
                "power_limit": r["power_limit"],
                "timestamp": r["timestamp"].isoformat() if r["timestamp"] else None
            })
        return {"success": True, "hostname": hostname, "gpu_index": gpu_index, "data": result}
    finally:
        cursor.close()
        conn.close()
