import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

cursor.execute('SELECT id, title, author FROM collection_items ORDER BY id')
rows = cursor.fetchall()

for r in rows:
    print(f'ID: {r[0]}, Title: {r[1]}, Author: {r[2]}')

cursor.close()
conn.close()
