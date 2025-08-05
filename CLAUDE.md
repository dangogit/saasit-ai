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