import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { SessionStore } from '../database/sessionStore.js';

const router = Router();
const sessionStore = new SessionStore();

// Get all sessions
router.get('/', async (req, res, next) => {
  try {
    const { userId, limit = 20, offset = 0 } = req.query;
    
    let sessions;
    if (userId) {
      sessions = await sessionStore.getUserSessions(userId, parseInt(limit), parseInt(offset));
    } else {
      sessions = await sessionStore.getAllActiveSessions();
    }

    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    logger.error('Failed to get sessions:', error);
    next(error);
  }
});

// Get session history
router.get('/:sessionId/history', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Get session details
    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Session not found'
      });
    }

    // Get messages
    const messages = await sessionStore.getMessages(
      sessionId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: {
        session,
        messages
      }
    });

  } catch (error) {
    logger.error('Failed to get session history:', error);
    next(error);
  }
});

// Get session details
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    logger.error('Failed to get session:', error);
    next(error);
  }
});

// Delete session
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const agentManager = req.app.locals.agentManager;

    // Try to terminate agent if active
    try {
      await agentManager.terminateAgent(sessionId);
    } catch (err) {
      // Agent might not be active, continue with deletion
      logger.debug(`Agent ${sessionId} not active:`, err.message);
    }

    // Delete from database
    await sessionStore.deleteSession(sessionId);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete session:', error);
    next(error);
  }
});

// Get tool executions for session
router.get('/:sessionId/tools', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    const executions = await sessionStore.getToolExecutions(sessionId, parseInt(limit));

    res.json({
      success: true,
      data: executions
    });

  } catch (error) {
    logger.error('Failed to get tool executions:', error);
    next(error);
  }
});

export const sessionRoutes = router;