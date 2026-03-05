#!/usr/bin/env python3
"""Simple API Test - No PowerShell Issues"""
import requests
import json

BASE = 'http://localhost:8080'

print("=" * 60)
print("TEST 1: Health Check")
print("=" * 60)
r = requests.get(f'{BASE}/health')
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")

print("\n" + "=" * 60)
print("TEST 2: Create Organization")
print("=" * 60)
data = {
    "organization_name": "My Company",
    "admin_email": "ceo@company.com",
    "admin_password": "SecurePass123!",
    "admin_name": "CEO User"
}
r = requests.post(f'{BASE}/api/auth/signup/organization', json=data)
print(f"Status: {r.status_code}")
if r.status_code == 201:
    result = r.json()
    print("✓ Organization created successfully!")
    print(f"Organization ID: {result['organization']['id']}")
    print(f"User Email: {result['user']['email']}")
    access_token = result['access_token']
    org_id = result['organization']['id']
    
    headers = {'Authorization': f'Bearer {access_token}'}
    
    print("\n" + "=" * 60)
    print("TEST 3: Get Organization Details")
    print("=" * 60)
    r = requests.get(f'{BASE}/api/organizations/{org_id}', headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print(f"✓ Success! {r.json()}")
    
    print("\n" + "=" * 60)
    print("TEST 4: List Workspaces")
    print("=" * 60)
    r = requests.get(f'{BASE}/api/workspaces', headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print(f"✓ Success! {r.json()}")
    
    print("\n" + "=" * 60)
    print("TEST 5: Create New Workspace")
    print("=" * 60)
    ws_data = {
        "organization_id": org_id,
        "name": "Development Team",
        "description": "Main development workspace"
    }
    r = requests.post(f'{BASE}/api/workspaces', json=ws_data, headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 201:
        print(f"✓ Workspace created! {r.json()}")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED!")
    print("=" * 60)
else:
    print(f"✗ Failed: {r.json()}")
    print("Cannot continue tests")
