#!/bin/bash

echo "🔧 Fixing dependency issues..."

# Backend dependencies
echo "📦 Cleaning and reinstalling backend dependencies..."
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..

# Frontend dependencies  
echo "🎨 Cleaning and reinstalling frontend dependencies..."
cd frontend
rm -rf node_modules package-lock.json
npm install
npm audit fix
cd ..

echo "✅ Dependencies fixed!"
echo ""
echo "🚀 Ready to start development servers:"
echo "   ./start-dev.sh"