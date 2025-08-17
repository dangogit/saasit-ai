#!/bin/bash

# ======================================================================
# SaasIt.ai Quick Test Runner
# ======================================================================
# Fastest way to run tests for development
# Usage: ./test-quick.sh
# ======================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 SaasIt.ai Quick Test Runner${NC}"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not running. Starting minimal test mode...${NC}"
    
    # Frontend tests only, no Docker
    echo -e "${BLUE}Running frontend E2E tests...${NC}"
    cd frontend
    
    # Quick dependency check
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    # Run tests
    npm run test:e2e
    
    echo -e "${GREEN}✅ Quick tests completed!${NC}"
    echo "💡 Start Docker and run './test-all.sh' for complete testing"
    
else
    echo -e "${BLUE}Docker available. Running full test suite...${NC}"
    ./test-all.sh --frontend-only
fi