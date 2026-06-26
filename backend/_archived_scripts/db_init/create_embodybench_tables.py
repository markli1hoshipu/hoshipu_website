"""
Create the 5 EmbodyBench tables for the benchmark-as-a-service platform.

Schema:
  embodybench_users    - email+password accounts (separate from yif_workers)
  embodybench_workers  - Slurm/SSH-launched GPU compute nodes
  embodybench_runs     - one row per user submission ("evaluate model on benchmark X")
  embodybench_jobs     - the unit of work workers claim (one invocation of eval_policy.py)
  embodybench_episodes - per-rollout result records (never claimed, written by workers)

Idempotent: safe to call repeatedly. Called automatically on backend boot via
database.init_embodybench_tables().
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


_DDL_STATEMENTS = [
    # 1. Users — separate from yif_workers so payment system stays isolated.
    """
    CREATE TABLE IF NOT EXISTS embodybench_users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(200) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name  VARCHAR(200),
        role          VARCHAR(50) DEFAULT 'user',
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_embodybench_users_email ON embodybench_users(email);",

    # 2. Workers — Slurm/SSH-launched compute nodes.
    """
    CREATE TABLE IF NOT EXISTS embodybench_workers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hostname        VARCHAR(200) NOT NULL,
        region          VARCHAR(50) NOT NULL,
        cluster_kind    VARCHAR(50),
        capabilities    JSONB NOT NULL,
        state           VARCHAR(50) DEFAULT 'active',
        max_concurrent  INT DEFAULT 1,
        registered_at   TIMESTAMPTZ DEFAULT NOW(),
        last_heartbeat  TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_embodybench_workers_state_hb ON embodybench_workers(state, last_heartbeat);",

    # 3. Runs — the user-facing submission.
    """
    CREATE TABLE IF NOT EXISTS embodybench_runs (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           INT NOT NULL REFERENCES embodybench_users(id),
        benchmark         VARCHAR(50) NOT NULL,
        benchmark_version VARCHAR(50),
        config            JSONB NOT NULL,
        eval_mode         VARCHAR(50) NOT NULL,
        api_endpoint_url  VARCHAR(500),
        api_auth          JSONB,
        state             VARCHAR(50) DEFAULT 'queued',
        submitted_at      TIMESTAMPTZ DEFAULT NOW(),
        started_at        TIMESTAMPTZ,
        finished_at       TIMESTAMPTZ,
        notes             TEXT
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_embodybench_runs_user_submitted ON embodybench_runs(user_id, submitted_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_embodybench_runs_state ON embodybench_runs(state);",

    # 4. Jobs — the unit of work workers claim (one invocation of eval_policy.py).
    """
    CREATE TABLE IF NOT EXISTS embodybench_jobs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id          UUID NOT NULL REFERENCES embodybench_runs(id) ON DELETE CASCADE,
        task_name       VARCHAR(200) NOT NULL,
        task_config     VARCHAR(200) NOT NULL,
        seed_offset     INT NOT NULL,
        n_episodes      INT NOT NULL,
        worker_id       UUID REFERENCES embodybench_workers(id),
        state           VARCHAR(50) DEFAULT 'queued',
        attempt_count   INT DEFAULT 0,
        claimed_at      TIMESTAMPTZ,
        started_at      TIMESTAMPTZ,
        finished_at     TIMESTAMPTZ,
        progress        JSONB,
        failure_reason  VARCHAR(200),
        requires_caps   JSONB,
        UNIQUE (run_id, task_name, seed_offset)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_embodybench_jobs_state_run ON embodybench_jobs(state, run_id);",
    "CREATE INDEX IF NOT EXISTS idx_embodybench_jobs_queued ON embodybench_jobs(state) WHERE state = 'queued';",

    # 5. Episodes — per-rollout results. Written by workers as each ep completes; never claimed.
    """
    CREATE TABLE IF NOT EXISTS embodybench_episodes (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id              UUID NOT NULL REFERENCES embodybench_jobs(id) ON DELETE CASCADE,
        run_id              UUID NOT NULL REFERENCES embodybench_runs(id) ON DELETE CASCADE,
        task_name           VARCHAR(200) NOT NULL,
        seed_used           BIGINT NOT NULL,
        episode_idx         INT NOT NULL,
        outcome             JSONB NOT NULL,
        trajectory_pointer  VARCHAR(500),
        recorded_at         TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_embodybench_episodes_run_task ON embodybench_episodes(run_id, task_name);",
    "CREATE INDEX IF NOT EXISTS idx_embodybench_episodes_job ON embodybench_episodes(job_id);",
]


def create_embodybench_tables() -> None:
    """Create all embodybench_* tables (idempotent).

    First admin user is NOT created here — it was inserted manually via a
    direct DB connection during initial setup (see scratchpad bootstrap
    script). Subsequent users are created via POST /api/bench/admin/users.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL not set; cannot init embodybench tables")

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    try:
        # gen_random_uuid() comes from pgcrypto on older Postgres; on Render's
        # managed Postgres 14+ it's a built-in, but enable the extension defensively.
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

        for stmt in _DDL_STATEMENTS:
            cursor.execute(stmt)

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    create_embodybench_tables()
    print("embodybench tables ready")
