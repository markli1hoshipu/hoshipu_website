/**
 * Error utility functions for parsing and handling backend errors in append operations
 */

import { 
  APPEND_ERROR_TYPES, 
  ERROR_MESSAGES, 
  BACKEND_ERROR_MAPPING,
  RETRY_CONFIG,
  RECOVERY_ACTIONS,
  RECOVERY_ACTION_METADATA,
  ERROR_SEVERITY
} from './errorConstants';

/**
 * Parse backend error response and classify error type
 * @param {Error|Object} error - Error object from API call
 * @param {Object} context - Additional context about the operation
 * @returns {Object} Parsed error with type, message, and recovery options
 */
export function parseAppendError(error, context = {}) {
  let errorCode = null;
  let errorMessage = '';
  let errorDetails = {};
  let httpStatus = null;

  // Extract error information from different error formats
  if (error.response) {
    // Axios/HTTP error response
    httpStatus = error.response.status;
    const responseData = error.response.data;
    
    if (typeof responseData === 'object') {
      errorCode = responseData.error_code || responseData.code || responseData.type;
      errorMessage = responseData.message || responseData.error || responseData.detail;
      errorDetails = responseData.details || responseData.data || {};
    } else {
      errorMessage = responseData || error.response.statusText;
    }
  } else if (error.message) {
    // JavaScript Error object
    errorMessage = error.message;
    
    // Try to extract error codes from error messages
    errorCode = extractErrorCodeFromMessage(errorMessage);
  } else if (typeof error === 'string') {
    // String error
    errorMessage = error;
    errorCode = extractErrorCodeFromMessage(error);
  } else if (typeof error === 'object') {
    // Generic error object
    errorCode = error.code || error.type || error.error_code;
    errorMessage = error.message || error.error || error.description;
    errorDetails = error.details || error.data || {};
  }

  // Classify error type based on error code, HTTP status, and message content
  const errorType = classifyErrorType(errorCode, httpStatus, errorMessage, errorDetails);
  
  // Get error configuration
  const errorConfig = ERROR_MESSAGES[errorType] || ERROR_MESSAGES[APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE];
  
  return {
    type: errorType,
    code: errorCode,
    message: errorMessage,
    details: errorDetails,
    httpStatus,
    severity: errorConfig.severity,
    title: errorConfig.title,
    userMessage: errorConfig.message,
    recoverable: errorConfig.recoverable,
    retryable: errorConfig.retryable,
    suggestedActions: errorConfig.actions,
    retryConfig: RETRY_CONFIG[errorType],
    context,
    timestamp: new Date().toISOString(),
    originalError: error
  };
}

/**
 * Extract error code from error message using pattern matching
 * @param {string} message - Error message to analyze
 * @returns {string|null} Extracted error code or null
 */
function extractErrorCodeFromMessage(message) {
  if (!message || typeof message !== 'string') return null;
  
  const messageUpper = message.toUpperCase();
  
  // Check for specific error patterns in message
  const patterns = [
    // Database errors
    { pattern: /TABLE.*NOT.*FOUND|RELATION.*DOES NOT EXIST/i, code: 'TABLE_NOT_FOUND' },
    { pattern: /PERMISSION.*DENIED|ACCESS.*DENIED/i, code: 'PERMISSION_DENIED' },
    { pattern: /UNIQUE.*VIOLATION|DUPLICATE.*KEY/i, code: 'UNIQUE_VIOLATION' },
    { pattern: /FOREIGN.*KEY.*VIOLATION/i, code: 'FOREIGN_KEY_VIOLATION' },
    { pattern: /CHECK.*VIOLATION|CHECK.*CONSTRAINT/i, code: 'CHECK_VIOLATION' },
    { pattern: /NOT.*NULL.*VIOLATION/i, code: 'NOT_NULL_VIOLATION' },
    { pattern: /TYPE.*MISMATCH|DATA.*TYPE/i, code: 'TYPE_MISMATCH' },
    { pattern: /COLUMN.*MISMATCH|COLUMN.*COUNT/i, code: 'COLUMN_MISMATCH' },
    { pattern: /SCHEMA.*MISMATCH/i, code: 'SCHEMA_MISMATCH' },
    
    // Network/Connection errors
    { pattern: /NETWORK.*ERROR|CONNECTION.*ERROR/i, code: 'NETWORK_ERROR' },
    { pattern: /TIMEOUT|TIMED.*OUT/i, code: 'TIMEOUT' },
    { pattern: /CONNECTION.*REFUSED|FAILED.*TO.*CONNECT/i, code: 'CONNECTION_ERROR' },
    
    // Service errors
    { pattern: /SERVICE.*UNAVAILABLE|SERVER.*ERROR/i, code: 'SERVICE_UNAVAILABLE' },
    { pattern: /LLM.*SERVICE|AI.*SERVICE|RECOMMENDATION.*SERVICE/i, code: 'LLM_SERVICE_UNAVAILABLE' },
    
    // Transaction errors
    { pattern: /TRANSACTION.*FAILED|ROLLBACK|DEADLOCK/i, code: 'TRANSACTION_FAILED' },
    
    // Resource errors
    { pattern: /DISK.*FULL|OUT.*OF.*SPACE/i, code: 'DISK_FULL' },
    { pattern: /OUT.*OF.*MEMORY|MEMORY.*ERROR/i, code: 'OUT_OF_MEMORY' },
    
    // Validation errors
    { pattern: /VALIDATION.*ERROR|VALIDATION.*FAILED/i, code: 'VALIDATION_ERROR' }
  ];

  for (const { pattern, code } of patterns) {
    if (pattern.test(messageUpper)) {
      return code;
    }
  }

  return null;
}

/**
 * Classify error type based on various error indicators
 * @param {string} errorCode - Backend error code
 * @param {number} httpStatus - HTTP status code
 * @param {string} errorMessage - Error message
 * @param {Object} errorDetails - Error details
 * @returns {string} Classified error type
 */
function classifyErrorType(errorCode, httpStatus, errorMessage, _errorDetails) {
  // First try to map known backend error codes
  if (errorCode && BACKEND_ERROR_MAPPING[errorCode.toUpperCase()]) {
    return BACKEND_ERROR_MAPPING[errorCode.toUpperCase()];
  }

  // Classify by HTTP status code
  if (httpStatus) {
    switch (httpStatus) {
      case 401:
      case 403:
        return APPEND_ERROR_TYPES.PERMISSION_DENIED;
      case 404:
        return APPEND_ERROR_TYPES.TABLE_NOT_FOUND;
      case 408:
      case 504:
        return APPEND_ERROR_TYPES.TIMEOUT_ERROR;
      case 409:
        return APPEND_ERROR_TYPES.CONSTRAINT_VIOLATION;
      case 422:
        return APPEND_ERROR_TYPES.VALIDATION_ERROR;
      case 429:
        return APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE;
      case 500:
      case 502:
      case 503:
        return APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE;
      default:
        if (httpStatus >= 400 && httpStatus < 500) {
          return APPEND_ERROR_TYPES.VALIDATION_ERROR;
        } else if (httpStatus >= 500) {
          return APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE;
        }
    }
  }

  // Classify by error message content
  if (errorMessage) {
    const messageUpper = errorMessage.toUpperCase();
    
    if (messageUpper.includes('TABLE') && messageUpper.includes('NOT FOUND')) {
      return APPEND_ERROR_TYPES.TABLE_NOT_FOUND;
    }
    if (messageUpper.includes('PERMISSION') || messageUpper.includes('ACCESS')) {
      return APPEND_ERROR_TYPES.PERMISSION_DENIED;
    }
    if (messageUpper.includes('TIMEOUT') || messageUpper.includes('TIMED OUT')) {
      return APPEND_ERROR_TYPES.TIMEOUT_ERROR;
    }
    if (messageUpper.includes('NETWORK') || messageUpper.includes('CONNECTION')) {
      return APPEND_ERROR_TYPES.NETWORK_ERROR;
    }
    if (messageUpper.includes('LLM') || messageUpper.includes('AI SERVICE')) {
      return APPEND_ERROR_TYPES.LLM_SERVICE_DOWN;
    }
    if (messageUpper.includes('UNIQUE') || messageUpper.includes('DUPLICATE')) {
      return APPEND_ERROR_TYPES.DUPLICATE_KEY_ERROR;
    }
    if (messageUpper.includes('SCHEMA') || messageUpper.includes('COLUMN')) {
      return APPEND_ERROR_TYPES.SCHEMA_INCOMPATIBLE;
    }
  }

  // Default classification
  return APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE;
}

/**
 * Get recovery action handlers for an error
 * @param {Object} parsedError - Parsed error object
 * @param {Object} context - Operation context
 * @returns {Object} Recovery action handlers
 */
export function getErrorRecoveryActions(parsedError, context = {}) {
  const actions = {};
  
  for (const actionType of parsedError.suggestedActions) {
    const actionMetadata = RECOVERY_ACTION_METADATA[actionType];
    if (actionMetadata) {
      actions[actionType] = {
        ...actionMetadata,
        handler: createRecoveryActionHandler(actionType, parsedError, context)
      };
    }
  }
  
  return actions;
}

/**
 * Create recovery action handler function
 * @param {string} actionType - Type of recovery action
 * @param {Object} parsedError - Parsed error object
 * @param {Object} context - Operation context
 * @returns {Function} Recovery action handler
 */
function createRecoveryActionHandler(actionType, parsedError, context) {
  return async (additionalContext = {}) => {
    const combinedContext = { ...context, ...additionalContext };
    
    switch (actionType) {
      case RECOVERY_ACTIONS.RETRY: {
        return { action: 'retry', immediate: true, ...combinedContext };
      }
        
      case RECOVERY_ACTIONS.RETRY_WITH_BACKOFF: {
        const retryConfig = parsedError.retryConfig || RETRY_CONFIG[APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE];
        return { 
          action: 'retry', 
          immediate: false, 
          delay: retryConfig.baseDelayMs,
          ...combinedContext 
        };
      }
        
      case RECOVERY_ACTIONS.SELECT_DIFFERENT_TABLE:
        return { action: 'navigate', phase: 'file-selection', ...combinedContext };
        
      case RECOVERY_ACTIONS.CREATE_NEW_TABLE:
        return { 
          action: 'configure', 
          mode: 'create',
          clearTargetTable: true,
          ...combinedContext 
        };
        
      case RECOVERY_ACTIONS.USE_ADVANCED_MAPPING:
        return { action: 'navigate', phase: 'column-mapping', ...combinedContext };
        
      case RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING:
        return { action: 'navigate', phase: 'column-mapping', ...combinedContext };
        
      case RECOVERY_ACTIONS.SWITCH_TO_CREATE_MODE:
        return { 
          action: 'configure', 
          mode: 'create',
          operationMode: 'CREATE',
          ...combinedContext 
        };
        
      case RECOVERY_ACTIONS.CANCEL_OPERATION:
        return { action: 'cancel', ...combinedContext };
        
      case RECOVERY_ACTIONS.CONTACT_ADMIN:
        return { 
          action: 'external', 
          type: 'contact_admin',
          errorDetails: parsedError,
          ...combinedContext 
        };
        
      case RECOVERY_ACTIONS.REFRESH_CONNECTION:
        return { 
          action: 'refresh', 
          type: 'connection',
          clearCache: true,
          ...combinedContext 
        };
        
      default:
        return { action: 'unknown', actionType, ...combinedContext };
    }
  };
}

/**
 * Calculate retry delay with exponential backoff
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} retryConfig - Retry configuration
 * @returns {number} Delay in milliseconds
 */
export function calculateRetryDelay(attempt, retryConfig) {
  if (!retryConfig) {
    retryConfig = RETRY_CONFIG[APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE];
  }
  
  const delay = retryConfig.baseDelayMs * Math.pow(retryConfig.exponentialBase, attempt);
  return Math.min(delay, retryConfig.maxDelayMs);
}

/**
 * Check if an error is retryable
 * @param {Object} parsedError - Parsed error object
 * @param {number} currentAttempt - Current retry attempt (0-based)
 * @returns {boolean} Whether the error can be retried
 */
export function isErrorRetryable(parsedError, currentAttempt = 0) {
  if (!parsedError.retryable) {
    return false;
  }
  
  const retryConfig = parsedError.retryConfig;
  if (!retryConfig) {
    return false;
  }
  
  return currentAttempt < retryConfig.maxAttempts;
}

/**
 * Format error for display to users
 * @param {Object} parsedError - Parsed error object
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted error for display
 */
export function formatErrorForDisplay(parsedError, options = {}) {
  const {
    showTechnicalDetails = false,
    showRecoveryActions = true,
    includeTimestamp = true
  } = options;

  const formatted = {
    title: parsedError.title,
    message: parsedError.userMessage,
    severity: parsedError.severity,
    recoverable: parsedError.recoverable,
    retryable: parsedError.retryable
  };

  if (showRecoveryActions && parsedError.suggestedActions) {
    formatted.actions = parsedError.suggestedActions.map(actionType => {
      const metadata = RECOVERY_ACTION_METADATA[actionType];
      return {
        type: actionType,
        label: metadata?.label,
        description: metadata?.description,
        icon: metadata?.icon,
        primary: metadata?.primary
      };
    });
  }

  if (showTechnicalDetails) {
    formatted.technical = {
      code: parsedError.code,
      type: parsedError.type,
      httpStatus: parsedError.httpStatus,
      originalMessage: parsedError.message,
      details: parsedError.details
    };
  }

  if (includeTimestamp) {
    formatted.timestamp = parsedError.timestamp;
  }

  return formatted;
}

/**
 * Group similar errors for batch handling
 * @param {Array} errors - Array of parsed errors
 * @returns {Object} Grouped errors by type
 */
export function groupErrorsByType(errors) {
  const grouped = {};
  
  for (const error of errors) {
    const type = error.type;
    if (!grouped[type]) {
      grouped[type] = {
        type,
        count: 0,
        errors: [],
        severity: error.severity,
        mostCommonMessage: error.userMessage
      };
    }
    
    grouped[type].count++;
    grouped[type].errors.push(error);
    
    // Use the most severe error level
    if (error.severity === ERROR_SEVERITY.CRITICAL) {
      grouped[type].severity = ERROR_SEVERITY.CRITICAL;
    } else if (error.severity === ERROR_SEVERITY.HIGH && grouped[type].severity !== ERROR_SEVERITY.CRITICAL) {
      grouped[type].severity = ERROR_SEVERITY.HIGH;
    }
  }
  
  return grouped;
}

/**
 * Generate error report for debugging/logging
 * @param {Object} parsedError - Parsed error object
 * @param {Object} context - Additional context
 * @returns {Object} Detailed error report
 */
export function generateErrorReport(parsedError, context = {}) {
  return {
    errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: parsedError.timestamp,
    type: parsedError.type,
    severity: parsedError.severity,
    classification: {
      code: parsedError.code,
      httpStatus: parsedError.httpStatus,
      recoverable: parsedError.recoverable,
      retryable: parsedError.retryable
    },
    messages: {
      technical: parsedError.message,
      user: parsedError.userMessage,
      title: parsedError.title
    },
    context: {
      operation: context.operation || 'upload',
      phase: context.phase,
      file: context.fileName,
      targetTable: context.targetTable,
      mode: context.mode,
      ...context
    },
    details: parsedError.details,
    suggestedActions: parsedError.suggestedActions,
    retryConfig: parsedError.retryConfig,
    originalError: {
      message: parsedError.originalError?.message,
      stack: parsedError.originalError?.stack,
      name: parsedError.originalError?.name
    }
  };
}