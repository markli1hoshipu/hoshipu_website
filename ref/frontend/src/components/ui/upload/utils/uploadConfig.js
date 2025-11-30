/**
 * Upload configuration utilities and presets for different services
 * 
 * CONFIDENCE SCALE DOCUMENTATION:
 * All confidence values throughout the system use a 0-100 scale:
 * - 90+ (HIGH): Auto-mapping, quick upload trigger
 * - 70+ (MEDIUM): Review needed threshold
 * - 50+ (LOW): Minimum apply threshold
 * - <50: Requires manual intervention
 */

/**
 * Default configuration for progressive upload system
 */
export const DEFAULT_CONFIG = {
  targetService: 'nl2sql',
  targetDatabase: 'sales',
  expectedColumns: [],
  allowedFileTypes: ['.csv', '.xlsx'],
  maxFileSize: '100MB',
  quickUploadThreshold: 90,  // HIGH confidence threshold for quick upload (0-100 scale)
  databaseConfig: {
    schema_name: 'sales',
    service_type: 'nl2sql',
    timeout_seconds: 30,
    database_type: 'postgresql'
  },
  previewConfig: {
    sample_size: 25,
    include_nulls: true,
    max_unique_values: 50,
    show_data_types: true,
    analyze_patterns: true,
    max_string_preview: 100
  },
  mappingConfig: {
    service_context: 'generic',
    confidence_threshold: 70,  // MEDIUM confidence threshold (0-100 scale, not 0-1)
    use_ai_fallback: true,
    enable_semantic_matching: true,
    max_ai_retries: 2,
    ai_model: 'gpt-4o-mini'
  }
};

/**
 * Service-specific configuration presets
 */
export const SERVICE_CONFIGS = {
  'nl2sql': {
    displayName: 'Sales Analytics',
    description: 'Upload sales data for analytics and insights',
    icon: 'BarChart3',
    targetService: 'nl2sql',
    targetDatabase: 'sales',
    expectedColumns: [
      'employee_name', 'sales_amount', 'location', 'customer_name',
      'profit', 'product_name', 'client_name', 'quotations_sent',
      'emails_sent', 'calls_made', 'sale_date'
    ],
    allowedFileTypes: ['.csv', '.xlsx'],
    maxFileSize: '100MB',
    quickUploadThreshold: 90,  // HIGH confidence threshold for quick upload (0-100 scale)
    databaseConfig: {
      schema_name: 'sales',
      service_type: 'nl2sql',
      database_type: 'postgresql'
    },
    mappingConfig: {
      service_context: 'sales',
      confidence_threshold: 70,  // MEDIUM confidence threshold (0-100 scale)
      enable_semantic_matching: true
    },
    previewConfig: {
      sample_size: 30,
      analyze_patterns: true
    }
  },

  'employee': {
    displayName: 'Employee Management',
    description: 'Upload employee data and profiles',
    icon: 'Users',
    targetService: 'employee',
    targetDatabase: 'employees',
    expectedColumns: [
      'name', 'email', 'role', 'department', 'hire_date',
      'phone', 'location', 'city', 'country', 'timezone'
    ],
    allowedFileTypes: ['.csv', '.xlsx'],
    maxFileSize: '25MB',
    quickUploadThreshold: 90,  // HIGH confidence threshold for quick upload (0-100 scale)
    databaseConfig: {
      schema_name: 'public',
      service_type: 'employee',
      database_type: 'postgresql'
    },
    mappingConfig: {
      service_context: 'employee',
      confidence_threshold: 70,  // MEDIUM confidence threshold (0-100 scale)
      enable_semantic_matching: true
    },
    previewConfig: {
      sample_size: 20,
      include_nulls: true
    }
  },

  'crm': {
    displayName: 'Customer Management',
    description: 'Upload customer data and interactions',
    icon: 'UserCircle',
    targetService: 'crm',
    targetDatabase: 'customers',
    expectedColumns: [
      'customer_name', 'email', 'phone', 'company', 'industry',
      'contact_date', 'lead_source', 'deal_value', 'status'
    ],
    allowedFileTypes: ['.csv', '.xlsx'],
    maxFileSize: '75MB',
    quickUploadThreshold: 90,  // HIGH confidence threshold for quick upload (0-100 scale)
    databaseConfig: {
      schema_name: 'public',
      service_type: 'crm',
      database_type: 'postgresql'
    },
    mappingConfig: {
      service_context: 'crm',
      confidence_threshold: 70,  // MEDIUM confidence threshold (0-100 scale)
      enable_semantic_matching: true
    },
    previewConfig: {
      sample_size: 25,
      max_string_preview: 150
    }
  },

  'lead-gen': {
    displayName: 'Lead Generation',
    description: 'Upload lead data for processing',
    icon: 'Target',
    targetService: 'lead-gen',
    targetDatabase: 'leads',
    expectedColumns: [
      'company_name', 'contact_name', 'email', 'phone', 'industry',
      'company_size', 'location', 'website', 'linkedin_url'
    ],
    allowedFileTypes: ['.csv', '.xlsx'],
    maxFileSize: '50MB',
    quickUploadThreshold: 90,  // HIGH confidence threshold for quick upload (0-100 scale)
    databaseConfig: {
      schema_name: 'public',
      service_type: 'lead-gen',
      database_type: 'postgresql'
    },
    mappingConfig: {
      service_context: 'lead_generation',
      confidence_threshold: 70,  // MEDIUM confidence threshold (0-100 scale)
      enable_semantic_matching: true
    },
    previewConfig: {
      sample_size: 20,
      max_unique_values: 100
    }
  }
};

/**
 * Get complete configuration for a service
 */
export const getServiceConfig = (serviceName, customConfig = {}) => {
  const serviceConfig = SERVICE_CONFIGS[serviceName] || SERVICE_CONFIGS['nl2sql'];
  
  return {
    ...DEFAULT_CONFIG,
    ...serviceConfig,
    ...customConfig,
    // Deep merge nested objects
    databaseConfig: {
      ...DEFAULT_CONFIG.databaseConfig,
      ...serviceConfig.databaseConfig,
      ...customConfig.databaseConfig
    },
    previewConfig: {
      ...DEFAULT_CONFIG.previewConfig,
      ...serviceConfig.previewConfig,
      ...customConfig.previewConfig
    },
    mappingConfig: {
      ...DEFAULT_CONFIG.mappingConfig,
      ...serviceConfig.mappingConfig,
      ...customConfig.mappingConfig
    }
  };
};

/**
 * Upload mode configurations
 */
export const UPLOAD_MODES = {
  QUICK: {
    id: 'quick',
    name: 'Quick Upload',
    description: 'Use AI suggestions automatically',
    icon: 'Zap',
    color: 'blue',
    features: [
      'Automatic column mapping',
      'AI-powered data analysis',
      'Instant upload processing',
      'Best for clean, well-structured data'
    ],
    requirements: {
      minConfidence: 90,  // HIGH confidence required for quick upload (0-100 scale)
      maxMissingColumns: 0,
      maxDataIssues: 2
    }
  },
  ADVANCED: {
    id: 'advanced',
    name: 'Advanced Mapping',
    description: 'Review and customize all mappings',
    icon: 'Settings',
    color: 'purple',
    features: [
      'Interactive column mapping',
      'Data preview with samples',
      'Custom mapping rules',
      'Best for complex or new data formats'
    ],
    requirements: {
      minConfidence: 0,
      maxMissingColumns: Infinity,
      maxDataIssues: Infinity
    }
  }
};


/**
 * Data quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  EXCELLENT: { min: 95, color: 'green', label: 'Excellent' },
  GOOD: { min: 80, color: 'blue', label: 'Good' },
  FAIR: { min: 60, color: 'yellow', label: 'Fair' },
  POOR: { min: 0, color: 'red', label: 'Poor' }
};

/**
 * Get data quality assessment
 */
export const getQualityAssessment = (score) => {
  if (score >= QUALITY_THRESHOLDS.EXCELLENT.min) return QUALITY_THRESHOLDS.EXCELLENT;
  if (score >= QUALITY_THRESHOLDS.GOOD.min) return QUALITY_THRESHOLDS.GOOD;
  if (score >= QUALITY_THRESHOLDS.FAIR.min) return QUALITY_THRESHOLDS.FAIR;
  return QUALITY_THRESHOLDS.POOR;
};

/**
 * Validation rules for different services
 */
export const VALIDATION_RULES = {
  'nl2sql': {
    requiredColumns: ['sales_amount'],
    optionalColumns: ['employee_name', 'customer_name', 'location'],
    dataTypes: {
      'sales_amount': 'number',
      'employee_name': 'string',
      'customer_name': 'string'
    }
  },
  'employee': {
    requiredColumns: ['name', 'email'],
    optionalColumns: ['role', 'department', 'hire_date'],
    dataTypes: {
      'name': 'string',
      'email': 'email',
      'hire_date': 'date'
    }
  },
  'crm': {
    requiredColumns: ['customer_name'],
    optionalColumns: ['email', 'phone', 'company'],
    dataTypes: {
      'customer_name': 'string',
      'email': 'email',
      'phone': 'string'
    }
  },
  'lead-gen': {
    requiredColumns: ['company_name', 'contact_name'],
    optionalColumns: ['email', 'phone', 'industry'],
    dataTypes: {
      'company_name': 'string',
      'contact_name': 'string',
      'email': 'email'
    }
  }
};

/**
 * Get validation rules for a service
 */
export const getValidationRules = (serviceName) => {
  return VALIDATION_RULES[serviceName] || VALIDATION_RULES['nl2sql'];
};

/**
 * Phase configuration for upload flow
 */
export const UPLOAD_PHASES = {
  FILE_SELECTION: {
    id: 'file-selection',
    name: 'File Selection',
    description: 'Choose your data file',
    icon: 'Upload',
    order: 1
  },
  MODE_DECISION: {
    id: 'mode-decision',
    name: 'Upload Mode',
    description: 'Select processing method',
    icon: 'Settings',
    order: 2
  },
  COLUMN_MAPPING: {
    id: 'column-mapping',
    name: 'Column Mapping',
    description: 'Map your data columns',
    icon: 'Columns',
    order: 3
  },
  UPLOAD_PROCESSING: {
    id: 'upload-processing',
    name: 'Processing',
    description: 'Upload and process data',
    icon: 'Loader',
    order: 4
  }
};
