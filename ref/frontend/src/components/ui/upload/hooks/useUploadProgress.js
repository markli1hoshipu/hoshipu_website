/**
 * Custom hook for upload progress tracking
 * Enhanced with comprehensive error handling and recovery mechanisms
 */
import { useState, useCallback, useRef } from 'react';
import { parseAppendError, getErrorRecoveryActions, formatErrorForDisplay } from '../utils/errorUtils';
import { APPEND_ERROR_TYPES } from '../utils/errorConstants';

export const UPLOAD_STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying',
  RECOVERING: 'recovering'
};

export const useUploadProgress = (uploadService) => {
  const [uploadState, setUploadState] = useState(UPLOAD_STATES.IDLE);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedError, setParsedError] = useState(null);
  const [recoveryActions, setRecoveryActions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [recoveryContext, setRecoveryContext] = useState({});
  
  const abortControllerRef = useRef(null);

  /**
   * Add log entry
   */
  const addLog = useCallback((message, type = 'info') => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      type, // 'info', 'success', 'warning', 'error'
      id: Date.now() + Math.random()
    };
    
    setLogs(prev => [...prev, logEntry]);
    
    console.log(`[Upload ${type.toUpperCase()}] ${message}`);
  }, []);

  /**
   * Update progress with optional message
   */
  const updateProgress = useCallback((newProgress, message) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
    
    if (message) {
      addLog(message);
    }
  }, [addLog]);

  /**
   * Start upload process with enhanced error handling
   */
  const startUpload = useCallback(async (file, mappings = {}, mode = 'quick', options = {}) => {
    if (!file || !uploadService) {
      throw new Error('File and upload service are required');
    }

    // Reset state
    setUploadState(UPLOAD_STATES.UPLOADING);
    setProgress(0);
    setUploadResult(null);
    setError(null);
    setParsedError(null);
    setRecoveryActions([]);
    setLogs([]);
    setStartTime(new Date());
    setEndTime(null);
    setRetryAttempts(0);
    setRecoveryContext({ file, mappings, mode, options });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Declare progressInterval in outer scope
    let progressInterval = null;

    try {
      addLog(`Starting ${mode} upload for file: ${file.name}`, 'info');
      addLog(`File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, 'info');
      
      if (Object.keys(mappings).length > 0) {
        addLog(`Using ${Object.keys(mappings).length} custom column mappings`, 'info');
      }

      updateProgress(10, 'Validating file...');

      // File validation
      const validation = uploadService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      updateProgress(20, 'File validation passed');

      // Check if cancelled
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled by user');
      }

      updateProgress(30, 'Uploading file to server...');
      
      // Start upload with progress simulation
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 10, 80);
          return newProgress;
        });
      }, 500);

      // Perform actual upload
      const result = await uploadService.uploadFile(file, mappings, mode, options);
      
      clearInterval(progressInterval);
      
      // Check if cancelled during upload
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled by user');
      }

      updateProgress(90, 'Processing upload results...');
      setUploadState(UPLOAD_STATES.PROCESSING);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateProgress(100, 'Upload completed successfully!');
      
      setUploadState(UPLOAD_STATES.SUCCESS);
      setUploadResult(result);
      setEndTime(new Date());
      
      addLog('File uploaded and processed successfully', 'success');
      
      if (result.rows_processed) {
        addLog(`Processed ${result.rows_processed} rows`, 'success');
      }
      
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          addLog(warning, 'warning');
        });
      }

      return result;

    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      const errorMessage = err.message || 'Upload failed with unknown error';
      
      if (errorMessage.includes('cancelled')) {
        setUploadState(UPLOAD_STATES.CANCELLED);
        addLog('Upload cancelled by user', 'warning');
      } else {
        // Parse and handle the error comprehensively
        const parsed = err.parsedError || parseAppendError(err, {
          operation: 'upload',
          fileName: file.name,
          mode,
          targetTable: options.target_table,
          phase: 'upload'
        });
        
        setParsedError(parsed);
        setError(parsed.userMessage || errorMessage);
        
        // Get available recovery actions
        const actions = getErrorRecoveryActions(parsed, {
          file,
          mappings,
          mode,
          options
        });
        setRecoveryActions(Object.values(actions));
        
        setUploadState(UPLOAD_STATES.ERROR);
        addLog(`Upload failed: ${parsed.title}`, 'error');
        addLog(parsed.userMessage, 'error');
        
        // Log technical details for debugging
        console.error('Upload error details:', {
          parsed,
          originalError: err,
          context: { file: file.name, mode, options }
        });
      }
      
      setEndTime(new Date());
      throw err;
    } finally {
      abortControllerRef.current = null;
    }
  }, [uploadService, addLog, updateProgress]);

  /**
   * Cancel upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
      addLog('Cancelling upload...', 'warning');
    }
  }, [addLog]);

  /**
   * Reset upload state including error handling state
   */
  const resetUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setUploadState(UPLOAD_STATES.IDLE);
    setProgress(0);
    setUploadResult(null);
    setError(null);
    setParsedError(null);
    setRecoveryActions([]);
    setLogs([]);
    setStartTime(null);
    setEndTime(null);
    setRetryAttempts(0);
    setRecoveryContext({});
  }, []);

  /**
   * Retry upload with same parameters and enhanced retry logic
   */
  const retryUpload = useCallback(async (file, mappings, mode, options = {}) => {
    if (!recoveryContext.file) {
      // Use provided parameters if no recovery context
      return startUpload(file, mappings, mode, options);
    }
    
    // Increment retry attempts
    setRetryAttempts(prev => prev + 1);
    setUploadState(UPLOAD_STATES.RETRYING);
    
    addLog(`Retrying upload (attempt ${retryAttempts + 1})...`, 'info');
    
    try {
      return await startUpload(
        recoveryContext.file,
        recoveryContext.mappings,
        recoveryContext.mode,
        recoveryContext.options
      );
    } catch (error) {
      addLog(`Retry attempt ${retryAttempts + 1} failed`, 'error');
      throw error;
    }
  }, [startUpload, recoveryContext, retryAttempts, addLog]);

  /**
   * Get upload duration
   */
  const getUploadDuration = useCallback(() => {
    if (!startTime) return null;
    
    const end = endTime || new Date();
    const duration = end - startTime;
    
    return {
      milliseconds: duration,
      seconds: Math.round(duration / 1000),
      formatted: formatDuration(duration)
    };
  }, [startTime, endTime]);

  /**
   * Get upload statistics including error handling metrics
   */
  const getUploadStats = useCallback(() => {
    return {
      state: uploadState,
      progress,
      duration: getUploadDuration(),
      logs: logs.length,
      errors: logs.filter(log => log.type === 'error').length,
      warnings: logs.filter(log => log.type === 'warning').length,
      retryAttempts,
      hasError: !!error,
      hasParsedError: !!parsedError,
      hasRecoveryOptions: recoveryActions.length > 0,
      errorType: parsedError?.type,
      errorSeverity: parsedError?.severity,
      recoverable: parsedError?.recoverable || false,
      retryable: parsedError?.retryable || false,
      success: uploadState === UPLOAD_STATES.SUCCESS,
      failed: uploadState === UPLOAD_STATES.ERROR,
      cancelled: uploadState === UPLOAD_STATES.CANCELLED,
      inProgress: [UPLOAD_STATES.UPLOADING, UPLOAD_STATES.PROCESSING, UPLOAD_STATES.RETRYING].includes(uploadState)
    };
  }, [uploadState, progress, logs, getUploadDuration, retryAttempts, error, parsedError, recoveryActions]);

  /**
   * Clear logs
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  /**
   * Export logs with enhanced error information
   */
  const exportLogs = useCallback(() => {
    return {
      uploadId: startTime?.toISOString(),
      state: uploadState,
      duration: getUploadDuration(),
      logs,
      result: uploadResult,
      error,
      parsedError,
      retryAttempts,
      recoveryActions: recoveryActions.map(action => ({
        type: action.type,
        label: action.label,
        description: action.description,
        primary: action.primary
      })),
      context: recoveryContext
    };
  }, [uploadState, startTime, logs, uploadResult, error, parsedError, retryAttempts, recoveryActions, recoveryContext, getUploadDuration]);

  /**
   * Execute a recovery action
   */
  const executeRecoveryAction = useCallback(async (actionType, additionalContext = {}) => {
    if (!parsedError || !recoveryActions.length) {
      console.warn('No recovery actions available');
      return { action: 'none' };
    }
    
    const action = recoveryActions.find(a => a.type === actionType);
    if (!action || !action.handler) {
      console.warn('Recovery action not found or invalid:', actionType);
      return { action: 'invalid', actionType };
    }
    
    setUploadState(UPLOAD_STATES.RECOVERING);
    addLog(`Executing recovery action: ${action.label}`, 'info');
    
    try {
      const result = await action.handler(additionalContext);
      addLog(`Recovery action completed: ${action.label}`, 'success');
      return result;
    } catch (error) {
      addLog(`Recovery action failed: ${action.label}`, 'error');
      throw error;
    } finally {
      if (uploadState === UPLOAD_STATES.RECOVERING) {
        setUploadState(UPLOAD_STATES.ERROR);
      }
    }
  }, [parsedError, recoveryActions, uploadState, addLog]);

  /**
   * Check if a specific recovery action is available
   */
  const canExecuteRecoveryAction = useCallback((actionType) => {
    return recoveryActions.some(action => action.type === actionType);
  }, [recoveryActions]);

  /**
   * Get formatted error for display
   */
  const getFormattedError = useCallback((options = {}) => {
    if (!parsedError) {
      if (error) {
        return {
          title: 'Upload Error',
          message: error,
          severity: 'high',
          recoverable: false,
          actions: []
        };
      }
      return null;
    }
    
    return formatErrorForDisplay(parsedError, options);
  }, [parsedError, error]);

  /**
   * Check if upload can be retried automatically
   */
  const canAutoRetry = useCallback(() => {
    if (!parsedError || retryAttempts >= 3) {
      return false;
    }
    
    // Only auto-retry for certain error types
    const autoRetryableErrors = [
      APPEND_ERROR_TYPES.NETWORK_ERROR,
      APPEND_ERROR_TYPES.TIMEOUT_ERROR,
      APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE
    ];
    
    return autoRetryableErrors.includes(parsedError.type);
  }, [parsedError, retryAttempts]);

  return {
    // State
    uploadState,
    progress,
    uploadResult,
    error,
    parsedError,
    recoveryActions,
    logs,
    retryAttempts,
    
    // Actions
    startUpload,
    cancelUpload,
    resetUpload,
    retryUpload,
    executeRecoveryAction,
    
    // Log management
    addLog,
    clearLogs,
    exportLogs,
    
    // Query functions
    getUploadDuration,
    getUploadStats,
    getFormattedError,
    canExecuteRecoveryAction,
    canAutoRetry,
    
    // Helper flags
    isIdle: uploadState === UPLOAD_STATES.IDLE,
    isUploading: uploadState === UPLOAD_STATES.UPLOADING,
    isProcessing: uploadState === UPLOAD_STATES.PROCESSING,
    isRetrying: uploadState === UPLOAD_STATES.RETRYING,
    isRecovering: uploadState === UPLOAD_STATES.RECOVERING,
    isSuccess: uploadState === UPLOAD_STATES.SUCCESS,
    isError: uploadState === UPLOAD_STATES.ERROR,
    isCancelled: uploadState === UPLOAD_STATES.CANCELLED,
    inProgress: [UPLOAD_STATES.UPLOADING, UPLOAD_STATES.PROCESSING, UPLOAD_STATES.RETRYING].includes(uploadState),
    canCancel: [UPLOAD_STATES.UPLOADING, UPLOAD_STATES.PROCESSING, UPLOAD_STATES.RETRYING].includes(uploadState),
    canRetry: [UPLOAD_STATES.ERROR, UPLOAD_STATES.CANCELLED].includes(uploadState),
    hasRecoveryOptions: recoveryActions.length > 0
  };
};

/**
 * Format duration in human readable format
 */
const formatDuration = (milliseconds) => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  return `${seconds}s`;
};