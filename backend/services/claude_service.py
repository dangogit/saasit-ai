import os
import asyncio
import logging
from typing import List, Dict, Optional, AsyncGenerator
import anthropic
from anthropic import AsyncAnthropic
import json
import time
from datetime import datetime
from .agent_loader import AgentLoader

logger = logging.getLogger(__name__)


class ClaudeService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        self.client = AsyncAnthropic(api_key=self.api_key)
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay for exponential backoff
        
    async def create_conversation(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream: bool = False
    ):
        """
        Create a conversation with Claude
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: System prompt to guide Claude's behavior
            max_tokens: Maximum tokens in response
            temperature: Response creativity (0-1)
            stream: Whether to stream the response
        """
        attempt = 0
        last_error = None
        
        while attempt < self.max_retries:
            try:
                if stream:
                    return await self._create_streaming_conversation(
                        messages, system_prompt, max_tokens, temperature
                    )
                else:
                    response = await self.client.messages.create(
                        model="claude-3-5-sonnet-20241022",
                        max_tokens=max_tokens,
                        temperature=temperature,
                        system=system_prompt,
                        messages=messages
                    )
                    return {
                        'content': response.content[0].text,
                        'usage': {
                            'input_tokens': response.usage.input_tokens,
                            'output_tokens': response.usage.output_tokens
                        }
                    }
                    
            except anthropic.RateLimitError as e:
                attempt += 1
                if attempt < self.max_retries:
                    delay = self._calculate_backoff(attempt)
                    logger.warning(f"Rate limit hit, retrying in {delay}s (attempt {attempt}/{self.max_retries})")
                    await asyncio.sleep(delay)
                else:
                    last_error = e
                    
            except anthropic.APIError as e:
                attempt += 1
                if attempt < self.max_retries and self._is_retryable_error(e):
                    delay = self._calculate_backoff(attempt)
                    logger.warning(f"API error: {e}, retrying in {delay}s (attempt {attempt}/{self.max_retries})")
                    await asyncio.sleep(delay)
                else:
                    last_error = e
                    break
                    
            except Exception as e:
                logger.error(f"Unexpected error in Claude service: {e}")
                raise
                
        # If we get here, all retries failed
        if last_error:
            raise last_error
        else:
            raise Exception("Max retries exceeded")
            
    async def _create_streaming_conversation(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_tokens: int,
        temperature: float
    ) -> AsyncGenerator[Dict, None]:
        """Create a streaming conversation with Claude"""
        try:
            async with self.client.messages.stream(
                model="claude-3-5-sonnet-20241022",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=messages
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        yield {
                            'type': 'content',
                            'delta': event.delta.text
                        }
                    elif event.type == "message_stop":
                        # Send final message with usage stats
                        message = await stream.get_final_message()
                        yield {
                            'type': 'done',
                            'usage': {
                                'input_tokens': message.usage.input_tokens,
                                'output_tokens': message.usage.output_tokens
                            }
                        }
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield {
                'type': 'error',
                'error': str(e)
            }
            
    def _calculate_backoff(self, attempt: int) -> float:
        """Calculate exponential backoff delay"""
        return min(self.base_delay * (2 ** (attempt - 1)), 10.0)
        
    def _is_retryable_error(self, error: anthropic.APIError) -> bool:
        """Determine if an error is retryable"""
        retryable_status_codes = [429, 500, 502, 503, 504]
        return hasattr(error, 'status_code') and error.status_code in retryable_status_codes


class WorkflowGenerator:
    """Generates agent workflows based on project descriptions"""
    
    def __init__(self, claude_service: ClaudeService):
        self.claude_service = claude_service
        self.agent_loader = AgentLoader()
        self.system_prompt = self._build_system_prompt()
        
    def _build_system_prompt(self) -> str:
        # Get dynamic agent context from loaded agents
        agent_context = self.agent_loader.build_agent_context()
        
        workflow_format = '''{
  "phase": "clarifying" | "designing" | "refining",
  "message": "Your response to the user",
  "questions": ["Array of clarifying questions if in clarifying phase"],
  "workflow": {
    "agents": [
      {
        "id": "agent-id",
        "type": "agent",
        "data": {
          "name": "Agent Name",
          "category": "Category",
          "description": "Role in this workflow",
          "capabilities": ["capability1", "capability2"],
          "estimatedTime": "2-4 hours"
        }
      }
    ],
    "connections": [
      {
        "source": "agent-id-1",
        "target": "agent-id-2",
        "type": "depends_on" | "collaborates_with" | "reports_to"
      }
    ],
    "layout": "sequential" | "parallel" | "hybrid"
  }
}'''
        
        return f"""You are an AI workflow architect specialized in creating visual agent workflows for software development projects.

CORE RESPONSIBILITIES:
1. Analyze user project descriptions to understand requirements
2. Ask strategic clarifying questions to fill knowledge gaps
3. Generate optimal agent workflows with proper dependencies
4. Suggest appropriate agents from the available library
5. Provide clear reasoning for workflow design decisions

{agent_context}

CONVERSATION FLOW:
1. INITIAL ANALYSIS: Understand the project scope, target audience, and key objectives
2. CLARIFICATION: Ask 2-3 strategic questions to understand:
   - Technical stack preferences
   - Timeline and resource constraints  
   - Specific feature requirements
   - Integration needs
3. WORKFLOW DESIGN: Create a logical flow of agents with clear dependencies
4. VALIDATION: Explain the reasoning behind agent selection and sequencing

When generating workflows, respond with JSON in this format:
{workflow_format}

QUESTIONING STRATEGY:
Focus on questions that help determine:
- Technical requirements and constraints
- User experience goals
- Business objectives
- Timeline and resources
- Integration needs

Always maintain a helpful, strategic tone focused on creating the most effective workflow for the user's specific needs."""
        
    async def generate_workflow(
        self,
        conversation_history: List[Dict[str, str]],
        stream: bool = False
    ):
        """Generate a workflow based on conversation history"""
        return await self.claude_service.create_conversation(
            messages=conversation_history,
            system_prompt=self.system_prompt,
            max_tokens=2048,
            temperature=0.7,
            stream=stream
        )
        
    def parse_workflow_response(self, response: str) -> Dict:
        """Parse the JSON response from Claude"""
        try:
            # Extract JSON from the response if it's wrapped in text
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # If no JSON found, return a basic structure
                return {
                    'phase': 'clarifying',
                    'message': response,
                    'questions': []
                }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse workflow response: {e}")
            return {
                'phase': 'clarifying',
                'message': response,
                'questions': []
            }