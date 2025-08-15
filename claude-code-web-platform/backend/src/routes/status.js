import { Router } from 'express';
import { getClaudeStatus } from '../utils/claudeAuth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Get system status
router.get('/', async (req, res, next) => {
  try {
    const claudeStatus = await getClaudeStatus();
    
    const systemStatus = {
      server: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      },
      claude: claudeStatus,
      database: {
        status: 'connected' // Could add actual DB health check
      }
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    logger.error('Failed to get system status:', error);
    next(error);
  }
});

// Get detailed Claude CLI information
router.get('/claude', async (req, res, next) => {
  try {
    const claudeStatus = await getClaudeStatus();
    
    res.json({
      success: true,
      data: claudeStatus
    });

  } catch (error) {
    logger.error('Failed to get Claude status:', error);
    next(error);
  }
});

export const statusRoutes = router;