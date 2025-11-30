import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import leadWorkflowApiService from '../services/leadWorkflowApi';

const WorkflowContext = createContext();

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};

export const WorkflowProvider = ({ children }) => {
  // Global workflow state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [lastCompletedSession, setLastCompletedSession] = useState(null);
  const [completionCallbacks, setCompletionCallbacks] = useState([]);

  // Polling interval and ref
  const pollInterval = 2000;
  const pollTimeoutRef = useRef(null);

  // Register completion callback
  const onWorkflowComplete = useCallback((callback) => {
    setCompletionCallbacks(prev => [...prev, callback]);
    
    // Return cleanup function
    return () => {
      setCompletionCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  // Trigger completion callbacks
  const triggerCompletionCallbacks = useCallback((sessionData, results) => {
    completionCallbacks.forEach(callback => {
      try {
        callback(sessionData, results);
      } catch (error) {
        console.error('Error in completion callback:', error);
      }
    });
  }, [completionCallbacks]);

  // Load workflow history
  const loadWorkflowHistory = async () => {
    try {
      const history = await leadWorkflowApiService.getWorkflowHistory('frontend_user', 5);
      setWorkflowHistory(history.sessions || []);
    } catch (error) {
      console.error('Error loading workflow history:', error);
    }
  };

  // Enhanced workflow completion handler
  const handleWorkflowCompletion = useCallback(async (sessionData) => {
    console.log('Workflow completed:', sessionData);
    setLastCompletedSession(sessionData);
    
    // Get full results if available
    if (sessionData.session_id) {
      try {
        const results = await leadWorkflowApiService.getSessionResults(sessionData.session_id);
        console.log('Retrieved completion results:', results);
        
        // Trigger completion callbacks with enhanced data
        triggerCompletionCallbacks(sessionData, results);
      } catch (error) {
        console.error('Error getting session results:', error);
        // Trigger callbacks with just session data
        triggerCompletionCallbacks(sessionData, null);
      }
    }
  }, [triggerCompletionCallbacks]);

  // Start polling session status
  const startPolling = async (sessionId) => {
    if (!sessionId) return;
    
    console.log('Starting polling for session:', sessionId);
    setIsPolling(true);
    setCurrentSessionId(sessionId);

    const poll = async () => {
      try {
        console.log('Polling session status for:', sessionId);
        const status = await leadWorkflowApiService.getSessionStatus(sessionId);
        console.log('Received status:', status);
        setSessionStatus(status);

        // Check for completion
        if (status.status === 'completed') {
          console.log('Session completed with status:', status.status);
          setIsPolling(false);
          
          // Handle completion
          await handleWorkflowCompletion(status);
          
          // Reload history when session completes
          await loadWorkflowHistory();
          
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          console.log('Session ended with status:', status.status);
          setIsPolling(false);
          await loadWorkflowHistory();
          
        } else if (status.status === 'running' || status.status === 'pending') {
          // Continue polling
          pollTimeoutRef.current = setTimeout(poll, pollInterval);
        }
        
      } catch (error) {
        console.error('Error polling session status:', error);
        setIsPolling(false);
        // Retry after a delay if there's an error
        pollTimeoutRef.current = setTimeout(poll, pollInterval * 2);
      }
    };

    // Start polling immediately
    await poll();
  };

  // Stop polling
  const stopPolling = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsPolling(false);
  };

  // Execute workflow
  const executeWorkflow = async (params) => {
    try {
      console.log('Executing workflow with params:', params);
      
      // Reset previous completion state
      setLastCompletedSession(null);
      
      // Convert params to the format expected by the API service
      const apiParams = {
        workflowName: params.workflow_name,
        location: params.location,
        industry: params.industry,
        keywords: params.keywords,
        maxResults: params.max_results,
        sessionName: params.session_name,
        userId: params.user_id
      };
      
      console.log('Converted API params:', apiParams);
      const result = await leadWorkflowApiService.executeWorkflow(apiParams);
      console.log('Workflow execution result:', result);
      
      if (result.session_id) {
        await startPolling(result.session_id);
        return result;
      } else {
        throw new Error('No session ID received');
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  };

  // Cancel workflow
  const cancelWorkflow = async () => {
    if (currentSessionId) {
      try {
        await leadWorkflowApiService.cancelSession(currentSessionId);
        stopPolling();
        setSessionStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
      } catch (error) {
        console.error('Error cancelling workflow:', error);
      }
    }
  };

  // Reset workflow
  const resetWorkflow = () => {
    stopPolling();
    setCurrentSessionId(null);
    setSessionStatus(null);
    setLastCompletedSession(null);
  };

  // Test backend connection
  const testConnection = async () => {
    try {
      console.log('Testing backend connection...');
      const token = await leadWorkflowApiService.getDevToken();
      console.log('Backend connection successful, token received:', token ? 'yes' : 'no');
      return true;
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  };

  // Get current step based on progress
  const getCurrentStep = useCallback(() => {
    if (!sessionStatus) return null;
    
    const progress = sessionStatus.progress_percentage || 0;
    if (progress < 30) return 'yellowpages_scraping';
    if (progress < 70) return 'linkedin_scraping';
    if (progress < 90) return 'data_processing';
    return 'database_storage';
  }, [sessionStatus]);

  // Get workflow errors
  const getWorkflowErrors = useCallback(() => {
    if (!sessionStatus) return [];
    return sessionStatus.errors || [];
  }, [sessionStatus]);

  // Load history on mount
  useEffect(() => {
    // Test connection first
    testConnection().then(connected => {
      if (connected) {
        loadWorkflowHistory();
      } else {
        console.error('Cannot load workflow history - backend connection failed');
      }
    });
    
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, []);

  const value = {
    // State
    currentSessionId,
    sessionStatus,
    isPolling,
    workflowHistory,
    lastCompletedSession,
    
    // Computed values
    isRunning: sessionStatus?.status === 'running' || sessionStatus?.status === 'pending',
    isCompleted: sessionStatus?.status === 'completed',
    isFailed: sessionStatus?.status === 'failed',
    isCancelled: sessionStatus?.status === 'cancelled',
    progress: sessionStatus?.progress_percentage || 0,
    companiesFound: sessionStatus?.companies_found || 0,
    personnelFound: sessionStatus?.personnel_found || 0,
    leadsCreated: sessionStatus?.leads_created || 0,
    currentStep: getCurrentStep(),
    errors: getWorkflowErrors(),
    
    // Enhanced computed values
    hasResults: sessionStatus?.companies_found > 0 || sessionStatus?.personnel_found > 0,
    isInitializing: sessionStatus?.status === 'pending' && (sessionStatus?.progress_percentage || 0) < 5,
    isProcessing: sessionStatus?.status === 'running' && (sessionStatus?.progress_percentage || 0) >= 5,
    completedAt: lastCompletedSession?.completed_at || sessionStatus?.completed_at,
    
    // Actions
    executeWorkflow,
    cancelWorkflow,
    resetWorkflow,
    loadWorkflowHistory,
    startPolling,
    stopPolling,
    onWorkflowComplete,
    
    // Enhanced actions
    getSessionResults: async (sessionId) => {
      try {
        return await leadWorkflowApiService.getSessionResults(sessionId || currentSessionId);
      } catch (error) {
        console.error('Error getting session results:', error);
        throw error;
      }
    }
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}; 