/**
 * File validation utilities for upload system
 */

export const FILE_TYPES = {
  CSV: '.csv',
  EXCEL: '.xlsx',
  XLS: '.xls'
};

export const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * Validate file type against allowed types
 */
export const validateFileType = (file, allowedTypes = [FILE_TYPES.CSV, FILE_TYPES.EXCEL]) => {
  const fileName = file.name.toLowerCase();
  const isValid = allowedTypes.some(type => fileName.endsWith(type.toLowerCase()));
  
  return {
    isValid,
    error: !isValid ? `File type not supported. Allowed: ${allowedTypes.join(', ')}` : null
  };
};

/**
 * Validate file size against maximum limit
 */
export const validateFileSize = (file, maxSizeBytes = DEFAULT_MAX_SIZE) => {
  const isValid = file.size <= maxSizeBytes;
  
  return {
    isValid,
    error: !isValid ? `File size (${formatFileSize(file.size)}) exceeds limit of ${formatFileSize(maxSizeBytes)}` : null,
    size: file.size,
    maxSize: maxSizeBytes
  };
};

/**
 * Validate file name for safe usage
 */
export const validateFileName = (fileName) => {
  // Allow alphanumeric, spaces, hyphens, underscores, and dots
  const safeNameRegex = /^[a-zA-Z0-9_\-\s.]+$/;
  const isValid = safeNameRegex.test(fileName);
  
  return {
    isValid,
    error: !isValid ? 'File name contains invalid characters. Use only letters, numbers, spaces, hyphens, and underscores.' : null
  };
};

/**
 * Comprehensive file validation
 */
export const validateFile = (file, options = {}) => {
  const {
    allowedTypes = [FILE_TYPES.CSV, FILE_TYPES.EXCEL],
    maxSize = DEFAULT_MAX_SIZE,
    validateName = true
  } = options;

  const validations = [];

  // Type validation
  const typeResult = validateFileType(file, allowedTypes);
  if (!typeResult.isValid) {
    validations.push({ type: 'file_type', ...typeResult });
  }

  // Size validation
  const sizeResult = validateFileSize(file, maxSize);
  if (!sizeResult.isValid) {
    validations.push({ type: 'file_size', ...sizeResult });
  }

  // Name validation
  if (validateName) {
    const nameResult = validateFileName(file.name);
    if (!nameResult.isValid) {
      validations.push({ type: 'file_name', ...nameResult });
    }
  }

  const errors = validations.filter(v => v.error).map(v => v.error);

  return {
    isValid: errors.length === 0,
    errors,
    validations,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Parse file size string to bytes
 */
export const parseFileSize = (sizeString) => {
  const units = {
    'B': 1,
    'BYTES': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };

  const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(B|BYTES|KB|MB|GB)$/i);
  if (!match) return DEFAULT_MAX_SIZE;

  const [, size, unit] = match;
  return parseFloat(size) * units[unit.toUpperCase()];
};

/**
 * Extract file extension
 */
export const getFileExtension = (fileName) => {
  return fileName.toLowerCase().split('.').pop();
};

