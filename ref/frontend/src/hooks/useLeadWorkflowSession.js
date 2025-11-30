import { useState, useEffect, useCallback, useRef } from 'react';
import leadWorkflowApiService from '../services/leadWorkflowApi';

/**
 * Hook for managing lead workflow sessions with real-time updates
 * @param {string} sessionId - The session ID to monitor
 * @param {object} options - Configuration options
 * @returns {object} Session state and control functions
 */
export const useLeadWorkflowSession = (sessionId = null, options = {}) => {
  const {
    pollInterval = 2000,
    autoStart = true,
    onStatusUpdate = null,
    onCompletion = null,
    onError = null
  } = options;

  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for cleanup
  const pollTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Clear polling timeout
  const clearPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Update session status
  const updateSessionStatus = useCallback(async (currentSessionId) => {
    if (!currentSessionId || !isMountedRef.current) return;

    try {
      const status = await leadWorkflowApiService.getSessionStatus(currentSessionId);
      
      if (!isMountedRef.current) return;

      setSession(prevSession => ({
        ...prevSession,
        ...status
      }));

      // Call status update callback
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }

      // Check if session is complete
      const isComplete = status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled';
      
      if (isComplete) {
        clearPolling();
        
        // Get final results if completed successfully
        if (status.status === 'completed') {
          try {
            const results = await leadWorkflowApiService.getSessionResults(currentSessionId);
            if (isMountedRef.current) {
              setSession(prevSession => ({
                ...prevSession,
                results: results.results
              }));
              
              if (onCompletion) {
                onCompletion(results);
              }
            }
          } catch (resultsError) {
            console.error('Error fetching session results:', resultsError);
          }
        }
      } else if (isMountedRef.current && isPolling) {
        // Continue polling
        pollTimeoutRef.current = setTimeout(() => {
          updateSessionStatus(currentSessionId);
        }, pollInterval);
      }

    } catch (err) {
      console.error('Error updating session status:', err);
      if (isMountedRef.current) {
        setError(err.message);
        clearPolling();
        
        if (onError) {
          onError(err);
        }
      }
    }
  }, [pollInterval, isPolling, onStatusUpdate, onCompletion, onError, clearPolling]);

  // Start monitoring session
  const startMonitoring = useCallback(async (targetSessionId) => {
    const currentSessionId = targetSessionId || sessionId;
    if (!currentSessionId) {
      return;
    }

    setLoading(true);
    setError(null);
    clearPolling();

    try {
      // Get initial session status
      const initialStatus = await leadWorkflowApiService.getSessionStatus(currentSessionId);
      
      if (!isMountedRef.current) return;

      setSession(initialStatus);
      setLoading(false);

      // Start polling if session is still running
      const isRunning = initialStatus.status === 'running' || initialStatus.status === 'pending';
      
      if (isRunning) {
        setIsPolling(true);
        pollTimeoutRef.current = setTimeout(() => {
          updateSessionStatus(currentSessionId);
        }, pollInterval);
      } else if (initialStatus.status === 'completed') {
        // Get results for completed session
        try {
          const results = await leadWorkflowApiService.getSessionResults(currentSessionId);
          if (isMountedRef.current) {
            setSession(prevSession => ({
              ...prevSession,
              results: results.results
            }));
          }
        } catch (resultsError) {
          console.error('Error fetching completed session results:', resultsError);
        }
      }

    } catch (err) {
      console.error('Error starting session monitoring:', err);
      if (isMountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [sessionId, pollInterval, updateSessionStatus, clearPolling]);

  // Stop monitoring session
  const stopMonitoring = useCallback(() => {
    clearPolling();
    setSession(null);
    setError(null);
  }, [clearPolling]);

  // Cancel session
  const cancelSession = useCallback(async (targetSessionId) => {
    const currentSessionId = targetSessionId || sessionId;
    if (!currentSessionId) return;

    try {
      await leadWorkflowApiService.cancelSession(currentSessionId);
      
      // Update local state
      if (isMountedRef.current) {
        setSession(prevSession => ({
          ...prevSession,
          status: 'cancelled'
        }));
        clearPolling();
      }

    } catch (err) {
      console.error('Error cancelling session:', err);
      if (isMountedRef.current) {
        setError(err.message);
        
        if (onError) {
          onError(err);
        }
      }
    }
  }, [sessionId, clearPolling, onError]);

  // Get session results
  const getResults = useCallback(async (targetSessionId) => {
    const currentSessionId = targetSessionId || sessionId;
    if (!currentSessionId) return null;

    try {
      const results = await leadWorkflowApiService.getSessionResults(currentSessionId);
      
      if (isMountedRef.current) {
        setSession(prevSession => ({
          ...prevSession,
          results: results.results
        }));
      }

      return results;

    } catch (err) {
      console.error('Error getting session results:', err);
      if (isMountedRef.current) {
        setError(err.message);
        
        if (onError) {
          onError(err);
        }
      }
      return null;
    }
  }, [sessionId, onError]);

  // Auto-start monitoring when sessionId changes
  useEffect(() => {
    if (sessionId && autoStart) {
      startMonitoring(sessionId);
    }

    return () => {
      clearPolling();
    };
  }, [sessionId, autoStart, startMonitoring, clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [clearPolling]);

  // Computed values
  const isRunning = session?.status === 'running' || session?.status === 'pending';
  const isCompleted = session?.status === 'completed';
  const isFailed = session?.status === 'failed';
  const isCancelled = session?.status === 'cancelled';
  const isActive = isRunning || isPolling;

  const progress = session?.progress_percentage || 0;
  const companiesFound = session?.companies_found || 0;
  const personnelFound = session?.personnel_found || 0;
  const leadsCreated = session?.leads_created || 0;

  const sessionResults = session?.results || null;
  const sessionErrors = session?.errors || [];

  return {
    // Session data
    session,
    loading,
    error,
    
    // Status flags
    isRunning,
    isCompleted,
    isFailed,
    isCancelled,
    isActive,
    isPolling,
    
    // Progress data
    progress,
    companiesFound,
    personnelFound,
    leadsCreated,
    sessionResults,
    sessionErrors,
    
    // Control functions
    startMonitoring,
    stopMonitoring,
    cancelSession,
    getResults,
    
    // Utility functions
    refresh: () => startMonitoring(sessionId),
    reset: () => {
      stopMonitoring();
      setError(null);
    }
  };
}; 