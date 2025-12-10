"""
测试 Collection API 和 R2 上传
"""

import requests
import io
from PIL import Image

API_BASE = "http://localhost:6102"

def create_test_image(color='red', size=(200, 200)):
    """创建测试图片"""
    img = Image.new('RGB', size, color=color)
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes

print("=" * 60)
print("测试 Collection API")
print("=" * 60)

# 1. 测试单文件上传
print("\n1️⃣ 测试单个文件上传到 R2...")
test_img = create_test_image('blue')
files = {"file": ("test.jpg", test_img, "image/jpeg")}
response = requests.post(f"{API_BASE}/api/collection/test-upload", files=files)

if response.status_code == 200:
    result = response.json()
    print(f"✅ 上传成功!")
    print(f"   URL: {result['url']}")
    print(f"   大小: {result['size_mb']} MB")
    print(f"   类型: {result['type']}")
    
    # 验证可访问性
    test_response = requests.get(result['url'])
    if test_response.status_code == 200:
        print(f"✅ 文件可以公开访问!")
    else:
        print(f"❌ 无法访问文件: {test_response.status_code}")
else:
    print(f"❌ 上传失败: {response.status_code}")
    print(response.text)
    exit(1)

# 2. 测试创建 Collection（多个文件）
print("\n2️⃣ 测试创建 Collection（多个图片 + 音频）...")

# 准备多个文件
img1 = create_test_image('red')
img2 = create_test_image('green')

files = [
    ("files", ("image1.jpg", img1, "image/jpeg")),
    ("files", ("image2.jpg", img2, "image/jpeg")),
]

data = {
    "title": "测试 Collection",
    "content": "这是一个包含多个媒体文件的测试条目"
}

response = requests.post(f"{API_BASE}/api/collection/", data=data, files=files)

if response.status_code == 200:
    result = response.json()
    print(f"✅ Collection 创建成功!")
    print(f"   ID: {result['collection_id']}")
    print(f"   标题: {result['title']}")
    print(f"   媒体数量: {result['media_count']}")
    for i, media in enumerate(result['media']):
        print(f"   媒体 {i+1}: {media['type']} - {media['url'][:60]}...")
    
    collection_id = result['collection_id']
else:
    print(f"❌ 创建失败: {response.status_code}")
    print(response.text)
    exit(1)

# 3. 测试获取列表
print("\n3️⃣ 测试获取 Collection 列表...")
response = requests.get(f"{API_BASE}/api/collection/")

if response.status_code == 200:
    result = response.json()
    print(f"✅ 获取列表成功!")
    print(f"   总数: {result['total']}")
    print(f"   返回: {len(result['collections'])} 条")
    
    if result['collections']:
        first = result['collections'][0]
        print(f"   第一条: {first['title']} ({len(first['media'])} 个媒体)")
else:
    print(f"❌ 获取列表失败: {response.status_code}")

# 4. 测试获取详情
print(f"\n4️⃣ 测试获取 Collection 详情 (ID: {collection_id})...")
response = requests.get(f"{API_BASE}/api/collection/{collection_id}")

if response.status_code == 200:
    result = response.json()
    collection = result['collection']
    print(f"✅ 获取详情成功!")
    print(f"   标题: {collection['title']}")
    print(f"   内容: {collection['content']}")
    print(f"   媒体数量: {len(collection['media'])}")
else:
    print(f"❌ 获取详情失败: {response.status_code}")

print("\n" + "=" * 60)
print("✅ 所有测试完成!")
print("=" * 60)
