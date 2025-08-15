#!/bin/bash

echo "🚀 Quick Fix for Claude Code Web Platform"
echo ""

# Stop any running processes
echo "🛑 Stopping any running processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Fix frontend dependencies
echo "🎨 Fixing frontend dependencies..."
cd frontend
rm -rf node_modules package-lock.json

# Install frontend dependencies with exact versions that work
npm install react@^18.3.1 react-dom@^18.3.1
npm install socket.io-client@^4.6.0 react-hook-form@^7.48.0
npm install react-markdown@^9.0.1 axios@^1.6.2 react-router-dom@^6.20.1
npm install react-hot-toast@^2.4.1 date-fns@^3.0.0 clsx@^2.0.0
npm install react-icons@^4.12.0 zustand@^4.4.7
npm install react-syntax-highlighter@^15.5.0

# Install dev dependencies
npm install --save-dev vite@^7.1.2 @vitejs/plugin-react@^5.0.0
npm install --save-dev tailwindcss@^3.4.0 autoprefixer@^10.4.16 postcss@^8.4.32
npm install --save-dev eslint@^9.33.0

echo "✅ Frontend dependencies installed"
cd ..

# Verify backend is ok
echo "📦 Checking backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
cd ..

echo ""
echo "✅ Quick fix completed!"
echo ""
echo "🚀 Starting development servers..."

# Create a simplified start script
cat > start-simple.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Claude Code Web Platform..."

# Start backend
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers starting!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait
EOF

chmod +x start-simple.sh

echo "Starting servers..."
./start-simple.sh