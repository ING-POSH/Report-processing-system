#!/usr/bin/env python3
import requests

# Test health check
print("=== Testing Health Check ===")
try:
    response = requests.get('http://localhost:8080/health')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Testing Organization Signup ===")
# Test organization creation
test_org_data = {
    "organization_name": "Test Organization",
    "admin_email": "admin@test.com",
    "admin_password": "Test123!",
    "admin_name": "Test Admin"
}

try:
    response = requests.post(
        'http://localhost:8080/api/auth/signup/organization',
        json=test_org_data,
        headers={'Content-Type': 'application/json'}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 201:
        data = response.json()
        access_token = data['access_token']
        org_id = data['organization']['id']
        
        print("\n=== Testing Get Organization ===")
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(f'http://localhost:8080/api/organizations/{org_id}', headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        print("\n=== Testing List Workspaces ===")
        response = requests.get('http://localhost:8080/api/workspaces', headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
except Exception as e:
    print(f"Error: {e}")

print("\n=== All Tests Complete ===")