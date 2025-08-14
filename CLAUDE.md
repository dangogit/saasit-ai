# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SaasIt.ai is a visual AI agent team orchestrator that enables users to create AI development teams that build real applications using Claude Code SDK. The platform allows users to design workflows visually through a drag-and-drop canvas, selecting from 40+ specialized AI agents.

## Essential Commands

### Frontend Development (React + Tailwind)
```bash
cd frontend
npm install           # Install dependencies
npm start             # Start development server (uses craco)
npm run build         # Build for production
npm test              # Run tests
```

### Backend Development (FastAPI + MongoDB)
```bash
cd backend
pip install -r requirements.txt    # Install Python dependencies
uvicorn server:app --reload        # Start development server
```

### Code Quality
```bash
# Frontend
cd frontend
# No specific lint/typecheck commands configured - consider adding eslint

# Backend
cd backend
black .               # Format Python code
isort .               # Sort imports
flake8                # Lint Python code
mypy .                # Type check Python code
pytest                # Run tests
```

## Architecture Overview

### Frontend Structure
- **Technology**: React with Craco configuration, Tailwind CSS, Shadcn/ui components
- **State Management**: Zustand (see `lib/stores/workflowStore.js`)
- **UI Components**: Custom components in `src/components/ui/` based on Radix UI
- **Main Features**:
  - `LandingPage.jsx`: Entry point
  - `WorkflowDesigner.jsx`: Main application interface
  - `AgentCanvas.jsx`: Visual workflow builder using React Flow
  - `ChatPanel.jsx`: AI assistant interface
  - `AgentLibrary.jsx`: Agent selection panel
  - `ExecutionPanel.jsx`: Real-time execution monitoring

### Backend Structure
- **Technology**: FastAPI with Motor (async MongoDB driver)
- **API**: RESTful endpoints under `/api` prefix
- **Database**: MongoDB with async operations
- **Current Endpoints**:
  - `GET /api/`: Health check
  - `POST /api/status`: Create status check
  - `GET /api/status`: List status checks

### Key Integration Points
1. Frontend expects backend API at `/api/*` endpoints
2. CORS is configured to allow all origins (development mode)
3. MongoDB connection via environment variables

## Development Workflow

1. **Environment Setup**: Backend requires `.env` file with `MONGO_URL` and `DB_NAME`
2. **Path Aliases**: Frontend uses `@/` alias for `src/` directory
3. **Hot Reload**: Can be disabled via `DISABLE_HOT_RELOAD=true` environment variable

## Important Implementation Notes

- The project is in early development stage with basic scaffolding
- Frontend has comprehensive UI component library but limited feature implementation
- Backend has minimal endpoints - needs expansion for full functionality
- No authentication/authorization implemented yet
- Mock data available in `frontend/src/data/mock.js`

## Agent System (Planned)
The platform will support 40+ specialized agents across categories:
- Engineering (rapid-prototyper, frontend-developer, backend-architect, etc.)
- Design (ui-designer, ux-researcher, brand-guardian, etc.)
- Marketing (growth-hacker, content-creator, tiktok-strategist, etc.)
- Product (feedback-synthesizer, trend-researcher, sprint-prioritizer)
- Operations (analytics-reporter, finance-tracker, infrastructure-maintainer, etc.)
- Testing (api-tester, performance-benchmarker, test-results-analyzer, etc.)
- Project Management (project-shipper, experiment-tracker, studio-producer)

## Next Development Steps
Based on the project documentation, priority areas include:
1. Implementing workflow creation and storage APIs
2. Building out the visual canvas functionality with React Flow
3. Creating agent execution engine integration
4. Adding authentication and user management
5. Implementing real-time WebSocket communication for execution updates

## System Architecture Updates

### Infrastructure Configuration
- Added Cloudflare Pages for frontend hosting
- Migrated backend to Fly.io
- Configured MongoDB Atlas connection (with current SSL challenges)
- Implemented basic API proxy through Cloudflare's _redirects

### Deployment Strategy
- Containerized backend with Docker
- Environment variables managed via Fly.io secrets
- Cloudflare CDN for static asset delivery
- Graceful degradation when database is unavailable

### Technology Stack Refinements
- Frontend: React with Craco, Tailwind CSS, Shadcn/ui
- Backend: FastAPI with Motor, Uvicorn ASGI server
- State Management: Zustand
- Visualization: React Flow for workflow designer

### Pending Technical Improvements
- Resolve MongoDB SSL connection issues
- Implement comprehensive user authentication
- Expand API endpoints for workflow management
- Add WebSocket support for real-time updates
- Integrate Claude Code SDK for AI agent execution
- ⏺ I can see the Clerk test mode credentials from your
  screenshot. These test credentials are useful for
  development and testing:

  - Test Email: your_email+clerk_test@example.com (or
  any email with +clerk_test subaddress)
  - Test Verification Code: 424242
  - Test Phone Number: +15555550100 (last 3 digits can
  be 100-199)

  These test credentials will work in Clerk's test mode
  without sending actual emails or SMS messages. The
  verification code 424242 can be used to bypass the
  normal verification flow during development and
  testing.
- │ │ SaasIt.ai Real-Time Streaming Architecture Analysis & Implementation Plan                        │ │
│ │                                                                                                  │ │
│ │ Current Implementation Analysis                                                                  │ │
│ │                                                                                                  │ │
│ │ Frontend Architecture                                                                            │ │
│ │                                                                                                  │ │
│ │ - ExecutionPanel: Static UI component displaying workflow execution steps with status indicators │ │
│ │ - Zustand Store: Manages workflow state but lacks real-time execution tracking                   │ │
│ │ - WebSocket Integration: Partial implementation in ChatPanel for streaming chat, but not         │ │
│ │ connected to execution monitoring                                                                │ │
│ │ - React Flow Canvas: Visual workflow designer with agent nodes and connections                   │ │
│ │                                                                                                  │ │
│ │ Backend Infrastructure                                                                           │ │
│ │                                                                                                  │ │
│ │ - FastAPI: Modern async framework with WebSocket support already implemented                     │ │
│ │ - WebSocket Endpoint: /ws/chat exists with JWT authentication for streaming chat                 │ │
│ │ - Claude Service: Handles AI conversations with streaming capability                             │ │
│ │ - No Execution Engine: Missing actual workflow execution and terminal streaming capabilities     │ │
│ │                                                                                                  │ │
│ │ Current Gaps                                                                                     │ │
│ │                                                                                                  │ │
│ │ 1. No local Claude Code SDK integration                                                          │ │
│ │ 2. No terminal output streaming from actual executions                                           │ │
│ │ 3. ExecutionPanel only displays mock data                                                        │ │
│ │ 4. Missing local-to-cloud execution bridge                                                       │ │
│ │ 5. No real-time progress updates during workflow execution                                       │ │
│ │                                                                                                  │ │
│ │ Recommended Architecture: Local Claude Code → Web Bridge                                         │ │
│ │                                                                                                  │ │
│ │ Phase 1: Core Streaming Infrastructure (Week 1-2)                                                │ │
│ │                                                                                                  │ │
│ │ Backend Enhancements:                                                                            │ │
│ │ 1. Execution WebSocket Endpoint (/ws/execution/{workflow_id})                                    │ │
│ │   - Separate from chat WebSocket for execution-specific streaming                                │ │
│ │   - JWT authentication with execution permissions                                                │ │
│ │   - Real-time progress updates, terminal output, and status changes                              │ │
│ │ 2. Claude Code Bridge Service                                                                    │ │
│ │   - Local daemon that connects to cloud API via WebSockets                                       │ │
│ │   - Executes workflows using Claude Code SDK locally                                             │ │
│ │   - Streams terminal output, file changes, and execution status                                  │ │
│ │   - Secure token-based authentication with cloud service                                         │ │
│ │ 3. Execution State Management                                                                    │ │
│ │   - Enhanced database schema for execution tracking                                              │ │
│ │   - Real-time status updates (queued, running, paused, completed, failed)                        │ │
│ │   - Execution logs and artifact storage                                                          │ │
│ │                                                                                                  │ │
│ │ Frontend Enhancements:                                                                           │ │
│ │ 1. Real-time ExecutionPanel                                                                      │ │
│ │   - Connect to execution WebSocket for live updates                                              │ │
│ │   - Stream terminal output display with syntax highlighting                                      │ │
│ │   - Progress indicators with actual step completion                                              │ │
│ │   - File change notifications and preview capabilities                                           │ │
│ │ 2. Enhanced Zustand Store                                                                        │ │
│ │   - Real-time execution state management                                                         │ │
│ │   - WebSocket connection handling and reconnection logic                                         │ │
│ │   - Terminal output buffering and display management                                             │ │
│ │                                                                                                  │ │
│ │ Phase 2: Security & Performance Optimization (Week 3)                                            │ │
│ │                                                                                                  │ │
│ │ Security Implementations:                                                                        │ │
│ │ 1. Multi-layer Authentication                                                                    │ │
│ │   - JWT tokens for WebSocket authentication                                                      │ │
│ │   - API key validation for local bridge connections                                              │ │
│ │   - Rate limiting and execution quotas per user tier                                             │ │
│ │   - Sanitized terminal output (remove sensitive info)                                            │ │
│ │ 2. Local Bridge Security                                                                         │ │
│ │   - TLS 1.3 for all local-to-cloud communications                                                │ │
│ │   - Certificate pinning for bridge authentication                                                │ │
│ │   - Sandbox execution environment isolation                                                      │ │
│ │   - Output filtering to prevent sensitive data leakage                                           │ │
│ │                                                                                                  │ │
│ │ Performance Optimizations:                                                                       │ │
│ │ 1. Smart Streaming Strategy                                                                      │ │
│ │   - Server-Sent Events for one-way execution updates (recommended)                               │ │
│ │   - WebSockets for bi-directional control (pause, cancel, restart)                               │ │
│ │   - Adaptive buffering based on network conditions                                               │ │
│ │   - Compression for large terminal outputs                                                       │ │
│ │                                                                                                  │ │
│ │ Phase 3: Advanced Features (Week 4)                                                              │ │
│ │                                                                                                  │ │
│ │ Enhanced Execution Control:                                                                      │ │
│ │ 1. Real-time Workflow Control                                                                    │ │
│ │   - Pause/resume execution capabilities                                                          │ │
│ │   - Step-by-step debugging mode                                                                  │ │
│ │   - Real-time agent performance metrics                                                          │ │
│ │   - Interactive approval gates for critical steps                                                │ │
│ │ 2. Monitoring & Analytics                                                                        │ │
│ │   - Execution performance dashboards                                                             │ │
│ │   - Agent efficiency tracking                                                                    │ │
│ │   - Resource utilization monitoring                                                              │ │
│ │   - Error pattern analysis                                                                       │ │
│ │                                                                                                  │ │
│ │ Technology Stack Recommendations                                                                 │ │
│ │                                                                                                  │ │
│ │ Streaming Protocol Selection                                                                     │ │
│ │                                                                                                  │ │
│ │ - Primary: Server-Sent Events (SSE) for execution updates                                        │ │
│ │   - Automatic reconnection                                                                       │ │
│ │   - Works through corporate firewalls                                                            │ │
│ │   - Perfect for one-way streaming (server → client)                                              │ │
│ │   - Browser-native EventSource API                                                               │ │
│ │ - Secondary: WebSockets for control commands                                                     │ │
│ │   - Bi-directional communication for execution control                                           │ │
│ │   - Real-time collaboration features                                                             │ │
│ │   - Interactive debugging capabilities                                                           │ │
│ │                                                                                                  │ │
│ │ Security Framework                                                                               │ │
│ │                                                                                                  │ │
│ │ 1. Transport Security: TLS 1.3 + Certificate Pinning                                             │ │
│ │ 2. Authentication: JWT + API Keys + OAuth2                                                       │ │
│ │ 3. Data Protection: Output sanitization + PII filtering                                          │ │
│ │ 4. Network Security: Reverse proxy + Rate limiting                                               │ │
│ │                                                                                                  │ │
│ │ Local Bridge Architecture                                                                        │ │
│ │                                                                                                  │ │
│ │ Local Environment → Claude Code SDK → Bridge Daemon → Secure Tunnel → Cloud API → WebSocket →    │ │
│ │ Frontend                                                                                         │ │
│ │                                                                                                  │ │
│ │ Implementation Priority Matrix                                                                   │ │
│ │                                                                                                  │ │
│ │ High Priority (Phase 1):                                                                         │ │
│ │ - Execution WebSocket endpoint                                                                   │ │
│ │ - Real-time ExecutionPanel updates                                                               │ │
│ │ - Claude Code bridge service foundations                                                         │ │
│ │ - Basic terminal output streaming                                                                │ │
│ │                                                                                                  │ │
│ │ Medium Priority (Phase 2):                                                                       │ │
│ │ - Advanced security implementations                                                              │ │
│ │ - Performance optimizations                                                                      │ │
│ │ - Error handling and reconnection logic                                                          │ │
│ │ - Output filtering and sanitization                                                              │ │
│ │                                                                                                  │ │
│ │ Future Enhancements (Phase 3):                                                                   │ │
│ │ - Interactive execution control                                                                  │ │
│ │ - Advanced monitoring dashboards                                                                 │ │
│ │ - Multi-user collaboration features                                                              │ │
│ │ - Enterprise security compliance                                                                 │ │
│ │                                                                                                  │ │
│ │ This architecture provides a robust, secure, and scalable foundation for streaming Claude Code   │ │
│ │ execution data to the SaasIt.ai web interface while maintaining enterprise-grade security and    │ │
│ │ performance standards.