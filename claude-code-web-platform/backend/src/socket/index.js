import { logger } from '../utils/logger.js';
import { SessionStore } from '../database/sessionStore.js';

const sessionStore = new SessionStore();

export function setupSocketHandlers(io, agentManager) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join session room
    socket.on('join-session', async (sessionId) => {
      socket.join(sessionId);
      logger.info(`Socket ${socket.id} joined session ${sessionId}`);
      
      // Send current session status
      const status = await agentManager.getAgentStatus(sessionId);
      socket.emit('session-status', status);
    });

    // Leave session room
    socket.on('leave-session', (sessionId) => {
      socket.leave(sessionId);
      logger.info(`Socket ${socket.id} left session ${sessionId}`);
    });

    // Handle message sending
    socket.on('message', async ({ sessionId, prompt, options = {} }) => {
      try {
        // Verify session exists
        const status = await agentManager.getAgentStatus(sessionId);
        if (status.status === 'not_found') {
          socket.emit('error', {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          });
          return;
        }

        // Send message to agent
        await agentManager.sendMessage(sessionId, prompt);

        // Emit status update
        socket.to(sessionId).emit('status', {
          state: 'processing',
          message: 'Processing your message...'
        });

      } catch (error) {
        logger.error('Socket message error:', error);
        socket.emit('error', {
          code: 'MESSAGE_ERROR',
          message: error.message
        });
      }
    });

    // Handle interruption
    socket.on('interrupt', async ({ sessionId }) => {
      try {
        // TODO: Implement interruption logic
        socket.emit('status', {
          state: 'interrupted',
          message: 'Processing interrupted'
        });
      } catch (error) {
        logger.error('Socket interrupt error:', error);
        socket.emit('error', {
          code: 'INTERRUPT_ERROR',
          message: error.message
        });
      }
    });

    // Handle tool responses
    socket.on('tool_response', async ({ sessionId, toolId, result }) => {
      try {
        await agentManager.handleToolResponse(sessionId, toolId, result);
        
        socket.emit('status', {
          state: 'tool_response_sent',
          message: 'Tool response sent to agent'
        });

      } catch (error) {
        logger.error('Socket tool response error:', error);
        socket.emit('error', {
          code: 'TOOL_RESPONSE_ERROR',
          message: error.message
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Setup agent event forwarding to sockets
  setupAgentEventForwarding(io, agentManager);
}

function setupAgentEventForwarding(io, agentManager) {
  // Forward response chunks
  agentManager.on('response-chunk', ({ sessionId, content, chunkType }) => {
    io.to(sessionId).emit('response_chunk', {
      content,
      type: chunkType,
      timestamp: new Date().toISOString()
    });
  });

  // Forward tool use requests
  agentManager.on('tool-use', ({ sessionId, tool, parameters, toolId }) => {
    io.to(sessionId).emit('tool_request', {
      tool,
      parameters,
      toolId,
      timestamp: new Date().toISOString()
    });

    // Log tool execution
    sessionStore.logToolExecution(
      sessionId, 
      tool, 
      parameters, 
      null, 
      null, 
      'pending'
    ).catch(err => logger.error('Failed to log tool execution:', err));
  });

  // Forward completion events
  agentManager.on('completion', ({ sessionId, finalResponse, turnNumber }) => {
    io.to(sessionId).emit('completion', {
      finalResponse,
      turnNumber,
      timestamp: new Date().toISOString()
    });
  });

  // Forward errors
  agentManager.on('error', ({ sessionId, error, code }) => {
    io.to(sessionId).emit('error', {
      code: code || 'AGENT_ERROR',
      message: error,
      timestamp: new Date().toISOString()
    });
  });

  // Forward agent status changes
  agentManager.on('agent-closed', ({ sessionId, exitCode }) => {
    io.to(sessionId).emit('status', {
      state: 'closed',
      message: `Agent closed with exit code ${exitCode}`,
      exitCode
    });
  });

  // Forward raw output
  agentManager.on('raw-output', ({ sessionId, content }) => {
    io.to(sessionId).emit('raw_output', {
      content,
      timestamp: new Date().toISOString()
    });
  });
}