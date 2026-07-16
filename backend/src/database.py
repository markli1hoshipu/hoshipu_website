"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment variables")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    echo=False  # Set to True to see SQL queries in console
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# For direct psycopg2 connections
import psycopg2

def get_db_connection():
    """Get a psycopg2 connection with error handling"""
    try:
        return psycopg2.connect(DATABASE_URL)
    except psycopg2.OperationalError as e:
        raise RuntimeError(f"Database connection failed: {str(e)}")


def init_embodybench_tables():
    """
    Create embodybench_* tables on backend boot (idempotent).
    Loads the init module by file path so we don't have to ship it under src/.
    """
    try:
        import importlib.util
        import sys
        spec_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "_archived_scripts", "db_init", "create_embodybench_tables.py",
        )
        if not os.path.exists(spec_path):
            print(f"[DB] embodybench init script not found at {spec_path}; skipping")
            return
        spec = importlib.util.spec_from_file_location("create_embodybench_tables", spec_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules["create_embodybench_tables"] = module
        spec.loader.exec_module(module)
        module.create_embodybench_tables()
        print("[DB] embodybench tables ready")
    except psycopg2.OperationalError as e:
        print(f"[DB] embodybench init failed - database connection error: {e}")
    except Exception as e:
        print(f"[DB] embodybench init skipped: {e}")


def init_passport_log_table():
    """
    Create passport_docs_log (audit log for the passport→DOCS tool) on boot.
    Idempotent: one row per processed passport image, storing ONLY the outputs
    (command/fields/warnings/error), request metadata (time, client IP,
    user-agent, provider), and a correctness vote used as an accuracy signal.
    The input photo is NOT stored. Best-effort — never blocks app boot.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS passport_docs_log (
                id           SERIAL PRIMARY KEY,
                request_id   TEXT NOT NULL,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                client_ip    TEXT,
                user_agent   TEXT,
                airline      TEXT,
                pax          INTEGER,
                provider     TEXT,
                filename     TEXT,
                command      TEXT,
                fields       JSONB,
                warnings     JSONB,
                error        TEXT,
                duration_ms  INTEGER,
                vote         SMALLINT,       -- 1 = correct, 0 = incorrect, NULL = no vote
                voted_at     TIMESTAMPTZ
            )
        """)
        # Migrate an earlier version of the table: drop the image columns (we no
        # longer store photos) and add the vote columns if missing.
        cursor.execute("ALTER TABLE passport_docs_log DROP COLUMN IF EXISTS image_bytes")
        cursor.execute("ALTER TABLE passport_docs_log DROP COLUMN IF EXISTS image_mime")
        cursor.execute("ALTER TABLE passport_docs_log DROP COLUMN IF EXISTS image_size")
        cursor.execute("ALTER TABLE passport_docs_log ADD COLUMN IF NOT EXISTS vote SMALLINT")
        cursor.execute("ALTER TABLE passport_docs_log ADD COLUMN IF NOT EXISTS voted_at TIMESTAMPTZ")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_passport_log_created ON passport_docs_log (created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_passport_log_request ON passport_docs_log (request_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_passport_log_provider ON passport_docs_log (provider)")
        conn.commit()
        cursor.close()
        conn.close()
        print("[DB] passport_docs_log table ready")
    except psycopg2.OperationalError as e:
        print(f"[DB] passport log init failed - database connection error: {e}")
    except Exception as e:
        print(f"[DB] passport log init skipped: {e}")


def init_quiz_leaderboard_table():
    """
    Create code_quiz_leaderboard (航司/机场代码测验 leaderboard) on boot.
    Idempotent. One row per completed challenge run: username, score
    (consecutive correct, capped 100), elapsed time_ms, and a perfect flag
    (score == 100). Best-effort — never blocks app boot.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS code_quiz_leaderboard (
                id          SERIAL PRIMARY KEY,
                username    TEXT NOT NULL,
                score       SMALLINT NOT NULL,
                time_ms     INTEGER NOT NULL,
                perfect     BOOLEAN NOT NULL DEFAULT false,
                client_ip   TEXT,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        # Rank: higher score first, then less time. (Time is the tiebreaker,
        # and the sole differentiator among perfect 100-question runs.)
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_quiz_lb_rank ON code_quiz_leaderboard (score DESC, time_ms ASC)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_quiz_lb_user ON code_quiz_leaderboard (username)"
        )
        conn.commit()
        cursor.close()
        conn.close()
        print("[DB] code_quiz_leaderboard table ready")
    except psycopg2.OperationalError as e:
        print(f"[DB] quiz leaderboard init failed - database connection error: {e}")
    except Exception as e:
        print(f"[DB] quiz leaderboard init skipped: {e}")


def init_yif_triggers():
    """
    Initialize YIF database triggers (backup safety net).
    Called once on startup. If trigger exists, does nothing.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Check if trigger already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_iou_status_insert'
            )
        """)
        if cursor.fetchone()[0]:
            cursor.close()
            conn.close()
            return  # Already exists

        print("[DB] Creating YIF status triggers (backup)...")

        # Create trigger function
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_iou_status_trigger()
            RETURNS TRIGGER AS $$
            DECLARE
                target_id INTEGER;
            BEGIN
                target_id := COALESCE(NEW.ious_id, OLD.ious_id);

                UPDATE yif_ious SET status = (
                    SELECT CASE
                        WHEN i.total_amount < 0 THEN 3
                        WHEN i.total_amount - COALESCE(SUM(p.amount), 0) = 0 THEN 2
                        WHEN i.total_amount - COALESCE(SUM(p.amount), 0) < 0 THEN 4
                        WHEN COUNT(p.id) > 0 THEN 1
                        ELSE 0
                    END
                    FROM yif_ious i
                    LEFT JOIN yif_payments p ON p.ious_id = i.id
                    WHERE i.id = target_id
                    GROUP BY i.id
                )
                WHERE id = target_id;

                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
        """)

        # Create triggers
        for op in ['INSERT', 'UPDATE', 'DELETE']:
            cursor.execute(f"""
                CREATE TRIGGER trigger_update_iou_status_{op.lower()}
                AFTER {op} ON yif_payments
                FOR EACH ROW EXECUTE FUNCTION update_iou_status_trigger();
            """)

        conn.commit()
        print("[DB] YIF status triggers created")
        cursor.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"[DB] Trigger init failed - database connection error: {e}")
    except Exception as e:
        print(f"[DB] Trigger init skipped: {e}")
