#!/bin/bash

# SaasIt.ai Development Server Startup Script
# Runs both backend and frontend concurrently for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting SaasIt.ai Development Environment${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    if port_in_use $1; then
        echo -e "${YELLOW}⚠️  Killing existing process on port $1${NC}"
        lsof -ti :$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Check prerequisites
echo -e "${BLUE}🔧 Checking prerequisites...${NC}"

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"

# Check backend virtual environment
echo -e "${BLUE}🔧 Setting up backend environment...${NC}"

if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}⚠️  Creating Python virtual environment...${NC}"
    cd backend
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment and install dependencies
echo -e "${BLUE}🔧 Installing backend dependencies...${NC}"
cd backend
source venv/bin/activate

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Backend .env file not found${NC}"
    echo -e "${YELLOW}💡 Please create backend/.env with required environment variables${NC}"
    exit 1
fi

# Install backend dependencies if requirements.txt is newer than last install
if [ requirements.txt -nt venv/pyvenv.cfg ] || [ ! -f venv/pyvenv.cfg ]; then
    echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
    pip install -r requirements.txt
fi

cd ..

# Setup frontend
echo -e "${BLUE}🔧 Setting up frontend environment...${NC}"
cd frontend

# Install frontend dependencies if package.json is newer than node_modules
if [ package.json -nt node_modules/.package-lock.json ] || [ ! -d node_modules ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    npm install
fi

cd ..

# Clean up any existing processes on development ports
echo -e "${BLUE}🔧 Cleaning up existing processes...${NC}"
kill_port 8000  # Backend port
kill_port 3000  # Frontend port
kill_port 4000  # Alternative frontend port

# Function to start backend
start_backend() {
    echo -e "${GREEN}🖥️  Starting backend server on http://localhost:8000${NC}"
    cd backend
    source venv/bin/activate
    uvicorn server:app --reload --host 0.0.0.0 --port 8000
}

# Function to start frontend
start_frontend() {
    echo -e "${GREEN}🌐 Starting frontend server on http://localhost:3000${NC}"
    cd frontend
    npm start
}

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down development servers...${NC}"
    kill_port 8000
    kill_port 3000
    kill_port 4000
    echo -e "${GREEN}✅ Cleanup completed${NC}"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

echo ""
echo -e "${GREEN}🚀 Starting development servers...${NC}"
echo -e "${BLUE}📝 Press Ctrl+C to stop all servers${NC}"
echo ""

# Start both servers in background
start_backend &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

start_frontend &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID