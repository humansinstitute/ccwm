import React, { useState } from 'react';
import { 
  FiTerminal, 
  FiFile, 
  FiGlobe, 
  FiX,
  FiPlay,
  FiCheck,
  FiAlertTriangle
} from 'react-icons/fi';
import { format } from 'date-fns';
import useStore from '../store/useStore';
import LoadingSpinner from './LoadingSpinner';

const ToolPanel = () => {
  const [toolResult, setToolResult] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { activeTool, handleToolResponse } = useStore();

  if (!activeTool) return null;

  const getToolIcon = (toolName) => {
    switch (toolName) {
      case 'bash':
        return <FiTerminal className="w-5 h-5" />;
      case 'file_editor':
        return <FiFile className="w-5 h-5" />;
      case 'web_search':
        return <FiGlobe className="w-5 h-5" />;
      default:
        return <FiTerminal className="w-5 h-5" />;
    }
  };

  const getToolDescription = (toolName) => {
    switch (toolName) {
      case 'bash':
        return 'Execute terminal commands';
      case 'file_editor':
        return 'Edit and manipulate files';
      case 'web_search':
        return 'Search the web for information';
      default:
        return 'Execute tool';
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    
    // Simulate tool execution
    // In a real implementation, this would execute the actual tool
    try {
      let result;
      
      switch (activeTool.tool) {
        case 'bash':
          result = await simulateBashExecution(activeTool.parameters);
          break;
        case 'file_editor':
          result = await simulateFileEditing(activeTool.parameters);
          break;
        case 'web_search':
          result = await simulateWebSearch(activeTool.parameters);
          break;
        default:
          result = { output: 'Tool executed successfully', success: true };
      }
      
      setToolResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setToolResult(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendResult = () => {
    try {
      const result = toolResult ? JSON.parse(toolResult) : { success: true };
      handleToolResponse(activeTool.toolId, result);
      setToolResult('');
    } catch (error) {
      console.error('Invalid JSON result:', error);
    }
  };

  const handleCancel = () => {
    handleToolResponse(activeTool.toolId, { error: 'Tool execution cancelled' });
    setToolResult('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center space-x-3">
          {getToolIcon(activeTool.tool)}
          <div>
            <h3 className="font-semibold text-gray-900">
              {activeTool.tool}
            </h3>
            <p className="text-sm text-gray-600">
              {getToolDescription(activeTool.tool)}
            </p>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* Tool Parameters */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Parameters</h4>
        <div className="bg-gray-50 rounded-lg p-3">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">
            {JSON.stringify(activeTool.parameters, null, 2)}
          </pre>
        </div>
      </div>

      {/* Execution Area */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Execution</h4>
          <div className="flex space-x-2">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="btn-primary flex items-center space-x-2 text-sm"
            >
              {isExecuting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <FiPlay className="w-4 h-4" />
              )}
              <span>Execute</span>
            </button>
          </div>
        </div>

        {/* Result Area */}
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Result (JSON)
          </label>
          <textarea
            value={toolResult}
            onChange={(e) => setToolResult(e.target.value)}
            placeholder="Tool execution result will appear here..."
            className="flex-1 input-field font-mono text-sm"
            rows={8}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSendResult}
            disabled={!toolResult.trim()}
            className="btn-primary flex items-center space-x-2"
          >
            <FiCheck className="w-4 h-4" />
            <span>Send Result</span>
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
        Requested at {format(new Date(activeTool.timestamp), 'HH:mm:ss')}
      </div>
    </div>
  );
};

// Simulation functions (replace with actual implementations)
const simulateBashExecution = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    output: `$ ${params.command}\nCommand executed successfully`,
    exitCode: 0,
    success: true
  };
};

const simulateFileEditing = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    action: params.action || 'read',
    file: params.file || 'unknown',
    success: true,
    message: 'File operation completed'
  };
};

const simulateWebSearch = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    query: params.query || '',
    results: [
      {
        title: 'Example Result',
        url: 'https://example.com',
        snippet: 'This is a simulated search result...'
      }
    ],
    success: true
  };
};

export default ToolPanel;