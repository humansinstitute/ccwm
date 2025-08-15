import React from 'react';
import { 
  FiMenu, 
  FiSettings, 
  FiPlus,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';
import useStore from '../store/useStore';

const Header = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
    isConnected,
    agentStatus,
    currentSessionId,
    createAgent
  } = useStore();

  const handleNewSession = async () => {
    try {
      await createAgent({
        systemPrompt: "You are a helpful coding assistant with terminal access",
        tools: ['bash', 'file_editor', 'web_search']
      });
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    switch (agentStatus) {
      case 'ready': return 'text-green-500';
      case 'processing': return 'text-blue-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    switch (agentStatus) {
      case 'ready': return 'Ready';
      case 'processing': return 'Processing';
      case 'error': return 'Error';
      case 'not_found': return 'No Agent';
      default: return 'Unknown';
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      {/* Left Section */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-gray-900">
            Claude Code
          </h1>
          <div className="flex items-center space-x-1">
            {isConnected ? (
              <FiWifi className="w-4 h-4 text-green-500" />
            ) : (
              <FiWifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex-1 flex justify-center">
        {currentSessionId && (
          <div className="text-sm text-gray-500 font-mono">
            Session: {currentSessionId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleNewSession}
          className="btn-primary flex items-center space-x-2"
          disabled={!isConnected}
        >
          <FiPlus className="w-4 h-4" />
          <span>New Session</span>
        </button>
        
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
          <FiSettings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;