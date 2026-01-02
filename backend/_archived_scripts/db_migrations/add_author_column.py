"""
添加 author 字段到 collection_items 表
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def add_author_column():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    
    try:
        # 添加 author 字段
        cursor.execute("""
            ALTER TABLE collection_items 
            ADD COLUMN IF NOT EXISTS author VARCHAR(200) DEFAULT 'Anonymous';
        """)
        
        conn.commit()
        print("Successfully added author column to collection_items table!")
        
    except Exception as e:
        conn.rollback()
        print(f"Failed to add author column: {e}")
        raise
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_author_column()
