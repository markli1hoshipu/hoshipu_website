#!/usr/bin/env python3
"""
Test Onboarding API with Different Database Configurations
==========================================================

Script to test the updated onboarding API with different database configurations.
"""

import requests
import json

def test_onboarding_api(base_url="http://localhost:8005"):
    """Test the onboarding API endpoints with different configurations."""
    
    print("=== ONBOARDING API TEST SUITE ===")
    
    test_cases = [
        {
            "name": "Default (Postgres Reference)",
            "url": f"{base_url}/api/onboarding/table-checklist",
            "expected_total": 27,
            "description": "Should show postgres as reference with 27 tables"
        },
        {
            "name": "Panacea Database",
            "url": f"{base_url}/api/onboarding/table-checklist?database=prelude_panacea",
            "expected_total": 27,
            "description": "Should show 10-11 out of 27 tables for Panacea"
        },
        {
            "name": "User Database",
            "url": f"{base_url}/api/onboarding/table-checklist?database=user_database",
            "expected_total": 27,
            "description": "Should show user_database tables against 27 reference"
        },
        {
            "name": "User Email Routing",
            "url": f"{base_url}/api/onboarding/table-checklist?user_email=test@panacea.com",
            "expected_total": 27,
            "description": "Should route user to their database or default"
        }
    ]
    
    print(f"Testing API at: {base_url}")
    print("-" * 80)
    
    for i, test in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test['name']}")
        print(f"URL: {test['url']}")
        print(f"Expected: {test['description']}")
        
        try:
            response = requests.get(test['url'], timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                total_tables = data.get('total_tables', 0)
                existing_tables = data.get('existing_tables', 0)
                completion = data.get('completion_percentage', 0)
                
                print(f"✅ SUCCESS:")
                print(f"   Total Expected: {total_tables} (should be {test['expected_total']})")
                print(f"   Existing: {existing_tables}")
                print(f"   Completion: {completion:.1f}%")
                
                if total_tables == test['expected_total']:
                    print(f"   ✅ Correct reference count!")
                else:
                    print(f"   ❌ Expected {test['expected_total']} total tables, got {total_tables}")
                    
            else:
                print(f"❌ FAILED: HTTP {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                
        except requests.RequestException as e:
            print(f"❌ CONNECTION ERROR: {e}")
        
        print("-" * 40)
    
    # Test database status endpoints
    print(f"\n=== DATABASE STATUS TESTS ===")
    
    status_tests = [
        {
            "name": "Default Status",
            "url": f"{base_url}/api/onboarding/database-status"
        },
        {
            "name": "Panacea Status",
            "url": f"{base_url}/api/onboarding/database-status?database=prelude_panacea"
        }
    ]
    
    for test in status_tests:
        print(f"\n{test['name']}:")
        try:
            response = requests.get(test['url'], timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"   Database: {data.get('database_name')}")
                print(f"   Tables: {data.get('total_tables')}/{data.get('expected_tables')}")
                print(f"   Match: {data.get('tables_match')}")
                print(f"   Routing: {data.get('routing_method', 'unknown')}")
            else:
                print(f"   ❌ HTTP {response.status_code}")
        except requests.RequestException as e:
            print(f"   ❌ ERROR: {e}")

if __name__ == "__main__":
    print("Testing onboarding API endpoints...")
    print("Make sure the backend service is running on port 8005!")
    print()
    test_onboarding_api()