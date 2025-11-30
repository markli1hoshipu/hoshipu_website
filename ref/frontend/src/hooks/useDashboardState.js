import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import useAuthenticatedSocketIO from '../auth/hooks/useAuthenticatedSocketIO';
import { usePersistedState } from './usePersistedState';

const socketIoConnectionUrl = import.meta.env.VITE_BACKEND_SOCKETIO_URL || 'ws://localhost:8001';
const apiBaseUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001/api';

export const useDashboardState = () => {
    const { isAuthenticated, logout, authFetch, isLoading, authError } = useAuth();
    const navigate = useNavigate();

    // UI State - persisted with cookies
    const [currentView, setCurrentView] = usePersistedState('dashboard_current_view', 'leads');  // Persisted view preference
    const [sidebarPreferences, setSidebarPreferences] = usePersistedState('dashboard_sidebar', {
        collapsed: false,
        chatViewHidden: false
    });
    
    // Extract individual preferences
    const isSidebarCollapsed = sidebarPreferences.collapsed;
    const isChatViewHidden = sidebarPreferences.chatViewHidden;
    const setIsSidebarCollapsed = (collapsed) => setSidebarPreferences(prev => ({ ...prev, collapsed }));
    const setIsChatViewHidden = (hidden) => setSidebarPreferences(prev => ({ ...prev, chatViewHidden: hidden }));
    
    // Non-persisted mobile state (device-specific)
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Data State
    const [protectedData, setProtectedData] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [sessions, setSessions] = useState(() => {
        // Try to restore sessions from localStorage
        try {
            const savedSessions = localStorage.getItem('chat_sessions');
            return savedSessions ? JSON.parse(savedSessions) : {};
        } catch (error) {
            console.warn('Failed to restore sessions from localStorage:', error);
            return {};
        }
    });
    const [selectedSessionId, setSelectedSessionId] = useState(() => {
        // Try to restore selected session from localStorage
        try {
            return localStorage.getItem('selected_session_id') || null;
        } catch (error) {
            console.warn('Failed to restore selected session from localStorage:', error);
            return null;
        }
    });

    // Track which sessions have had their history loaded to prevent infinite loops
    const loadedSessionsRef = useRef(new Set());
    
    // Track thinking timeouts to clear them when responses arrive
    const thinkingTimeoutsRef = useRef(new Map());

    // WebSocket State
    const [wsError, setWsError] = useState(null);
    const [isWsConnected, setIsWsConnected] = useState(false);
    const [wsSend, setWsSend] = useState(null);

    // Save sessions to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('chat_sessions', JSON.stringify(sessions));
        } catch (error) {
            console.warn('Failed to save sessions to localStorage:', error);
        }
    }, [sessions]);

    // Save selected session ID to localStorage whenever it changes
    useEffect(() => {
        try {
            if (selectedSessionId) {
                localStorage.setItem('selected_session_id', selectedSessionId);
            } else {
                localStorage.removeItem('selected_session_id');
            }
        } catch (error) {
            console.warn('Failed to save selected session to localStorage:', error);
        }
    }, [selectedSessionId]);

    // Clean up loadedSessionsRef periodically to prevent memory leaks
    useEffect(() => {
        const cleanup = setInterval(() => {
            const currentSessionIds = Object.keys(sessions);
            const loadedSessions = [...loadedSessionsRef.current];
            const validLoadedSessions = loadedSessions.filter(id => currentSessionIds.includes(id));

            if (validLoadedSessions.length !== loadedSessions.length) {
                loadedSessionsRef.current = new Set(validLoadedSessions);
                console.log('Dashboard: Cleaned up loadedSessionsRef, removed stale sessions');
            }
        }, 60000); // Clean every minute

        return () => clearInterval(cleanup);
    }, [sessions]);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // --- WebSocket Event Handlers ---
    // Helper function to detect if agent message is asking a question
    const isQuestionText = useCallback((text) => {
        return text.includes("?") || 
               text.toLowerCase().includes("would you like") ||
               text.toLowerCase().includes("do you want") ||
               text.toLowerCase().includes("should i") ||
               text.toLowerCase().includes("which one") ||
               text.toLowerCase().includes("please specify") ||
               text.toLowerCase().includes("please provide") ||
               text.toLowerCase().includes("need more information") ||
               text.toLowerCase().includes("clarify");
    }, []);

    const handleEventResponse = useCallback((data) => {
        console.log('Dashboard: Received event_response:', data);
        
        const { sessionId, event } = data;
        
        if (!sessionId) {
            console.warn('Dashboard: Received event_response without sessionId');
            return;
        }

        if (!event) {
            console.warn('Dashboard: Received event_response without event');
            return;
        }

        setSessions(prevSessions => {
            const currentSession = prevSessions[sessionId];
            if (!currentSession) {
                console.warn(`Dashboard: Session ${sessionId} not found for event_response`);
                return prevSessions;
            }

            // Prevent race conditions by checking if session still exists
            if (!prevSessions[sessionId]) {
                return prevSessions;
            }

            // Handle different event types
            if (event.event_type === 'agent_message') {
                // Handle periodic "still thinking" events (empty partial messages)
                if (!event.text || !event.text.trim()) {
                    if (event.partial) {
                        // This is a periodic "still thinking" event - just reset timeout and maintain thinking state
                        const timeout = thinkingTimeoutsRef.current.get(sessionId);
                        if (timeout) {
                            clearTimeout(timeout);
                            thinkingTimeoutsRef.current.delete(sessionId);
                        }
                        
                        return {
                            ...prevSessions,
                            [sessionId]: {
                                ...currentSession,
                                isAgentThinking: true, // Keep thinking state active
                                error: null
                            }
                        };
                    } else {
                        // Empty non-partial message - skip it
                        return prevSessions;
                    }
                }

                // Clear any thinking timeout for this session since we got a response
                const timeout = thinkingTimeoutsRef.current.get(sessionId);
                if (timeout) {
                    clearTimeout(timeout);
                    thinkingTimeoutsRef.current.delete(sessionId);
                }

                // For partial messages, either append to existing message or create new one
                if (event.partial) {
                    const lastMessage = currentSession.messages[currentSession.messages.length - 1];
                    if (lastMessage && lastMessage.from === 'agent' && lastMessage.partial) {
                        // Append to existing partial message - keep thinking state for partial messages
                        const updatedMessages = [...currentSession.messages];
                        updatedMessages[updatedMessages.length - 1] = {
                            ...lastMessage,
                            text: lastMessage.text + event.text.trim()
                        };
                        return {
                            ...prevSessions,
                            [sessionId]: {
                                ...currentSession,
                                messages: updatedMessages,
                                isAgentThinking: true, // Keep thinking state for partial messages
                                error: null
                            }
                        };
                    } else {
                        // Create new partial message - keep thinking state for partial messages
                        const agentMessage = { 
                            text: event.text.trim(), 
                            from: 'agent', 
                            partial: true, 
                            timestamp: new Date(),
                            id: Date.now().toString(),
                            status: 'received'
                        };
                        return {
                            ...prevSessions,
                            [sessionId]: {
                                ...currentSession,
                                messages: [...currentSession.messages, agentMessage],
                                isAgentThinking: true, // Keep thinking state for partial messages
                                error: null
                            }
                        };
                    }
                } else {
                    // Final message - either create new or finalize existing partial
                    const lastMessage = currentSession.messages[currentSession.messages.length - 1];
                    if (lastMessage && lastMessage.from === 'agent' && lastMessage.partial) {
                        // Finalize existing partial message by replacing with complete text
                        const updatedMessages = [...currentSession.messages];
                        updatedMessages[updatedMessages.length - 1] = {
                            ...lastMessage,
                            text: event.text.trim(), // Use the complete final text, don't append
                            partial: false
                        };

                        // Check if this finalized message is a question or request for user input
                        const isQuestion = isQuestionText(event.text);

                        // Check if this is likely a final response (longer message, no tool calls expected, not a question)
                        const isLikelyFinalResponse = !isQuestion && 
                                                    event.text.length > 100 && 
                                                    !event.text.includes("Calling") && 
                                                    !event.text.includes("...");

                        return {
                            ...prevSessions,
                            [sessionId]: {
                                ...currentSession,
                                messages: updatedMessages,
                                // Clear thinking state if this is a question (waiting for user input) or a final response
                                isAgentThinking: (isQuestion || isLikelyFinalResponse) ? false : currentSession.isAgentThinking,
                                error: null
                            }
                        };
                    } else {
                        // Create new final message
                        const agentMessage = { 
                            text: event.text.trim(), 
                            from: 'agent', 
                            partial: false, 
                            timestamp: new Date(),
                            id: Date.now().toString(),
                            status: 'received'
                        };
                        // Check if this is a question or request for user input
                        const isQuestion = isQuestionText(event.text);

                        // Check if this is likely a final response (longer message, no tool calls expected, not a question)
                        const isLikelyFinalResponse = !isQuestion && 
                                                    event.text.length > 100 && 
                                                    !event.text.includes("Calling") && 
                                                    !event.text.includes("...");
                        
                        return {
                            ...prevSessions,
                            [sessionId]: {
                                ...currentSession,
                                messages: [...currentSession.messages, agentMessage],
                                // Clear thinking state if this is a question (waiting for user input) or a final response
                                isAgentThinking: (isQuestion || isLikelyFinalResponse) ? false : currentSession.isAgentThinking,
                                error: null
                            }
                        };
                    }
                }
            } else if (event.event_type === 'function_call') {
                // Function call events - keep thinking state active but don't show in chat
                console.log(`Dashboard: Function call event: ${event.function_name} (hidden from user)`);
                
                return {
                    ...prevSessions,
                    [sessionId]: {
                        ...currentSession,
                        isAgentThinking: true, // Keep thinking state active during tool calls
                        error: null
                    }
                };
            } else if (event.event_type === 'function_response') {
                // Function response events - keep thinking state active but don't show in chat
                console.log(`Dashboard: Function response event: ${event.function_name} (hidden from user)`);
                
                return {
                    ...prevSessions,
                    [sessionId]: {
                        ...currentSession,
                        isAgentThinking: true, // Keep thinking state active after tool responses
                        error: null
                    }
                };
            } else {
                // Handle other event types if needed
                console.log(`Dashboard: Unhandled event type: ${event.event_type}`);
                return prevSessions;
            }
        });
    }, []);

    const handleSessionDeleted = useCallback((data) => {
        console.log('Dashboard: Received session_deleted:', data);
        
        const { sessionId } = data;
        if (!sessionId) {
            console.error('Dashboard: No session ID in session_deleted event');
            return;
        }
        
        setSessions(prevSessions => {
            const newSessions = { ...prevSessions };
            delete newSessions[sessionId];

            // If the deleted session was selected, select another one or clear selection
            if (selectedSessionId === sessionId) {
                const remainingSessions = Object.keys(newSessions);
                const nextSessionId = remainingSessions.length > 0 ? remainingSessions[0] : null;
                
                if (nextSessionId) {
                    // Initialize the newly selected session with proper state
                    newSessions[nextSessionId] = {
                        ...newSessions[nextSessionId],
                        isAgentThinking: false,
                        isLoading: false,
                        error: null
                    };
                    
                    // Set a timeout to ensure loading state is cleared even if history request fails
                    setTimeout(() => {
                        setSessions(prevSessions => {
                            if (prevSessions[nextSessionId]) {
                                return {
                                    ...prevSessions,
                                    [nextSessionId]: {
                                        ...prevSessions[nextSessionId],
                                        isLoading: false
                                    }
                                };
                            }
                            return prevSessions;
                        });
                    }, 2000); // Clear loading state after 2 seconds as fallback
                }
                
                setSelectedSessionId(nextSessionId);
            }

            return newSessions;
        });
    }, [selectedSessionId, sessions]);

    const handleSessionCreated = useCallback((data) => {
        console.log('Dashboard: Received session_created:', data);
        
        const { sessionId } = data;
        if (!sessionId) {
            console.error('Dashboard: No session ID in session_created event');
            return;
        }
        
        console.log('Dashboard: New session created:', sessionId);
        
        // Add the new session to the sessions state
        setSessions(prevSessions => ({
            ...prevSessions,
            [sessionId]: {
                id: sessionId,
                name: `Session ${sessionId.slice(-8)}`,
                messages: [],
                isLoading: true,
                error: null,
                isAgentThinking: false
            }
        }));
        
        // Select the new session
        setSelectedSessionId(sessionId);
        
        // Load the session history
        if (wsSend) {
            wsSend('session_history_request', { sessionId }, (historyResponse) => {
                console.log('Dashboard: Session history response:', historyResponse);
                if (historyResponse.error) {
                    console.error('Dashboard: Failed to load session history:', historyResponse.error);
                    return;
                }
                
                // Update the session with its history
                setSessions(prevSessions => ({
                    ...prevSessions,
                    [sessionId]: {
                        ...prevSessions[sessionId],
                        messages: historyResponse.sessionHistory || [],
                        isLoading: false,
                        error: null
                    }
                }));
            });
        }
    }, [wsSend]);

    const handleSessionHistory = useCallback((data) => {
        console.log('Dashboard: Received session_history_response:', data);
        
        const { sessionHistory, error } = data;
        
        if (error) {
            console.error('Dashboard: Error loading session history:', error);
            return;
        }
        
        // We need to extract the sessionId from the first message or use the selected session
        // Since the backend doesn't return sessionId in the response, we'll use the selected session
        const sessionId = selectedSessionId;
        
        if (!sessionId) {
            console.warn('Dashboard: No session ID available for session history');
            return;
        }
        
        setSessions(prevSessions => ({
            ...prevSessions,
            [sessionId]: {
                ...prevSessions[sessionId],
                messages: (sessionHistory || [])
                    .filter(event => event.text && event.text.trim()) // Filter out empty messages
                    .map(event => ({
                        text: event.text.trim(),
                        from: event.event_type === 'user_message' ? 'user' : 'agent'
                    })),
                isLoading: false,
                error: null
            }
        }));
        
        // Mark this session as loaded
        loadedSessionsRef.current.add(sessionId);
    }, [selectedSessionId]);

    const handleListSessions = useCallback((data) => {
        console.log('Dashboard: Received list_sessions_response:', data);
        
        const { sessionIds, error } = data;
        
        if (error) {
            console.error('Dashboard: Error listing sessions:', error);
            return;
        }
        
        if (sessionIds && sessionIds.length > 0) {
            const sessionDict = {};
            sessionIds.forEach(sessionId => {
                // Check if we have this session in localStorage with existing data
                const existingSession = sessions[sessionId];
                sessionDict[sessionId] = {
                    id: sessionId,
                    name: existingSession?.name || `Session ${sessionId.slice(-8)}`,
                    messages: existingSession?.messages || [],
                    isLoading: existingSession?.messages?.length > 0 ? false : true,
                    error: null,
                    isAgentThinking: false
                };
            });

            setSessions(sessionDict);

            // Select the first session if none is selected, or restore from localStorage
            if (!selectedSessionId && sessionIds.length > 0) {
                // Try to restore the previously selected session if it still exists
                const savedSelectedId = localStorage.getItem('selected_session_id');
                if (savedSelectedId && sessionIds.includes(savedSelectedId)) {
                    setSelectedSessionId(savedSelectedId);
                } else {
                    setSelectedSessionId(sessionIds[0]);
                }
            }
        } else {
            // No sessions exist, create a new one
            if (wsSend) {
                console.log('Dashboard: No sessions found, creating a new one...');
                wsSend('create_session_request', {}, (response) => {
                    console.log('Dashboard: Create session response:', response);
                    if (response.error) {
                        console.error('Dashboard: Failed to create session:', response.error);
                        return;
                    }
                    
                    const newSessionId = response.sessionId;
                    if (!newSessionId) {
                        console.error('Dashboard: No session ID returned from create_session_request');
                        return;
                    }
                    
                    console.log('Dashboard: New session created:', newSessionId);
                    
                    // Add the new session to the sessions state
                    setSessions(prevSessions => ({
                        ...prevSessions,
                        [newSessionId]: {
                            id: newSessionId,
                            name: `Session ${newSessionId.slice(-8)}`,
                            messages: [],
                            isLoading: true,
                            error: null,
                            isAgentThinking: false
                        }
                    }));
                    
                    // Select the new session
                    setSelectedSessionId(newSessionId);
                    
                    // Load the session history
                    wsSend('session_history_request', { sessionId: newSessionId }, (historyResponse) => {
                        console.log('Dashboard: Session history response:', historyResponse);
                        if (historyResponse.error) {
                            console.error('Dashboard: Failed to load session history:', historyResponse.error);
                            return;
                        }
                        
                        // Update the session with its history
                        setSessions(prevSessions => ({
                            ...prevSessions,
                            [newSessionId]: {
                                ...prevSessions[newSessionId],
                                messages: historyResponse.sessionHistory || [],
                                isLoading: false,
                                error: null
                            }
                        }));
                    });
                });
            }
        }
    }, [selectedSessionId, wsSend]);

    // Function call permission handler
    const handleFunctionCallRequest = useCallback((data, callback) => {
        console.log('Dashboard: Received function_call_request:', data);

        // For now, automatically grant permission for all function calls
        // In a production system, you might want to show a user permission dialog
        const response = { granted: true };

        console.log('Dashboard: Responding to function_call_request with:', response);

        // Call the callback to respond to the backend
        if (typeof callback === 'function') {
            callback(response);
        }
    }, []);

    // WebSocket event handlers map - use ref to prevent reconnections
    const eventHandlersRef = useRef({});
    eventHandlersRef.current = {
        'event_response': handleEventResponse,
        'session_created': handleSessionCreated,
        'session_deleted': handleSessionDeleted,
        'session_history_response': handleSessionHistory,
        'list_sessions_response': handleListSessions,
        'function_call_request': handleFunctionCallRequest,
    };

    // Stable event handlers object for WebSocket
    const stableEventHandlers = useMemo(() => {
        const handlers = {};
        Object.keys(eventHandlersRef.current).forEach(key => {
            handlers[key] = (...args) => eventHandlersRef.current[key](...args);
        });
        return handlers;
    }, []); // Empty dependency array - handlers are stable

    // Initialize WebSocket connection - but make it optional
    const { isConnected: wsConnected, error: wsConnectionError, send } = useAuthenticatedSocketIO(
        socketIoConnectionUrl,
        stableEventHandlers
    );

    // Update WebSocket state - but don't treat errors as critical
    useEffect(() => {
        setIsWsConnected(wsConnected);
        setWsSend(() => send);
        
        // Don't set critical errors for WebSocket issues
        if (wsConnectionError) {
            console.warn('WebSocket connection issue (non-critical):', wsConnectionError);
            setWsError(wsConnectionError);
        } else {
            setWsError(null);
        }
    }, [wsConnected, wsConnectionError, send]);

    // Load sessions when WebSocket connects
    useEffect(() => {
        if (wsConnected && send && isAuthenticated) {
            console.log('Dashboard: WebSocket connected, requesting session list');
            send('list_sessions_request', {}, handleListSessions);
        }
    }, [wsConnected, send, isAuthenticated, handleListSessions]);


    // --- Auth and Data Fetching ---
    const fetchProtectedData = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            setIsFetching(true);
            setFetchError(null);
            
            const response = await authFetch(`${apiBaseUrl}/protected`);
            setProtectedData(response);
        } catch (error) {
            console.warn('Failed to fetch protected data (non-critical):', error);
            setFetchError(error);
        } finally {
            setIsFetching(false);
        }
    }, [isAuthenticated, authFetch]);

    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            fetchProtectedData();
        }
    }, [isAuthenticated, isLoading, fetchProtectedData]);

    // --- Session Management Functions ---
    const handleCreateSession = useCallback(() => {
        if (!send || !wsConnected) {
            console.warn('Cannot create session: WebSocket not connected');
            return;
        }
        
        send('create_session_request', {}, (response) => {
            console.log('Dashboard: Create session response:', response);
        });
    }, [send, wsConnected]);

    const handleDeleteSession = useCallback((sessionId) => {
        return new Promise((resolve, reject) => {
            if (!send || !wsConnected) {
                console.warn('Cannot delete session: WebSocket not connected');
                reject(new Error('WebSocket not connected'));
                return;
            }

            send('delete_session_request', { sessionId }, (response) => {
                console.log('Dashboard: Delete session response:', response);
                if (response && response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }, [send, wsConnected]);

    const handleSelectSessionMobile = useCallback((sessionId) => {
        setSelectedSessionId(sessionId);
        setIsMobileSidebarOpen(false);
    }, []);

    // Load session history when a session is selected
    useEffect(() => {
        if (selectedSessionId && wsConnected && send && sessions[selectedSessionId] && !loadedSessionsRef.current.has(selectedSessionId)) {
            console.log('Dashboard: Loading history for selected session:', selectedSessionId);
            loadedSessionsRef.current.add(selectedSessionId);
            
            send('session_history_request', { sessionId: selectedSessionId }, (response) => {
                console.log('Dashboard: Session history response:', response);
                if (response.error) {
                    console.error('Dashboard: Failed to load session history:', response.error);
                    setSessions(prevSessions => ({
                        ...prevSessions,
                        [selectedSessionId]: {
                            ...prevSessions[selectedSessionId],
                            isLoading: false,
                            error: response.error
                        }
                    }));
                } else {
                    setSessions(prevSessions => ({
                        ...prevSessions,
                        [selectedSessionId]: {
                            ...prevSessions[selectedSessionId],
                            messages: (response.sessionHistory || [])
                                .filter(event => event.text && event.text.trim()) // Filter out empty messages
                                .map(event => ({
                                    text: event.text.trim(),
                                    from: event.event_type === 'user_message' ? 'user' : 'agent'
                                })),
                            isLoading: false,
                            error: null
                        }
                    }));
                }
            });
        }
    }, [selectedSessionId, wsConnected, send, sessions]);

    // --- UI Functions ---
    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setIsMobileSidebarOpen(prev => !prev);
        } else {
            setIsSidebarCollapsed(prev => !prev);
        }
    }, [isMobile]);

    const handleLogout = useCallback(async () => {
        try {
            // Clear session data from localStorage
            localStorage.removeItem('chat_sessions');
            localStorage.removeItem('selected_session_id');

            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, [logout, navigate]);

    // --- Computed Values ---
    const combinedError = useMemo(() => {
        // Only show auth errors as critical, not WebSocket errors
        return authError || fetchError;
    }, [authError, fetchError]);

    const showInitialLoading = useMemo(() => {
        // Don't wait for WebSocket connection to show the UI
        // Only show loading on initial authentication check
        return isLoading && !isAuthenticated;
    }, [isLoading, isAuthenticated]);

    return {
        // UI State
        currentView,
        setCurrentView,
        isMobile,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isChatViewHidden,
        setIsChatViewHidden,
        toggleSidebar,

        // Data State
        protectedData,
        fetchError,
        isFetching,
        sessions,
        setSessions,
        selectedSessionId,
        setSelectedSessionId,
        handleSelectSessionMobile,

        // WebSocket State (optional)
        isWsConnected,
        wsError,
        wsSend,

        // Auth State
        isAuthenticated,
        isLoading,
        authError,
        handleLogout,
        navigate,

        // Session Management
        handleCreateSession,
        handleDeleteSession,
        handleRenameSession: useCallback((sessionId, newName) => {
            return new Promise((resolve) => {
                setSessions(prevSessions => ({
                    ...prevSessions,
                    [sessionId]: {
                        ...prevSessions[sessionId],
                        name: newName,
                        title: newName
                    }
                }));
                resolve();
            });
        }, []),

        // Timeout Management
        registerThinkingTimeout: useCallback((sessionId, timeoutId) => {
            thinkingTimeoutsRef.current.set(sessionId, timeoutId);
        }, []),
        clearThinkingTimeout: useCallback((sessionId) => {
            const timeout = thinkingTimeoutsRef.current.get(sessionId);
            if (timeout) {
                clearTimeout(timeout);
                thinkingTimeoutsRef.current.delete(sessionId);
            }
        }, []),

        // Computed values
        combinedError,
        showInitialLoading,
    };
}; 