import { Router } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Validation schemas
const createAgentSchema = Joi.object({
  systemPrompt: Joi.string().max(1000).optional(),
  maxTurns: Joi.number().integer().min(1).max(50).optional(),
  outputFormat: Joi.string().valid('json', 'text', 'markdown').optional(),
  tools: Joi.array().items(Joi.string()).optional(),
  userId: Joi.string().optional()
});

// Create new agent
router.post('/create', aiRateLimiter, async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = createAgentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const agentManager = req.app.locals.agentManager;
    const result = await agentManager.createAgent(value);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to create agent:', error);
    next(error);
  }
});

// Get agent status
router.get('/:sessionId/status', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const agentManager = req.app.locals.agentManager;
    
    const status = await agentManager.getAgentStatus(sessionId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Agent session not found'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get agent status:', error);
    next(error);
  }
});

// Terminate agent
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const agentManager = req.app.locals.agentManager;
    
    const result = await agentManager.terminateAgent(sessionId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    logger.error('Failed to terminate agent:', error);
    next(error);
  }
});

// Get all active sessions
router.get('/active', async (req, res, next) => {
  try {
    const agentManager = req.app.locals.agentManager;
    const sessions = await agentManager.getActiveSessions();
    
    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    logger.error('Failed to get active sessions:', error);
    next(error);
  }
});

export const agentRoutes = router;