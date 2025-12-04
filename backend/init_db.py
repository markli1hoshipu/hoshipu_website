"""
Initialize database tables
"""
import sys
import io
from src.database import engine, Base
from src.models import Message

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def init_db():
    """Create all database tables"""
    print("=" * 60)
    print("Initializing Database...")
    print("=" * 60)

    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("\n✅ Database tables created successfully!")
        print("\nCreated tables:")
        for table in Base.metadata.sorted_tables:
            print(f"   - {table.name}")
        print("\n" + "=" * 60)

    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_db()
