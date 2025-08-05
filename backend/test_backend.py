#!/usr/bin/env python3
"""
Test script for SaasIt.ai backend API
Run with: python test_backend.py
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Test data
TEST_USER = {
    "email": f"test_{datetime.now().timestamp()}@example.com",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User",
    "company": "Test Company"
}

TEST_PROJECT = {
    "name": "Test AI Workflow",
    "description": "A test project for the backend",
    "tags": ["test", "demo"],
    "workflow": {
        "nodes": [
            {
                "id": "node-1",
                "type": "agent",
                "position": {"x": 100, "y": 100},
                "data": {
                    "id": "rapid-prototyper",
                    "name": "Rapid Prototyper",
                    "description": "Build the MVP"
                }
            }
        ],
        "edges": [],
        "layout": "sequential"
    }
}


class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_test(test_name):
    print(f"\n{Colors.HEADER}{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")


def print_success(message):
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")


def print_error(message):
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")


def print_info(message):
    print(f"{Colors.OKCYAN}→ {message}{Colors.ENDC}")


def test_health_check():
    """Test the health check endpoint"""
    print_test("Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print_success(f"Server is {data['status']}")
            print_info(f"Version: {data['version']}")
            print_info(f"Database: {data['database']}")
            return True
        else:
            print_error(f"Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to server: {e}")
        return False


def test_user_registration():
    """Test user registration"""
    print_test("User Registration")
    
    try:
        response = requests.post(f"{API_V1}/auth/register", json=TEST_USER)
        if response.status_code == 200:
            data = response.json()
            print_success("User registered successfully")
            print_info(f"User ID: {data['user']['id']}")
            print_info(f"Email: {data['user']['email']}")
            print_info(f"Tier: {data['user']['subscription']['tier']}")
            return data
        else:
            print_error(f"Registration failed: {response.json()}")
            return None
    except Exception as e:
        print_error(f"Registration error: {e}")
        return None


def test_user_login(email=None, password=None):
    """Test user login"""
    print_test("User Login")
    
    login_data = {
        "email": email or TEST_USER["email"],
        "password": password or TEST_USER["password"]
    }
    
    try:
        response = requests.post(f"{API_V1}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print_success("Login successful")
            print_info(f"Access token: {data['access_token'][:20]}...")
            return data
        else:
            print_error(f"Login failed: {response.json()}")
            return None
    except Exception as e:
        print_error(f"Login error: {e}")
        return None


def test_get_user_info(token):
    """Test getting current user info"""
    print_test("Get User Info")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{API_V1}/auth/me", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_success("Retrieved user info")
            print_info(f"Name: {data['first_name']} {data['last_name']}")
            print_info(f"Verified: {data['is_verified']}")
            print_info(f"Usage: {data['usage']['workflows_created']}/{data['usage']['workflows_limit']} workflows")
            return True
        else:
            print_error(f"Failed to get user info: {response.json()}")
            return False
    except Exception as e:
        print_error(f"Error getting user info: {e}")
        return False


def test_create_project(token):
    """Test creating a project"""
    print_test("Create Project")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{API_V1}/projects", json=TEST_PROJECT, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_success("Project created successfully")
            print_info(f"Project ID: {data['id']}")
            print_info(f"Name: {data['name']}")
            print_info(f"Status: {data['status']}")
            return data
        else:
            print_error(f"Failed to create project: {response.json()}")
            return None
    except Exception as e:
        print_error(f"Error creating project: {e}")
        return None


def test_list_projects(token):
    """Test listing projects"""
    print_test("List Projects")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{API_V1}/projects", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Retrieved {data['total']} projects")
            for project in data['projects']:
                print_info(f"- {project['name']} (ID: {project['id']})")
            return True
        else:
            print_error(f"Failed to list projects: {response.json()}")
            return False
    except Exception as e:
        print_error(f"Error listing projects: {e}")
        return False


def test_export_project(token, project_id):
    """Test exporting a project"""
    print_test("Export Project")
    
    headers = {"Authorization": f"Bearer {token}"}
    export_options = {
        "format": "json",
        "include_readme": True,
        "include_env_template": True
    }
    
    try:
        response = requests.post(
            f"{API_V1}/projects/{project_id}/export/json", 
            json=export_options, 
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print_success("Project exported successfully")
            print_info(f"Filename: {data['filename']}")
            print_info(f"Content type: {data['content_type']}")
            print_info(f"Content length: {len(data['content'])} bytes")
            return True
        else:
            print_error(f"Failed to export project: {response.json()}")
            return False
    except Exception as e:
        print_error(f"Error exporting project: {e}")
        return False


def main():
    """Run all tests"""
    print(f"{Colors.BOLD}{Colors.HEADER}=== SaasIt.ai Backend Test Suite ==={Colors.ENDC}")
    
    # Test health check
    if not test_health_check():
        print(f"\n{Colors.FAIL}Server is not running. Start it with: uvicorn server:app --reload{Colors.ENDC}")
        sys.exit(1)
    
    # Test user registration
    registration_data = test_user_registration()
    if not registration_data:
        print(f"\n{Colors.WARNING}Registration failed - trying login with existing user{Colors.ENDC}")
        
    # Test user login
    login_data = test_user_login()
    if not login_data:
        print(f"\n{Colors.FAIL}Cannot proceed without authentication{Colors.ENDC}")
        sys.exit(1)
    
    token = login_data["access_token"]
    
    # Test authenticated endpoints
    test_get_user_info(token)
    
    # Test project operations
    project = test_create_project(token)
    test_list_projects(token)
    
    if project:
        test_export_project(token, project["id"])
    
    print(f"\n{Colors.BOLD}{Colors.OKGREEN}=== All tests completed ==={Colors.ENDC}")


if __name__ == "__main__":
    main()