/**
 * Custom hook for column mapping functionality
 */
import { useState, useCallback, useMemo, useReducer, useRef, useEffect } from 'react';
import {
  applyUserMappings,
  mappingsToUserFormat,
  validateMappings,
  getMappingStats,
  calculateOverallConfidence,
  getMappingStatus
} from '../utils/mappingHelpers';

// Mapping reducer for complex state management
const mappingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER_MAPPING':
      return {
        ...state,
        userMappings: {
          ...state.userMappings,
          [action.sourceColumn]: action.targetColumn
        }
      };
    
    case 'REMOVE_USER_MAPPING':
      const { [action.sourceColumn]: removed, ...remaining } = state.userMappings;
      return {
        ...state,
        userMappings: remaining
      };
    
    case 'BULK_AUTO_MAP':
      return {
        ...state,
        userMappings: {
          ...state.userMappings,
          ...action.mappings
        }
      };
    
    case 'RESET_MAPPINGS':
      return {
        ...state,
        userMappings: action.mappings || {}
      };
    
    case 'CLEAR_ALL_MAPPINGS':
      return {
        ...state,
        userMappings: {}
      };
    
    case 'IMPORT_MAPPINGS':
      return {
        ...state,
        userMappings: action.mappings
      };
    
    case 'SET_DROPDOWN_STATE':
      return {
        ...state,
        openDropdowns: action.openDropdowns
      };
    
    default:
      return state;
  }
};

const initialMappingState = {
  userMappings: {},
  openDropdowns: new Set()
};

export const useColumnMapping = (analysisResult, uploadService) => {
  const [mappingState, dispatch] = useReducer(mappingReducer, initialMappingState);
  const { userMappings, openDropdowns } = mappingState;
  
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [llmRecommendations, setLlmRecommendations] = useState(null);
  const [compatibilityData, setCompatibilityData] = useState(null);
  const [isLoadingLlmInsights, setIsLoadingLlmInsights] = useState(false);
  const [llmInsightsError, setLlmInsightsError] = useState(null);
  
  // AbortController for cancelling preview requests
  const previewAbortControllerRef = useRef(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewAbortControllerRef.current) {
        previewAbortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Combined mapping rules (suggestions + user overrides)
   */
  const effectiveMappings = useMemo(() => {
    if (!analysisResult?.mapping_suggestions) return [];
    
    return applyUserMappings(analysisResult.mapping_suggestions, userMappings);
  }, [analysisResult?.mapping_suggestions, userMappings]);

  /**
   * Mapping statistics
   */
  const mappingStats = useMemo(() => {
    if (!analysisResult?.source_columns) return null;
    
    return getMappingStats(analysisResult.source_columns, effectiveMappings);
  }, [analysisResult?.source_columns, effectiveMappings]);

  /**
   * Overall confidence score - uses backend-calculated confidence
   * 
   * The backend CSV mapping library provides accurate confidence values based on
   * proper weighted calculations. Frontend no longer recalculates this to avoid
   * the harsh coverage penalty that was causing 1% confidence displays.
   */
  const overallConfidence = useMemo(() => {
    // Use backend confidence value directly if available (0-100 scale)
    if (analysisResult?.overall_confidence !== undefined && analysisResult?.overall_confidence !== null) {
      return Math.round(analysisResult.overall_confidence);
    }
    
    // Fallback calculation for edge cases
    if (!analysisResult?.source_columns) return 0;
    
    return calculateOverallConfidence(effectiveMappings, analysisResult.source_columns, analysisResult);
  }, [effectiveMappings, analysisResult]);

  /**
   * Mapping validation results
   */
  const validationResults = useMemo(() => {
    if (!analysisResult?.source_columns || !analysisResult?.existing_table_info) {
      return { isValid: false, issues: [], warnings: [], canProceed: false };
    }
    
    return validateMappings(
      analysisResult.source_columns,
      analysisResult.existing_table_info,
      effectiveMappings,
      userMappings
    );
  }, [analysisResult, effectiveMappings, userMappings]);

  /**
   * Update user mapping for a source column
   */
  const updateMapping = useCallback((sourceColumn, targetColumn) => {
    dispatch({
      type: 'SET_USER_MAPPING',
      sourceColumn,
      targetColumn
    });
  }, []);

  /**
   * Remove mapping for a source column
   */
  const removeMapping = useCallback((sourceColumn) => {
    dispatch({
      type: 'REMOVE_USER_MAPPING',
      sourceColumn
    });
  }, []);

  /**
   * Clear all user mappings
   */
  const clearAllMappings = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_MAPPINGS' });
  }, []);

  /**
   * Auto-apply high confidence mappings
   */
  const autoApplyHighConfidenceMappings = useCallback(() => {
    if (!analysisResult?.mapping_suggestions) return;

    const highConfidenceMappings = {};
    
    analysisResult.mapping_suggestions
      .filter(rule => rule.target_column && rule.confidence >= 90)
      .forEach(rule => {
        highConfidenceMappings[rule.source_column] = rule.target_column;
      });

    dispatch({
      type: 'BULK_AUTO_MAP',
      mappings: highConfidenceMappings
    });
  }, [analysisResult?.mapping_suggestions]);

  /**
   * Reset to AI suggestions only
   */
  const resetToSuggestions = useCallback(() => {
    if (!analysisResult?.mapping_suggestions) return;

    const suggestedMappings = mappingsToUserFormat(analysisResult.mapping_suggestions);
    dispatch({
      type: 'RESET_MAPPINGS',
      mappings: suggestedMappings
    });
  }, [analysisResult?.mapping_suggestions]);

  /**
   * Load preview data for current mappings
   */
  const loadPreview = useCallback(async (file) => {
    if (!file || !uploadService) return;

    // Cancel previous preview request if ongoing
    if (previewAbortControllerRef.current) {
      previewAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    previewAbortControllerRef.current = new AbortController();
    
    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const result = await uploadService.previewMapping(file, userMappings, {
        signal: previewAbortControllerRef.current.signal
      });
      setPreviewData(result);
      return result;
    } catch (error) {
      // Handle aborted requests gracefully
      if (error.name === 'AbortError') {
        console.log('Preview loading was cancelled');
        return null;
      }
      
      console.error('Preview loading failed:', error);
      setPreviewError(error.message);
      throw error;
    } finally {
      setIsLoadingPreview(false);
    }
  }, [uploadService, userMappings]);

  /**
   * Get mapping for a specific source column
   */
  const getMappingForSource = useCallback((sourceColumn) => {
    return effectiveMappings.find(rule => rule.source_column === sourceColumn);
  }, [effectiveMappings]);

  /**
   * Get source column mapped to a target column
   */
  const getSourceForTarget = useCallback((targetColumn) => {
    const mapping = effectiveMappings.find(rule => rule.target_column === targetColumn);
    return mapping?.source_column || null;
  }, [effectiveMappings]);

  /**
   * Check if a target column is mapped
   */
  const isTargetMapped = useCallback((targetColumn) => {
    return effectiveMappings.some(rule => rule.target_column === targetColumn);
  }, [effectiveMappings]);

  /**
   * Get unmapped source columns
   */
  const getUnmappedSources = useCallback(() => {
    if (!analysisResult?.source_columns) return [];

    const mappedSources = new Set(
      effectiveMappings
        .filter(rule => rule.target_column)
        .map(rule => rule.source_column)
    );

    return analysisResult.source_columns.filter(col => !mappedSources.has(col.name));
  }, [analysisResult?.source_columns, effectiveMappings]);

  /**
   * Get unmapped target columns
   */
  const getUnmappedTargets = useCallback(() => {
    if (!analysisResult?.existing_table_info?.columns) return [];

    const mappedTargets = new Set(
      effectiveMappings
        .filter(rule => rule.target_column)
        .map(rule => rule.target_column)
    );

    return analysisResult.existing_table_info.columns
      .filter(col => !mappedTargets.has(col.name));
  }, [analysisResult?.existing_table_info, effectiveMappings]);

  /**
   * Drag and drop handlers
   */
  const handleDragStart = useCallback((column) => {
    setDraggedColumn(column);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null);
  }, []);

  const handleDrop = useCallback((sourceColumn, targetColumn) => {
    if (sourceColumn && targetColumn) {
      updateMapping(sourceColumn.name, targetColumn.name);
    }
    setDraggedColumn(null);
  }, [updateMapping]);

  /**
   * Get columns grouped by status
   */
  const getColumnsByStatus = useCallback(() => {
    if (!analysisResult?.source_columns) return {};

    const groups = {
      auto_mapped: [],
      review_needed: [],
      unmapped: [],
      manual: []
    };

    analysisResult.source_columns.forEach(column => {
      const mapping = getMappingForSource(column.name);
      const status = getMappingStatus(mapping);
      
      if (groups[status]) {
        groups[status].push({ ...column, mapping });
      }
    });

    return groups;
  }, [analysisResult?.source_columns, getMappingForSource]);

  /**
   * Export current mappings
   */
  const exportMappings = useCallback(() => {
    return {
      userMappings,
      effectiveMappings,
      stats: mappingStats,
      confidence: overallConfidence,
      validation: validationResults
    };
  }, [userMappings, effectiveMappings, mappingStats, overallConfidence, validationResults]);

  /**
   * Load LLM recommendations for current analysis
   */
  const loadLlmRecommendations = useCallback(async (forceReload = false) => {
    if (!uploadService || !analysisResult?.existing_table_info || (llmRecommendations && !forceReload)) {
      return;
    }

    setIsLoadingLlmInsights(true);
    setLlmInsightsError(null);

    try {
      const targetTable = analysisResult.existing_table_info.table_name;
      const sourceColumns = analysisResult.source_columns || [];
      const missingColumns = analysisResult.missing_columns || [];
      const newColumns = analysisResult.new_columns || [];

      const recommendations = await uploadService.getColumnMismatchRecommendations(
        targetTable,
        sourceColumns,
        missingColumns,
        newColumns
      );

      setLlmRecommendations(recommendations);
      return recommendations;

    } catch (error) {
      console.error('Failed to load LLM recommendations:', error);
      setLlmInsightsError(error.message);
      throw error;
    } finally {
      setIsLoadingLlmInsights(false);
    }
  }, [uploadService, analysisResult, llmRecommendations]);

  /**
   * Load schema compatibility analysis
   */
  const loadCompatibilityAnalysis = useCallback(async (forceReload = false) => {
    if (!uploadService || !analysisResult?.existing_table_info || (compatibilityData && !forceReload)) {
      return;
    }

    try {
      const targetTable = analysisResult.existing_table_info.table_name;
      const sourceColumns = analysisResult.source_columns || [];

      const compatibility = await uploadService.analyzeSchemaCompatibility(
        targetTable,
        sourceColumns,
        'APPEND'
      );

      setCompatibilityData(compatibility);
      return compatibility;

    } catch (error) {
      console.error('Failed to load compatibility analysis:', error);
      throw error;
    }
  }, [uploadService, analysisResult, compatibilityData]);

  /**
   * Get comprehensive analysis (both LLM and compatibility)
   */
  const loadComprehensiveAnalysis = useCallback(async (forceReload = false) => {
    if (!uploadService || !analysisResult?.existing_table_info) {
      return null;
    }

    try {
      const targetTable = analysisResult.existing_table_info.table_name;
      const sourceColumns = analysisResult.source_columns || [];

      const comprehensiveAnalysis = await uploadService.getComprehensiveAnalysis(
        targetTable,
        sourceColumns,
        'APPEND'
      );

      setCompatibilityData(comprehensiveAnalysis.compatibility);
      setLlmRecommendations(comprehensiveAnalysis.llmRecommendations);

      return comprehensiveAnalysis;

    } catch (error) {
      console.error('Failed to load comprehensive analysis:', error);
      setLlmInsightsError(error.message);
      throw error;
    }
  }, [uploadService, analysisResult]);

  /**
   * Apply LLM recommendations to user mappings
   */
  const applyLlmRecommendations = useCallback((recommendations = null) => {
    const recsToApply = recommendations || llmRecommendations?.recommendations || [];
    const newMappings = {};

    recsToApply.forEach(rec => {
      if (rec.suggested_action === 'add_column') {
        newMappings[rec.column_name] = 'import_as_new';
      } else if (rec.suggested_action === 'map_existing' && rec.target_column) {
        newMappings[rec.column_name] = rec.target_column;
      } else if (rec.suggested_action === 'skip_column') {
        newMappings[rec.column_name] = null;
      }
    });

    dispatch({
      type: 'BULK_AUTO_MAP',
      mappings: newMappings
    });
  }, [llmRecommendations]);

  /**
   * Get LLM recommendation for a specific column
   */
  const getLlmRecommendationForColumn = useCallback((columnName) => {
    return llmRecommendations?.recommendations?.find(
      rec => rec.column_name === columnName
    ) || null;
  }, [llmRecommendations]);

  /**
   * Check if LLM insights are available
   */
  const hasLlmInsights = useMemo(() => {
    return !!(llmRecommendations?.recommendations?.length > 0);
  }, [llmRecommendations]);

  /**
   * Get LLM insights summary
   */
  const getLlmInsightsSummary = useCallback(() => {
    if (!llmRecommendations) return null;

    const recommendations = llmRecommendations.recommendations || [];
    const severityCounts = recommendations.reduce((acc, rec) => {
      acc[rec.severity] = (acc[rec.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRecommendations: recommendations.length,
      severityCounts,
      overallConfidence: llmRecommendations.overall_confidence,
      businessContext: llmRecommendations.business_context,
      hasHighSeverityIssues: (severityCounts.high || 0) > 0,
      hasMediumSeverityIssues: (severityCounts.medium || 0) > 0
    };
  }, [llmRecommendations]);

  /**
   * Import mappings
   */
  const importMappings = useCallback((mappings) => {
    dispatch({
      type: 'IMPORT_MAPPINGS',
      mappings
    });
  }, []);

  return {
    // State
    userMappings,
    effectiveMappings,
    previewData,
    isLoadingPreview,
    previewError,
    draggedColumn,
    llmRecommendations,
    compatibilityData,
    isLoadingLlmInsights,
    llmInsightsError,
    openDropdowns,
    dispatch,

    // Computed values
    mappingStats,
    overallConfidence,
    validationResults,

    // Actions
    updateMapping,
    removeMapping,
    clearAllMappings,
    autoApplyHighConfidenceMappings,
    resetToSuggestions,
    loadPreview,

    // LLM Actions
    loadLlmRecommendations,
    loadCompatibilityAnalysis,
    loadComprehensiveAnalysis,
    applyLlmRecommendations,
    getLlmRecommendationForColumn,
    getLlmInsightsSummary,

    // Query functions
    getMappingForSource,
    getSourceForTarget,
    isTargetMapped,
    getUnmappedSources,
    getUnmappedTargets,
    getColumnsByStatus,

    // Drag and drop
    handleDragStart,
    handleDragEnd,
    handleDrop,

    // Import/Export
    exportMappings,
    importMappings,

    // Helper flags
    hasPreview: !!previewData,
    hasPreviewError: !!previewError,
    canProceed: validationResults.canProceed,
    hasMappings: Object.keys(userMappings).length > 0,
    isComplete: validationResults.isValid,
    hasLlmInsights,
    hasLlmInsightsError: !!llmInsightsError,
    hasCompatibilityData: !!compatibilityData
  };
};