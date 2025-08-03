from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from bson import ObjectId
from models.workflow import (
    Workflow, WorkflowCreate, WorkflowUpdate, WorkflowResponse, 
    WorkflowSummary, WorkflowListResponse, CanvasState, ChatMessage
)
from models.user import UserTier
from database.connection import find_one, find_many, insert_one, update_one, delete_one, count_documents
from services.usage_service import usage_service
import logging

logger = logging.getLogger(__name__)

class WorkflowService:
    async def create_workflow(self, user_id: str, user_tier: UserTier, workflow_data: WorkflowCreate) -> WorkflowResponse:
        """Create a new workflow"""
        try:
            # Check tier limits
            await self._check_tier_limits(user_id, user_tier)

            # Create workflow document
            workflow_doc = {
                "user_id": user_id,
                "name": workflow_data.name,
                "description": workflow_data.description,
                "canvas_state": workflow_data.canvas_state.dict() if workflow_data.canvas_state else {"nodes": [], "edges": []},
                "chat_history": [],
                "agent_count": len(workflow_data.canvas_state.nodes) if workflow_data.canvas_state else 0,
                "message_count": 0,
                "version": 1,
                "parent_workflow_id": None,
                "is_template": False,
                "template_category": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Insert workflow
            workflow_id = await insert_one("workflows", workflow_doc)
            workflow_doc["_id"] = str(workflow_id)

            # Track usage
            await usage_service.track_workflow_creation(user_id)

            return self._doc_to_response(workflow_doc)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Create workflow error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create workflow"
            )

    async def get_workflow(self, workflow_id: str, user_id: str) -> WorkflowResponse:
        """Get workflow by ID"""
        try:
            workflow_doc = await find_one("workflows", {
                "_id": ObjectId(workflow_id),
                "$or": [
                    {"user_id": user_id},
                    {"is_template": True}
                ]
            })

            if not workflow_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )

            return self._doc_to_response(workflow_doc)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get workflow error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve workflow"
            )

    async def update_workflow(self, workflow_id: str, user_id: str, update_data: WorkflowUpdate) -> WorkflowResponse:
        """Update workflow"""
        try:
            # Verify ownership
            existing_workflow = await find_one("workflows", {
                "_id": ObjectId(workflow_id),
                "user_id": user_id
            })

            if not existing_workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )

            # Prepare update data
            update_dict = {
                "updated_at": datetime.utcnow(),
                "version": existing_workflow["version"] + 1
            }

            if update_data.name:
                update_dict["name"] = update_data.name
            if update_data.description is not None:
                update_dict["description"] = update_data.description
            if update_data.canvas_state:
                update_dict["canvas_state"] = update_data.canvas_state.dict()
                update_dict["agent_count"] = len(update_data.canvas_state.nodes)
            if update_data.chat_history is not None:
                update_dict["chat_history"] = [msg.dict() for msg in update_data.chat_history]
                update_dict["message_count"] = len(update_data.chat_history)

            # Update workflow
            await update_one("workflows", {"_id": ObjectId(workflow_id)}, update_dict)

            # Get updated workflow
            updated_workflow = await find_one("workflows", {"_id": ObjectId(workflow_id)})
            return self._doc_to_response(updated_workflow)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update workflow error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update workflow"
            )

    async def delete_workflow(self, workflow_id: str, user_id: str):
        """Delete workflow"""
        try:
            # Verify ownership
            existing_workflow = await find_one("workflows", {
                "_id": ObjectId(workflow_id),
                "user_id": user_id
            })

            if not existing_workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )

            # Delete workflow
            await delete_one("workflows", {"_id": ObjectId(workflow_id)})

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Delete workflow error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete workflow"
            )

    async def list_workflows(self, user_id: str, page: int = 1, limit: int = 20) -> WorkflowListResponse:
        """List user workflows with pagination"""
        try:
            skip = (page - 1) * limit
            filter_dict = {"user_id": user_id}

            # Get workflows
            workflow_docs = await find_many(
                "workflows", 
                filter_dict, 
                skip=skip, 
                limit=limit, 
                sort=[("updated_at", -1)]
            )

            # Get total count
            total = await count_documents("workflows", filter_dict)

            # Convert to summaries
            workflows = [self._doc_to_summary(doc) for doc in workflow_docs]

            # Pagination info
            pagination = {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }

            return WorkflowListResponse(workflows=workflows, pagination=pagination)

        except Exception as e:
            logger.error(f"List workflows error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve workflows"
            )

    async def add_chat_message(self, workflow_id: str, user_id: str, message: ChatMessage) -> WorkflowResponse:
        """Add chat message to workflow"""
        try:
            # Verify ownership
            workflow_doc = await find_one("workflows", {
                "_id": ObjectId(workflow_id),
                "user_id": user_id
            })

            if not workflow_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )

            # Add message to chat history
            chat_history = workflow_doc.get("chat_history", [])
            chat_history.append(message.dict())

            # Update workflow
            update_dict = {
                "chat_history": chat_history,
                "message_count": len(chat_history),
                "updated_at": datetime.utcnow()
            }

            await update_one("workflows", {"_id": ObjectId(workflow_id)}, update_dict)

            # Get updated workflow
            updated_workflow = await find_one("workflows", {"_id": ObjectId(workflow_id)})
            return self._doc_to_response(updated_workflow)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Add chat message error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add chat message"
            )

    async def _check_tier_limits(self, user_id: str, tier: UserTier):
        """Check if user can create more workflows based on tier limits"""
        if tier == UserTier.FREE:
            # Check monthly workflow limit for free users
            monthly_count = await usage_service.get_monthly_workflow_count(user_id)
            if monthly_count >= 3:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Monthly workflow limit reached. Please upgrade your plan."
                )

    def _doc_to_response(self, doc: dict) -> WorkflowResponse:
        """Convert MongoDB document to WorkflowResponse"""
        chat_history = []
        for msg in doc.get("chat_history", []):
            chat_history.append(ChatMessage(**msg))

        canvas_state = CanvasState(**doc.get("canvas_state", {"nodes": [], "edges": []}))

        return WorkflowResponse(
            id=str(doc["_id"]),
            name=doc["name"],
            description=doc.get("description"),
            canvas_state=canvas_state,
            chat_history=chat_history,
            agent_count=doc.get("agent_count", 0),
            message_count=doc.get("message_count", 0),
            version=doc.get("version", 1),
            is_template=doc.get("is_template", False),
            template_category=doc.get("template_category"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )

    def _doc_to_summary(self, doc: dict) -> WorkflowSummary:
        """Convert MongoDB document to WorkflowSummary"""
        return WorkflowSummary(
            id=str(doc["_id"]),
            name=doc["name"],
            description=doc.get("description"),
            agent_count=doc.get("agent_count", 0),
            message_count=doc.get("message_count", 0),
            updated_at=doc["updated_at"]
        )

workflow_service = WorkflowService()