#!/usr/bin/env python3
import requests
import json

BASE_URL = 'http://localhost:8080'

def test_endpoint(method, endpoint, **kwargs):
    """Test an endpoint and print results"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{method} {endpoint}")
    print("-" * 50)
    
    try:
        if method == 'GET':
            response = requests.get(url, **kwargs)
        elif method == 'POST':
            response = requests.post(url, **kwargs)
        
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200 or response.status_code == 201:
            try:
                data = response.json()
                print(f"✓ Success!")
                print(f"Response: {json.dumps(data, indent=2)}")
                return data
            except json.JSONDecodeError:
                print(f"✗ Failed to parse JSON")
                print(f"Raw response: {response.text[:500]}")
        else:
            print(f"✗ Error")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Raw error: {response.text[:500]}")
        
        return None
        
    except Exception as e:
        print(f"✗ Exception: {e}")
        return None

# Test 1: Health Check
print("=" * 60)
print("TEST 1: Health Check")
print("=" * 60)
test_endpoint('GET', '/health')

# Test 2: Create Organization
print("\n" + "=" * 60)
print("TEST 2: Create Organization")
print("=" * 60)

org_data = {
    "organization_name": "Test Org",
    "admin_email": "admin@test.com",
    "admin_password": "Test123!",
    "admin_name": "Admin User"
}

headers = {'Content-Type': 'application/json'}
result = test_endpoint('POST', '/api/auth/signup/organization', json=org_data, headers=headers)

if result and 'access_token' in result:
    access_token = result['access_token']
    org_id = result['organization']['id']
    
    auth_headers = {'Authorization': f'Bearer {access_token}'}
    
    # Test 3: Get Organization
    print("\n" + "=" * 60)
    print("TEST 3: Get Organization Details")
    print("=" * 60)
    test_endpoint('GET', f'/api/organizations/{org_id}', headers=auth_headers)
    
    # Test 4: List Workspaces
    print("\n" + "=" * 60)
    print("TEST 4: List Workspaces")
    print("=" * 60)
    test_endpoint('GET', '/api/workspaces', headers=auth_headers)
    
    # Test 5: Create Another Workspace
    print("\n" + "=" * 60)
    print("TEST 5: Create New Workspace")
    print("=" * 60)
    workspace_data = {
        "organization_id": org_id,
        "name": "Project Alpha",
        "description": "Test workspace"
    }
    test_endpoint('POST', '/api/workspaces', json=workspace_data, headers=auth_headers)
else:
    print("\n✗ Cannot continue tests - no access token received")

print("\n" + "=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)