/**
 * Centralized confidence threshold constants for the upload system
 * 
 * All confidence values throughout the system use a 0-100 scale for consistency.
 * These constants ensure uniform behavior across frontend and backend components.
 */

/**
 * Standard confidence thresholds (0-100 scale)
 */
export const CONFIDENCE_THRESHOLDS = {
  // High confidence - enables auto-mapping and quick upload
  HIGH: 90,
  
  // Medium confidence - requires review but suggests mapping
  MEDIUM: 70,
  
  // Low confidence - minimum threshold for applying mappings
  LOW: 50,
  
  // Apply threshold - minimum confidence to apply a mapping
  APPLY: 50
};

/**
 * Confidence display utilities
 */
export const CONFIDENCE_DISPLAY = {
  // Color classes for confidence levels
  COLORS: {
    HIGH: 'text-green-600 bg-green-50 border-green-200',
    MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200', 
    LOW: 'text-orange-600 bg-orange-50 border-orange-200',
    VERY_LOW: 'text-red-600 bg-red-50 border-red-200'
  },
  
  // Labels for confidence ranges
  LABELS: {
    HIGH: 'High Confidence',
    MEDIUM: 'Medium Confidence',
    LOW: 'Low Confidence', 
    VERY_LOW: 'Very Low Confidence'
  }
};

/**
 * Normalize confidence value from backend (0-1 scale) to frontend (0-100 scale)
 * @param {number} backendConfidence - Confidence value from backend (0-1 scale)
 * @returns {number} Normalized confidence value (0-100 scale)
 */
export function normalizeConfidence(backendConfidence) {
  if (typeof backendConfidence !== 'number') {
    return 0;
  }
  
  // If already in 0-100 scale, return as is
  if (backendConfidence > 1) {
    return Math.min(100, Math.max(0, backendConfidence));
  }
  
  // Convert from 0-1 to 0-100 scale
  return Math.round(backendConfidence * 100);
}

/**
 * Get confidence level based on threshold
 * @param {number} confidence - Confidence value (0-100 scale)
 * @returns {string} Confidence level ('HIGH', 'MEDIUM', 'LOW', 'VERY_LOW')
 */
export function getConfidenceLevel(confidence) {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'HIGH';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'MEDIUM';  
  } else if (confidence >= CONFIDENCE_THRESHOLDS.LOW) {
    return 'LOW';
  } else {
    return 'VERY_LOW';
  }
}

/**
 * Get confidence display properties
 * @param {number} confidence - Confidence value (0-100 scale)  
 * @returns {Object} Display properties with color, label, and formatted value
 */
export function getConfidenceDisplay(confidence) {
  const level = getConfidenceLevel(confidence);
  
  return {
    level,
    label: CONFIDENCE_DISPLAY.LABELS[level],
    color: CONFIDENCE_DISPLAY.COLORS[level],
    value: Math.round(confidence),
    percentage: `${Math.round(confidence)}%`
  };
}
