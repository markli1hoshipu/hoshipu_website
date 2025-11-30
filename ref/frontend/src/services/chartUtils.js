/**
 * Shared Chart Utilities
 * Common formatting and utility functions for all chart components
 */

/**
 * Format currency values
 */
export const formatCurrency = (value) => {
  if (typeof value !== 'number') return 0;
  return value;
};

/**
 * Format number values
 */
export const formatNumber = (value) => {
  if (typeof value !== 'number') return 0;
  return value;
};

/**
 * Format display value for tooltips and labels
 */
export const formatDisplayValue = (value, formatType) => {
  if (typeof value !== 'number') return '0';
  
  switch(formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'number':
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: value % 1 !== 0 ? 1 : 0,
      }).format(value);
  }
};

/**
 * Truncate name for X-axis display
 * @param {string} name - Full name to truncate
 * @param {number} maxLength - Maximum number of characters (default: 12)
 * @returns {string} Truncated name with ellipsis if needed
 */
export const truncateName = (name, maxLength = 12) => {
  if (!name || typeof name !== 'string') return '';
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '…';
};

export default {
  formatCurrency,
  formatNumber,
  formatDisplayValue,
  truncateName
};