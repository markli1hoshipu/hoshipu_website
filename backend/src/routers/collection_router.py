"""
Collection API Router
支持上传多个图片和音频文件
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
from datetime import datetime
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from database import get_db_connection
from r2_storage import r2_storage

router = APIRouter(prefix="/api/collection", tags=["collection"])

# 文件类型配置
ALLOWED_TYPES = {
    'image/jpeg': ('images', 10, 'jpg'),
    'image/png': ('images', 10, 'png'),
    'image/gif': ('images', 10, 'gif'),
    'image/webp': ('images', 10, 'webp'),
    'audio/mpeg': ('audio', 50, 'mp3'),
    'audio/wav': ('audio', 50, 'wav'),
    'audio/aac': ('audio', 50, 'aac'),
    'audio/ogg': ('audio', 50, 'ogg'),
}


@router.post("/")
async def create_collection(
    title: str = Form(...),
    author: str = Form("Anonymous"),
    content: str = Form(""),
    files: List[UploadFile] = File([])
):
    """
    创建 collection 条目，支持多个文件上传
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. 创建 collection 条目
        cursor.execute("""
            INSERT INTO collection_items (title, author, content, created_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (title, author, content, datetime.now()))
        
        collection_id = cursor.fetchone()['id']
        
        # 2. 处理上传的文件
        uploaded_media = []
        
        for index, file in enumerate(files):
            if not file.filename:
                continue
                
            # 验证文件类型
            if file.content_type not in ALLOWED_TYPES:
                raise HTTPException(400, f"不支持的文件类型: {file.content_type}")
            
            folder, max_mb, default_ext = ALLOWED_TYPES[file.content_type]
            
            # 读取文件
            file_content = await file.read()
            file_size = len(file_content)
            
            # 验证大小
            max_size = max_mb * 1024 * 1024
            if file_size > max_size:
                raise HTTPException(400, f"{file.filename} 大小超过 {max_mb}MB")
            
            # 生成文件路径
            file_ext = file.filename.split('.')[-1] if '.' in file.filename else default_ext
            date_path = datetime.now().strftime('%Y/%m')
            unique_id = str(uuid.uuid4())
            file_path = f"collection/{folder}/{date_path}/{unique_id}.{file_ext}"
            
            # 上传到 R2
            media_url = r2_storage.upload_file(
                file_content=file_content,
                file_name=file_path,
                content_type=file.content_type
            )
            
            # 保存到数据库
            cursor.execute("""
                INSERT INTO collection_media 
                (collection_id, media_type, media_url, file_path, file_size, content_type, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (collection_id, folder, media_url, file_path, file_size, file.content_type, index))
            
            uploaded_media.append({
                "type": folder,
                "url": media_url,
                "size": file_size
            })
        
        conn.commit()
        
        return {
            "success": True,
            "collection_id": collection_id,
            "title": title,
            "media_count": len(uploaded_media),
            "media": uploaded_media
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"创建失败: {str(e)}")
    
    finally:
        cursor.close()
        conn.close()


@router.get("/")
async def get_collections(limit: int = 20, offset: int = 0):
    """
    获取 collection 列表（包含媒体）
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 获取 collection 列表
        cursor.execute("""
            SELECT id, title, author, content, created_at, updated_at
            FROM collection_items
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        collections = cursor.fetchall()
        
        # 为每个 collection 获取媒体
        for collection in collections:
            cursor.execute("""
                SELECT id, media_type, media_url, file_size, content_type, display_order
                FROM collection_media
                WHERE collection_id = %s
                ORDER BY display_order
            """, (collection['id'],))
            
            collection['media'] = cursor.fetchall()
        
        # 获取总数
        cursor.execute("SELECT COUNT(*) as total FROM collection_items")
        total = cursor.fetchone()['total']
        
        return {
            "success": True,
            "total": total,
            "collections": collections
        }
        
    finally:
        cursor.close()
        conn.close()


@router.get("/{collection_id}")
async def get_collection(collection_id: int):
    """
    获取单个 collection 详情
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 获取 collection
        cursor.execute("""
            SELECT id, title, author, content, created_at, updated_at
            FROM collection_items
            WHERE id = %s
        """, (collection_id,))
        
        collection = cursor.fetchone()
        
        if not collection:
            raise HTTPException(404, "Collection 不存在")
        
        # 获取媒体
        cursor.execute("""
            SELECT id, media_type, media_url, file_size, content_type, display_order
            FROM collection_media
            WHERE collection_id = %s
            ORDER BY display_order
        """, (collection_id,))
        
        collection['media'] = cursor.fetchall()
        
        return {
            "success": True,
            "collection": collection
        }
        
    finally:
        cursor.close()
        conn.close()


@router.delete("/{collection_id}")
async def delete_collection(collection_id: int):
    """
    删除 collection 及其所有媒体文件
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 获取所有媒体文件路径
        cursor.execute("""
            SELECT file_path FROM collection_media
            WHERE collection_id = %s
        """, (collection_id,))
        
        media_files = cursor.fetchall()
        
        # 从 R2 删除文件
        for media in media_files:
            r2_storage.delete_file(media['file_path'])
        
        # 删除数据库记录（CASCADE 会自动删除 media）
        cursor.execute("""
            DELETE FROM collection_items WHERE id = %s
        """, (collection_id,))
        
        conn.commit()
        
        return {
            "success": True,
            "message": f"已删除 collection 及 {len(media_files)} 个媒体文件"
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"删除失败: {str(e)}")
    
    finally:
        cursor.close()
        conn.close()


@router.post("/test-upload")
async def test_upload(file: UploadFile = File(...)):
    """
    测试单个文件上传到 R2
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"不支持的文件类型: {file.content_type}")
    
    folder, max_mb, default_ext = ALLOWED_TYPES[file.content_type]
    
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > max_mb * 1024 * 1024:
        raise HTTPException(400, f"文件大小超过 {max_mb}MB")
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else default_ext
    file_path = f"test/{folder}/{uuid.uuid4()}.{file_ext}"
    
    try:
        url = r2_storage.upload_file(
            file_content=file_content,
            file_name=file_path,
            content_type=file.content_type
        )
        
        return {
            "success": True,
            "url": url,
            "size_mb": round(file_size / 1024 / 1024, 2),
            "type": folder
        }
    except Exception as e:
        raise HTTPException(500, f"上传失败: {str(e)}")
