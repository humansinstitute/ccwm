#!/bin/bash

echo "🚀 Starting Backend Only..."

# Stop any running processes
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
sleep 2

cd backend

echo "📦 Checking backend dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

echo "🚀 Starting backend server..."
npm run dev