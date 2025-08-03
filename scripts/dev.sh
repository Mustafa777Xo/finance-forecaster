#!/bin/bash

# Development startup script for Finance Forecaster
# This script starts both backend and frontend in development mode

echo "🚀 Starting Finance Forecaster Development Environment"
echo "=================================================="

# Function to check if port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    local pid=$(lsof -ti:$1)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $1 (PID: $pid)"
        kill -9 $pid
    fi
}

# Check and kill existing processes
if check_port 8000; then
    echo "⚠️  Port 8000 is in use. Killing existing process..."
    kill_port 8000
fi

if check_port 3000; then
    echo "⚠️  Port 3000 is in use. Killing existing process..."
    kill_port 3000
fi

if check_port 5173; then
    echo "⚠️  Port 5173 is in use. Killing existing process..."
    kill_port 5173
fi

echo ""
echo "📦 Installing dependencies..."

# Install backend dependencies
echo "Installing Python dependencies..."
poetry install --no-root

# Install frontend dependencies
echo "Installing Node.js dependencies..."
cd frontend && npm install && cd ..

echo ""
echo "🔧 Starting services..."

# Start backend in background
echo "Starting FastAPI backend on http://localhost:8000"
PYTHONPATH=. poetry run uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "Starting React frontend on http://localhost:5173"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development environment is running!"
echo "   📱 Frontend: http://localhost:5173"
echo "   🔧 Backend API: http://localhost:8000"
echo "   📖 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
