import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { SessionStore } from '../database/sessionStore.js';

export class ClaudeAgentManager extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.sessionStore = new SessionStore();
  }

  async createAgent(config = {}) {
    const sessionId = uuidv4();
    const {
      systemPrompt = "You are a helpful coding assistant with terminal access",
      maxTurns = 10,
      outputFormat = "json",
      tools = ['bash', 'file_editor', 'web_search'],
      userId = null
    } = config;

    try {
      // Create session in database
      await this.sessionStore.createSession({
        id: sessionId,
        userId,
        agentConfig: {
          systemPrompt,
          maxTurns,
          outputFormat,
          tools
        }
      });

      // Create agent process
      const agent = {
        id: sessionId,
        process: null,
        config: {
          systemPrompt,
          maxTurns,
          outputFormat,
          tools
        },
        status: 'initializing',
        messageQueue: [],
        currentTurn: 0,
        createdAt: new Date()
      };

      // Initialize Claude Code CLI process using local authentication
      // Start with basic arguments that Claude CLI supports
      const claudeArgs = [];
      
      // Add system prompt if provided
      if (systemPrompt && systemPrompt !== "You are a helpful coding assistant with terminal access") {
        claudeArgs.push('--system', systemPrompt);
      }
      
      // Most Claude CLI implementations don't support these advanced options
      // We'll use basic mode and handle the interaction through stdin/stdout

      const claudeProcess = spawn('claude', claudeArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env // Use existing environment (includes local Claude auth)
      });

      agent.process = claudeProcess;
      agent.status = 'ready';

      // Handle process output
      claudeProcess.stdout.on('data', (data) => {
        const output = data.toString();
        this.handleAgentOutput(sessionId, output);
      });

      claudeProcess.stderr.on('data', (data) => {
        const error = data.toString();
        logger.error(`Agent ${sessionId} error:`, error);
        this.emit('agent-error', { sessionId, error });
      });

      claudeProcess.on('close', (code) => {
        logger.info(`Agent ${sessionId} process exited with code ${code}`);
        this.handleAgentClose(sessionId, code);
      });

      this.agents.set(sessionId, agent);
      logger.info(`Created agent ${sessionId}`);

      return {
        sessionId,
        status: 'ready',
        config: agent.config
      };

    } catch (error) {
      logger.error('Failed to create agent:', error);
      throw error;
    }
  }

  async sendMessage(sessionId, message) {
    const agent = this.agents.get(sessionId);
    
    if (!agent) {
      throw new Error(`Agent ${sessionId} not found`);
    }

    if (agent.status !== 'ready') {
      throw new Error(`Agent ${sessionId} is not ready. Status: ${agent.status}`);
    }

    try {
      // Update session activity
      await this.sessionStore.updateLastActive(sessionId);
      
      // Store message in database
      await this.sessionStore.addMessage(sessionId, 'user', message);

      agent.status = 'processing';
      agent.currentTurn++;

      // Send message to Claude CLI process
      // Claude CLI expects input followed by newline
      agent.process.stdin.write(message + '\n');

      logger.info(`Sent message to agent ${sessionId}: "${message.substring(0, 100)}..."`);

      return {
        status: 'processing',
        turnNumber: agent.currentTurn
      };

    } catch (error) {
      logger.error(`Failed to send message to agent ${sessionId}:`, error);
      agent.status = 'error';
      throw error;
    }
  }

  handleAgentOutput(sessionId, output) {
    const agent = this.agents.get(sessionId);
    if (!agent) return;

    try {
      // Parse output based on format
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          switch (data.type) {
            case 'response_chunk':
              this.emit('response-chunk', {
                sessionId,
                content: data.content,
                chunkType: data.chunkType || 'text'
              });
              break;
              
            case 'tool_use':
              this.emit('tool-use', {
                sessionId,
                tool: data.tool,
                parameters: data.parameters,
                toolId: data.toolId
              });
              break;
              
            case 'completion':
              agent.status = 'ready';
              this.emit('completion', {
                sessionId,
                finalResponse: data.content,
                turnNumber: agent.currentTurn
              });
              
              // Store assistant response
              this.sessionStore.addMessage(sessionId, 'assistant', data.content);
              break;
              
            case 'error':
              agent.status = 'error';
              this.emit('error', {
                sessionId,
                error: data.error,
                code: data.code
              });
              break;
              
            default:
              logger.debug(`Unknown output type from agent ${sessionId}:`, data);
          }
        } catch (parseError) {
          // Handle non-JSON output
          this.emit('raw-output', {
            sessionId,
            content: line
          });
        }
      }
    } catch (error) {
      logger.error(`Error handling agent output for ${sessionId}:`, error);
    }
  }

  handleAgentClose(sessionId, code) {
    const agent = this.agents.get(sessionId);
    if (!agent) return;

    agent.status = 'closed';
    this.emit('agent-closed', {
      sessionId,
      exitCode: code
    });

    // Update session status
    this.sessionStore.updateSessionStatus(sessionId, 'closed');
  }

  async terminateAgent(sessionId) {
    const agent = this.agents.get(sessionId);
    
    if (!agent) {
      throw new Error(`Agent ${sessionId} not found`);
    }

    try {
      if (agent.process && !agent.process.killed) {
        agent.process.kill('SIGTERM');
        
        // Give process time to exit gracefully
        setTimeout(() => {
          if (!agent.process.killed) {
            agent.process.kill('SIGKILL');
          }
        }, 5000);
      }

      agent.status = 'terminated';
      this.agents.delete(sessionId);
      
      // Update session status
      await this.sessionStore.updateSessionStatus(sessionId, 'terminated');
      
      logger.info(`Terminated agent ${sessionId}`);
      
      return { status: 'terminated' };
      
    } catch (error) {
      logger.error(`Failed to terminate agent ${sessionId}:`, error);
      throw error;
    }
  }

  async getAgentStatus(sessionId) {
    const agent = this.agents.get(sessionId);
    
    if (!agent) {
      // Check if session exists in database
      const session = await this.sessionStore.getSession(sessionId);
      if (session) {
        return {
          status: session.status,
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
      status: agent.status,
      exists: true,
      active: true,
      currentTurn: agent.currentTurn,
      maxTurns: agent.config.maxTurns,
      createdAt: agent.createdAt
    };
  }

  async handleToolResponse(sessionId, toolId, result) {
    const agent = this.agents.get(sessionId);
    
    if (!agent) {
      throw new Error(`Agent ${sessionId} not found`);
    }

    try {
      // Send tool response back to Claude
      agent.process.stdin.write(JSON.stringify({
        type: 'tool_response',
        toolId,
        result
      }) + '\n');

      logger.info(`Sent tool response to agent ${sessionId}`);
      
      return { status: 'sent' };
      
    } catch (error) {
      logger.error(`Failed to send tool response to agent ${sessionId}:`, error);
      throw error;
    }
  }

  async getActiveSessions() {
    const sessions = [];
    
    for (const [sessionId, agent] of this.agents.entries()) {
      sessions.push({
        sessionId,
        status: agent.status,
        currentTurn: agent.currentTurn,
        maxTurns: agent.config.maxTurns,
        createdAt: agent.createdAt
      });
    }
    
    return sessions;
  }

  // Cleanup inactive agents
  async cleanupInactiveAgents(maxInactiveTime = 3600000) {
    const now = Date.now();
    const sessionsToCleanup = [];

    for (const [sessionId, agent] of this.agents.entries()) {
      const inactiveTime = now - agent.createdAt.getTime();
      
      if (inactiveTime > maxInactiveTime && agent.status === 'ready') {
        sessionsToCleanup.push(sessionId);
      }
    }

    for (const sessionId of sessionsToCleanup) {
      try {
        await this.terminateAgent(sessionId);
        logger.info(`Cleaned up inactive agent ${sessionId}`);
      } catch (error) {
        logger.error(`Failed to cleanup agent ${sessionId}:`, error);
      }
    }

    return sessionsToCleanup.length;
  }
}

export default ClaudeAgentManager;