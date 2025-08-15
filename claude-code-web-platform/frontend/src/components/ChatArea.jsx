import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUpload, FiSquare } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import useStore from '../store/useStore';
import LoadingSpinner from './LoadingSpinner';

const ChatArea = () => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  const {
    messages,
    currentMessage,
    isProcessing,
    currentSessionId,
    sendMessage,
    createAgent,
    agentStatus
  } = useStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    try {
      await sendMessage(inputMessage.trim());
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleCreateSession = async () => {
    try {
      await createAgent();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  // No session state
  if (!currentSessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-claude-blue/10 rounded-full flex items-center justify-center">
            <FiSend className="w-8 h-8 text-claude-blue" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to Claude Code
          </h3>
          <p className="text-gray-600 mb-6">
            Start a conversation with Claude Code to get help with coding, system administration, and more.
          </p>
          <button
            onClick={handleCreateSession}
            className="btn-primary"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-claude-blue text-white'
                  : message.role === 'assistant'
                  ? 'bg-gray-100 text-gray-900'
                  : message.role === 'system'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-50 border-l-4 border-blue-400'
              }`}
            >
              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                {message.role === 'user' ? (
                  <p className="text-white m-0">{message.content}</p>
                ) : (
                  <ReactMarkdown
                    components={{
                      code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline ? (
                          <pre className="code-block">
                            <code {...props}>{children}</code>
                          </pre>
                        ) : (
                          <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
              
              {/* Timestamp */}
              <div className="text-xs mt-2 opacity-70">
                {format(new Date(message.timestamp), 'HH:mm')}
                {message.turnNumber && (
                  <span className="ml-2">Turn {message.turnNumber}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Current streaming message */}
        {currentMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] bg-gray-100 text-gray-900 rounded-lg p-3">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{currentMessage}</ReactMarkdown>
              </div>
              <div className="typing-animation mt-2"></div>
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && !currentMessage && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-600">Claude is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          {/* File Upload Button */}
          <button
            type="button"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <FiUpload className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Claude Code for help..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-claude-blue focus:border-transparent"
              rows={1}
              disabled={isProcessing}
              style={{ maxHeight: '120px' }}
            />
          </div>

          {/* Send/Stop Button */}
          {isProcessing ? (
            <button
              type="button"
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
            >
              <FiSquare className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputMessage.trim() || agentStatus !== 'ready'}
              className="p-2 text-white bg-claude-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              <FiSend className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Status */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          {agentStatus === 'ready' 
            ? 'Ready to help' 
            : agentStatus === 'processing'
            ? 'Processing...'
            : `Status: ${agentStatus}`
          }
        </div>
      </div>
    </div>
  );
};

export default ChatArea;