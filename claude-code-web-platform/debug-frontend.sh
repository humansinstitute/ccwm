#!/bin/bash

echo "🔍 Debugging Frontend Issues..."
echo ""

# Stop any running processes
echo "🛑 Stopping any running processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

cd frontend

echo "📁 Checking frontend directory structure..."
ls -la

echo ""
echo "📦 Checking package.json..."
if [ -f package.json ]; then
    echo "✅ package.json exists"
    cat package.json
else
    echo "❌ package.json missing!"
fi

echo ""
echo "🧹 Cleaning frontend..."
rm -rf node_modules package-lock.json dist .vite

echo ""
echo "📥 Installing basic dependencies..."
npm init -y

# Install React and Vite
echo "Installing React..."
npm install react@^18.2.0 react-dom@^18.2.0

echo "Installing Vite..."
npm install --save-dev vite@latest @vitejs/plugin-react@latest

echo "Installing other dependencies..."
npm install socket.io-client@^4.6.0 zustand@^4.4.7 react-hot-toast@^2.4.1
npm install tailwindcss@^3.3.0 autoprefixer@^10.4.14 postcss@^8.4.24
npm install clsx@^2.0.0 react-icons@^4.10.0

echo ""
echo "📄 Checking if main.jsx exists..."
if [ ! -f src/main.jsx ]; then
    echo "❌ main.jsx missing - creating basic structure..."
    
    mkdir -p src
    
    # Create main.jsx
    cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

    # Create basic App.jsx
    cat > src/App.jsx << 'EOF'
import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-4">
          Claude Code Web Platform
        </h1>
        <p className="text-gray-600 text-center mb-4">
          Frontend is now working! 🎉
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>Success!</strong> The React frontend is running.
        </div>
      </div>
    </div>
  )
}

export default App
EOF

    # Create basic index.css
    cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
EOF

    echo "✅ Created basic React structure"
fi

echo ""
echo "📄 Checking if index.html exists..."
if [ ! -f index.html ]; then
    echo "❌ index.html missing - creating..."
    cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Code Web Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF
    echo "✅ Created index.html"
fi

echo ""
echo "⚙️  Checking vite.config.js..."
if [ ! -f vite.config.js ]; then
    echo "❌ vite.config.js missing - creating..."
    cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true
  }
})
EOF
    echo "✅ Created vite.config.js"
fi

echo ""
echo "⚙️  Updating package.json scripts..."
cat > package.json << 'EOF'
{
  "name": "claude-code-web-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "socket.io-client": "^4.6.0",
    "zustand": "^4.4.7",
    "react-hot-toast": "^2.4.1",
    "clsx": "^2.0.0",
    "react-icons": "^4.10.0"
  },
  "devDependencies": {
    "vite": "latest",
    "@vitejs/plugin-react": "latest",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24"
  }
}
EOF

echo ""
echo "🔄 Running npm install..."
npm install

echo ""
echo "🎨 Setting up Tailwind CSS..."
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "🚀 Starting development server..."

# Start the dev server
npm run dev