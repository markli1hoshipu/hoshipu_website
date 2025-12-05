import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
    CREATE TABLE IF NOT EXISTS gjp_pdf_template (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        template_string TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
""")

cur.execute("""
    INSERT INTO gjp_pdf_template (name, template_string) VALUES
    ('仅发票号', '{invoice_number}.pdf'),
    ('测试', '{issue_date}-{amount}.pdf'),
    ('行程信息', '{buyer} {name} {origin}-{destination} {amount}.pdf')
    ON CONFLICT (name) DO NOTHING;
""")

conn.commit()
cur.close()
conn.close()

print("gjp_pdf_template table created and seeded with default templates")
