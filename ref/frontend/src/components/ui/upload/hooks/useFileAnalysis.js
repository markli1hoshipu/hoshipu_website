/**
 * Custom hook for file analysis functionality
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { validateFile, parseFileSize } from '../utils/fileValidation';

export const useFileAnalysis = (uploadService, config) => {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  
  // AbortController for cancelling requests
  const abortControllerRef = useRef(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoize config-dependent values to prevent unnecessary re-renders
  const configHash = useMemo(() => 
    JSON.stringify({
      allowedTypes: config.allowedFileTypes,
      maxSize: config.maxFileSize,
      threshold: config.quickUploadThreshold
    }), [config.allowedFileTypes, config.maxFileSize, config.quickUploadThreshold]
  );

  /**
   * Analyze uploaded file
   */
  const analyzeFile = useCallback(async (file, options = {}) => {
    if (!file) return;

    // Cancel previous request if ongoing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // First validate file
      const validation = validateFile(file, {
        allowedTypes: config.allowedFileTypes,
        maxSize: parseFileSize(config.maxFileSize || '50MB')
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Perform analysis using upload service with abort signal
      const result = await uploadService.analyzeUpload(file, {
        database_config: { ...config.databaseConfig, ...options.database_config },
        mapping_config: { ...config.mappingConfig, ...options.mapping_config },
        preview_config: { ...config.previewConfig, ...options.preview_config },
        target_table: options.target_table
      }, { signal: abortControllerRef.current.signal });

      setAnalysisResult(result);
      return result;

    } catch (error) {
      // Handle aborted requests gracefully
      if (error.name === 'AbortError') {
        console.log('File analysis was cancelled');
        return null;
      }
      
      console.error('File analysis failed:', error);
      setAnalysisError(error.message);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadService, configHash]);

  /**
   * Reset analysis state
   */
  const resetAnalysis = useCallback(() => {
    // Cancel ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  }, []);

  /**
   * Get analysis summary
   */
  const getAnalysisSummary = useCallback(() => {
    if (!analysisResult) return null;

    const {
      source_columns = [],
      mapping_suggestions = [],
      overall_confidence = 0,
      missing_columns = [],
      new_columns = [],
      data_issues = [],
      data_quality_score = 0
    } = analysisResult;

    const mappedCount = mapping_suggestions.filter(rule => rule.target_column).length;
    const highConfidenceCount = mapping_suggestions.filter(
      rule => rule.target_column && rule.confidence >= 90
    ).length;

    return {
      totalColumns: source_columns.length,
      mappedColumns: mappedCount,
      unmappedColumns: source_columns.length - mappedCount,
      mappingPercentage: source_columns.length > 0 ? Math.round((mappedCount / source_columns.length) * 100) : 0,
      overallConfidence: Math.round(overall_confidence),
      highConfidenceCount,
      mediumConfidenceCount: mapping_suggestions.filter(
        rule => rule.target_column && rule.confidence >= 70 && rule.confidence < 90
      ).length,
      lowConfidenceCount: mappedCount - highConfidenceCount,
      missingColumnsCount: missing_columns.length,
      newColumnsCount: new_columns.length,
      dataIssuesCount: data_issues.length,
      highSeverityIssues: data_issues.filter(issue => issue.severity === 'high').length,
      dataQualityScore: Math.round(data_quality_score),
      recommendedMode: overall_confidence >= config.quickUploadThreshold ? 'quick' : 'advanced'
    };
  }, [analysisResult, config.quickUploadThreshold]);

  /**
   * Check if file analysis indicates quick upload is recommended
   */
  const isQuickUploadRecommended = useCallback(() => {
    if (!analysisResult) return false;

    const summary = getAnalysisSummary();
    
    return (
      summary.overallConfidence >= config.quickUploadThreshold &&
      summary.missingColumnsCount === 0 &&
      summary.highSeverityIssues === 0
    );
  }, [analysisResult, config.quickUploadThreshold, getAnalysisSummary]);

  /**
   * Get data quality assessment
   */
  const getDataQuality = useCallback(() => {
    if (!analysisResult) return null;

    const { data_quality_score = 0, data_issues = [] } = analysisResult;

    let level = 'poor';
    let color = 'red';
    
    if (data_quality_score >= 95) {
      level = 'excellent';
      color = 'green';
    } else if (data_quality_score >= 80) {
      level = 'good';
      color = 'blue';
    } else if (data_quality_score >= 60) {
      level = 'fair';
      color = 'yellow';
    }

    const criticalIssues = data_issues.filter(issue => issue.severity === 'high');
    const warnings = data_issues.filter(issue => issue.severity === 'medium');

    return {
      score: Math.round(data_quality_score),
      level,
      color,
      issues: {
        critical: criticalIssues.length,
        warnings: warnings.length,
        total: data_issues.length
      },
      details: data_issues
    };
  }, [analysisResult]);

  /**
   * Get column analysis details
   */
  const getColumnAnalysis = useCallback(() => {
    if (!analysisResult) return null;

    const { source_columns = [], mapping_suggestions = [] } = analysisResult;

    return source_columns.map(column => {
      const mapping = mapping_suggestions.find(rule => rule.source_column === column.name);
      
      return {
        ...column,
        mapping,
        status: mapping?.target_column 
          ? mapping.confidence >= 90 ? 'auto_mapped' : 'review_needed'
          : 'unmapped'
      };
    });
  }, [analysisResult]);

  return {
    // State
    analysisResult,
    isAnalyzing,
    analysisError,
    
    // Actions
    analyzeFile,
    resetAnalysis,
    
    // Computed values
    getAnalysisSummary,
    isQuickUploadRecommended,
    getDataQuality,
    getColumnAnalysis,
    
    // Helper flags
    hasAnalysis: !!analysisResult,
    hasError: !!analysisError,
    canProceed: !!analysisResult && !analysisError
  };
};