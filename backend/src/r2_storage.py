"""
Cloudflare R2 存储工具
"""

import boto3
import os
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

class R2Storage:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('R2_ENDPOINT'),
            aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
        self.bucket_name = os.getenv('R2_BUCKET_NAME')
        self.public_url = os.getenv('R2_PUBLIC_URL')
    
    def upload_file(self, file_content: bytes, file_name: str, content_type: str = 'application/octet-stream'):
        """
        上传文件到 R2
        
        Args:
            file_content: 文件的二进制内容
            file_name: 文件路径（如 "collection/images/2024/12/image.jpg"）
            content_type: MIME 类型
        
        Returns:
            公开访问的 URL
        """
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=file_content,
                ContentType=content_type
            )
            
            public_url = f"{self.public_url}/{file_name}"
            return public_url
            
        except Exception as e:
            print(f"R2 上传失败: {e}")
            raise
    
    def delete_file(self, file_name: str):
        """删除文件"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_name
            )
            return True
        except Exception as e:
            print(f"R2 删除失败: {e}")
            return False
    
    def list_files(self, prefix: str = ""):
        """列出文件"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            return response.get('Contents', [])
        except Exception as e:
            print(f"R2 列出文件失败: {e}")
            return []

r2_storage = R2Storage()
