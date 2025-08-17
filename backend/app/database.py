"""
Database dependency injection for FastAPI
"""
from fastapi import Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_database(request: Request) -> AsyncIOMotorDatabase:
    """
    Get database instance from app state.
    This dependency can be overridden in tests.
    """
    db = getattr(request.app.state, 'db', None)
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
    return db