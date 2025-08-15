import { getDatabase } from './index.js';
import { logger } from '../utils/logger.js';

export class SessionStore {
  constructor() {
    this.db = null;
  }

  getDb() {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  async createSession({ id, userId, agentConfig }) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        INSERT INTO sessions (id, user_id, agent_config, status)
        VALUES (?, ?, ?, 'active')
      `);
      
      stmt.run(id, userId, JSON.stringify(agentConfig));
      logger.info(`Created session ${id}`);
      
      return { id, userId, agentConfig, status: 'active' };
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM sessions WHERE id = ?
      `);
      
      const session = stmt.get(sessionId);
      
      if (session) {
        session.agent_config = JSON.parse(session.agent_config || '{}');
        session.metadata = JSON.parse(session.metadata || '{}');
      }
      
      return session;
    } catch (error) {
      logger.error('Failed to get session:', error);
      throw error;
    }
  }

  async updateLastActive(sessionId) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        UPDATE sessions 
        SET last_active = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      stmt.run(sessionId);
    } catch (error) {
      logger.error('Failed to update last active:', error);
      throw error;
    }
  }

  async updateSessionStatus(sessionId, status) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        UPDATE sessions 
        SET status = ? 
        WHERE id = ?
      `);
      
      stmt.run(status, sessionId);
      logger.info(`Updated session ${sessionId} status to ${status}`);
    } catch (error) {
      logger.error('Failed to update session status:', error);
      throw error;
    }
  }

  async addMessage(sessionId, role, content, metadata = null) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        INSERT INTO messages (session_id, role, content, metadata)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        sessionId, 
        role, 
        content, 
        metadata ? JSON.stringify(metadata) : null
      );
      
      return { id: result.lastInsertRowid, sessionId, role, content };
    } catch (error) {
      logger.error('Failed to add message:', error);
      throw error;
    }
  }

  async getMessages(sessionId, limit = 100, offset = 0) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM messages 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `);
      
      const messages = stmt.all(sessionId, limit, offset);
      
      return messages.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      })).reverse();
    } catch (error) {
      logger.error('Failed to get messages:', error);
      throw error;
    }
  }

  async getUserSessions(userId, limit = 20, offset = 0) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT id, created_at, last_active, status, agent_config
        FROM sessions 
        WHERE user_id = ? 
        ORDER BY last_active DESC 
        LIMIT ? OFFSET ?
      `);
      
      const sessions = stmt.all(userId, limit, offset);
      
      return sessions.map(session => ({
        ...session,
        agent_config: JSON.parse(session.agent_config || '{}')
      }));
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      throw error;
    }
  }

  async getAllActiveSessions() {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT id, user_id, created_at, last_active, status, agent_config
        FROM sessions 
        WHERE status = 'active'
        ORDER BY last_active DESC
      `);
      
      const sessions = stmt.all();
      
      return sessions.map(session => ({
        ...session,
        agent_config: JSON.parse(session.agent_config || '{}')
      }));
    } catch (error) {
      logger.error('Failed to get active sessions:', error);
      throw error;
    }
  }

  async logToolExecution(sessionId, toolName, parameters, result, executionTime, status) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        INSERT INTO tool_executions (session_id, tool_name, parameters, result, execution_time, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const res = stmt.run(
        sessionId,
        toolName,
        JSON.stringify(parameters),
        JSON.stringify(result),
        executionTime,
        status
      );
      
      return { id: res.lastInsertRowid };
    } catch (error) {
      logger.error('Failed to log tool execution:', error);
      throw error;
    }
  }

  async getToolExecutions(sessionId, limit = 50) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM tool_executions 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      
      const executions = stmt.all(sessionId, limit);
      
      return executions.map(exec => ({
        ...exec,
        parameters: JSON.parse(exec.parameters || '{}'),
        result: JSON.parse(exec.result || '{}')
      }));
    } catch (error) {
      logger.error('Failed to get tool executions:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        DELETE FROM sessions WHERE id = ?
      `);
      
      stmt.run(sessionId);
      logger.info(`Deleted session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw error;
    }
  }
}