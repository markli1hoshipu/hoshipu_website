"""
创建 Collection 相关的数据库表
支持一个 collection 条目有多个 media（图片、音频混合）
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def create_collection_tables():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    
    try:
        # 1. Collection 主表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS collection_items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # 2. Media 表（一个 collection 可以有多个 media）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS collection_media (
                id SERIAL PRIMARY KEY,
                collection_id INTEGER NOT NULL REFERENCES collection_items(id) ON DELETE CASCADE,
                media_type VARCHAR(20) NOT NULL,  -- 'image', 'audio'
                media_url TEXT NOT NULL,
                file_path TEXT NOT NULL,          -- R2 中的路径，用于删除
                file_size INTEGER,                -- 字节
                content_type VARCHAR(100),        -- MIME type
                display_order INTEGER DEFAULT 0,  -- 显示顺序
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # 3. 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_collection_media_collection_id 
            ON collection_media(collection_id);
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_collection_items_created_at 
            ON collection_items(created_at DESC);
        """)
        
        conn.commit()
        print("Collection tables created successfully!")
        print("   - collection_items: main table")
        print("   - collection_media: media table (supports multiple files)")
        
    except Exception as e:
        conn.rollback()
        print(f"Failed to create tables: {e}")
        raise
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_collection_tables()
