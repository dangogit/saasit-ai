#!/bin/bash

# Quick development startup script
# Assumes dependencies are already installed

set -e

echo "🚀 Starting SaasIt.ai Development Environment"

# Kill existing processes
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

# Start backend
echo "🖥️  Starting backend (http://localhost:8000)..."
cd backend
source venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend (http://localhost:3000)..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development servers started!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both processes and handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    echo "✅ Cleanup completed"
    exit 0
}

trap cleanup SIGINT SIGTERM
wait