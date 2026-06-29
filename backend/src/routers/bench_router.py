"""
EmbodyBench (benchmark-as-a-service) — auth + run + worker endpoints.

Mirrors the conventions of yif_router.py:
  - bcrypt + JWT (HS256) for human users
  - shared-secret header for workers (x-embodybench-worker-token)
  - rate-limited /login
  - psycopg2 + RealDictCursor (matches the rest of the project's DB pattern)
  - Reuses get_db_connection from database and limiter from rate_limiter

This file is intentionally a single home for the embodybench module so the
data-flow stays easy to follow:
  Phase 0  → auth helpers + login/me/change-password/admin-create-user
  Phase 1  → benchmark catalogs + run submission + setup-validation
  Phase 2  → worker-facing endpoints (register/heartbeat/claim/progress/
             episodes/state) + admin GET /workers + heartbeat reclaim
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request, Path
from pydantic import BaseModel, EmailStr, Field, HttpUrl
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal, Any
from math import ceil
import json as _json
import os

from cryptography.fernet import Fernet, InvalidToken

from database import get_db_connection
from rate_limiter import limiter

# Local imports for benchmark catalogs — sibling to routers/
import sys as _sys
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SRC_DIR = os.path.dirname(_THIS_DIR)
if _SRC_DIR not in _sys.path:
    _sys.path.insert(0, _SRC_DIR)
import benchmarks as _benchmarks


router = APIRouter(prefix="/api/bench", tags=["embodybench"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8h, same as YIF — used when remember=False
REMEMBER_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days — used when remember=True


# ---------------------------------------------------------------------------
# Fernet encryption for user-supplied api_auth tokens
# ---------------------------------------------------------------------------

def _get_fernet() -> Optional[Fernet]:
    """Return a Fernet instance if EMBODYBENCH_AUTH_ENCRYPTION_KEY is set.

    If unset, return None — calling code MUST refuse to accept api_auth payloads
    in that case so we never store user secrets in plaintext.
    """
    key = os.getenv("EMBODYBENCH_AUTH_ENCRYPTION_KEY")
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except ValueError as e:
        raise RuntimeError(
            f"EMBODYBENCH_AUTH_ENCRYPTION_KEY is not a valid Fernet key: {e}. "
            "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )


def _encrypt_api_auth(plain: dict) -> dict:
    """Encrypt the {scheme, token} blob. Token gets enciphered; scheme stays clear."""
    f = _get_fernet()
    if not f:
        raise HTTPException(
            status_code=503,
            detail="Server is not configured to accept api_auth (EMBODYBENCH_AUTH_ENCRYPTION_KEY unset)",
        )
    token_plain = plain.get("token", "")
    return {
        "scheme": plain.get("scheme", "bearer"),
        "token_enc": f.encrypt(token_plain.encode()).decode(),
    }


def _decrypt_api_auth(enc: dict) -> dict:
    """Reverse of _encrypt_api_auth — only used when handing a job to a worker."""
    f = _get_fernet()
    if not f:
        return {"scheme": enc.get("scheme", "bearer"), "token": ""}
    try:
        token = f.decrypt(enc["token_enc"].encode()).decode()
    except (InvalidToken, KeyError):
        token = ""
    return {"scheme": enc.get("scheme", "bearer"), "token": token}


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
    remember: bool = True  # default-on: this is a research tool, not a bank


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

        token_ttl_min = (
            REMEMBER_TOKEN_EXPIRE_MINUTES if body.remember else ACCESS_TOKEN_EXPIRE_MINUTES
        )
        token = _create_access_token(
            {"sub": f"bench:{user['id']}", "email": user["email"]},
            timedelta(minutes=token_ttl_min),
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


# ===========================================================================
# Phase 1: benchmark catalog + run submission
# ===========================================================================

class RunConfig(BaseModel):
    tasks: list[str] = Field(..., min_length=1, description="Task names to evaluate")
    episodes_per_task: int = Field(..., ge=1, le=1000)
    chunk_size: Optional[int] = Field(
        None,
        ge=1,
        description="Episodes per worker job. Default = episodes_per_task (one job per task).",
    )
    task_config: Optional[str] = Field(
        None,
        description="Override task_config YAML name. Default = benchmark's default_task_config.",
    )
    # Action space the user's model speaks. Worker's embodybench_remote policy
    # module converts between this and the sim's native qpos commands.
    #   joint_abs_14:      14-dim joint positions (sim-native, no conversion)
    #   xvla_ee_rot6d_20:  20-dim absolute EE, 6D rotation (X-VLA convention)
    action_space: Literal["joint_abs_14", "xvla_ee_rot6d_20"] = "xvla_ee_rot6d_20"


class ApiAuthIn(BaseModel):
    scheme: Literal["bearer", "none"] = "bearer"
    token: str = ""


class SubmitRunRequest(BaseModel):
    benchmark: Literal["robotwin", "robopro"]
    config: RunConfig
    eval_mode: Literal["api"] = "api"  # checkpoint mode comes later
    api_endpoint_url: HttpUrl
    api_auth: Optional[ApiAuthIn] = None
    notes: Optional[str] = None


class SubmitRunResponse(BaseModel):
    run_id: str
    jobs_queued: int
    episodes_total: int


class JobSummary(BaseModel):
    id: str
    task_name: str
    seed_offset: int
    n_episodes: int
    state: str
    attempt_count: int
    progress: Optional[dict] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class RunSummary(BaseModel):
    id: str
    benchmark: str
    state: str
    eval_mode: str
    api_endpoint_url: Optional[str]
    submitted_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    notes: Optional[str]
    jobs_total: int
    jobs_done: int
    episodes_total: int
    episodes_done: int


@router.get("/benchmarks")
async def list_benchmarks():
    """Static catalog of benchmarks the platform supports (no auth needed)."""
    return {"benchmarks": _benchmarks.all_as_list()}


@router.post("/runs", response_model=SubmitRunResponse)
async def submit_run(body: SubmitRunRequest, user_id: int = Depends(verify_bench_user)):
    """Create a new run + its job rows.

    Validates the task names against the benchmark catalog and partitions the
    (tasks × episodes_per_task) workload into jobs of `chunk_size` episodes each.
    """
    bench_mod = _benchmarks.get(body.benchmark)
    if bench_mod is None:
        raise HTTPException(status_code=400, detail=f"Unknown benchmark: {body.benchmark}")

    known_tasks = {t["name"] for t in bench_mod.TASKS}
    bad = [t for t in body.config.tasks if t not in known_tasks]
    if bad:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown task(s) for {body.benchmark}: {bad[:5]}",
        )

    if body.config.episodes_per_task > bench_mod.MAX_EPISODES_PER_TASK:
        raise HTTPException(
            status_code=400,
            detail=f"episodes_per_task={body.config.episodes_per_task} exceeds cap "
            f"({bench_mod.MAX_EPISODES_PER_TASK}) for {body.benchmark}",
        )

    chunk_size = body.config.chunk_size or body.config.episodes_per_task
    chunk_size = min(chunk_size, body.config.episodes_per_task)
    task_config = body.config.task_config or bench_mod.DEFAULT_TASK_CONFIG

    # Encrypt the user-supplied bearer token before persisting.
    api_auth_stored: Optional[dict] = None
    if body.api_auth and body.api_auth.scheme != "none" and body.api_auth.token:
        api_auth_stored = _encrypt_api_auth(body.api_auth.model_dump())

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # 1. Insert the run row.
        cursor.execute(
            """
            INSERT INTO embodybench_runs
                (user_id, benchmark, benchmark_version, config, eval_mode,
                 api_endpoint_url, api_auth, state, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'queued', %s)
            RETURNING id;
            """,
            (
                user_id,
                body.benchmark,
                bench_mod.VERSION,
                Json(body.config.model_dump()),
                body.eval_mode,
                str(body.api_endpoint_url),
                Json(api_auth_stored) if api_auth_stored else None,
                body.notes,
            ),
        )
        run_id = cursor.fetchone()["id"]

        # 2. Partition into jobs.
        jobs_queued = 0
        episodes_total = 0
        for task_name in body.config.tasks:
            n = body.config.episodes_per_task
            num_chunks = ceil(n / chunk_size)
            for i in range(num_chunks):
                ep_in_chunk = chunk_size if (i + 1) * chunk_size <= n else (n - i * chunk_size)
                cursor.execute(
                    """
                    INSERT INTO embodybench_jobs
                        (run_id, task_name, task_config, seed_offset, n_episodes,
                         state, requires_caps)
                    VALUES (%s, %s, %s, %s, %s, 'queued', %s);
                    """,
                    (
                        run_id,
                        task_name,
                        task_config,
                        i,
                        ep_in_chunk,
                        Json({"benchmark": body.benchmark}),
                    ),
                )
                jobs_queued += 1
                episodes_total += ep_in_chunk

        conn.commit()
        return {
            "run_id": str(run_id),
            "jobs_queued": jobs_queued,
            "episodes_total": episodes_total,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create run: {e}")
    finally:
        cursor.close()
        conn.close()


def _run_row_to_summary(row: dict, jobs_total: int, jobs_done: int,
                        episodes_total: int, episodes_done: int) -> dict:
    return {
        "id": str(row["id"]),
        "benchmark": row["benchmark"],
        "state": row["state"],
        "eval_mode": row["eval_mode"],
        "api_endpoint_url": row["api_endpoint_url"],
        "submitted_at": row["submitted_at"],
        "started_at": row["started_at"],
        "finished_at": row["finished_at"],
        "notes": row["notes"],
        "jobs_total": jobs_total,
        "jobs_done": jobs_done,
        "episodes_total": episodes_total,
        "episodes_done": episodes_done,
    }


@router.get("/runs")
async def list_runs(user_id: int = Depends(verify_bench_user)):
    """User's runs, most recent first, with aggregate job/episode counts."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            SELECT r.*,
              COUNT(j.id) AS jobs_total,
              COUNT(j.id) FILTER (WHERE j.state IN ('succeeded','failed'))
                  AS jobs_done,
              COALESCE(SUM(j.n_episodes), 0) AS episodes_total,
              COALESCE(SUM(
                  COALESCE((j.progress->>'episodes_done')::int, 0)
                  + CASE WHEN j.state = 'succeeded' THEN
                       (j.n_episodes - COALESCE((j.progress->>'episodes_done')::int, 0))
                    ELSE 0 END
              ), 0) AS episodes_done
            FROM embodybench_runs r
            LEFT JOIN embodybench_jobs j ON j.run_id = r.id
            WHERE r.user_id = %s
            GROUP BY r.id
            ORDER BY r.submitted_at DESC
            LIMIT 200;
            """,
            (user_id,),
        )
        return {
            "runs": [
                _run_row_to_summary(
                    r, r["jobs_total"], r["jobs_done"], int(r["episodes_total"]),
                    int(r["episodes_done"]),
                )
                for r in cursor.fetchall()
            ]
        }
    finally:
        cursor.close()
        conn.close()


@router.get("/runs/{run_id}")
async def get_run(run_id: str = Path(...), user_id: int = Depends(verify_bench_user)):
    """Full run detail + per-task success-rate aggregate."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            "SELECT * FROM embodybench_runs WHERE id = %s AND user_id = %s",
            (run_id, user_id),
        )
        run = cursor.fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        cursor.execute(
            """
            SELECT
              COUNT(*) AS jobs_total,
              COUNT(*) FILTER (WHERE state IN ('succeeded','failed')) AS jobs_done,
              COALESCE(SUM(n_episodes), 0) AS episodes_total,
              COALESCE(SUM(COALESCE((progress->>'episodes_done')::int, 0)
                + CASE WHEN state = 'succeeded' THEN
                     (n_episodes - COALESCE((progress->>'episodes_done')::int, 0))
                  ELSE 0 END), 0) AS episodes_done
            FROM embodybench_jobs WHERE run_id = %s;
            """,
            (run_id,),
        )
        agg = cursor.fetchone()

        cursor.execute(
            """
            SELECT task_name,
              COUNT(*) AS attempted,
              COUNT(*) FILTER (WHERE (outcome->>'success')::bool) AS succeeded
            FROM embodybench_episodes
            WHERE run_id = %s
            GROUP BY task_name
            ORDER BY task_name;
            """,
            (run_id,),
        )
        per_task = cursor.fetchall()

        summary = _run_row_to_summary(
            run, int(agg["jobs_total"]), int(agg["jobs_done"]),
            int(agg["episodes_total"]), int(agg["episodes_done"]),
        )
        summary["config"] = run["config"]
        summary["benchmark_version"] = run["benchmark_version"]
        summary["per_task"] = [
            {
                "task_name": pt["task_name"],
                "attempted": pt["attempted"],
                "succeeded": pt["succeeded"],
                "success_rate": (pt["succeeded"] / pt["attempted"]) if pt["attempted"] else 0.0,
            }
            for pt in per_task
        ]
        return summary
    finally:
        cursor.close()
        conn.close()


@router.get("/runs/{run_id}/jobs")
async def list_jobs(run_id: str = Path(...), user_id: int = Depends(verify_bench_user)):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Authorize by checking the run belongs to user.
        cursor.execute(
            "SELECT 1 FROM embodybench_runs WHERE id = %s AND user_id = %s",
            (run_id, user_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Run not found")

        cursor.execute(
            """
            SELECT id, task_name, seed_offset, n_episodes, state, attempt_count,
                   progress, started_at, finished_at, failure_reason
            FROM embodybench_jobs
            WHERE run_id = %s
            ORDER BY task_name, seed_offset;
            """,
            (run_id,),
        )
        return {
            "jobs": [
                {
                    "id": str(r["id"]),
                    "task_name": r["task_name"],
                    "seed_offset": r["seed_offset"],
                    "n_episodes": r["n_episodes"],
                    "state": r["state"],
                    "attempt_count": r["attempt_count"],
                    "progress": r["progress"],
                    "started_at": r["started_at"],
                    "finished_at": r["finished_at"],
                    "failure_reason": r["failure_reason"],
                }
                for r in cursor.fetchall()
            ]
        }
    finally:
        cursor.close()
        conn.close()


@router.delete("/runs/{run_id}")
async def cancel_run(run_id: str = Path(...), user_id: int = Depends(verify_bench_user)):
    """Cancel a run. Queued jobs are marked cancelled too; running jobs continue
    on the worker (worker will see state and exit gracefully on next heartbeat).
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            "SELECT state FROM embodybench_runs WHERE id = %s AND user_id = %s",
            (run_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Run not found")
        if row["state"] in ("completed", "failed", "cancelled"):
            return {"ok": True, "noop": True}

        cursor.execute(
            "UPDATE embodybench_runs SET state = 'cancelled', finished_at = NOW() WHERE id = %s",
            (run_id,),
        )
        cursor.execute(
            "UPDATE embodybench_jobs SET state = 'cancelled' "
            "WHERE run_id = %s AND state IN ('queued','claimed')",
            (run_id,),
        )
        conn.commit()
        return {"ok": True}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Setup-validation subagent (Claude Haiku) — Phase 1
# ---------------------------------------------------------------------------

class ValidateRequest(BaseModel):
    benchmark: Literal["robotwin", "robopro"]
    config: RunConfig


@router.post("/setup/validate")
async def setup_validate(body: ValidateRequest, user_id: int = Depends(verify_bench_user)):
    """Sanity-check the user's run config with Claude Haiku.

    Returns warnings/suggestions. No-ops with {ok: true, warnings: []} when
    ANTHROPIC_API_KEY is not set on the server.
    """
    bench_mod = _benchmarks.get(body.benchmark)
    if bench_mod is None:
        raise HTTPException(status_code=400, detail=f"Unknown benchmark: {body.benchmark}")

    try:
        # Local import keeps the optional dependency lazy.
        from bench_validation import validate_config
    except ImportError as e:
        # Validation module missing → degrade gracefully.
        return {"ok": True, "warnings": [], "suggestions": [], "skipped_reason": str(e)}

    return validate_config(bench_mod, body.config.model_dump())


# ===========================================================================
# Phase 2: worker-facing endpoints
# ===========================================================================
#
# Auth model: every worker request carries x-embodybench-worker-token that
# must match EMBODYBENCH_WORKER_SHARED_SECRET on the backend. One operator
# (you) runs every worker, so per-worker tokens are overkill for v1; revisit
# when multiple operators need scoped/revocable creds.

import hmac as _hmac


def verify_worker_token(
    x_embodybench_worker_token: Optional[str] = Header(None),
) -> bool:
    """Constant-time compare against the server's shared secret."""
    expected = os.getenv("EMBODYBENCH_WORKER_SHARED_SECRET")
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Server has no EMBODYBENCH_WORKER_SHARED_SECRET configured",
        )
    if not x_embodybench_worker_token or not _hmac.compare_digest(
        x_embodybench_worker_token, expected
    ):
        raise HTTPException(status_code=401, detail="Invalid worker token")
    return True


# ---------------------------------------------------------------------------
# Worker schemas
# ---------------------------------------------------------------------------

class WorkerCapabilities(BaseModel):
    """What the worker can do. Matched against jobs.requires_caps on claim."""
    benchmarks: list[Literal["robotwin", "robopro"]] = Field(default_factory=list)
    gpu_type: Optional[str] = None
    gpu_count: Optional[int] = None
    ram_gb: Optional[int] = None
    sapien_ok: bool = True


class RegisterWorkerRequest(BaseModel):
    hostname: str
    region: str  # 'oldlab' | 'montreal' | ...
    cluster_kind: Optional[Literal["slurm", "ssh"]] = None
    capabilities: WorkerCapabilities
    max_concurrent: int = 1


class RegisterWorkerResponse(BaseModel):
    worker_id: str
    heartbeat_interval_sec: int
    claim_poll_interval_sec: int
    drain_timeout_sec: int  # how long a job can run before reclaim kicks in


class ClaimRequest(BaseModel):
    # Workers re-state their caps on every claim so the scheduler can match
    # without a stale-row read from embodybench_workers.
    caps: WorkerCapabilities


class ClaimedJob(BaseModel):
    job_id: str
    run_id: str
    benchmark: str
    benchmark_version: Optional[str]
    task_name: str
    task_config: str
    seed_offset: int
    n_episodes: int
    api_endpoint_url: Optional[str]
    api_auth: Optional[dict]  # decrypted at claim time; never persisted in clear
    attempt_count: int


class JobProgressRequest(BaseModel):
    worker_id: str
    episodes_done: int
    episodes_succeeded: int = 0


class EpisodeIn(BaseModel):
    seed_used: int
    episode_idx: int
    outcome: dict  # {success: bool, n_steps: int, fail_reason?: str, reward?: float}
    trajectory_pointer: Optional[str] = None


class JobEpisodesBatch(BaseModel):
    worker_id: str
    episodes: list[EpisodeIn]


class JobStateUpdate(BaseModel):
    worker_id: str
    state: Literal["succeeded", "failed"]
    failure_reason: Optional[str] = None


# Tunables — could move to settings, but constants are clearer in v1.
_HEARTBEAT_INTERVAL_SEC = 10
_CLAIM_POLL_INTERVAL_SEC = 1
_RECLAIM_AFTER_SEC = 300  # 5 minutes of silence → re-queue


# ---------------------------------------------------------------------------
# Worker endpoints
# ---------------------------------------------------------------------------

@router.post("/workers/register", response_model=RegisterWorkerResponse)
async def register_worker(
    body: RegisterWorkerRequest,
    _: bool = Depends(verify_worker_token),
):
    """Insert a new row in embodybench_workers (or revive an existing host)."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            INSERT INTO embodybench_workers
                (hostname, region, cluster_kind, capabilities, state, max_concurrent)
            VALUES (%s, %s, %s, %s, 'active', %s)
            RETURNING id;
            """,
            (
                body.hostname,
                body.region,
                body.cluster_kind,
                Json(body.capabilities.model_dump()),
                body.max_concurrent,
            ),
        )
        worker_id = cursor.fetchone()["id"]
        conn.commit()
        return {
            "worker_id": str(worker_id),
            "heartbeat_interval_sec": _HEARTBEAT_INTERVAL_SEC,
            "claim_poll_interval_sec": _CLAIM_POLL_INTERVAL_SEC,
            "drain_timeout_sec": _RECLAIM_AFTER_SEC,
        }
    finally:
        cursor.close()
        conn.close()


@router.post("/workers/{worker_id}/heartbeat")
async def heartbeat(worker_id: str = Path(...), _: bool = Depends(verify_worker_token)):
    """Refresh last_heartbeat. 404 if the worker was already reclaimed/deleted."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE embodybench_workers SET last_heartbeat = NOW() WHERE id = %s",
            (worker_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Worker not registered")
        conn.commit()
        return {"ok": True}
    finally:
        cursor.close()
        conn.close()


@router.post("/workers/{worker_id}/claim")
async def claim_job(
    worker_id: str = Path(...),
    body: ClaimRequest = None,  # type: ignore[assignment]
    _: bool = Depends(verify_worker_token),
):
    """Atomically claim ONE queued job. Returns 204 if the queue is empty.

    Uses FOR UPDATE SKIP LOCKED so concurrent workers each grab a different
    row. Capabilities filter: job.requires_caps.benchmark must be in the
    worker's caps.benchmarks list.
    """
    if body is None or not body.caps.benchmarks:
        # Workers without any benchmark capability cannot claim anything.
        from fastapi import Response
        return Response(status_code=204)

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Refresh heartbeat opportunistically — claim implies the worker is alive.
        cursor.execute(
            "UPDATE embodybench_workers SET last_heartbeat = NOW() WHERE id = %s "
            "RETURNING id",
            (worker_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Worker not registered")

        cursor.execute(
            """
            WITH next AS (
              SELECT j.id FROM embodybench_jobs j
              JOIN embodybench_runs r ON r.id = j.run_id
              WHERE j.state = 'queued'
                AND r.state IN ('queued', 'running')
                AND (j.requires_caps->>'benchmark') = ANY(%s)
              ORDER BY r.submitted_at ASC, j.task_name ASC, j.seed_offset ASC
              LIMIT 1 FOR UPDATE OF j SKIP LOCKED
            )
            UPDATE embodybench_jobs j
               SET state = 'claimed',
                   worker_id = %s,
                   claimed_at = NOW(),
                   attempt_count = j.attempt_count + 1
              FROM next WHERE j.id = next.id
            RETURNING j.id, j.run_id, j.task_name, j.task_config, j.seed_offset,
                      j.n_episodes, j.attempt_count;
            """,
            (body.caps.benchmarks, worker_id),
        )
        job_row = cursor.fetchone()
        if not job_row:
            # Also promote the run from queued → running on the first claim.
            from fastapi import Response
            conn.commit()
            return Response(status_code=204)

        # Pull the run for benchmark, version, endpoint, and api_auth.
        cursor.execute(
            """
            SELECT benchmark, benchmark_version, api_endpoint_url, api_auth, state
              FROM embodybench_runs WHERE id = %s;
            """,
            (job_row["run_id"],),
        )
        run_row = cursor.fetchone()
        if run_row["state"] == "queued":
            cursor.execute(
                "UPDATE embodybench_runs SET state = 'running', started_at = NOW() "
                "WHERE id = %s AND state = 'queued';",
                (job_row["run_id"],),
            )
        conn.commit()

        api_auth_decrypted = (
            _decrypt_api_auth(run_row["api_auth"]) if run_row["api_auth"] else None
        )

        return {
            "job_id": str(job_row["id"]),
            "run_id": str(job_row["run_id"]),
            "benchmark": run_row["benchmark"],
            "benchmark_version": run_row["benchmark_version"],
            "task_name": job_row["task_name"],
            "task_config": job_row["task_config"],
            "seed_offset": job_row["seed_offset"],
            "n_episodes": job_row["n_episodes"],
            "api_endpoint_url": run_row["api_endpoint_url"],
            "api_auth": api_auth_decrypted,
            "attempt_count": job_row["attempt_count"],
        }
    finally:
        cursor.close()
        conn.close()


def _check_worker_owns_job(cursor, job_id: str, worker_id: str) -> dict:
    """Returns the job row if worker_id matches, else raises 409."""
    cursor.execute(
        "SELECT id, run_id, worker_id, state, n_episodes "
        "FROM embodybench_jobs WHERE id = %s",
        (job_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    if str(row["worker_id"]) != str(worker_id):
        # The job was reclaimed by the heartbeat watchdog and given to someone
        # else. The worker should drop this work and request a new claim.
        raise HTTPException(status_code=409, detail="Claim lost (reclaimed)")
    return row


@router.patch("/jobs/{job_id}/progress")
async def job_progress(
    body: JobProgressRequest,
    job_id: str = Path(...),
    _: bool = Depends(verify_worker_token),
):
    """Worker reports mid-job progress. Bumps state to 'running' on first call."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _check_worker_owns_job(cursor, job_id, body.worker_id)
        if row["state"] not in ("claimed", "running"):
            raise HTTPException(status_code=409, detail=f"Job is {row['state']}, not claimed/running")
        cursor.execute(
            """
            UPDATE embodybench_jobs
               SET state = CASE WHEN state = 'claimed' THEN 'running' ELSE state END,
                   started_at = COALESCE(started_at, NOW()),
                   progress = %s
             WHERE id = %s;
            """,
            (
                Json({
                    "episodes_done": body.episodes_done,
                    "episodes_succeeded": body.episodes_succeeded,
                }),
                job_id,
            ),
        )
        conn.commit()
        return {"ok": True}
    finally:
        cursor.close()
        conn.close()


@router.post("/jobs/{job_id}/episodes")
async def job_episodes_batch(
    body: JobEpisodesBatch,
    job_id: str = Path(...),
    _: bool = Depends(verify_worker_token),
):
    """Append a batch of completed-episode result rows to embodybench_episodes."""
    if not body.episodes:
        return {"inserted": 0}

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _check_worker_owns_job(cursor, job_id, body.worker_id)

        # Lookup task_name + run_id once.
        cursor.execute(
            "SELECT task_name, run_id FROM embodybench_jobs WHERE id = %s",
            (job_id,),
        )
        meta = cursor.fetchone()
        task_name = meta["task_name"]
        run_id = meta["run_id"]

        inserted = 0
        for ep in body.episodes:
            cursor.execute(
                """
                INSERT INTO embodybench_episodes
                    (job_id, run_id, task_name, seed_used, episode_idx,
                     outcome, trajectory_pointer)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    job_id,
                    run_id,
                    task_name,
                    ep.seed_used,
                    ep.episode_idx,
                    Json(ep.outcome),
                    ep.trajectory_pointer,
                ),
            )
            inserted += 1
        conn.commit()
        return {"inserted": inserted}
    finally:
        cursor.close()
        conn.close()


@router.patch("/jobs/{job_id}/state")
async def job_state(
    body: JobStateUpdate,
    job_id: str = Path(...),
    _: bool = Depends(verify_worker_token),
):
    """Mark a job as terminal. Also promotes the parent run to its final state
    when this was the last non-terminal job."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _check_worker_owns_job(cursor, job_id, body.worker_id)
        if row["state"] not in ("claimed", "running"):
            raise HTTPException(status_code=409, detail=f"Job is {row['state']}")

        cursor.execute(
            """
            UPDATE embodybench_jobs
               SET state = %s,
                   finished_at = NOW(),
                   failure_reason = %s
             WHERE id = %s;
            """,
            (body.state, body.failure_reason, job_id),
        )

        # Check if run can be closed: any non-terminal job remaining?
        run_id = row["run_id"]
        cursor.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE state NOT IN ('succeeded','failed','cancelled'))
                  AS non_terminal,
              COUNT(*) FILTER (WHERE state = 'failed')   AS failed,
              COUNT(*) FILTER (WHERE state = 'succeeded') AS succeeded
            FROM embodybench_jobs WHERE run_id = %s;
            """,
            (run_id,),
        )
        agg = cursor.fetchone()
        if agg["non_terminal"] == 0:
            # Run done. Mark failed if any job failed, else completed.
            final = "failed" if agg["failed"] > 0 else "completed"
            cursor.execute(
                "UPDATE embodybench_runs SET state = %s, finished_at = NOW() "
                "WHERE id = %s AND state IN ('queued','running');",
                (final, run_id),
            )

        conn.commit()
        return {"ok": True}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Admin: see registered workers
# ---------------------------------------------------------------------------

@router.get("/admin/workers")
async def admin_list_workers(_: int = Depends(require_admin)):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            SELECT id, hostname, region, cluster_kind, capabilities, state,
                   max_concurrent, registered_at, last_heartbeat,
                   EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) AS heartbeat_age_sec
            FROM embodybench_workers
            ORDER BY registered_at DESC
            LIMIT 200;
            """,
        )
        return {
            "workers": [
                {
                    **r,
                    "id": str(r["id"]),
                    "heartbeat_age_sec": int(r["heartbeat_age_sec"] or 0),
                }
                for r in cursor.fetchall()
            ]
        }
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Heartbeat reclaim — runs as an asyncio background task.
# ---------------------------------------------------------------------------

async def reclaim_stale_jobs_loop():
    """Periodically re-queue jobs whose worker has gone silent for >5 min.

    Started by main.py on app startup. Cancelled cleanly on shutdown.
    """
    import asyncio
    INTERVAL_SEC = 30
    while True:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    f"""
                    UPDATE embodybench_jobs
                       SET state = 'queued',
                           worker_id = NULL,
                           claimed_at = NULL
                     WHERE state IN ('claimed', 'running')
                       AND worker_id IN (
                          SELECT id FROM embodybench_workers
                           WHERE last_heartbeat < NOW() - INTERVAL '{_RECLAIM_AFTER_SEC} seconds'
                       );
                    """
                )
                if cursor.rowcount:
                    import logging
                    logging.getLogger("embodybench").info(
                        "Reclaimed %d stale job(s)", cursor.rowcount
                    )
                # Also mark workers offline that haven't heartbeat in 5x the threshold.
                cursor.execute(
                    f"""
                    UPDATE embodybench_workers
                       SET state = 'offline'
                     WHERE state = 'active'
                       AND last_heartbeat < NOW() - INTERVAL '{5 * _RECLAIM_AFTER_SEC} seconds';
                    """
                )
                conn.commit()
            finally:
                cursor.close()
                conn.close()
        except Exception:
            # Log but don't crash the loop — DB hiccup, network blip, whatever.
            import logging, traceback
            logging.getLogger("embodybench").warning(
                "reclaim loop error:\n%s", traceback.format_exc()
            )
        await asyncio.sleep(INTERVAL_SEC)

