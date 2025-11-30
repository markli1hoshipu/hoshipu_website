/**
 * Upload Service - Abstraction layer for different backend services
 * Supports nl2sql, crm, and lead-gen services
 * Includes comprehensive error handling for append operations
 */

import { parseAppendError, isErrorRetryable, calculateRetryDelay } from '../utils/errorUtils';
import { APPEND_ERROR_TYPES, RETRY_CONFIG } from '../utils/errorConstants';

class UploadService {
  constructor(config) {
    this.config = {
      targetService: 'nl2sql',
      targetDatabase: 'sales',
      expectedColumns: [],
      allowedFileTypes: ['.csv', '.xlsx'],
      maxFileSize: '50MB',
      quickUploadThreshold: 90,  // HIGH confidence threshold for quick upload (0-100 scale)
      // Enhanced configuration
      databaseConfig: {
        schema_name: 'sales',
        service_type: 'nl2sql',
        timeout_seconds: 30
      },
      previewConfig: {
        sample_size: 25,
        include_nulls: true,
        max_unique_values: 50,
        show_data_types: true,
        analyze_patterns: true
      },
      mappingConfig: {
        service_context: 'generic',
        confidence_threshold: 70,  // MEDIUM confidence threshold (0-100 scale, not 0-1)
        use_ai_fallback: true,
        enable_semantic_matching: true
      },
      ...config
    };

    // Service endpoint mapping with environment variable support
    this.serviceEndpoints = {
      'nl2sql': {
        baseUrl: import.meta.env.VITE_SALESCENTER_API_URL || 'http://localhost:8002',
        uploadEndpoint: '/api/data/upload',
        analyzeEndpoint: '/api/data/analyze'
      },
      'crm': {
        baseUrl: import.meta.env.VITE_CRM_URL || 'http://localhost:8003',
        uploadEndpoint: '/customers/upload',
        analyzeEndpoint: '/customers/analyze'
      },
      'lead-gen': {
        baseUrl: import.meta.env.VITE_LEAD_GEN_URL || 'http://localhost:9000',
        uploadEndpoint: '/leads/upload',
        analyzeEndpoint: '/leads/analyze'
      }
    };

    // CSV mapping integrated into NL2SQL service
    this.csvMappingServiceUrl = this.serviceEndpoints['nl2sql'].baseUrl;
  }

  /**
   * Analyze uploaded file using integrated CSV mapping library
   * Enhanced with comprehensive error handling
   */
  async analyzeUpload(file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Extract configuration parameters for query string
      const mappingConfig = { ...this.config.mappingConfig, ...options.mapping_config };
      const targetTable = options.target_table || null;
      const useAiFallback = mappingConfig.use_ai_fallback !== false;
      const confidenceThreshold = mappingConfig.confidence_threshold || 70;

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (targetTable) queryParams.append('target_table', targetTable);
      queryParams.append('use_ai_fallback', useAiFallback.toString());
      // Convert from 0-100 scale (frontend) to 0-1 scale (backend)
      queryParams.append('confidence_threshold', (confidenceThreshold / 100).toString());

      const idToken = localStorage.getItem('id_token');
      const response = await fetch(`${this.csvMappingServiceUrl}/api/data/analyze-upload-advanced?${queryParams}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        await this._handleApiError(response, {
          operation: 'analyze',
          fileName: file.name,
          targetTable: targetTable,
          phase: 'analysis'
        });
      }

      const response_data = await response.json();
      
      // Extract analysis result from nested structure
      const result = response_data?.analysis || response_data || {};
      
      // Enhanced analysis result processing
      // Convert backend confidence values from 0-1 scale to 0-100 scale for frontend compatibility
      const overall_confidence = (result.overall_confidence || 0) * 100;
      const mapping_suggestions = (result.mapping_suggestions || []).map(suggestion => ({
        ...suggestion,
        confidence: (suggestion.confidence || 0) * 100
      }));

      return {
        upload_mode: overall_confidence >= this.config.quickUploadThreshold ? 'quick' : 'advanced',
        source_columns: result.source_columns || [],
        existing_table_info: result.existing_table_info,
        mapping_suggestions,
        missing_columns: result.missing_columns || [],
        new_columns: result.new_columns || [],
        overall_confidence,
        recommended_flow: this._determineRecommendedFlow({ 
          ...result, 
          overall_confidence 
        }),
        data_issues: result.data_issues || [],
        preview_stats: result.preview_stats,
        data_quality_score: (result.data_quality_score || 0) * 100
      };

    } catch (error) {
      const parsedError = parseAppendError(error, {
        operation: 'analyze',
        fileName: file.name,
        targetTable: options.target_table,
        phase: 'analysis'
      });
      
      console.error('File analysis failed:', parsedError);
      
      // Re-throw with enhanced error information
      const enhancedError = new Error(parsedError.userMessage);
      enhancedError.parsedError = parsedError;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Preview column mapping with sample data
   * Enhanced with error handling and retry logic
   */
  async previewMapping(file, userMappings) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('user_mappings', JSON.stringify(userMappings));
      queryParams.append('sample_size', this.config.previewConfig.sample_size || 10);

      const idToken = localStorage.getItem('id_token');
      const response = await fetch(`${this.csvMappingServiceUrl}/api/data/preview-mapping?${queryParams}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        await this._handleApiError(response, {
          operation: 'preview',
          fileName: file.name,
          phase: 'mapping_preview',
          mappingCount: Object.keys(userMappings).length
        });
      }

      const response_data = await response.json();
      
      // Extract preview result from nested structure
      return response_data.preview || response_data;

    } catch (error) {
      const parsedError = parseAppendError(error, {
        operation: 'preview',
        fileName: file.name,
        phase: 'mapping_preview',
        mappingCount: Object.keys(userMappings).length
      });
      
      console.error('Mapping preview failed:', parsedError);
      
      const enhancedError = new Error(parsedError.userMessage);
      enhancedError.parsedError = parsedError;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Upload file with mappings to target service
   * Enhanced with comprehensive error handling and retry logic
   */
  async uploadFile(file, mappings, mode = 'quick', options = {}) {
    const serviceConfig = this.serviceEndpoints[this.config.targetService];
    
    if (!serviceConfig) {
      throw new Error(`Unsupported service: ${this.config.targetService}`);
    }

    const context = {
      operation: 'upload',
      fileName: file.name,
      targetTable: options.target_table,
      mode,
      phase: 'upload',
      service: this.config.targetService
    };

    return await this._executeWithRetry(async () => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping_mode', mode);
      formData.append('target_database', this.config.targetDatabase);
      
      if (mappings && Object.keys(mappings).length > 0) {
        // Send ALL mappings to backend - backend will handle special values like "import_as_new" and "ignore_column"
        formData.append('user_mappings', JSON.stringify(mappings));
      }

      // Add service-specific parameters
      if (this.config.targetService === 'nl2sql') {
        const targetTable = options.target_table;
        
        if (targetTable) {
          // User selected existing table - append mode
          formData.append('target_table', targetTable);
          formData.append('operation_mode', 'APPEND');
        } else {
          // Create new table mode
          formData.append('table_name', this.config.tableName || file.name.replace(/\.(csv|xlsx)$/i, ''));
          formData.append('operation_mode', 'CREATE');
        }
        
        formData.append('auto_adapt', 'true');
      }

      const idToken = localStorage.getItem('id_token');
      const response = await fetch(`${serviceConfig.baseUrl}${serviceConfig.uploadEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData,
        // Add timeout for upload operations
        signal: AbortSignal.timeout(options.timeout || 300000) // 5 minute default timeout
      });

      if (!response.ok) {
        await this._handleApiError(response, context);
      }

      const result = await response.json();
      
      // Validate the response has expected structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      return result;
    }, context);
  }

  /**
   * Get target schema for specific service
   * Enhanced with error handling
   */

  /**
   * Validate file before upload
   */
  validateFile(file) {
    const errors = [];

    // Check file type
    const fileName = file.name.toLowerCase();
    const isValidType = this.config.allowedFileTypes.some(type => 
      fileName.endsWith(type.toLowerCase())
    );
    
    if (!isValidType) {
      errors.push(`File type not supported. Allowed types: ${this.config.allowedFileTypes.join(', ')}`);
    }

    // Check file size
    const maxSizeBytes = this._parseFileSize(this.config.maxFileSize);
    if (file.size > maxSizeBytes) {
      errors.push(`File size exceeds limit of ${this.config.maxFileSize}`);
    }

    // Check file name
    if (!/^[a-zA-Z0-9_\-\s.]+$/.test(file.name)) {
      errors.push('File name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get service-specific configuration
   */
  getServiceConfig() {
    const serviceConfigs = {
      'nl2sql': {
        displayName: 'Sales Analytics',
        description: 'Upload sales data for analytics and insights',
        expectedColumns: ['employee_name', 'sales_amount', 'location', 'customer_name'],
        icon: 'BarChart3'
      },
      'crm': {
        displayName: 'Customer Management',
        description: 'Upload customer data and interactions',
        expectedColumns: ['customer_name', 'email', 'phone', 'company'],
        icon: 'UserCircle'
      },
      'lead-gen': {
        displayName: 'Lead Generation',
        description: 'Upload lead data for processing',
        expectedColumns: ['company_name', 'contact_name', 'email', 'industry'],
        icon: 'Target'
      }
    };

    return serviceConfigs[this.config.targetService] || serviceConfigs['nl2sql'];
  }

  // Private helper methods
  _determineRecommendedFlow(analysisResult) {
    const { 
      overall_confidence = 0, 
      missing_columns = [], 
      data_issues = [] 
    } = analysisResult || {};
    
    // High confidence and no issues - recommend quick upload
    if (overall_confidence >= 90 && missing_columns.length === 0 && data_issues.length === 0) {
      return 'quick_upload';
    }
    
    // Low confidence or significant issues - require review  
    if (overall_confidence < 50 || data_issues.filter(issue => issue.severity === 'high').length > 0) {
      return 'require_review';
    }
    
    // Medium confidence - show mapping UI
    return 'show_mapping_ui';
  }

  _parseFileSize(sizeString) {
    const units = {
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);
    if (!match) return 50 * 1024 * 1024; // Default 50MB

    const [, size, unit] = match;
    return parseFloat(size) * units[unit.toUpperCase()];
  }

  /**
   * Health check for LLM advisory services
   * Enhanced with proper timeout handling
   */
  async checkLLMServiceHealth() {
    try {
      const response = await fetch(`${this.csvMappingServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('LLM service health check timed out');
      } else {
        console.warn('LLM service health check failed:', error);
      }
      return false;
    }
  }

  /**
   * Execute operation with retry logic for transient errors
   * @private
   */
  async _executeWithRetry(operation, context = {}, attempt = 0) {
    try {
      return await operation();
    } catch (error) {
      const parsedError = parseAppendError(error, context);
      
      // Check if error is retryable and we haven't exceeded max attempts
      if (isErrorRetryable(parsedError, attempt)) {
        const delay = calculateRetryDelay(attempt, parsedError.retryConfig);
        
        console.warn(`Operation failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, parsedError);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Recursive retry
        return this._executeWithRetry(operation, context, attempt + 1);
      }
      
      // Not retryable or max attempts exceeded, re-throw enhanced error
      const enhancedError = new Error(parsedError.userMessage);
      enhancedError.parsedError = parsedError;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Handle API error responses consistently
   * @private
   */
  async _handleApiError(response, context = {}) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorData = {};
    
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
      } else {
        const errorText = await response.text();
        errorMessage = errorText || response.statusText || errorMessage;
      }
    } catch (parseError) {
      console.warn('Failed to parse error response:', parseError);
      errorMessage = `${errorMessage}: ${response.statusText}`;
    }
    
    // Create error object with response information
    const error = new Error(errorMessage);
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: errorData
    };
    
    throw error;
  }

  /**
   * Validate operation context and provide helpful error messages
   * @private
   */
  _validateOperationContext(operation, context = {}) {
    const validationErrors = [];
    
    switch (operation) {
      case 'upload':
        if (!context.fileName) {
          validationErrors.push('File name is required for upload operations');
        }
        if (context.mode === 'append' && !context.targetTable) {
          validationErrors.push('Target table is required for append operations');
        }
        break;
        
      case 'analyze':
        if (!context.fileName) {
          validationErrors.push('File name is required for analysis operations');
        }
        break;
    }
    
    if (validationErrors.length > 0) {
      throw new Error(`Operation validation failed: ${validationErrors.join(', ')}`);
    }
  }

  /**
   * Get enhanced error context for better debugging
   * @private
   */
  _getErrorContext(baseContext = {}) {
    return {
      ...baseContext,
      service: this.config.targetService,
      database: this.config.targetDatabase,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      serviceConfig: {
        baseUrl: this.serviceEndpoints[this.config.targetService]?.baseUrl,
        timeout: this.config.timeout
      }
    };
  }
  /**
   * Check if a specific error type indicates a critical failure
   * that should stop all retry attempts
   */
  isCriticalError(error) {
    if (!error.parsedError) {
      return false;
    }
    
    const criticalTypes = [
      APPEND_ERROR_TYPES.PERMISSION_DENIED,
      APPEND_ERROR_TYPES.INSUFFICIENT_PRIVILEGES,
      APPEND_ERROR_TYPES.TABLE_NOT_FOUND,
      APPEND_ERROR_TYPES.SCHEMA_INCOMPATIBLE
    ];
    
    return criticalTypes.includes(error.parsedError.type);
  }

  /**
   * Get user-friendly error message for display
   */
  getDisplayError(error) {
    if (error.parsedError) {
      return {
        title: error.parsedError.title,
        message: error.parsedError.userMessage,
        severity: error.parsedError.severity,
        recoverable: error.parsedError.recoverable,
        actions: error.parsedError.suggestedActions
      };
    }
    
    // Fallback for non-parsed errors
    return {
      title: 'Upload Error',
      message: error.message || 'An unexpected error occurred',
      severity: 'high',
      recoverable: false,
      actions: ['cancel_operation']
    };
  }
}

export default UploadService;