# Interactive CLI Test - Multi-Interface Chat Application

A sophisticated AI chat application with both CLI and web interfaces that share state in real-time.

## Features

- 🔄 **Real-time Synchronization** - Messages sync instantly between CLI and web
- 📱 **CLI Interface** - Interactive command-line chat with color-coded messages
- 🌐 **Web Interface** - Modern chat UI accessible at http://localhost:3000
- 🤖 **AI Integration** - Ready for Anthropic Claude API
- 💾 **Persistence** - Conversation history saved to JSON file
- 🔌 **WebSocket Support** - Real-time updates via Socket.IO

## Installation

```bash
cd intCLI
npm install
```

## Configuration

1. Add your Anthropic API key to `.env`:
```
AI_API_KEY=your_anthropic_api_key_here
```

## Usage

### Start Both Interfaces Together
```bash
npm start
```

### Start Interfaces Separately
```bash
# Terminal 1 - Web server
npm run web

# Terminal 2 - CLI
npm run cli
```

## CLI Commands

- `/help` - Show available commands
- `/clear` - Clear conversation history
- `/exit` - Exit the CLI

## Architecture

- **shared-state.js** - Centralized conversation management with EventEmitter
- **ai-service.js** - AI integration layer (Anthropic Claude)
- **cli.js** - Command-line interface with readline
- **server.js** - Express + Socket.IO web server
- **index.js** - Main launcher for both interfaces
- **public/index.html** - Web interface

## How It Works

1. Both interfaces connect to a shared conversation manager
2. Messages are persisted to `conversation.json`
3. Real-time updates broadcast via EventEmitter and WebSockets
4. Each message tagged with source (CLI or web) and timestamp