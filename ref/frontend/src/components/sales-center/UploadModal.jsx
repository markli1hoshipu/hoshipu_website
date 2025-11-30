import React from 'react';
import { ProgressiveUploadModal } from '../ui/upload';
import { getServiceConfig } from '../ui/upload/utils/uploadConfig';

const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  // Sales Center specific configuration
  const salesConfig = getServiceConfig('nl2sql', {
    // Override default settings for sales center
    targetDatabase: 'sales',
    tableName: '', // Will be set dynamically from filename
    expectedColumns: [
      'employee_name', 'location', 'sales_amount', 'profit', 'product_name',
      'client_name', 'quotations_sent', 'emails_sent', 'calls_made', 'sale_date'
    ],
    allowedFileTypes: ['.csv', '.xlsx'],
    maxFileSize: '100MB',
    quickUploadThreshold: 75, // Higher threshold for sales data
    
    // Enhanced configuration for sales context
    databaseConfig: {
      schema_name: 'sales',
      service_type: 'nl2sql',
      database_type: 'postgresql'
    },
    mappingConfig: {
      service_context: 'sales',
      confidence_threshold: 0.75,
      enable_semantic_matching: true
    },
    previewConfig: {
      sample_size: 30,
      analyze_patterns: true,
      include_nulls: true
    }
  });

  return (
    <ProgressiveUploadModal
      isOpen={isOpen}
      onClose={onClose}
      onUploadSuccess={onUploadSuccess}
      config={salesConfig}
    />
  );
};

export default UploadModal;