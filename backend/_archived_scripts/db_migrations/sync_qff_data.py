"""
Sync QFF travel data from local files to database
"""
import sys
import os
import json
import yaml

src_path = os.path.join(os.path.dirname(__file__), 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from database import SessionLocal
from models import TravelOutputTemplate, TravelAirline, TravelAirport

def sync_templates():
    db = SessionLocal()
    try:
        yaml_path = os.path.join(os.path.dirname(__file__), '..', 'ww_航程翻译_2023ver', 'output_templates.yaml')
        
        with open(yaml_path, 'r', encoding='utf8') as f:
            config = yaml.safe_load(f)
        
        for template_name, template_config in config['templates'].items():
            existing = db.query(TravelOutputTemplate).filter(TravelOutputTemplate.name == template_name).first()
            
            if not existing:
                new_template = TravelOutputTemplate(
                    name=template_name,
                    description=template_config.get('description', ''),
                    config_json=json.dumps(template_config, ensure_ascii=False, indent=2),
                    is_active=True
                )
                db.add(new_template)
                print(f"Added template: {template_name}")
            else:
                print(f"Template already exists: {template_name}")
        
        db.commit()
        print("Templates synced successfully!")
    except Exception as e:
        print(f"Error syncing templates: {e}")
        db.rollback()
    finally:
        db.close()

def sync_airlines():
    db = SessionLocal()
    try:
        txt_path = os.path.join(os.path.dirname(__file__), '..', 'ww_航程翻译_2023ver', '航司对照表.txt')
        
        with open(txt_path, 'r', encoding='utf8') as f:
            lines = f.readlines()
        
        count = 0
        for line in lines:
            line = line.strip()
            if not line or line.startswith('END'):
                continue
            
            parts = line.split(maxsplit=1)
            if len(parts) == 2:
                code, name = parts
                
                existing = db.query(TravelAirline).filter(TravelAirline.code == code).first()
                
                if not existing:
                    new_airline = TravelAirline(
                        code=code,
                        name=name,
                        is_active=True
                    )
                    db.add(new_airline)
                    count += 1
        
        db.commit()
        print(f"Added {count} airlines!")
    except Exception as e:
        print(f"Error syncing airlines: {e}")
        db.rollback()
    finally:
        db.close()

def sync_airports():
    db = SessionLocal()
    try:
        txt_path = os.path.join(os.path.dirname(__file__), '..', 'ww_航程翻译_2023ver', '机场对照表.txt')
        
        with open(txt_path, 'r', encoding='utf8') as f:
            lines = f.readlines()
        
        count = 0
        for line in lines:
            line = line.strip()
            if not line or line.startswith('END'):
                continue
            
            parts = line.split(maxsplit=1)
            if len(parts) == 2:
                code, name = parts
                
                existing = db.query(TravelAirport).filter(TravelAirport.code == code).first()
                
                if not existing:
                    new_airport = TravelAirport(
                        code=code,
                        name=name,
                        is_active=True
                    )
                    db.add(new_airport)
                    count += 1
        
        db.commit()
        print(f"Added {count} airports!")
    except Exception as e:
        print(f"Error syncing airports: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting QFF data sync...")
    print("\n1. Syncing templates...")
    sync_templates()
    print("\n2. Syncing airlines...")
    sync_airlines()
    print("\n3. Syncing airports...")
    sync_airports()
    print("\nSync completed!")
