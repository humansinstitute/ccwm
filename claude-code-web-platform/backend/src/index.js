import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import custom modules
import { setupDatabase } from './database/index.js';
import { logger } from './utils/logger.js';
import { setupRoutes } from './routes/index.js';
import { setupSocketHandlers } from './socket/index.js';
import { SimpleClaudeManager } from './services/simpleClaudeManager.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Setup database
    await setupDatabase();
    logger.info('Database initialized successfully');

    // Initialize Simple Claude Manager (doesn't require CLI for now)
    const agentManager = new SimpleClaudeManager();
    app.locals.agentManager = agentManager;
    logger.info('✅ Simple Claude Manager initialized (demo mode)');

    // Setup routes
    setupRoutes(app);
    logger.info('Routes configured');

    // Setup Socket.IO handlers
    setupSocketHandlers(io, agentManager);
    logger.info('Socket.IO handlers configured');

    // Start server
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`🚀 Claude Code Web Platform running at http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Initialize the application
initializeServices();