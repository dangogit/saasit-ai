from typing import List, Optional
from fastapi import HTTPException, status
from bson import ObjectId
from models.agent import Agent, AgentCreate, AgentUpdate, AgentResponse, AgentCategory
from database.connection import find_one, find_many, insert_one, update_one, delete_one
import logging

logger = logging.getLogger(__name__)

class AgentService:
    async def get_all_agents(self) -> List[AgentResponse]:
        """Get all public agents"""
        try:
            agents_docs = await find_many("agents", {"is_public": True}, sort=[("category", 1), ("name", 1)])
            return [self._doc_to_response(doc) for doc in agents_docs]
        except Exception as e:
            logger.error(f"Get all agents error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve agents"
            )

    async def get_agent_by_id(self, agent_id: str) -> AgentResponse:
        """Get agent by ID"""
        try:
            agent_doc = await find_one("agents", {"_id": ObjectId(agent_id)})
            if not agent_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found"
                )
            return self._doc_to_response(agent_doc)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get agent error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve agent"
            )

    async def get_agent_categories(self) -> List[AgentCategory]:
        """Get agent categories with counts"""
        try:
            # Get all agents and group by category
            agents = await find_many("agents", {"is_public": True})
            category_counts = {}
            
            for agent in agents:
                category = agent["category"]
                category_counts[category] = category_counts.get(category, 0) + 1

            # Create categories list
            categories = [
                AgentCategory(id="all", name="All Agents", count=len(agents))
            ]
            
            for category, count in category_counts.items():
                categories.append(AgentCategory(
                    id=category.lower(),
                    name=category,
                    count=count
                ))

            return categories
        except Exception as e:
            logger.error(f"Get agent categories error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve agent categories"
            )

    async def create_custom_agent(self, user_id: str, agent_data: AgentCreate) -> AgentResponse:
        """Create a custom agent"""
        try:
            # Check if name is already taken
            existing_agent = await find_one("agents", {"name": agent_data.name})
            if existing_agent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Agent name already exists"
                )

            # Create agent document
            agent_doc = {
                "name": agent_data.name,
                "display_name": agent_data.display_name,
                "category": agent_data.category,
                "description": agent_data.description,
                "icon": agent_data.icon,
                "color": agent_data.color,
                "capabilities": agent_data.capabilities,
                "estimated_time": agent_data.estimated_time,
                "system_prompt": agent_data.system_prompt,
                "is_custom": True,
                "created_by_id": user_id,
                "is_public": False,  # Custom agents are private by default
                "usage_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Insert agent
            agent_id = await insert_one("agents", agent_doc)
            agent_doc["_id"] = str(agent_id)

            return self._doc_to_response(agent_doc)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Create custom agent error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create custom agent"
            )

    async def update_custom_agent(self, agent_id: str, user_id: str, update_data: AgentUpdate) -> AgentResponse:
        """Update a custom agent"""
        try:
            # Verify ownership
            existing_agent = await find_one("agents", {
                "_id": ObjectId(agent_id),
                "created_by_id": user_id,
                "is_custom": True
            })

            if not existing_agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Custom agent not found"
                )

            # Prepare update data
            update_dict = {
                "updated_at": datetime.utcnow()
            }

            for field, value in update_data.dict(exclude_unset=True).items():
                if value is not None:
                    update_dict[field] = value

            # Update agent
            await update_one("agents", {"_id": ObjectId(agent_id)}, update_dict)

            # Get updated agent
            updated_agent = await find_one("agents", {"_id": ObjectId(agent_id)})
            return self._doc_to_response(updated_agent)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update custom agent error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update custom agent"
            )

    async def delete_custom_agent(self, agent_id: str, user_id: str):
        """Delete a custom agent"""
        try:
            # Verify ownership
            existing_agent = await find_one("agents", {
                "_id": ObjectId(agent_id),
                "created_by_id": user_id,
                "is_custom": True
            })

            if not existing_agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Custom agent not found"
                )

            # Delete agent
            await delete_one("agents", {"_id": ObjectId(agent_id)})

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Delete custom agent error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete custom agent"
            )

    async def increment_usage_count(self, agent_id: str):
        """Increment agent usage count"""
        try:
            await update_one(
                "agents", 
                {"_id": ObjectId(agent_id)}, 
                {"$inc": {"usage_count": 1}}
            )
        except Exception as e:
            logger.warning(f"Failed to increment usage count for agent {agent_id}: {e}")

    def _doc_to_response(self, doc: dict) -> AgentResponse:
        """Convert MongoDB document to AgentResponse"""
        return AgentResponse(
            id=str(doc["_id"]),
            name=doc["name"],
            category=doc["category"],
            description=doc["description"],
            icon=doc["icon"],
            color=doc.get("color", "accent-blue"),
            capabilities=doc.get("capabilities", []),
            estimated_time=doc.get("estimated_time", "2-4 hours"),
            is_custom=doc.get("is_custom", False),
            usage_count=doc.get("usage_count", 0)
        )

from datetime import datetime
agent_service = AgentService()