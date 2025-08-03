from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None

database = Database()

def get_database():
    return database.database

async def connect_to_mongo():
    """Create database connection"""
    try:
        database.client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        database.database = database.client[os.environ.get('DB_NAME', 'saasit')]
        
        # Test the connection
        await database.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if database.client:
        database.client.close()
        logger.info("Disconnected from MongoDB")

async def create_indexes():
    """Create database indexes for performance"""
    try:
        db = database.database
        
        # User indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("tier")
        
        # Workflow indexes
        await db.workflows.create_index("user_id")
        await db.workflows.create_index([("is_template", 1), ("template_category", 1)])
        await db.workflows.create_index("created_at")
        
        # Agent indexes
        await db.agents.create_index("category")
        await db.agents.create_index("name", unique=True)
        await db.agents.create_index([("created_by_id", 1), ("is_custom", 1)])
        
        # Execution indexes
        await db.executions.create_index([("user_id", 1), ("status", 1)])
        await db.executions.create_index("status")
        await db.executions.create_index("created_at")
        
        # Template indexes
        await db.templates.create_index("category")
        await db.templates.create_index("is_public")
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")

# Utility functions for common database operations
async def insert_one(collection_name: str, document: dict):
    """Insert a single document"""
    collection = database.database[collection_name]
    result = await collection.insert_one(document)
    return result.inserted_id

async def find_one(collection_name: str, filter_dict: dict):
    """Find a single document"""
    collection = database.database[collection_name]
    return await collection.find_one(filter_dict)

async def find_many(collection_name: str, filter_dict: dict = None, skip: int = 0, limit: int = 100, sort: list = None):
    """Find multiple documents"""
    collection = database.database[collection_name]
    cursor = collection.find(filter_dict or {})
    
    if sort:
        cursor = cursor.sort(sort)
    
    cursor = cursor.skip(skip).limit(limit)
    return await cursor.to_list(length=limit)

async def update_one(collection_name: str, filter_dict: dict, update_dict: dict):
    """Update a single document"""
    collection = database.database[collection_name]
    result = await collection.update_one(filter_dict, {"$set": update_dict})
    return result.modified_count

async def delete_one(collection_name: str, filter_dict: dict):
    """Delete a single document"""
    collection = database.database[collection_name]
    result = await collection.delete_one(filter_dict)
    return result.deleted_count

async def count_documents(collection_name: str, filter_dict: dict = None):
    """Count documents in collection"""
    collection = database.database[collection_name]
    return await collection.count_documents(filter_dict or {})