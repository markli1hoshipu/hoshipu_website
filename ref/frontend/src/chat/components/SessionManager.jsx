// src/chat/components/SessionManager.jsx
import React, { memo } from 'react';
import { Card, CardContent } from '../../components/ui/primitives/card';
import { Button } from '../../components/ui/primitives/button';
import { PanelLeftOpen } from 'lucide-react';
import EnhancedChatWindow from './EnhancedChatWindow';
import Sidebar from './Sidebar';

// Helper function to get context-aware welcome messages
const getWelcomeMessage = (context) => {
  const welcomeMessages = {
    leads: {
      title: 'Start Your Lead Generation',
      subtitle: 'Create a new chat to begin lead generation with AI assistance.'
    },
    'sales-center': {
      title: 'Start Your Sales Process',
      subtitle: 'Create a new chat to begin sales process management with AI assistance.'
    },
    employees: {
      title: 'Start Team Management',
      subtitle: 'Create a new chat to begin team management with AI assistance.'
    },
    calendar: {
      title: 'Start Your First Schedule',
      subtitle: 'Create a new chat to begin scheduling with AI assistance.'
    }
  };
  
  return welcomeMessages[context] || welcomeMessages.calendar;
};

const EmptySessionState = memo(({ context, onOpenSidebar, isMobile = false }) => {
  const welcomeMessage = getWelcomeMessage(context);
  
  return (
    <div className="flex items-center justify-center h-full p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="w-full max-w-md mx-4 bg-white shadow-lg border-0">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="font-display font-medium text-prelude-900">
                {welcomeMessage.title}
              </h3>
              <p className="text-sm text-gray-600 font-inter">
                {welcomeMessage.subtitle}
              </p>
              {isMobile && onOpenSidebar && (
                <Button
                  onClick={onOpenSidebar}
                  className="bg-prelude-800 hover:bg-prelude-900 text-white font-manrope"
                >
                  <PanelLeftOpen className="h-4 w-4 mr-2" />
                  Open Menu
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
});

EmptySessionState.displayName = 'EmptySessionState';

const SessionManager = memo(({
  // Session state
  _sessions = [],
  selectedSessionId,
  selectedSession,
  
  // Session data
  currentSessionMessages = [],
  currentSessionError = null,
  currentSessionIsAgentThinking = false,
  selectedSessionIsLoading = false,
  
  // Handlers
  _onSelectSession,
  _onDeleteSession,
  _onCreateSession,
  onSendMessage,
  
  // UI state
  context = 'calendar',
  isConnected = true,
  isMobile = false,
  onOpenSidebar
}) => {
  
  // Note: Session creation is now handled by useDashboardState hook
  // when no sessions are found during the initial list_sessions_request
  
  return (
    <div className="h-full overflow-hidden bg-gray-50">
      {selectedSessionId && selectedSession ? (
        <EnhancedChatWindow
          sessionId={selectedSession.id}
          isConnected={isConnected}
          messages={currentSessionMessages}
          error={currentSessionError}
          send={onSendMessage}
          isAgentThinking={currentSessionIsAgentThinking}
          isLoading={selectedSessionIsLoading}
          context={context}
        />
      ) : (
        <EmptySessionState 
          context={context}
          onOpenSidebar={onOpenSidebar}
          isMobile={isMobile}
        />
      )}
    </div>
  );
});

SessionManager.displayName = 'SessionManager';

export default SessionManager; 