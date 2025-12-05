import requests
import yaml
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:6101/api/pdf-templates"
PASSWORD = "gjp123"

yaml_templates = {
    "仅发票号": "{invoice_number}.pdf",
    "测试": "{issue_date}-{amount}.pdf",
    "行程信息": "{buyer} {name} {origin}-{destination} {amount}.pdf"
}

response = requests.get(API_URL)
existing_templates = {t['name']: t for t in response.json()}

for name, template_string in yaml_templates.items():
    if name in existing_templates:
        print(f"Template '{name}' already exists, skipping...")
        continue
    
    data = {
        "name": name,
        "template_string": template_string,
        "password": PASSWORD
    }
    
    try:
        response = requests.post(API_URL, json=data)
        if response.status_code == 201:
            print(f"Successfully added template: {name}")
        else:
            print(f"Failed to add template {name}: {response.text}")
    except Exception as e:
        print(f"Error adding template {name}: {e}")

print("\nFinal templates in database:")
response = requests.get(API_URL)
for t in response.json():
    print(f"  - {t['name']}: {t['template_string']}")
