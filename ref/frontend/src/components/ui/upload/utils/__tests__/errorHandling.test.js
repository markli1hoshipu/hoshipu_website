/**
 * Test suite for error handling functionality in upload system
 */

import { 
  parseAppendError, 
  getErrorRecoveryActions, 
  formatErrorForDisplay,
  isErrorRetryable,
  calculateRetryDelay
} from '../errorUtils';

import { 
  APPEND_ERROR_TYPES, 
  ERROR_MESSAGES, 
  RETRY_CONFIG,
  ERROR_SEVERITY 
} from '../errorConstants';

describe('Error Handling - parseAppendError', () => {
  test('should parse HTTP error response correctly', () => {
    const error = {
      response: {
        status: 404,
        statusText: 'Not Found',
        data: {
          error_code: 'TABLE_NOT_FOUND',
          message: 'The specified table does not exist'
        }
      }
    };

    const context = {
      operation: 'upload',
      fileName: 'test.csv',
      targetTable: 'missing_table'
    };

    const parsed = parseAppendError(error, context);

    expect(parsed.type).toBe(APPEND_ERROR_TYPES.TABLE_NOT_FOUND);
    expect(parsed.httpStatus).toBe(404);
    expect(parsed.severity).toBe(ERROR_SEVERITY.HIGH);
    expect(parsed.recoverable).toBe(true);
    expect(parsed.retryable).toBe(false);
    expect(parsed.title).toBe('Target Table Not Found');
  });

  test('should handle network errors', () => {
    const error = new Error('Network request failed');
    error.code = 'NETWORK_ERROR';

    const parsed = parseAppendError(error);

    expect(parsed.type).toBe(APPEND_ERROR_TYPES.NETWORK_ERROR);
    expect(parsed.retryable).toBe(true);
    expect(parsed.severity).toBe(ERROR_SEVERITY.MEDIUM);
  });

  test('should classify permission errors correctly', () => {
    const error = {
      response: {
        status: 403,
        data: {
          message: 'Access denied: insufficient privileges'
        }
      }
    };

    const parsed = parseAppendError(error);

    expect(parsed.type).toBe(APPEND_ERROR_TYPES.PERMISSION_DENIED);
    expect(parsed.severity).toBe(ERROR_SEVERITY.CRITICAL);
    expect(parsed.recoverable).toBe(false);
  });
});

describe('Error Handling - Recovery Actions', () => {
  test('should provide appropriate recovery actions for table not found error', () => {
    const parsedError = {
      type: APPEND_ERROR_TYPES.TABLE_NOT_FOUND,
      ...ERROR_MESSAGES[APPEND_ERROR_TYPES.TABLE_NOT_FOUND]
    };

    const actions = getErrorRecoveryActions(parsedError, {});

    expect(Object.keys(actions)).toContain('select_different_table');
    expect(Object.keys(actions)).toContain('create_new_table');
    expect(Object.keys(actions)).toContain('cancel_operation');
    
    // Check that handlers are functions
    expect(typeof actions.select_different_table.handler).toBe('function');
  });

  test('should handle recovery action execution', async () => {
    const parsedError = {
      type: APPEND_ERROR_TYPES.NETWORK_ERROR,
      retryConfig: RETRY_CONFIG[APPEND_ERROR_TYPES.NETWORK_ERROR],
      ...ERROR_MESSAGES[APPEND_ERROR_TYPES.NETWORK_ERROR]
    };

    const actions = getErrorRecoveryActions(parsedError, {});
    const retryAction = actions.retry;

    expect(retryAction).toBeDefined();
    
    const result = await retryAction.handler();
    expect(result.action).toBe('retry');
    expect(result.immediate).toBe(true);
  });
});

describe('Error Handling - Retry Logic', () => {
  test('should determine if error is retryable', () => {
    const retryableError = {
      retryable: true,
      retryConfig: RETRY_CONFIG[APPEND_ERROR_TYPES.NETWORK_ERROR]
    };

    const nonRetryableError = {
      retryable: false
    };

    expect(isErrorRetryable(retryableError, 0)).toBe(true);
    expect(isErrorRetryable(retryableError, 3)).toBe(false); // Exceeds max attempts
    expect(isErrorRetryable(nonRetryableError, 0)).toBe(false);
  });

  test('should calculate retry delay with exponential backoff', () => {
    const retryConfig = {
      baseDelayMs: 1000,
      exponentialBase: 2,
      maxDelayMs: 10000
    };

    expect(calculateRetryDelay(0, retryConfig)).toBe(1000);
    expect(calculateRetryDelay(1, retryConfig)).toBe(2000);
    expect(calculateRetryDelay(2, retryConfig)).toBe(4000);
    expect(calculateRetryDelay(10, retryConfig)).toBe(10000); // Capped at max
  });
});

describe('Error Handling - Display Formatting', () => {
  test('should format error for user display', () => {
    const parsedError = {
      type: APPEND_ERROR_TYPES.SCHEMA_INCOMPATIBLE,
      title: 'Schema Incompatibility',
      userMessage: 'Your CSV data has structural differences',
      severity: ERROR_SEVERITY.HIGH,
      recoverable: true,
      retryable: false,
      suggestedActions: ['use_advanced_mapping', 'review_column_mapping'],
      code: 'SCHEMA_MISMATCH',
      httpStatus: 422
    };

    const formatted = formatErrorForDisplay(parsedError, {
      showRecoveryActions: true,
      showTechnicalDetails: true
    });

    expect(formatted.title).toBe('Schema Incompatibility');
    expect(formatted.severity).toBe(ERROR_SEVERITY.HIGH);
    expect(formatted.actions).toHaveLength(2);
    expect(formatted.technical.code).toBe('SCHEMA_MISMATCH');
    expect(formatted.technical.httpStatus).toBe(422);
  });
});

describe('Error Handling - Error Classification', () => {
  test('should classify errors from error messages', () => {
    const duplicateKeyError = new Error('Duplicate key violates unique constraint');
    const parsedDuplicate = parseAppendError(duplicateKeyError);
    expect(parsedDuplicate.type).toBe(APPEND_ERROR_TYPES.DUPLICATE_KEY_ERROR);

    const timeoutError = new Error('Request timed out after 30 seconds');
    const parsedTimeout = parseAppendError(timeoutError);
    expect(parsedTimeout.type).toBe(APPEND_ERROR_TYPES.TIMEOUT_ERROR);

    const llmError = new Error('LLM service unavailable');
    const parsedLlm = parseAppendError(llmError);
    expect(parsedLlm.type).toBe(APPEND_ERROR_TYPES.LLM_SERVICE_DOWN);
  });

  test('should handle unknown errors gracefully', () => {
    const unknownError = new Error('Something unexpected happened');
    const parsed = parseAppendError(unknownError);

    expect(parsed.type).toBe(APPEND_ERROR_TYPES.SERVICE_UNAVAILABLE);
    expect(parsed.title).toBeDefined();
    expect(parsed.userMessage).toBeDefined();
    expect(parsed.severity).toBeDefined();
  });
});

describe('Error Handling - Context Preservation', () => {
  test('should preserve operation context in parsed error', () => {
    const error = new Error('Upload failed');
    const context = {
      operation: 'upload',
      fileName: 'sales_data.csv',
      targetTable: 'sales',
      mode: 'append',
      phase: 'processing'
    };

    const parsed = parseAppendError(error, context);

    expect(parsed.context).toEqual(context);
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.originalError).toBe(error);
  });
});

// Integration test for full error handling flow
describe('Error Handling - Integration', () => {
  test('should handle complete error recovery flow', async () => {
    // Simulate a table not found error during append operation
    const simulatedError = {
      response: {
        status: 404,
        data: {
          error_code: 'TABLE_NOT_FOUND',
          message: 'Table "sales_data" does not exist',
          details: {
            database: 'analytics',
            schema: 'public'
          }
        }
      }
    };

    const context = {
      operation: 'upload',
      fileName: 'sales_report.csv',
      targetTable: 'sales_data',
      mode: 'append'
    };

    // Parse the error
    const parsed = parseAppendError(simulatedError, context);

    // Verify error classification
    expect(parsed.type).toBe(APPEND_ERROR_TYPES.TABLE_NOT_FOUND);
    expect(parsed.recoverable).toBe(true);

    // Get recovery actions
    const actions = getErrorRecoveryActions(parsed, context);
    expect(actions).toHaveProperty('select_different_table');
    expect(actions).toHaveProperty('create_new_table');

    // Test recovery action execution
    const selectDifferentTableAction = actions.select_different_table;
    const result = await selectDifferentTableAction.handler();
    
    expect(result.action).toBe('navigate');
    expect(result.phase).toBe('file-selection');

    // Format for display
    const formatted = formatErrorForDisplay(parsed, {
      showRecoveryActions: true
    });

    expect(formatted.title).toBe('Target Table Not Found');
    expect(formatted.actions.length).toBeGreaterThan(0);
  });
});