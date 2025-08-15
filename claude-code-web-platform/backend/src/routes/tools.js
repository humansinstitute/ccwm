import { Router } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger.js';
import { SessionStore } from '../database/sessionStore.js';

const router = Router();
const sessionStore = new SessionStore();

// Validation schema
const toolResponseSchema = Joi.object({
  sessionId: Joi.string().required(),
  toolId: Joi.string().required(),
  result: Joi.any().required()
});

// Send tool response
router.post('/response', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = toolResponseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { sessionId, toolId, result } = value;
    const agentManager = req.app.locals.agentManager;

    // Send tool response to agent
    const response = await agentManager.handleToolResponse(sessionId, toolId, result);

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    logger.error('Failed to send tool response:', error);
    next(error);
  }
});

// Get available tools
router.get('/available', async (req, res) => {
  // Return list of available tools
  const tools = [
    {
      name: 'bash',
      description: 'Execute bash commands in the terminal',
      category: 'system'
    },
    {
      name: 'file_editor',
      description: 'Edit and manipulate files',
      category: 'files'
    },
    {
      name: 'web_search',
      description: 'Search the web for information',
      category: 'web'
    },
    {
      name: 'database_query',
      description: 'Execute database queries (custom MCP tool)',
      category: 'data'
    }
  ];

  res.json({
    success: true,
    data: tools
  });
});

// Register custom MCP tool
router.post('/register', async (req, res, next) => {
  try {
    const { name, description, inputSchema, handler } = req.body;

    // TODO: Implement MCP tool registration
    // This would connect to the MCP server and register the tool

    res.json({
      success: true,
      message: 'Tool registered successfully',
      data: { name, description }
    });

  } catch (error) {
    logger.error('Failed to register tool:', error);
    next(error);
  }
});

export const toolRoutes = router;