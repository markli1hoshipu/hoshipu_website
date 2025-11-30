/**
 * Error constants and classification system for append-specific operations
 */

// Append-specific error types with detailed classification
export const APPEND_ERROR_TYPES = {
  TABLE_NOT_FOUND: 'table_not_found',
  SCHEMA_INCOMPATIBLE: 'schema_incompatible', 
  PERMISSION_DENIED: 'permission_denied',
  CONSTRAINT_VIOLATION: 'constraint_violation',
  TRANSACTION_FAILED: 'transaction_failed',
  LLM_SERVICE_DOWN: 'llm_service_down',
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  VALIDATION_ERROR: 'validation_error',
  DATA_TYPE_MISMATCH: 'data_type_mismatch',
  COLUMN_COUNT_MISMATCH: 'column_count_mismatch',
  DUPLICATE_KEY_ERROR: 'duplicate_key_error',
  FOREIGN_KEY_ERROR: 'foreign_key_error',
  CHECK_CONSTRAINT_ERROR: 'check_constraint_error',
  NOT_NULL_VIOLATION: 'not_null_violation',
  INSUFFICIENT_PRIVILEGES: 'insufficient_privileges',
  DISK_SPACE_ERROR: 'disk_space_error',
  MEMORY_ERROR: 'memory_error',
  CONNECTION_ERROR: 'connection_error',
  SERVICE_UNAVAILABLE: 'service_unavailable'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Recovery action types
export const RECOVERY_ACTIONS = {
  RETRY: 'retry',
  RETRY_WITH_BACKOFF: 'retry_with_backoff',
  SELECT_DIFFERENT_TABLE: 'select_different_table',
  CREATE_NEW_TABLE: 'create_new_table',
  USE_ADVANCED_MAPPING: 'use_advanced_mapping',
  REVIEW_COLUMN_MAPPING: 'review_column_mapping',
  MODIFY_DATA: 'modify_data',
  CONTACT_ADMIN: 'contact_admin',
  CANCEL_OPERATION: 'cancel_operation',
  SWITCH_TO_CREATE_MODE: 'switch_to_create_mode',
  REDUCE_FILE_SIZE: 'reduce_file_size',
  TRY_DIFFERENT_SERVICE: 'try_different_service',
  REFRESH_CONNECTION: 'refresh_connection',
  CLEAR_CACHE: 'clear_cache'
};

// User-friendly error messages with recovery guidance
export const ERROR_MESSAGES = {
  [APPEND_ERROR_TYPES.TABLE_NOT_FOUND]: {
    title: "Target Table Not Found",
    message: "The table you selected for append no longer exists. It may have been deleted or renamed by another user.",
    severity: ERROR_SEVERITY.HIGH,
    actions: [
      RECOVERY_ACTIONS.SELECT_DIFFERENT_TABLE, 
      RECOVERY_ACTIONS.CREATE_NEW_TABLE, 
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: false
  },
  [APPEND_ERROR_TYPES.SCHEMA_INCOMPATIBLE]: {
    title: "Schema Incompatibility", 
    message: "Your CSV data has structural differences that cannot be automatically resolved with the target table.",
    severity: ERROR_SEVERITY.HIGH,
    actions: [
      RECOVERY_ACTIONS.USE_ADVANCED_MAPPING, 
      RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING,
      RECOVERY_ACTIONS.SWITCH_TO_CREATE_MODE,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: false
  },
  [APPEND_ERROR_TYPES.PERMISSION_DENIED]: {
    title: "Permission Denied",
    message: "You don't have sufficient permissions to modify this table. Contact your administrator for access.",
    severity: ERROR_SEVERITY.CRITICAL,
    actions: [
      RECOVERY_ACTIONS.CONTACT_ADMIN,
      RECOVERY_ACTIONS.SELECT_DIFFERENT_TABLE,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: false,
    retryable: false
  },
  [APPEND_ERROR_TYPES.CONSTRAINT_VIOLATION]: {
    title: "Data Constraint Violation",
    message: "Some data in your file violates table constraints (unique keys, foreign keys, or check constraints).",
    severity: ERROR_SEVERITY.HIGH,
    actions: [
      RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING,
      RECOVERY_ACTIONS.MODIFY_DATA,
      RECOVERY_ACTIONS.SWITCH_TO_CREATE_MODE,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: false
  },
  [APPEND_ERROR_TYPES.TRANSACTION_FAILED]: {
    title: "Transaction Failed",
    message: "The database transaction failed during data insertion. Your table was not modified.",
    severity: ERROR_SEVERITY.HIGH,
    actions: [
      RECOVERY_ACTIONS.RETRY,
      RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: true
  },
  [APPEND_ERROR_TYPES.LLM_SERVICE_DOWN]: {
    title: "AI Service Unavailable",
    message: "The AI recommendation service is temporarily unavailable. You can still proceed with manual mapping.",
    severity: ERROR_SEVERITY.MEDIUM,
    actions: [
      RECOVERY_ACTIONS.USE_ADVANCED_MAPPING,
      RECOVERY_ACTIONS.RETRY_WITH_BACKOFF,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: true
  },
  [APPEND_ERROR_TYPES.NETWORK_ERROR]: {
    title: "Network Connection Error",
    message: "Unable to connect to the server. Please check your internet connection and try again.",
    severity: ERROR_SEVERITY.MEDIUM,
    actions: [
      RECOVERY_ACTIONS.RETRY,
      RECOVERY_ACTIONS.REFRESH_CONNECTION,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: true
  },
  [APPEND_ERROR_TYPES.TIMEOUT_ERROR]: {
    title: "Upload Timeout",
    message: "The upload took too long to complete. This often happens with large files or slow connections.",
    severity: ERROR_SEVERITY.MEDIUM,
    actions: [
      RECOVERY_ACTIONS.RETRY,
      RECOVERY_ACTIONS.REDUCE_FILE_SIZE,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: true
  },
  [APPEND_ERROR_TYPES.VALIDATION_ERROR]: {
    title: "Data Validation Error",
    message: "Some data in your file doesn't meet the validation requirements for the target table.",
    severity: ERROR_SEVERITY.MEDIUM,
    actions: [
      RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING,
      RECOVERY_ACTIONS.MODIFY_DATA,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: false
  },
  [APPEND_ERROR_TYPES.DATA_TYPE_MISMATCH]: {
    title: "Data Type Mismatch",
    message: "Column data types in your file don't match the target table schema.",
    severity: ERROR_SEVERITY.HIGH,
    actions: [
      RECOVERY_ACTIONS.USE_ADVANCED_MAPPING,
      RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING,
      RECOVERY_ACTIONS.SWITCH_TO_CREATE_MODE
    ],
    recoverable: true,
    retryable: false
  },
  [APPEND_ERROR_TYPES.DUPLICATE_KEY_ERROR]: {
    title: "Duplicate Key Error",
    message: "Your data contains duplicate values for columns with unique constraints.",
    severity: ERROR_SEVERITY.HIGH,
    actions: [
      RECOVERY_ACTIONS.MODIFY_DATA,
      RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: false
  },
  [APPEND_ERROR_TYPES.INSUFFICIENT_PRIVILEGES]: {
    title: "Insufficient Database Privileges",
    message: "Your database user doesn't have the required privileges to perform this operation.",
    severity: ERROR_SEVERITY.CRITICAL,
    actions: [
      RECOVERY_ACTIONS.CONTACT_ADMIN,
      RECOVERY_ACTIONS.TRY_DIFFERENT_SERVICE,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: false,
    retryable: false
  },
  [APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE]: {
    title: "Service Temporarily Unavailable",
    message: "The upload service is temporarily unavailable. Please try again in a few moments.",
    severity: ERROR_SEVERITY.HIGH,
    actions: [
      RECOVERY_ACTIONS.RETRY_WITH_BACKOFF,
      RECOVERY_ACTIONS.TRY_DIFFERENT_SERVICE,
      RECOVERY_ACTIONS.CANCEL_OPERATION
    ],
    recoverable: true,
    retryable: true
  }
};

// Recovery action metadata with user-friendly labels and descriptions
export const RECOVERY_ACTION_METADATA = {
  [RECOVERY_ACTIONS.RETRY]: {
    label: "Try Again",
    description: "Retry the operation immediately",
    icon: "RefreshCw",
    primary: true
  },
  [RECOVERY_ACTIONS.RETRY_WITH_BACKOFF]: {
    label: "Retry in a Moment",
    description: "Wait and retry automatically",
    icon: "Clock",
    primary: true
  },
  [RECOVERY_ACTIONS.SELECT_DIFFERENT_TABLE]: {
    label: "Select Different Table",
    description: "Choose a different table to append to",
    icon: "Table",
    primary: false
  },
  [RECOVERY_ACTIONS.CREATE_NEW_TABLE]: {
    label: "Create New Table",
    description: "Create a new table instead of appending",
    icon: "Plus",
    primary: false
  },
  [RECOVERY_ACTIONS.USE_ADVANCED_MAPPING]: {
    label: "Advanced Mapping",
    description: "Use manual column mapping options",
    icon: "Settings",
    primary: true
  },
  [RECOVERY_ACTIONS.REVIEW_COLUMN_MAPPING]: {
    label: "Review Column Mapping",
    description: "Check and modify column mappings",
    icon: "MapPin",
    primary: true
  },
  [RECOVERY_ACTIONS.MODIFY_DATA]: {
    label: "Modify Data",
    description: "Fix data issues in your file first",
    icon: "Edit",
    primary: false
  },
  [RECOVERY_ACTIONS.CONTACT_ADMIN]: {
    label: "Contact Administrator",
    description: "Get help from system administrator",
    icon: "HelpCircle",
    primary: false
  },
  [RECOVERY_ACTIONS.CANCEL_OPERATION]: {
    label: "Cancel",
    description: "Cancel the upload operation",
    icon: "X",
    primary: false
  },
  [RECOVERY_ACTIONS.SWITCH_TO_CREATE_MODE]: {
    label: "Create New Table Instead",
    description: "Create a new table with your data",
    icon: "Plus",
    primary: false
  },
  [RECOVERY_ACTIONS.REDUCE_FILE_SIZE]: {
    label: "Reduce File Size",
    description: "Try with a smaller file or fewer rows",
    icon: "Minimize2",
    primary: false
  },
  [RECOVERY_ACTIONS.TRY_DIFFERENT_SERVICE]: {
    label: "Try Different Service",
    description: "Switch to a different backend service",
    icon: "Shuffle",
    primary: false
  },
  [RECOVERY_ACTIONS.REFRESH_CONNECTION]: {
    label: "Refresh Connection",
    description: "Reset your connection and try again",
    icon: "Wifi",
    primary: false
  }
};

// Backend error code mapping to frontend error types
export const BACKEND_ERROR_MAPPING = {
  // Table/Schema errors
  'TABLE_NOT_FOUND': APPEND_ERROR_TYPES.TABLE_NOT_FOUND,
  'RELATION_DOES_NOT_EXIST': APPEND_ERROR_TYPES.TABLE_NOT_FOUND,
  'NO_SUCH_TABLE': APPEND_ERROR_TYPES.TABLE_NOT_FOUND,
  
  // Schema compatibility
  'SCHEMA_MISMATCH': APPEND_ERROR_TYPES.SCHEMA_INCOMPATIBLE,
  'COLUMN_MISMATCH': APPEND_ERROR_TYPES.SCHEMA_INCOMPATIBLE,
  'TYPE_MISMATCH': APPEND_ERROR_TYPES.DATA_TYPE_MISMATCH,
  'COLUMN_COUNT_MISMATCH': APPEND_ERROR_TYPES.COLUMN_COUNT_MISMATCH,
  
  // Permission errors
  'PERMISSION_DENIED': APPEND_ERROR_TYPES.PERMISSION_DENIED,
  'ACCESS_DENIED': APPEND_ERROR_TYPES.PERMISSION_DENIED,
  'INSUFFICIENT_PRIVILEGES': APPEND_ERROR_TYPES.INSUFFICIENT_PRIVILEGES,
  'UNAUTHORIZED': APPEND_ERROR_TYPES.PERMISSION_DENIED,
  
  // Constraint violations
  'UNIQUE_VIOLATION': APPEND_ERROR_TYPES.DUPLICATE_KEY_ERROR,
  'FOREIGN_KEY_VIOLATION': APPEND_ERROR_TYPES.FOREIGN_KEY_ERROR,
  'CHECK_VIOLATION': APPEND_ERROR_TYPES.CHECK_CONSTRAINT_ERROR,
  'NOT_NULL_VIOLATION': APPEND_ERROR_TYPES.NOT_NULL_VIOLATION,
  'CONSTRAINT_VIOLATION': APPEND_ERROR_TYPES.CONSTRAINT_VIOLATION,
  
  // Transaction errors
  'TRANSACTION_FAILED': APPEND_ERROR_TYPES.TRANSACTION_FAILED,
  'ROLLBACK': APPEND_ERROR_TYPES.TRANSACTION_FAILED,
  'DEADLOCK': APPEND_ERROR_TYPES.TRANSACTION_FAILED,
  
  // Service errors
  'LLM_SERVICE_UNAVAILABLE': APPEND_ERROR_TYPES.LLM_SERVICE_DOWN,
  'AI_SERVICE_DOWN': APPEND_ERROR_TYPES.LLM_SERVICE_DOWN,
  'RECOMMENDATION_SERVICE_ERROR': APPEND_ERROR_TYPES.LLM_SERVICE_DOWN,
  
  // Network/Connection errors
  'CONNECTION_ERROR': APPEND_ERROR_TYPES.CONNECTION_ERROR,
  'NETWORK_ERROR': APPEND_ERROR_TYPES.NETWORK_ERROR,
  'TIMEOUT': APPEND_ERROR_TYPES.TIMEOUT_ERROR,
  'REQUEST_TIMEOUT': APPEND_ERROR_TYPES.TIMEOUT_ERROR,
  
  // Validation errors
  'VALIDATION_ERROR': APPEND_ERROR_TYPES.VALIDATION_ERROR,
  'DATA_VALIDATION_FAILED': APPEND_ERROR_TYPES.VALIDATION_ERROR,
  
  // Resource errors
  'DISK_FULL': APPEND_ERROR_TYPES.DISK_SPACE_ERROR,
  'OUT_OF_MEMORY': APPEND_ERROR_TYPES.MEMORY_ERROR,
  'RESOURCE_EXHAUSTED': APPEND_ERROR_TYPES.MEMORY_ERROR,
  
  // Service availability
  'SERVICE_UNAVAILABLE': APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE,
  'SERVER_ERROR': APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE,
  'INTERNAL_SERVER_ERROR': APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE
};

// Default retry configuration for different error types
export const RETRY_CONFIG = {
  [APPEND_ERROR_TYPES.NETWORK_ERROR]: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBase: 2
  },
  [APPEND_ERROR_TYPES.TIMEOUT_ERROR]: {
    maxAttempts: 2,
    baseDelayMs: 2000,
    maxDelayMs: 15000,
    exponentialBase: 2
  },
  [APPEND_ERROR_TYPES.LLM_SERVICE_DOWN]: {
    maxAttempts: 2,
    baseDelayMs: 5000,
    maxDelayMs: 20000,
    exponentialBase: 1.5
  },
  [APPEND_ERROR_TYPES.TRANSACTION_FAILED]: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    exponentialBase: 1.5
  },
  [APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE]: {
    maxAttempts: 3,
    baseDelayMs: 3000,
    maxDelayMs: 30000,
    exponentialBase: 2
  }
};