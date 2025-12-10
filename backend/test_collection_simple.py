"""
Test Collection API and R2 upload
"""

import requests
import io
from PIL import Image

API_BASE = "http://localhost:6102"

def create_test_image(color='red', size=(200, 200)):
    """Create test image"""
    img = Image.new('RGB', size, color=color)
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes

print("=" * 60)
print("Testing Collection API")
print("=" * 60)

# 1. Test single file upload
print("\n[1] Testing single file upload to R2...")
test_img = create_test_image('blue')
files = {"file": ("test.jpg", test_img, "image/jpeg")}
response = requests.post(f"{API_BASE}/api/collection/test-upload", files=files)

if response.status_code == 200:
    result = response.json()
    print(f"SUCCESS! Upload successful!")
    print(f"   URL: {result['url']}")
    print(f"   Size: {result['size_mb']} MB")
    print(f"   Type: {result['type']}")
    
    # Verify accessibility
    test_response = requests.get(result['url'])
    if test_response.status_code == 200:
        print(f"SUCCESS! File is publicly accessible!")
        print(f"   Content-Type: {test_response.headers.get('content-type')}")
    else:
        print(f"ERROR! Cannot access file: {test_response.status_code}")
else:
    print(f"ERROR! Upload failed: {response.status_code}")
    print(response.text)
    exit(1)

# 2. Test creating Collection with multiple files
print("\n[2] Testing Collection creation (multiple images)...")

# Prepare multiple files
img1 = create_test_image('red')
img2 = create_test_image('green')

files = [
    ("files", ("image1.jpg", img1, "image/jpeg")),
    ("files", ("image2.jpg", img2, "image/jpeg")),
]

data = {
    "title": "Test Collection",
    "content": "This is a test collection with multiple media files"
}

response = requests.post(f"{API_BASE}/api/collection/", data=data, files=files)

if response.status_code == 200:
    result = response.json()
    print(f"SUCCESS! Collection created!")
    print(f"   ID: {result['collection_id']}")
    print(f"   Title: {result['title']}")
    print(f"   Media count: {result['media_count']}")
    for i, media in enumerate(result['media']):
        print(f"   Media {i+1}: {media['type']} - {media['url'][:70]}...")
    
    collection_id = result['collection_id']
else:
    print(f"ERROR! Creation failed: {response.status_code}")
    print(response.text)
    exit(1)

# 3. Test getting list
print("\n[3] Testing Collection list retrieval...")
response = requests.get(f"{API_BASE}/api/collection/")

if response.status_code == 200:
    result = response.json()
    print(f"SUCCESS! List retrieved!")
    print(f"   Total: {result['total']}")
    print(f"   Returned: {len(result['collections'])} items")
    
    if result['collections']:
        first = result['collections'][0]
        print(f"   First item: {first['title']} ({len(first['media'])} media)")
else:
    print(f"ERROR! List retrieval failed: {response.status_code}")

# 4. Test getting details
print(f"\n[4] Testing Collection detail retrieval (ID: {collection_id})...")
response = requests.get(f"{API_BASE}/api/collection/{collection_id}")

if response.status_code == 200:
    result = response.json()
    collection = result['collection']
    print(f"SUCCESS! Detail retrieved!")
    print(f"   Title: {collection['title']}")
    print(f"   Content: {collection['content']}")
    print(f"   Media count: {len(collection['media'])}")
    for i, media in enumerate(collection['media']):
        print(f"   Media {i+1}: {media['media_type']} - {media['media_url'][:70]}...")
else:
    print(f"ERROR! Detail retrieval failed: {response.status_code}")

print("\n" + "=" * 60)
print("All tests completed!")
print("=" * 60)
