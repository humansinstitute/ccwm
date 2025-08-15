import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { SessionStore } from '../database/sessionStore.js';

export class SimpleClaudeManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.sessionStore = new SessionStore();
  }

  async createAgent(config = {}) {
    const sessionId = uuidv4();
    const {
      systemPrompt = "You are a helpful coding assistant with terminal access",
      userId = null
    } = config;

    try {
      // Create session in database
      await this.sessionStore.createSession({
        id: sessionId,
        userId,
        agentConfig: { systemPrompt }
      });

      // Store session info (no persistent process for now)
      const session = {
        id: sessionId,
        config: { systemPrompt },
        status: 'ready',
        messageHistory: [],
        currentTurn: 0,
        createdAt: new Date()
      };

      this.sessions.set(sessionId, session);
      logger.info(`Created simple session ${sessionId}`);

      return {
        sessionId,
        status: 'ready',
        config: session.config
      };

    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  async sendMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Update session activity
      await this.sessionStore.updateLastActive(sessionId);
      
      // Store user message
      await this.sessionStore.addMessage(sessionId, 'user', message);
      
      session.status = 'processing';
      session.currentTurn++;

      logger.info(`Processing message in session ${sessionId}`);

      // Simulate Claude CLI interaction
      this.simulateClaudeResponse(sessionId, message);

      return {
        status: 'processing',
        turnNumber: session.currentTurn
      };

    } catch (error) {
      logger.error(`Failed to send message to session ${sessionId}:`, error);
      session.status = 'error';
      throw error;
    }
  }

  async simulateClaudeResponse(sessionId, userMessage) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // For now, simulate a Claude-like response
    // In a real implementation, this would call the actual Claude CLI
    setTimeout(() => {
      const response = this.generateMockResponse(userMessage);
      
      // Emit response chunks
      const chunks = response.split(' ');
      let currentResponse = '';
      
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          currentResponse += (index > 0 ? ' ' : '') + chunk;
          
          this.emit('response-chunk', {
            sessionId,
            content: chunk + (index < chunks.length - 1 ? ' ' : ''),
            chunkType: 'text'
          });
          
          // If last chunk, emit completion
          if (index === chunks.length - 1) {
            setTimeout(() => {
              session.status = 'ready';
              this.emit('completion', {
                sessionId,
                finalResponse: response,
                turnNumber: session.currentTurn
              });
              
              // Store assistant response
              this.sessionStore.addMessage(sessionId, 'assistant', response);
            }, 100);
          }
        }, index * 100);
      });
    }, 500);
  }

  generateMockResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hello! I'm Claude Code, your AI assistant. I can help you with coding, system administration, file operations, and more. How can I assist you today?";
    }
    
    if (message.includes('file') || message.includes('create')) {
      return "I can help you work with files! I have access to file operations through my tools. What would you like to do with files?";
    }
    
    if (message.includes('code') || message.includes('programming')) {
      return "I'd be happy to help with your code! I can write, review, debug, and explain code in many programming languages. What are you working on?";
    }
    
    if (message.includes('terminal') || message.includes('bash') || message.includes('command')) {
      return "I can execute terminal commands and help with system administration tasks. What commands would you like to run?";
    }
    
    return `I understand you're asking about "${userMessage}". As Claude Code, I can help you with coding tasks, file operations, terminal commands, and system administration. Could you provide more details about what you'd like to accomplish?`;
  }

  async getAgentStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      const dbSession = await this.sessionStore.getSession(sessionId);
      if (dbSession) {
        return {
          status: dbSession.status,
          exists: true,
          active: false
        };
      }
      return {
        status: 'not_found',
        exists: false,
        active: false
      };
    }

    return {
      status: session.status,
      exists: true,
      active: true,
      currentTurn: session.currentTurn,
      createdAt: session.createdAt
    };
  }

  async terminateAgent(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'terminated';
    this.sessions.delete(sessionId);
    
    await this.sessionStore.updateSessionStatus(sessionId, 'terminated');
    
    logger.info(`Terminated session ${sessionId}`);
    
    return { status: 'terminated' };
  }

  async getActiveSessions() {
    const sessions = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      sessions.push({
        sessionId,
        status: session.status,
        currentTurn: session.currentTurn,
        createdAt: session.createdAt
      });
    }
    
    return sessions;
  }

  async handleToolResponse(sessionId, toolId, result) {
    // For now, just acknowledge the tool response
    logger.info(`Tool response received for session ${sessionId}: ${toolId}`);
    return { status: 'acknowledged' };
  }
}