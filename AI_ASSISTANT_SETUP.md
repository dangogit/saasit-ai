# AI Assistant Setup Guide

This guide explains how to set up and use the Claude Sonnet 4 AI assistant integration in SaasIt.ai.

## Prerequisites

1. **Anthropic API Key**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. **MongoDB**: Ensure MongoDB is running locally or have a connection URL
3. **Node.js**: Version 18+ recommended
4. **Python**: Version 3.8+ for the backend

## Backend Setup

1. **Install Python dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=saasit_ai
   ```

3. **Start the backend server**:
   ```bash
   uvicorn server:app --reload
   ```

## Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   yarn install
   # or npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   The default values should work for local development.

3. **Start the frontend**:
   ```bash
   yarn start
   # or npm start
   ```

## Using the AI Assistant

### Basic Workflow Creation

1. **Open the app** at http://localhost:3000
2. **Click on WorkflowDesigner** from the landing page
3. **Use the chat panel** on the left to describe your project:
   - Example: "I want to build a social media app with AI-powered content recommendations"
   - Example: "Create an e-commerce platform with inventory management"
   - Example: "Build a task management app with real-time collaboration"

### How the AI Assistant Works

1. **Initial Analysis**: The AI analyzes your project description
2. **Clarifying Questions**: It may ask 2-3 questions to better understand:
   - Technical requirements
   - Timeline constraints
   - Target audience
   - Integration needs
3. **Workflow Generation**: Based on your answers, it creates a visual workflow with:
   - Appropriate agents for your project
   - Proper dependencies between agents
   - Optimal layout on the canvas

### Features

- **Real-time Streaming**: Responses stream in real-time via WebSocket
- **Auto-layout**: Workflows are automatically arranged using dagre layout engine
- **Interactive Canvas**: You can manually adjust the generated workflow
- **Context-aware**: The AI remembers your conversation history

### Chat Commands

The AI understands various types of requests:

- **Project descriptions**: "I want to build..."
- **Feature additions**: "Add authentication to the workflow"
- **Questions about agents**: "What does the backend-architect do?"
- **Workflow modifications**: "Replace the UI designer with a brand guardian"

### Canvas Controls

- **Auto Layout Button**: Click to re-arrange nodes optimally
- **Drag & Drop**: Manually position agents
- **Connect Agents**: Draw connections between agents
- **Agent Library**: Drag new agents from the right panel

## Architecture Overview

### Backend Components

1. **Claude Service** (`backend/services/claude_service.py`):
   - Handles Anthropic API communication
   - Implements retry logic and error handling
   - Supports streaming responses

2. **Workflow Generator** (`backend/services/claude_service.py`):
   - Converts project descriptions to workflows
   - Manages conversation phases
   - Generates structured workflow data

3. **Agent Loader** (`backend/services/agent_loader.py`):
   - Loads agent definitions from markdown files
   - Provides agent context to the AI

### Frontend Components

1. **Chat Panel** (`frontend/src/components/ChatPanel.jsx`):
   - Handles user input and AI responses
   - Manages WebSocket connection
   - Displays streaming responses

2. **Workflow Generator** (`frontend/src/services/workflowGenerator.js`):
   - Converts AI responses to visual nodes
   - Creates proper connections between agents

3. **Layout Engine** (`frontend/src/utils/layoutEngine.js`):
   - Uses dagre for automatic node positioning
   - Supports multiple layout types
   - Handles smooth transitions

4. **Workflow Store** (`frontend/src/lib/stores/workflowStore.js`):
   - Manages application state
   - Handles workflow updates
   - Integrates with React Flow

## Troubleshooting

### API Key Issues
- Ensure `ANTHROPIC_API_KEY` is set in backend `.env`
- Check API key permissions in Anthropic Console

### Connection Issues
- Verify backend is running on port 8000
- Check CORS settings if frontend can't connect
- Ensure MongoDB is accessible

### WebSocket Issues
- Falls back to REST API if WebSocket fails
- Check browser console for connection errors
- Verify firewall settings

## Development Tips

1. **Adding New Agents**: 
   - Add agent markdown files in `agents/` directory
   - Restart backend to load new agents

2. **Customizing System Prompts**:
   - Edit `_build_system_prompt()` in `claude_service.py`
   - Add specific instructions for your use case

3. **Layout Customization**:
   - Modify layout configs in `layoutEngine.js`
   - Add new layout types as needed

4. **Error Handling**:
   - All API errors show in the chat panel
   - Check backend logs for detailed errors
   - Frontend console shows WebSocket issues