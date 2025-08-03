from datetime import datetime, timedelta
from typing import Dict, Any
from database.connection import find_many, insert_one, count_documents
import logging

logger = logging.getLogger(__name__)

class UsageService:
    async def track_workflow_creation(self, user_id: str):
        """Track workflow creation for usage limits"""
        try:
            usage_doc = {
                "user_id": user_id,
                "metric_type": "workflow_created",
                "count": 1,
                "period_start": self._get_month_start(),
                "period_end": self._get_month_end(),
                "created_at": datetime.utcnow()
            }
            await insert_one("usage_metrics", usage_doc)
        except Exception as e:
            logger.warning(f"Failed to track workflow creation: {e}")

    async def get_monthly_workflow_count(self, user_id: str) -> int:
        """Get monthly workflow count for user"""
        try:
            month_start = self._get_month_start()
            month_end = self._get_month_end()
            
            count = await count_documents("workflows", {
                "user_id": user_id,
                "created_at": {
                    "$gte": month_start,
                    "$lte": month_end
                }
            })
            return count
        except Exception as e:
            logger.error(f"Failed to get monthly workflow count: {e}")
            return 0

    async def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive usage statistics for user"""
        try:
            now = datetime.utcnow()
            month_start = self._get_month_start()
            
            # Current month workflows
            monthly_workflows = await self.get_monthly_workflow_count(user_id)
            
            # Total workflows
            total_workflows = await count_documents("workflows", {"user_id": user_id})
            
            # Current month executions (when implemented)
            monthly_executions = await count_documents("executions", {
                "user_id": user_id,
                "created_at": {
                    "$gte": month_start,
                    "$lte": now
                }
            })
            
            return {
                "monthly_workflows": monthly_workflows,
                "total_workflows": total_workflows,
                "monthly_executions": monthly_executions,
                "period": {
                    "start": month_start.isoformat(),
                    "end": now.isoformat()
                }
            }
        except Exception as e:
            logger.error(f"Failed to get usage stats: {e}")
            return {
                "monthly_workflows": 0,
                "total_workflows": 0,
                "monthly_executions": 0,
                "period": {
                    "start": month_start.isoformat(),
                    "end": now.isoformat()
                }
            }

    async def check_tier_limits(self, user_id: str, tier: str, action: str) -> Dict[str, Any]:
        """Check if user can perform action based on tier limits"""
        try:
            usage_stats = await self.get_usage_stats(user_id)
            
            # Define tier limits
            tier_limits = {
                "FREE": {
                    "max_monthly_workflows": 3,
                    "max_agents_per_workflow": 10,
                    "max_messages_per_workflow": 10
                },
                "DESIGNER": {
                    "max_monthly_workflows": float('inf'),
                    "max_agents_per_workflow": float('inf'),
                    "max_messages_per_workflow": float('inf')
                },
                "STARTER": {
                    "max_monthly_workflows": float('inf'),
                    "max_agents_per_workflow": float('inf'),
                    "max_messages_per_workflow": float('inf'),
                    "cloud_execution": True
                }
            }
            
            limits = tier_limits.get(tier, tier_limits["FREE"])
            
            # Check specific action
            can_perform = True
            reason = None
            
            if action == "create_workflow":
                if usage_stats["monthly_workflows"] >= limits["max_monthly_workflows"]:
                    can_perform = False
                    reason = f"Monthly workflow limit ({limits['max_monthly_workflows']}) exceeded"
            
            return {
                "can_perform": can_perform,
                "reason": reason,
                "current_usage": usage_stats,
                "limits": limits
            }
            
        except Exception as e:
            logger.error(f"Failed to check tier limits: {e}")
            return {"can_perform": True, "reason": None}

    def _get_month_start(self) -> datetime:
        """Get start of current month"""
        now = datetime.utcnow()
        return datetime(now.year, now.month, 1)

    def _get_month_end(self) -> datetime:
        """Get end of current month"""
        now = datetime.utcnow()
        if now.month == 12:
            return datetime(now.year + 1, 1, 1) - timedelta(seconds=1)
        else:
            return datetime(now.year, now.month + 1, 1) - timedelta(seconds=1)

usage_service = UsageService()