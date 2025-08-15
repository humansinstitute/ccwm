import { Router } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Validation schema
const sendMessageSchema = Joi.object({
  sessionId: Joi.string().required(),
  message: Joi.string().required().max(10000),
  options: Joi.object({
    stream: Joi.boolean(),
    includeTools: Joi.boolean()
  }).optional()
});

// Send message to agent
router.post('/', aiRateLimiter, async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { sessionId, message, options = {} } = value;
    const agentManager = req.app.locals.agentManager;

    // Check if streaming is requested
    if (options.stream) {
      // Set up SSE headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      // Handle streaming responses
      const chunkHandler = (data) => {
        if (data.sessionId === sessionId) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      };

      const completionHandler = (data) => {
        if (data.sessionId === sessionId) {
          res.write(`data: ${JSON.stringify({ type: 'completion', ...data })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          cleanup();
        }
      };

      const errorHandler = (data) => {
        if (data.sessionId === sessionId) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...data })}\n\n`);
          res.end();
          cleanup();
        }
      };

      const cleanup = () => {
        agentManager.off('response-chunk', chunkHandler);
        agentManager.off('completion', completionHandler);
        agentManager.off('error', errorHandler);
      };

      // Register event handlers
      agentManager.on('response-chunk', chunkHandler);
      agentManager.on('completion', completionHandler);
      agentManager.on('error', errorHandler);

      // Send message
      await agentManager.sendMessage(sessionId, message);

      // Handle client disconnect
      req.on('close', cleanup);

    } else {
      // Non-streaming response
      const result = await agentManager.sendMessage(sessionId, message);
      
      res.json({
        success: true,
        data: result
      });
    }

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    if (error.message.includes('not ready')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
    logger.error('Failed to send message:', error);
    next(error);
  }
});

export const messageRoutes = router;