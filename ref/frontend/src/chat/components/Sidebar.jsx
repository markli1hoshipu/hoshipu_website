// src/chat/components/Sidebar.jsx
import React, { memo, useState } from 'react';
import { Plus, MessageSquare, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/primitives/button';
import { AnimatePresence } from 'framer-motion';
import { ScrollArea } from '../../components/ui/primitives/scroll-area';
import ConfirmDialog from '../../components/ui/feedback/ConfirmDialog';
import toast from 'react-hot-toast';

const SessionItem = memo(({ session, isSelected, onSelect, onDelete, isConnected = true }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    
    if (isDeleting) return; // Prevent double-clicks
    
    if (!isConnected) {
      toast.error('Cannot delete session: Connection lost. Please wait for reconnection.');
      return;
    }
    
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    try {
      await onDelete(session.id);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete conversation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ x: 2 }}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all duration-200
        ${isSelected 
          ? 'bg-blue-50 text-blue-900 shadow-sm' 
          : 'hover:bg-gray-50 text-gray-700'
        }
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
        ${!isConnected ? 'opacity-75' : ''}
      `}
      onClick={() => !isDeleting && onSelect(session.id)}
    >
      {/* Icon */}
      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
        isSelected ? 'text-blue-600' : 'text-gray-400'
      }`} />
      
      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {session.title}
        </p>
        {session.lastMessage && (
          <p className="text-xs text-gray-500 truncate">
            {session.lastMessage}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isSelected && !isDeleting && (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting || !isConnected}
          className={`p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 ${
            isConnected 
              ? 'hover:bg-red-50 hover:text-red-600' 
              : 'cursor-not-allowed opacity-50'
          }`}
          title={!isConnected ? "Cannot delete: Connection lost" : "Delete conversation"}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Conversation"
        message={`Are you sure you want to delete "${session.title}"?`}
        details="This conversation and all its messages will be permanently deleted."
        confirmText="Delete Conversation"
        cancelText="Keep Conversation"
        type="danger"
        isLoading={isDeleting}
      />
    </motion.div>
  );
});

SessionItem.displayName = 'SessionItem';

const Sidebar = ({
  sessions = [],
  selectedSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateNewSession,
  isCollapsed = false,
  isMobile = false,
  isConnected = true
}) => {
  if (isCollapsed && !isMobile) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <Button
          onClick={onCreateNewSession}
          disabled={!isConnected}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 disabled:bg-gray-400 disabled:cursor-not-allowed"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full" role="status" aria-live="polite">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              Connection Lost
            </span>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence>
          {sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Start a new chat to begin
              </p>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isSelected={session.id === selectedSessionId}
                  onSelect={onSelectSession}
                  onDelete={onDeleteSession}
                  isConnected={isConnected}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default memo(Sidebar);