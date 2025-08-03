# SaasIt.ai - API Contracts & Integration Spec

## Overview
This document defines the API contracts between frontend and backend for SaasIt.ai. The backend provides RESTful APIs for workflow management, user authentication, and agent orchestration, with WebSocket support for real-time updates.

## Base Configuration
- **Backend URL**: `process.env.REACT_APP_BACKEND_URL` (already configured in frontend)
- **API Prefix**: `/api/v1` (all routes must be prefixed)
- **Authentication**: JWT Bearer tokens
- **Content Type**: `application/json`

## Data Models

### User Model
```javascript
{
  id: string,
  email: string,
  name: string,
  tier: 'FREE' | 'DESIGNER' | 'STARTER' | 'PROFESSIONAL' | 'SCALE',
  createdAt: Date,
  updatedAt: Date
}
```

### Workflow Model
```javascript
{
  id: string,
  userId: string,
  name: string,
  description?: string,
  canvasState: {
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  },
  chatHistory: ChatMessage[],
  agentCount: number,
  messageCount: number,
  version: number,
  isTemplate: boolean,
  templateCategory?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Agent Model
```javascript
{
  id: string,
  name: string,
  category: string,
  description: string,
  icon: string,
  color: string,
  capabilities: string[],
  estimatedTime: string,
  isCustom: boolean,
  isPublic: boolean,
  systemPrompt: string,
  usageCount: number
}
```

### Execution Model (Mock for now)
```javascript
{
  id: string,
  workflowId: string,
  userId: string,
  status: 'QUEUED' | 'INITIALIZING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
  startedAt?: Date,
  completedAt?: Date,
  runtimeSeconds?: number,
  artifactsUrl?: string,
  gitRepoUrl?: string,
  errorMessage?: string,
  createdAt: Date
}
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/profile` - Get user profile

### Workflows
- `GET /api/v1/workflows` - List user workflows (paginated)
- `POST /api/v1/workflows` - Create new workflow
- `GET /api/v1/workflows/:id` - Get workflow by ID
- `PUT /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow

### Agents
- `GET /api/v1/agents` - List all available agents
- `GET /api/v1/agents/categories` - Get agent categories
- `GET /api/v1/agents/:id` - Get agent details
- `POST /api/v1/agents` - Create custom agent (DESIGNER+ tier)
- `PUT /api/v1/agents/:id` - Update custom agent
- `DELETE /api/v1/agents/:id` - Delete custom agent

### Templates
- `GET /api/v1/templates` - List workflow templates
- `GET /api/v1/templates/:id` - Get template details
- `POST /api/v1/workflows/from-template/:templateId` - Create workflow from template

### Executions (Mock)
- `POST /api/v1/executions` - Start workflow execution (mock)
- `GET /api/v1/executions` - List user executions
- `GET /api/v1/executions/:id` - Get execution details
- `DELETE /api/v1/executions/:id` - Cancel execution

### Chat
- `POST /api/v1/chat/suggest-agents` - Get agent suggestions from chat
- `POST /api/v1/workflows/:id/chat` - Add chat message to workflow

## Frontend Integration Points

### Mock Data Migration
**Current mock data in `/app/frontend/src/data/mock.js` needs to be migrated to backend APIs:**

1. **Agents data** → `GET /api/v1/agents`
2. **Agent categories** → `GET /api/v1/agents/categories`
3. **Pricing tiers** → Hardcoded in frontend (no API needed)
4. **Workflow templates** → `GET /api/v1/templates`
5. **Chat messages** → Stored in workflow.chatHistory
6. **Execution steps** → `GET /api/v1/executions/:id/logs` (mock)

### Zustand Store Integration
**Current stores in `/app/frontend/src/lib/stores/workflowStore.js`:**

- Replace mock data with API calls
- Add authentication state management
- Implement real-time WebSocket updates
- Handle loading states and errors

### Component Updates Required
1. **AgentLibrary.jsx** - Fetch agents from API instead of mock
2. **WorkflowDesigner.jsx** - Save/load workflows to/from backend
3. **ChatPanel.jsx** - Send messages to backend and get AI responses
4. **ExecutionPanel.jsx** - Show real execution status from backend

## WebSocket Events

### Client → Server
- `workflow:join` - Join workflow room for updates
- `workflow:leave` - Leave workflow room
- `workflow:update` - Real-time workflow updates
- `chat:message` - Send chat message

### Server → Client
- `workflow:updated` - Workflow state changed
- `execution:status` - Execution status update
- `execution:queued` - Execution added to queue
- `execution:completed` - Execution finished
- `chat:response` - AI chat response

## Authentication Flow

1. **Login/Register** → Store JWT tokens in localStorage
2. **API Requests** → Include `Authorization: Bearer ${token}` header
3. **Token Refresh** → Automatic refresh on 401 responses
4. **WebSocket Auth** → Send token in connection handshake

## Error Handling

### Standard Error Response
```javascript
{
  error: {
    message: string,
    code: string,
    details?: any
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Invalid or expired token
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid request data
- `TIER_LIMIT_EXCEEDED` - User has reached tier limits
- `RESOURCE_NOT_FOUND` - Workflow/agent not found
- `EXECUTION_FAILED` - Execution error (mock)

## Tier Limitations (Implemented in Backend)

### FREE Tier
- 3 workflows per month
- 10 chat messages per workflow
- 10 agents max per workflow
- No cloud execution
- Export to Claude Code config only

### DESIGNER Tier ($20/month)
- Unlimited workflows
- Unlimited chat messages
- Unlimited agents per workflow
- Custom agent creation
- No cloud execution

### STARTER+ Tiers
- Everything in lower tiers
- Cloud execution (Coming Soon)

## Backend Implementation Priorities

1. **Phase 1: Core APIs**
   - User authentication (register/login)
   - Workflow CRUD operations
   - Agent listing and management
   - Basic WebSocket setup

2. **Phase 2: Enhanced Features**
   - Chat AI responses (mock intelligent responses)
   - Template management
   - Usage tracking and tier enforcement
   - Real-time workflow updates

3. **Phase 3: Mock Execution**
   - Mock execution queue
   - Simulated execution progress
   - Mock artifacts generation
   - Coming soon banner for cloud execution

4. **Phase 4: Frontend Integration**
   - Replace all mock data with API calls
   - Add authentication state management
   - Implement real-time updates
   - Error handling and loading states

## Database Schema (MongoDB)

### Collections
- `users` - User accounts and profiles
- `workflows` - Workflow definitions and state
- `agents` - Agent definitions and metadata
- `executions` - Execution records (mock)
- `templates` - Workflow templates
- `usage_metrics` - Usage tracking for tier limits

### Indexes
- `users.email` (unique)
- `workflows.userId`
- `workflows.isTemplate, templateCategory`
- `agents.category`
- `executions.userId, status`

This contract ensures seamless integration between the existing frontend and the new backend implementation.