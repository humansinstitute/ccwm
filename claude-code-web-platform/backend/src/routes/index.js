import { agentRoutes } from './agent.js';
import { messageRoutes } from './message.js';
import { sessionRoutes } from './session.js';
import { toolRoutes } from './tools.js';
import { uploadRoutes } from './upload.js';
import { statusRoutes } from './status.js';

export function setupRoutes(app) {
  // API routes
  app.use('/api/agent', agentRoutes);
  app.use('/api/message', messageRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/tools', toolRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/status', statusRoutes);

  // 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested endpoint does not exist'
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
      message: process.env.NODE_ENV === 'production' && statusCode === 500 
        ? 'An unexpected error occurred' 
        : message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });
}