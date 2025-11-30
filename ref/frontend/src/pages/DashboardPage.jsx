import React, { useEffect, useState } from 'react';
import { motion as _motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// --- Import shadcn/ui components ---
import { Button } from '../components/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/primitives/card';

// --- Import prebuilt components ---
import Navigation from '../components/Navigation';
import AnimatedBackground from '../components/AnimatedBackground';
import SidebarMenu from '../components/SidebarMenu';
import FloatingChatWindow from '../components/FloatingChatWindow';
import MainContentArea from '../components/MainContentArea';

import CustomerSuccessDashboard from '../components/crm/dashboard/CustomerSuccessDashboard';

// Import the GlobalWorkflowStatus component
import GlobalWorkflowStatus from '../components/lead-gen/GlobalWorkflowStatus';

// Import the custom hook
import { useDashboardContext } from '../contexts/DashboardStateContext';
import TutorialModal from '../components/tutorial/TutorialModal';
import { useTutorial } from '../contexts/TutorialContext';



function DashboardPage() {
    const { isTutorialOpen, closeTutorial } = useTutorial();
    const {
        // UI State
        currentView,
        setCurrentView,

        // Data State
        sessions,
        selectedSessionId,
        setSelectedSessionId,
        setSessions,

        // WebSocket State
        isWsConnected,
        wsSend,

        // Auth State
        isAuthenticated,
        isLoading,
        navigate,

        // Timeout Management
        registerThinkingTimeout,
        clearThinkingTimeout,

        // Computed values
        combinedError,
        showInitialLoading,
    } = useDashboardContext();

    // New state for floating chat
    const [isChatVisible, setIsChatVisible] = useState(false);
    
    // Loading state for tab navigation
    const [isTabLoading, setIsTabLoading] = useState(false);
    const [targetView, setTargetView] = useState(null);
    const [isContentReady, setIsContentReady] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    
    // Loading screen toggle state - temporarily default to false for debugging
    // const [loadingEnabled, setLoadingEnabled] = useState(false);  // Temporarily commented out
    const loadingEnabled = false;  // Hardcoded to false to disable loading screen


    // Track when initial loading is complete - optimized to reduce re-renders
    useEffect(() => {
        if (showInitialLoading) {
            // Reset content ready state when initial loading starts
            setIsContentReady(false);
            setInitialLoadComplete(false);
        } else if (!initialLoadComplete) {
            // Batch state updates to reduce re-renders
            setTimeout(() => {
                // Update both states together to minimize re-renders
                setIsContentReady(true);
                setInitialLoadComplete(true);
            }, 100); // Reduced delay for faster UI response
        }
    }, [showInitialLoading, initialLoadComplete]);

    // Create a default session if none exist and we're authenticated
    useEffect(() => {
        if (isAuthenticated && Object.keys(sessions).length === 0 && !selectedSessionId) {
            const defaultSessionId = 'default-session';
            setSessions({
                [defaultSessionId]: {
                    id: defaultSessionId,
                    name: 'Default Session',
                    messages: [],
                    isLoading: false,
                    error: null,
                    isAgentThinking: false
                }
            });
            setSelectedSessionId(defaultSessionId);
        }
    }, [isAuthenticated, sessions, selectedSessionId, setSessions, setSelectedSessionId]);

    // Listen for navigation events from workflow status
    useEffect(() => {
        const handleNavigateToLeads = () => {
            setCurrentView('leads');
        };

        window.addEventListener('navigate-to-leads', handleNavigateToLeads);
        return () => {
            window.removeEventListener('navigate-to-leads', handleNavigateToLeads);
        };
    }, []);

    // Listen for navigation events from notifications (to switch sections when clicking notification links)
    useEffect(() => {
        const handleNavigateToSection = (event) => {
            const { section } = event.detail;
            console.log('[DashboardPage] Navigating to section:', section);

            // Map notification section names to view names
            const sectionMap = {
                'leadgen': 'leads',
                'crm': 'crm'
            };

            const viewName = sectionMap[section];
            if (viewName) {
                setCurrentView(viewName);
            }
        };

        window.addEventListener('navigateToSection', handleNavigateToSection);
        return () => {
            window.removeEventListener('navigateToSection', handleNavigateToSection);
        };
    }, [setCurrentView]);

    const selectedSession = selectedSessionId ? sessions[selectedSessionId] : null;
    const selectedSessionIsLoading = selectedSession?.isLoading || false;
    const currentSessionMessages = selectedSession?.messages || [];
    const currentSessionError = selectedSession?.error || null;
    const currentSessionIsAgentThinking = selectedSession?.isAgentThinking || false;

    // Chat handlers
    const handleSendMessageFromChat = (message) => {
        if (!selectedSessionId) {
            console.warn('DashboardPage: Cannot send message: No session selected.');
            return;
        }

        if (!wsSend || !isWsConnected) {
            console.warn('DashboardPage: Cannot send message: WebSocket not connected.');
            // Add user message with error indication
            const userMessage = { text: message, from: 'user' };
            const errorMessage = { text: 'Chat service is not available. Please check your connection.', from: 'system' };
            setSessions(prevSessions => ({
                ...prevSessions,
                [selectedSessionId]: {
                    ...prevSessions[selectedSessionId],
                    messages: [...(prevSessions[selectedSessionId]?.messages || []), userMessage, errorMessage],
                    isAgentThinking: false,
                    error: 'Chat service unavailable'
                }
            }));
            return;
        }

        console.log(`DashboardPage: Sending message for session ${selectedSessionId}:`, message);
        
        // Add user message immediately to UI
        const userMessage = { 
            text: message, 
            from: 'user', 
            timestamp: new Date(),
            id: Date.now().toString(),
            status: 'sent'
        };
        setSessions(prevSessions => ({
            ...prevSessions,
            [selectedSessionId]: {
                ...prevSessions[selectedSessionId],
                messages: [...(prevSessions[selectedSessionId]?.messages || []), userMessage],
                isAgentThinking: true
            }
        }));

        // Add timeout fallback to clear thinking state if no response received
        const thinkingTimeout = setTimeout(() => {
            console.warn(`DashboardPage: Timeout clearing thinking state for session ${selectedSessionId}`);
            setSessions(prevSessions => ({
                ...prevSessions,
                [selectedSessionId]: {
                    ...prevSessions[selectedSessionId],
                    isAgentThinking: false
                }
            }));
        }, 20000); // 20 second timeout
        
        // Register the timeout so it can be cleared by event responses
        registerThinkingTimeout(selectedSessionId, thinkingTimeout);

        // Send via WebSocket
        wsSend('user_input_request', { sessionId: selectedSessionId, text: message }, (response) => {
            console.log(`DashboardPage: Received user_input_request ACK for session ${selectedSessionId}:`, response);
            clearThinkingTimeout(selectedSessionId); // Clear timeout since we got a response
            if (response && response.error) {
                console.error(`DashboardPage: Error sending message for session ${selectedSessionId}:`, response.error);
                setSessions(prevSessions => ({
                    ...prevSessions,
                    [selectedSessionId]: {
                        ...prevSessions[selectedSessionId],
                        isAgentThinking: false,
                        error: response.error
                    }
                }));
            }
        });
    };

    const handleDeleteSession = (sessionId) => {
        if (!sessionId) {
            console.warn(`DashboardPage: Cannot delete session: ID missing.`);
            return;
        }

        if (!isWsConnected || !wsSend) {
            toast.error('Unable to delete session. Please check your connection and try again.');
            return;
        }

        console.log(`DashboardPage: Deleting session: ${sessionId}`);
        
        // Optimistically update UI while waiting for server response
        const originalSessions = sessions;
        setSessions(prevSessions => {
            const newSessions = { ...prevSessions };
            delete newSessions[sessionId];
            return newSessions;
        });

        // Handle selected session change immediately
        if (selectedSessionId === sessionId) {
            const remainingSessions = Object.keys(sessions).filter(id => id !== sessionId);
            setSelectedSessionId(remainingSessions.length > 0 ? remainingSessions[0] : null);
        }

        // Send delete request via WebSocket
        wsSend('delete_session_request', { sessionId }, (response) => {
            console.log(`DashboardPage: Received delete_session ACK response:`, response);
            
            if (response && response.error) {
                console.error('Deletion error:', response.error);
                toast.error('Unable to delete session. Please try again.');
                
                // Revert the optimistic update on error
                setSessions(originalSessions);
                if (selectedSessionId === sessionId) {
                    setSelectedSessionId(sessionId);
                }
            } else {
                console.log(`DashboardPage: Session ${sessionId} deleted successfully.`);
                toast.success('Session deleted successfully.');
            }
        });
    };

    // For initial loading, show sidebar but replace main content with loading
    const isInitialLoading = showInitialLoading || !initialLoadComplete;

    // Error states
    if (!isWsConnected && Object.keys(sessions).length === 0 && combinedError) {
        return (
            <div className="bg-white">
              <Navigation />
              <AnimatedBackground className="min-h-screen">
                <div className="flex items-center justify-center min-h-screen p-4 pt-32">
                  <_motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Card className="w-full max-w-md bg-white/90 backdrop-blur-md shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="text-center text-red-700 font-display">Connection Error</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-center text-sm text-gray-600 font-inter">
                          Could not connect to chat service or load sessions.
                        </p>
                        {combinedError && (
                          <p className="text-sm text-red-700 bg-red-50 p-3 rounded-md font-inter">
                            {combinedError.message || String(combinedError)}
                          </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={() => window.location.reload()} className="flex-1 bg-prelude-800 hover:bg-prelude-900 text-white font-manrope">
                            Retry Connection
                          </Button>
                          <Button variant="outline" onClick={() => navigate('/login')} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-inter">
                            Go to Login
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </_motion.div>
                </div>
              </AnimatedBackground>
            </div>
        );
    }

    // Toggle chat visibility
    const toggleChatVisibility = () => {
        setIsChatVisible(!isChatVisible);
    };
    
    // Toggle loading screen
    // const toggleLoadingEnabled = () => {
    //     setLoadingEnabled(!loadingEnabled);
    // };  // Temporarily commented out
    const toggleLoadingEnabled = () => {}; // No-op function
    
    // Handle tab loading
    const handleTabClick = (tabId) => {
        if (tabId !== currentView && !isTabLoading) { // Prevent double triggers
            setTargetView(tabId);
            setIsTabLoading(true);
            setIsContentReady(false);
            
            // Simulate actual content loading (replace with real API calls)
            // This represents database queries, API calls, etc.
            setTimeout(() => {
                setIsContentReady(true); // Signal that actual content is ready
            }, 1500 + Math.random() * 2000); // Random loading time between 1.5-3.5 seconds
        }
    };
    
    // Handle when loading screen completes
    const handleLoadingComplete = () => {
        setIsTabLoading(false);
        setTargetView(null);
        setIsContentReady(false);
    };

    // Main dashboard layout - two column design
    return (
        <div className="dashboard-container min-h-screen flex" style={{height: '100vh'}}>
            {/* Global Workflow Status */}
            <GlobalWorkflowStatus />
            
            {/* Left Sidebar Navigation */}
            <div className="border-r border-gray-200 transition-all duration-300" style={{
                background: 'linear-gradient(to bottom, rgb(255, 255, 255) 0%, rgb(250, 252, 253) 40%, rgb(232, 243, 245) 100%)'
            }}>
                <SidebarMenu
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    onTabClick={handleTabClick}
                />
            </div>

            {/* Main Content Area */}
            <MainContentArea 
                currentView={currentView}
                isTabLoading={isTabLoading}
                targetView={targetView}
                isContentReady={isContentReady}
                onLoadingComplete={handleLoadingComplete}
                isWsConnected={isWsConnected}
                isInitialLoading={isInitialLoading}
                onInitialLoadComplete={() => setInitialLoadComplete(true)}
                loadingEnabled={loadingEnabled}
            />

            {/* Floating Chat Window */}
            <AnimatePresence>
                <FloatingChatWindow
                    isVisible={isChatVisible}
                    onToggleVisibility={toggleChatVisibility}
                    sessionId={selectedSessionId}
                    isConnected={isWsConnected}
                    messages={currentSessionMessages}
                    error={currentSessionError}
                    send={handleSendMessageFromChat}
                    isAgentThinking={currentSessionIsAgentThinking}
                    isLoading={selectedSessionIsLoading}
                    context={currentView}
                />
            </AnimatePresence>

            {/* Tutorial Modal */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={closeTutorial}
            />
        </div>
    );
}

export default DashboardPage; 