import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { io } from 'socket.io-client';

const useStore = create(
  subscribeWithSelector((set, get) => ({
    // Connection state
    socket: null,
    isConnected: false,

    // Agent state
    currentSessionId: null,
    agentStatus: 'not_found',
    sessions: [],

    // Conversation state
    messages: [],
    isProcessing: false,
    currentMessage: '',

    // Tool state
    activeTool: null,
    toolExecutions: [],

    // UI state
    sidebarOpen: true,
    showSettings: false,
    theme: 'light',

    // Actions
    initializeSocket: () => {
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      socket.on('connect', () => {
        console.log('Connected to server');
        set({ socket, isConnected: true });
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        set({ isConnected: false });
      });

      socket.on('response_chunk', (data) => {
        const { messages, currentMessage } = get();
        const updatedMessage = currentMessage + data.content;
        set({ currentMessage: updatedMessage });
      });

      socket.on('completion', (data) => {
        const { messages, currentMessage } = get();
        const newMessage = {
          id: Date.now(),
          role: 'assistant',
          content: currentMessage || data.finalResponse,
          timestamp: new Date().toISOString(),
          turnNumber: data.turnNumber
        };
        
        set({
          messages: [...messages, newMessage],
          currentMessage: '',
          isProcessing: false
        });
      });

      socket.on('tool_request', (data) => {
        set({
          activeTool: {
            tool: data.tool,
            parameters: data.parameters,
            toolId: data.toolId,
            timestamp: data.timestamp
          }
        });
      });

      socket.on('error', (data) => {
        console.error('Socket error:', data);
        set({ isProcessing: false });
        // TODO: Show error toast
      });

      socket.on('status', (data) => {
        console.log('Status update:', data);
        if (data.state === 'processing') {
          set({ isProcessing: true });
        } else if (data.state === 'closed') {
          set({ agentStatus: 'closed', isProcessing: false });
        }
      });

      set({ socket });
    },

    disconnectSocket: () => {
      const { socket } = get();
      if (socket) {
        socket.disconnect();
        set({ socket: null, isConnected: false });
      }
    },

    createAgent: async (config = {}) => {
      try {
        const response = await fetch('/api/agent/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });

        const result = await response.json();
        
        if (result.success) {
          const sessionId = result.data.sessionId;
          set({
            currentSessionId: sessionId,
            agentStatus: 'ready',
            messages: []
          });

          // Join socket room
          const { socket } = get();
          if (socket) {
            socket.emit('join-session', sessionId);
          }

          return sessionId;
        } else {
          throw new Error(result.message || 'Failed to create agent');
        }
      } catch (error) {
        console.error('Failed to create agent:', error);
        throw error;
      }
    },

    sendMessage: async (message) => {
      const { currentSessionId, socket, messages } = get();
      
      if (!currentSessionId) {
        throw new Error('No active session');
      }

      // Add user message to chat
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      set({
        messages: [...messages, userMessage],
        isProcessing: true,
        currentMessage: ''
      });

      // Send via socket for streaming
      if (socket) {
        socket.emit('message', {
          sessionId: currentSessionId,
          prompt: message,
          options: { stream: true }
        });
      } else {
        // Fallback to HTTP API
        try {
          const response = await fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: currentSessionId,
              message,
              options: { stream: false }
            })
          });

          const result = await response.json();
          
          if (result.success) {
            set({ isProcessing: false });
          } else {
            throw new Error(result.message || 'Failed to send message');
          }
        } catch (error) {
          console.error('Failed to send message:', error);
          set({ isProcessing: false });
          throw error;
        }
      }
    },

    handleToolResponse: async (toolId, result) => {
      const { socket, currentSessionId } = get();
      
      if (socket && currentSessionId) {
        socket.emit('tool_response', {
          sessionId: currentSessionId,
          toolId,
          result
        });
      }

      set({ activeTool: null });
    },

    loadSessions: async () => {
      try {
        const response = await fetch('/api/sessions');
        const result = await response.json();
        
        if (result.success) {
          set({ sessions: result.data });
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    },

    loadSession: async (sessionId) => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/history`);
        const result = await response.json();
        
        if (result.success) {
          const { session, messages } = result.data;
          set({
            currentSessionId: sessionId,
            messages,
            agentStatus: session.status
          });

          // Join socket room
          const { socket } = get();
          if (socket) {
            socket.emit('join-session', sessionId);
          }

          return session;
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        throw error;
      }
    },

    deleteSession: async (sessionId) => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const { sessions, currentSessionId } = get();
          const updatedSessions = sessions.filter(s => s.id !== sessionId);
          
          const updates = { sessions: updatedSessions };
          
          if (currentSessionId === sessionId) {
            updates.currentSessionId = null;
            updates.messages = [];
            updates.agentStatus = 'not_found';
          }
          
          set(updates);
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
        throw error;
      }
    },

    // UI actions
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setShowSettings: (show) => set({ showSettings: show }),
    setTheme: (theme) => set({ theme })
  }))
);

export default useStore;