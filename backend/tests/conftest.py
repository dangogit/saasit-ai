"""
Pytest configuration and fixtures for SaasIt.ai backend tests
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi.testclient import TestClient
from datetime import datetime
import os

# Set test environment
os.environ["TESTING"] = "true"
os.environ["MONGO_URL"] = os.getenv("TEST_MONGO_URL", "mongodb://localhost:27017")
os.environ["DB_NAME"] = "saasit_test"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"

from server import app
from app.config import settings
from app.services.auth_service import AuthService
from app.models.user import UserCreate


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def db_client() -> AsyncGenerator[AsyncIOMotorClient, None]:
    """Get test database client"""
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    yield client
    client.close()


@pytest.fixture(scope="function")
async def test_db(db_client: AsyncIOMotorClient) -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Get test database and clean it after each test"""
    db = db_client[os.environ["DB_NAME"]]
    
    # Clean database before test
    await db.users.delete_many({})
    await db.projects.delete_many({})
    await db.status_checks.delete_many({})
    
    yield db
    
    # Clean database after test
    await db.users.delete_many({})
    await db.projects.delete_many({})
    await db.status_checks.delete_many({})


@pytest.fixture
def client(test_db: AsyncIOMotorDatabase) -> TestClient:
    """Get test client with test database"""
    app.state.db = test_db
    return TestClient(app)


@pytest.fixture
async def test_user_data() -> dict:
    """Get test user data"""
    return {
        "email": f"test_{datetime.now().timestamp()}@example.com",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User",
        "company": "Test Company"
    }


@pytest.fixture
async def registered_user(test_db: AsyncIOMotorDatabase, test_user_data: dict) -> dict:
    """Create a registered user and return user data with tokens"""
    auth_service = AuthService(test_db)
    user_create = UserCreate(**test_user_data)
    result = await auth_service.register_user(user_create)
    return {
        **result,
        "password": test_user_data["password"]
    }


@pytest.fixture
async def auth_headers(registered_user: dict) -> dict:
    """Get authorization headers with valid token"""
    return {
        "Authorization": f"Bearer {registered_user['access_token']}"
    }


@pytest.fixture
def test_project_data() -> dict:
    """Get test project data"""
    return {
        "name": "Test AI Workflow",
        "description": "A test project for automated testing",
        "tags": ["test", "automated"],
        "workflow": {
            "nodes": [
                {
                    "id": "node-1",
                    "type": "agent",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "id": "rapid-prototyper",
                        "name": "Rapid Prototyper",
                        "description": "Build the MVP",
                        "capabilities": ["prototyping", "mvp"],
                        "category": "Engineering"
                    }
                },
                {
                    "id": "node-2",
                    "type": "agent",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "id": "frontend-developer",
                        "name": "Frontend Developer",
                        "description": "Build the UI",
                        "capabilities": ["react", "ui"],
                        "category": "Engineering"
                    }
                }
            ],
            "edges": [
                {
                    "id": "edge-1",
                    "source": "node-1",
                    "target": "node-2",
                    "type": "smoothstep"
                }
            ],
            "layout": "sequential"
        }
    }


@pytest.fixture
async def test_users_with_tiers(test_db: AsyncIOMotorDatabase) -> dict:
    """Create test users with different subscription tiers"""
    auth_service = AuthService(test_db)
    users = {}
    
    tiers = ["free", "architect", "builder", "shipper", "studio"]
    
    for tier in tiers:
        user_data = UserCreate(
            email=f"{tier}_user@example.com",
            password="TestPass123!",
            first_name=tier.capitalize(),
            last_name="User"
        )
        
        result = await auth_service.register_user(user_data)
        
        # Update user tier
        await test_db.users.update_one(
            {"_id": result["user"]["id"]},
            {"$set": {"subscription.tier": tier}}
        )
        
        users[tier] = {
            **result,
            "tier": tier
        }
    
    return users