/**
 * Mapping utilities for column mapping system
 */

import { CONFIDENCE_THRESHOLDS } from './confidenceConstants.js';


/**
 * Mapping statuses
 */
export const MAPPING_STATUS = {
  AUTO_MAPPED: 'auto_mapped',
  REVIEW_NEEDED: 'review_needed',
  UNMAPPED: 'unmapped',
  MANUAL: 'manual'
};

/**
 * Mapping types
 */
export const MAPPING_TYPES = {
  EXACT: 'exact',
  PATTERN: 'pattern',
  AI: 'ai',
  MANUAL: 'manual'
};

/**
 * Get mapping status based on confidence score
 */
export const getMappingStatus = (mappingRule) => {
  if (!mappingRule || !mappingRule.target_column) {
    return MAPPING_STATUS.UNMAPPED;
  }

  if (mappingRule.mapping_type === MAPPING_TYPES.MANUAL) {
    return MAPPING_STATUS.MANUAL;
  }

  if (mappingRule.confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return MAPPING_STATUS.AUTO_MAPPED;
  }

  if (mappingRule.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return MAPPING_STATUS.REVIEW_NEEDED;
  }

  return MAPPING_STATUS.UNMAPPED;
};

// Removed unused getConfidenceColor and getStatusConfig functions

/**
 * Get overall mapping confidence from backend analysis result
 * 
 * Uses backend-calculated confidence instead of frontend calculation to fix
 * the 1% confidence issue caused by harsh coverage penalties in the original formula.
 * 
 * @param {Array} mappingRules - Array of mapping rules (used for fallback only)
 * @param {Array} sourceColumns - Array of source columns (used for fallback only) 
 * @param {Object} analysisResult - Backend analysis result containing overall_confidence
 * @returns {number} Confidence score (0-100)
 */
export const calculateOverallConfidence = (mappingRules, sourceColumns, analysisResult = null) => {
  // Primary: Use backend confidence value (0-100 scale)
  if (analysisResult && typeof analysisResult.overall_confidence === 'number') {
    return Math.round(analysisResult.overall_confidence);
  }
  
  // Fallback: Simple average calculation for edge cases (no coverage penalty)
  if (!mappingRules || mappingRules.length === 0) return 0;

  const mappedColumns = mappingRules.filter(rule => rule.target_column);
  if (mappedColumns.length === 0) return 0;
  
  const totalConfidence = mappedColumns.reduce((sum, rule) => sum + (rule.confidence || 0), 0);
  const averageConfidence = totalConfidence / mappedColumns.length;
  
  return Math.round(averageConfidence);
};

/**
 * Get unmapped source columns
 */
export const getUnmappedColumns = (sourceColumns, mappingRules) => {
  const mappedSourceColumns = new Set(
    mappingRules
      .filter(rule => rule.target_column)
      .map(rule => rule.source_column)
  );

  return sourceColumns.filter(col => !mappedSourceColumns.has(col.name));
};

/**
 * Get missing target columns (required columns not mapped)
 */
export const getMissingTargetColumns = (targetSchema, mappingRules) => {
  const mappedTargetColumns = new Set(
    mappingRules
      .filter(rule => rule.target_column)
      .map(rule => rule.target_column)
  );

  return targetSchema.columns
    .filter(col => col.required && !mappedTargetColumns.has(col.name))
    .map(col => col.name);
};

/**
 * Validate mapping completeness with ignore column support
 */
export const validateMappings = (sourceColumns, targetSchema, mappingRules, userMappings = {}) => {
  const issues = [];
  const warnings = [];

  // Count ignored columns
  const ignoredColumns = Object.values(userMappings).filter(target => target === 'ignore_column').length;
  const activeSourceColumns = sourceColumns.length - ignoredColumns;

  // Check for unmapped required columns
  const missingRequired = getMissingTargetColumns(targetSchema, mappingRules);
  if (missingRequired.length > 0) {
    issues.push({
      type: 'missing_required',
      message: `Required columns not mapped: ${missingRequired.join(', ')}`,
      columns: missingRequired,
      severity: 'high'
    });
  }

  // Check for unmapped source columns (excluding ignored ones)
  const unmappedSource = getUnmappedColumns(sourceColumns, mappingRules).filter(col => {
    return userMappings[col.name] !== 'ignore_column';
  });
  
  if (unmappedSource.length > 0) {
    warnings.push({
      type: 'unmapped_source',
      message: `Source columns will be imported as new: ${unmappedSource.map(col => col.name).join(', ')}`,
      columns: unmappedSource.map(col => col.name),
      severity: 'medium'
    });
  }

  // Add info about ignored columns
  if (ignoredColumns > 0) {
    const ignoredColumnNames = Object.entries(userMappings)
      .filter(([, target]) => target === 'ignore_column')
      .map(([source]) => source);
    
    warnings.push({
      type: 'ignored_columns',
      message: `${ignoredColumns} columns will be ignored: ${ignoredColumnNames.join(', ')}`,
      columns: ignoredColumnNames,
      severity: 'low'
    });
  }

  // Check for low confidence mappings (excluding ignored columns)
  const lowConfidenceMappings = mappingRules.filter(rule => 
    rule.target_column && 
    rule.target_column !== 'ignore_column' &&
    rule.confidence < CONFIDENCE_THRESHOLDS.MEDIUM
  );

  if (lowConfidenceMappings.length > 0) {
    warnings.push({
      type: 'low_confidence',
      message: `${lowConfidenceMappings.length} mappings have low confidence`,
      columns: lowConfidenceMappings.map(rule => rule.source_column),
      severity: 'medium'
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    canProceed: issues.filter(issue => issue.severity === 'high').length === 0,
    stats: {
      totalColumns: sourceColumns.length,
      mappedColumns: mappingRules.filter(rule => rule.target_column && rule.target_column !== 'ignore_column').length,
      ignoredColumns: ignoredColumns,
      unmappedColumns: unmappedSource.length
    }
  };
};

/**
 * Apply user mappings to suggested mappings with ignore column support
 */
export const applyUserMappings = (mappingSuggestions, userMappings) => {
  const updatedMappings = [...mappingSuggestions];

  Object.entries(userMappings).forEach(([sourceColumn, targetColumn]) => {
    const existingIndex = updatedMappings.findIndex(
      rule => rule.source_column === sourceColumn
    );

    // Determine confidence based on mapping type
    const getConfidence = (target) => {
      if (target === 'ignore_column') return 100; // User explicitly chose to ignore
      if (target === 'import_as_new') return 100; // User explicitly chose to import as new
      return 100; // Manual mappings have 100% confidence
    };

    // Determine suggested action based on target
    const getSuggestedAction = (target) => {
      if (target === 'ignore_column') return 'ignore';
      if (target === 'import_as_new') return 'import_new';
      return 'map';
    };

    if (existingIndex >= 0) {
      // Update existing mapping
      updatedMappings[existingIndex] = {
        ...updatedMappings[existingIndex],
        target_column: targetColumn,
        mapping_type: MAPPING_TYPES.MANUAL,
        confidence: getConfidence(targetColumn),
        suggested_action: getSuggestedAction(targetColumn)
      };
    } else {
      // Add new manual mapping
      updatedMappings.push({
        source_column: sourceColumn,
        target_column: targetColumn,
        confidence: getConfidence(targetColumn),
        mapping_type: MAPPING_TYPES.MANUAL,
        suggested_action: getSuggestedAction(targetColumn)
      });
    }
  });

  return updatedMappings;
};

/**
 * Convert mappings to user mapping format
 */
export const mappingsToUserFormat = (mappingRules) => {
  const userMappings = {};
  
  mappingRules
    .filter(rule => rule.target_column)
    .forEach(rule => {
      userMappings[rule.source_column] = rule.target_column;
    });

  return userMappings;
};

/**
 * Get mapping statistics with ignore column support
 */
export const getMappingStats = (sourceColumns, mappingRules, userMappings = {}) => {
  const totalColumns = sourceColumns.length;
  
  // Count different types of mappings
  const ignoredColumns = mappingRules.filter(rule => rule.target_column === 'ignore_column').length;
  const importAsNewColumns = mappingRules.filter(rule => rule.target_column === 'import_as_new').length;
  const mappedColumns = mappingRules.filter(rule => 
    rule.target_column && 
    rule.target_column !== 'ignore_column' && 
    rule.target_column !== 'import_as_new'
  ).length;
  const unmappedColumns = totalColumns - mappedColumns - ignoredColumns - importAsNewColumns;

  // Calculate confidence stats (excluding ignored and import_as_new columns)
  const activeRules = mappingRules.filter(rule => 
    rule.target_column && 
    rule.target_column !== 'ignore_column' && 
    rule.target_column !== 'import_as_new'
  );

  const highConfidence = activeRules.filter(rule => 
    rule.confidence >= CONFIDENCE_THRESHOLDS.HIGH
  ).length;
  const mediumConfidence = activeRules.filter(rule => 
    rule.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM && 
    rule.confidence < CONFIDENCE_THRESHOLDS.HIGH
  ).length;
  const lowConfidence = activeRules.length - highConfidence - mediumConfidence;

  return {
    total: totalColumns,
    mapped: mappedColumns,
    ignored: ignoredColumns,
    importAsNew: importAsNewColumns,
    unmapped: unmappedColumns,
    mappingPercentage: totalColumns > 0 ? Math.round(((mappedColumns + importAsNewColumns) / totalColumns) * 100) : 0,
    processedPercentage: totalColumns > 0 ? Math.round(((totalColumns - unmappedColumns) / totalColumns) * 100) : 0,
    confidence: {
      high: highConfidence,
      medium: mediumConfidence,
      low: lowConfidence
    }
  };
};

