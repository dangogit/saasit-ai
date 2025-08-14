#!/usr/bin/env python3
"""
Test script to verify the execution system is working end-to-end
"""

import asyncio
import websockets
import json
import requests
import time
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000"

# Mock user data
MOCK_USER = {
    "email": "test@example.com",
    "user_id": "test_user_123"
}

# Mock workflow data
MOCK_WORKFLOW = {
    "workflow_name": "Test AI Team Workflow",
    "workflow_data": {
        "nodes": [
            {
                "id": "agent_1",
                "type": "agent",
                "data": {
                    "name": "Frontend Developer",
                    "type": "frontend-developer",
                    "description": "Build React components"
                }
            },
            {
                "id": "agent_2", 
                "type": "agent",
                "data": {
                    "name": "Backend Architect",
                    "type": "backend-architect", 
                    "description": "Design API structure"
                }
            }
        ],
        "edges": [
            {
                "id": "edge_1",
                "source": "agent_1",
                "target": "agent_2"
            }
        ],
        "estimatedSteps": 4
    },
    "estimated_steps": 4,
    "metadata": {
        "created_at": datetime.utcnow().isoformat(),
        "user_id": "test_user_123"
    }
}

def test_health_check():
    """Test basic backend health"""
    print("🏥 Testing backend health check...")
    try:
        response = requests.get(f"{BACKEND_URL}/health")
        print(f"✅ Health check status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def create_mock_execution():
    """Create a mock execution via REST API"""
    print("📝 Creating mock execution...")
    
    # For testing without auth, we'll modify the endpoint temporarily
    # In production, this would require proper JWT tokens
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/v1/executions/",
            json=MOCK_WORKFLOW,
            headers={
                "Content-Type": "application/json",
                # "Authorization": f"Bearer {mock_token}"  # Would need real token
            }
        )
        
        if response.status_code == 200:
            execution = response.json()
            print(f"✅ Execution created: {execution['id']}")
            return execution
        else:
            print(f"❌ Failed to create execution: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception creating execution: {e}")
        return None

async def test_websocket_connection(execution_id):
    """Test WebSocket connection and messaging"""
    print(f"🔌 Testing WebSocket connection for execution {execution_id}...")
    
    # Mock token for testing
    mock_token = "test_token_123"
    ws_uri = f"{WS_URL}/ws/execution/{execution_id}?token={mock_token}"
    
    try:
        async with websockets.connect(ws_uri) as websocket:
            print("✅ WebSocket connected")
            
            # Send a ping message
            ping_message = {"type": "ping"}
            await websocket.send(json.dumps(ping_message))
            print("📤 Sent ping message")
            
            # Listen for responses
            timeout_counter = 0
            while timeout_counter < 5:  # 5 second timeout
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"📥 Received: {data}")
                    
                    if data.get("type") == "pong":
                        print("✅ WebSocket ping/pong successful")
                        return True
                        
                except asyncio.TimeoutError:
                    timeout_counter += 1
                    continue
                    
            print("⚠️ No pong response received within timeout")
            return False
            
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

async def test_execution_workflow(execution_id):
    """Test full execution workflow via WebSocket"""
    print(f"⚡ Testing execution workflow for {execution_id}...")
    
    mock_token = "test_token_123"
    ws_uri = f"{WS_URL}/ws/execution/{execution_id}?token={mock_token}"
    
    try:
        async with websockets.connect(ws_uri) as websocket:
            print("✅ Connected to execution WebSocket")
            
            # Start execution
            start_message = {
                "type": "start_execution",
                "data": MOCK_WORKFLOW["workflow_data"]
            }
            await websocket.send(json.dumps(start_message))
            print("📤 Sent start execution command")
            
            # Monitor execution progress
            step_count = 0
            timeout = time.time() + 30  # 30 second timeout
            
            while time.time() < timeout:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(message)
                    msg_type = data.get("type")
                    
                    print(f"📥 Received: {msg_type}")
                    
                    if msg_type == "execution_started":
                        print("🚀 Execution started successfully")
                    elif msg_type == "step_started":
                        step_count += 1
                        step_name = data.get("data", {}).get("step", {}).get("name", "Unknown")
                        print(f"▶️  Step {step_count} started: {step_name}")
                    elif msg_type == "step_completed":
                        print(f"✅ Step completed")
                    elif msg_type == "execution_completed":
                        print("🎉 Execution completed successfully!")
                        return True
                    elif msg_type == "execution_failed":
                        error = data.get("data", {}).get("error", "Unknown error")
                        print(f"❌ Execution failed: {error}")
                        return False
                    elif msg_type == "terminal_output":
                        content = data.get("data", {}).get("output", {}).get("content", "")
                        print(f"💬 Terminal: {content}")
                        
                except asyncio.TimeoutError:
                    continue
                except json.JSONDecodeError as e:
                    print(f"⚠️ JSON decode error: {e}")
                    continue
                    
            print("⏰ Execution test timed out")
            return False
            
    except Exception as e:
        print(f"❌ Execution workflow test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🧪 Starting SaasIt.ai Execution System Tests\n")
    
    # Test 1: Health check
    if not test_health_check():
        print("❌ Backend is not running. Please start with: uvicorn server:app --reload")
        return
    
    print()
    
    # Test 2: Create execution
    execution = create_mock_execution()
    if not execution:
        print("❌ Cannot proceed without execution ID")
        return
        
    execution_id = execution.get("id")
    print()
    
    # Test 3: WebSocket connection
    ws_connected = await test_websocket_connection(execution_id)
    if not ws_connected:
        print("❌ WebSocket connection failed")
        return
        
    print()
    
    # Test 4: Full execution workflow
    execution_success = await test_execution_workflow(execution_id)
    
    print(f"\n{'='*50}")
    if execution_success:
        print("🎉 All tests passed! Execution system is working!")
    else:
        print("❌ Some tests failed. Check the backend logs.")
    print(f"{'='*50}")

if __name__ == "__main__":
    asyncio.run(main())