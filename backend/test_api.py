import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import json

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor(cursor_factory=RealDictCursor)

cursor.execute("""
    SELECT id, title, author, content, created_at, updated_at
    FROM collection_items
    WHERE id = 4
""")

result = cursor.fetchone()
print("Raw result from database:")
print(result)
print("\nJSON serialized:")
print(json.dumps(dict(result), default=str))

cursor.close()
conn.close()
