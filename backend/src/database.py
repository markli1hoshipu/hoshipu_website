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
