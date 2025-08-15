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
