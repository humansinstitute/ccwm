const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const conversationManager = require('./shared-state');
const aiService = require('./ai-service');

class WebServer {
  constructor(port = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.port = port;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupConversationSync();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    this.app.get('/api/conversation', (req, res) => {
      res.json(conversationManager.getConversation());
    });

    this.app.post('/api/message', async (req, res) => {
      try {
        const { content } = req.body;
        
        // Add user message
        const userMessage = conversationManager.addMessage({
          role: 'user',
          content: content,
          source: 'web'
        });

        // Get AI response
        const conversation = conversationManager.getConversation();
        const aiResponse = await aiService.sendMessage(conversation);

        // Add AI response
        const aiMessage = conversationManager.addMessage({
          role: 'assistant',
          content: aiResponse.content,
          thinking: aiResponse.thinking,
          source: 'web'
        });

        res.json({ userMessage, aiMessage });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.delete('/api/conversation', (req, res) => {
      conversationManager.clear();
      res.json({ success: true });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected');

      // Send current conversation
      socket.emit('conversationHistory', conversationManager.getConversation());

      // Handle CLI message events
      socket.on('cliMessage', (message) => {
        // Broadcast CLI messages to all other clients
        socket.broadcast.emit('newMessage', message);
        
        // Update server's conversation state
        if (!conversationManager.conversation.find(m => m.id === message.id)) {
          conversationManager.conversation.push(message);
          conversationManager.save();
        }
      });

      // Handle clear conversation from CLI
      socket.on('clearConversation', () => {
        conversationManager.clear();
      });

      // Handle history requests
      socket.on('requestHistory', () => {
        socket.emit('conversationHistory', conversationManager.getConversation());
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }

  setupConversationSync() {
    // Broadcast new messages to all connected web clients
    conversationManager.on('messageAdded', (message) => {
      this.io.emit('newMessage', message);
    });

    conversationManager.on('conversationCleared', () => {
      this.io.emit('conversationCleared');
    });
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🌐 Web interface running at http://localhost:${this.port}`);
    });
  }
}

// Start web server if run directly
if (require.main === module) {
  const server = new WebServer();
  server.start();
}

module.exports = WebServer;