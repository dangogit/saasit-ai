#!/usr/bin/env python3
"""
Script to clear all data from MongoDB database
WARNING: This will delete ALL data from the database!
"""

import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv()

async def clear_database():
    """Clear all collections in the database"""
    
    # Get database configuration
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "saasit-ai")
    
    if not mongo_url:
        print("❌ Error: MONGO_URL environment variable not set")
        return False
    
    print(f"🔗 Connecting to MongoDB...")
    print(f"   Database: {db_name}")
    
    try:
        # Create MongoDB client
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB")
        
        # Get database
        db = client[db_name]
        
        # Get all collection names
        collections = await db.list_collection_names()
        
        if not collections:
            print("ℹ️  Database is already empty")
            return True
        
        print(f"\n📋 Found {len(collections)} collections to clear:")
        for collection in collections:
            print(f"   - {collection}")
        
        # Confirm deletion
        print("\n⚠️  WARNING: This will DELETE ALL DATA from the database!")
        confirmation = input("Type 'DELETE ALL' to confirm: ")
        
        if confirmation != "DELETE ALL":
            print("❌ Deletion cancelled")
            return False
        
        print("\n🗑️  Clearing collections...")
        
        # Clear each collection
        for collection_name in collections:
            collection = db[collection_name]
            result = await collection.delete_many({})
            print(f"   ✓ Cleared {collection_name}: {result.deleted_count} documents deleted")
        
        print("\n✅ Database cleared successfully!")
        
        # Verify collections are empty
        print("\n🔍 Verifying collections are empty...")
        all_empty = True
        for collection_name in collections:
            collection = db[collection_name]
            count = await collection.count_documents({})
            if count > 0:
                print(f"   ⚠️  {collection_name} still has {count} documents")
                all_empty = False
            else:
                print(f"   ✓ {collection_name} is empty")
        
        if all_empty:
            print("\n✅ All collections verified empty!")
        else:
            print("\n⚠️  Some collections still have data")
        
        return all_empty
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\nPossible issues:")
        print("  - MongoDB connection string may be incorrect")
        print("  - Database may be unreachable")
        print("  - SSL/TLS configuration issues")
        return False
    finally:
        try:
            client.close()
            print("\n🔌 Disconnected from MongoDB")
        except:
            pass

async def main():
    """Main function"""
    print("=" * 50)
    print("MongoDB Database Cleaner for SaasIt.ai")
    print("=" * 50)
    
    success = await clear_database()
    
    if success:
        print("\n✨ Database is now clean and ready for fresh data!")
    else:
        print("\n❌ Database clearing failed or was cancelled")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())