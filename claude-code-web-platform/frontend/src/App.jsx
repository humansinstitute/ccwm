import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ToolPanel from './components/ToolPanel';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const {
    initializeSocket,
    disconnectSocket,
    sidebarOpen,
    activeTool,
    isConnected,
    loadSessions
  } = useStore();

  useEffect(() => {
    // Initialize socket connection
    initializeSocket();
    
    // Load initial sessions
    loadSessions();

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'w-80' : 'w-0'} 
        transition-all duration-300 ease-in-out overflow-hidden
        bg-white border-r border-gray-200
      `}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Connection Status */}
        {!isConnected && (
          <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
            <div className="flex items-center text-yellow-800 text-sm">
              <LoadingSpinner size="sm" className="mr-2" />
              Connecting to server...
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex min-h-0">
          {/* Chat */}
          <div className={`
            ${activeTool ? 'w-2/3' : 'w-full'} 
            transition-all duration-300 ease-in-out
          `}>
            <ChatArea />
          </div>

          {/* Tool Panel */}
          {activeTool && (
            <div className="w-1/3 border-l border-gray-200 bg-white">
              <ToolPanel />
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
