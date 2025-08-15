import React from 'react';
import { 
  FiMessageSquare,
  FiTrash2,
  FiClock,
  FiUser
} from 'react-icons/fi';
import { format } from 'date-fns';
import useStore from '../store/useStore';

const Sidebar = () => {
  const {
    sessions,
    currentSessionId,
    loadSession,
    deleteSession
  } = useStore();

  const handleSessionClick = async (sessionId) => {
    try {
      await loadSession(sessionId);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(sessionId);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = 'status-indicator';
    switch (status) {
      case 'active':
        return `${baseClasses} status-active`;
      case 'processing':
        return `${baseClasses} status-processing`;
      case 'error':
        return `${baseClasses} status-error`;
      default:
        return `${baseClasses} status-closed`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiMessageSquare className="mr-2" />
          Sessions
        </h2>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <FiMessageSquare className="mx-auto mb-2 w-8 h-8" />
            <p className="text-sm">No sessions yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a new session to get started
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session.id)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors
                  hover:bg-gray-50 border border-transparent
                  ${currentSessionId === session.id 
                    ? 'bg-claude-blue/10 border-claude-blue' 
                    : 'hover:border-gray-200'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Session Info */}
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={getStatusBadge(session.status)}>
                        {session.status}
                      </span>
                    </div>
                    
                    {/* Session ID */}
                    <p className="text-sm font-mono text-gray-600 truncate">
                      {session.id.slice(0, 12)}...
                    </p>
                    
                    {/* Timestamps */}
                    <div className="flex items-center text-xs text-gray-400 mt-1 space-x-3">
                      <div className="flex items-center">
                        <FiClock className="mr-1 w-3 h-3" />
                        {format(new Date(session.created_at), 'MMM d, HH:mm')}
                      </div>
                      {session.user_id && (
                        <div className="flex items-center">
                          <FiUser className="mr-1 w-3 h-3" />
                          User
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;