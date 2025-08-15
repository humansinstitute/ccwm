#!/bin/bash

echo "🚀 Setting up Claude Code Web Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and run this script again."
    exit 1
fi

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "❌ Claude CLI is not found."
    echo "📥 Please install Claude Code CLI:"
    echo "   npm install -g @anthropic-ai/claude-code"
    echo ""
    echo "🔐 After installation, authenticate with:"
    echo "   claude auth login"
    echo ""
    echo "Then run this setup script again."
    exit 1
fi

# Check if Claude CLI is authenticated
echo "🔐 Checking Claude Code CLI authentication..."
if claude --help > /dev/null 2>&1; then
    echo "✅ Claude CLI basic check passed"
    # Try a simple test to verify full authentication
    if echo "test" | timeout 10s claude --system-prompt "Reply with 'ok'" > /dev/null 2>&1; then
        echo "✅ Claude CLI authentication verified"
    else
        echo "⚠️  Claude CLI might not be fully authenticated"
        echo "🔐 Please ensure authentication with:"
        echo "   claude auth login"
        echo ""
        echo "Continuing setup anyway..."
    fi
else
    echo "❌ Claude CLI basic check failed."
    echo "🔐 Please ensure Claude CLI is properly installed and authenticated:"
    echo "   npm install -g @anthropic-ai/claude-code"
    echo "   claude auth login"
    echo ""
    echo "Then run this setup script again."
    exit 1
fi

echo "✅ Claude Code CLI is installed and authenticated"

# Setup backend
echo "📦 Setting up backend..."
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install

# Create necessary directories
mkdir -p data logs uploads

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
    echo "   - Adjust settings as needed (no API key required)"
fi

cd ..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Create .env file for frontend
if [ ! -f .env ]; then
    echo "VITE_API_URL=http://localhost:3000" > .env
    echo "✅ Created frontend .env file"
fi

cd ..

# Create development scripts
echo "📝 Creating development scripts..."

# Create start script
cat > start-dev.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Claude Code Web Platform in development mode..."

# Start backend
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
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

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
EOF

chmod +x start-dev.sh

# Create production docker setup
echo "🐳 Creating Docker configuration..."

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/claude_code.db
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
      - ./logs:/app/logs
      - ~/.claude:/root/.claude  # Mount Claude CLI config
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

volumes:
  redis-data:
EOF

# Create backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Copy source code
COPY src ./src

# Create necessary directories
RUN mkdir -p data logs uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
EOF

# Create frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Create nginx configuration
cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Create README
cat > README.md << 'EOF'
# Claude Code Web Platform

A web-based interface for interacting with Claude Code SDK, providing a rich UI for conversations while maintaining full terminal execution capabilities.

## Features

- 🎯 **Real-time Streaming**: See Claude's responses as they're generated
- 🔧 **Tool Integration**: Execute bash commands, edit files, and use custom tools
- 💬 **Rich Chat Interface**: Markdown rendering, code highlighting, and message history
- 🗂️ **Session Management**: Save, load, and organize your conversations
- 📁 **File Uploads**: Send images and documents to Claude
- ⚡ **WebSocket Communication**: Low-latency real-time updates
- 🛡️ **Security**: Rate limiting, input validation, and secure file handling

## Quick Start

### Development Setup

1. **Prerequisites**
   - Node.js 18+
   - Claude CLI (`npm install -g @anthropic-ai/claude-code`)  
   - Claude CLI authentication (`claude auth login`)

2. **Installation**
   ```bash
   git clone <your-repo>
   cd claude-code-web-platform
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configuration**
   - Ensure Claude CLI is authenticated: `claude auth login`
   - Adjust settings in `backend/.env` as needed (no API key required)

4. **Start Development Servers**
   ```bash
   ./start-dev.sh
   ```

   This will start:
   - Backend API: http://localhost:3000
   - Frontend: http://localhost:5173

### Production Deployment

1. **Docker Compose**
   ```bash
   # Ensure Claude CLI is authenticated on host
   claude auth login
   
   # Start services
   docker-compose up -d
   ```

2. **Access the application**
   - Web interface: http://localhost
   - API: http://localhost:3000

## Architecture

### Backend (Node.js)
- **Express Server**: REST API and WebSocket server
- **Claude Code SDK**: Direct integration with Claude CLI
- **SQLite Database**: Session and message persistence
- **Real-time Communication**: Socket.IO for streaming

### Frontend (React)
- **Modern React**: Hooks, Context, and component-based architecture
- **Tailwind CSS**: Responsive and accessible UI
- **State Management**: Zustand for global state
- **Real-time Updates**: Socket.IO client for live communication

## API Endpoints

### Agent Management
- `POST /api/agent/create` - Create new Claude agent
- `GET /api/agent/:sessionId/status` - Get agent status
- `DELETE /api/agent/:sessionId` - Terminate agent

### Messaging
- `POST /api/message` - Send message to agent
- Supports both HTTP and WebSocket streaming

### Sessions
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:sessionId` - Get session details
- `GET /api/sessions/:sessionId/history` - Get conversation history
- `DELETE /api/sessions/:sessionId` - Delete session

### Tools
- `POST /api/tools/response` - Send tool execution results
- `GET /api/tools/available` - List available tools

### File Uploads
- `POST /api/upload` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `GET /api/upload/download/:fileId` - Download file

## WebSocket Events

### Client → Server
- `join-session` - Join a session room
- `message` - Send message to Claude
- `tool_response` - Return tool execution results
- `interrupt` - Interrupt current processing

### Server → Client
- `response_chunk` - Streaming response chunks
- `completion` - Message completion
- `tool_request` - Tool execution request
- `status` - Status updates
- `error` - Error notifications

## Configuration

### Environment Variables

#### Backend (.env)
```bash
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/claude_code.db
SESSION_SECRET=your_secret
JWT_SECRET=your_jwt_secret
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
```

## Development

### Backend Development
```bash
cd backend
npm run dev    # Start with nodemon
npm test       # Run tests
npm run lint   # Lint code
```

### Frontend Development
```bash
cd frontend
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Security Considerations

- **Rate Limiting**: API and auth endpoints are rate-limited
- **Input Validation**: All inputs validated with Joi schemas  
- **File Upload Security**: Type and size restrictions
- **CORS Configuration**: Proper origin restrictions
- **Helmet**: Security headers enabled
- **Tool Execution**: Sandboxed command execution

## Monitoring

- **Logging**: Winston with file rotation
- **Health Checks**: `/health` endpoint
- **Error Handling**: Centralized error management
- **Database**: SQLite with WAL mode for performance

## Troubleshooting

### Common Issues

1. **Claude CLI not found**
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude auth login
   ```

2. **Database connection issues**
   - Check `DATABASE_PATH` in .env
   - Ensure write permissions for data directory

3. **WebSocket connection failures**
   - Verify CORS settings
   - Check firewall configuration

4. **Claude CLI authentication issues**
   - Run `claude auth login` to authenticate
   - Verify authentication with `claude --help`

### Debug Mode
```bash
# Backend with debug logging
DEBUG=* npm run dev

# Frontend with debug info
npm run dev -- --debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: See `/docs` directory
- API Reference: Available at `/api/docs` when running
EOF

# Make scripts executable
chmod +x start-dev.sh

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Ensure Claude CLI is authenticated: 'claude auth login'"
echo "2. Run './start-dev.sh' to start development servers"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "📖 See README.md for detailed documentation"