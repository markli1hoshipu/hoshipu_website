/**
 * Schema Compatibility Phase - Display LLM-powered recommendations for column mismatches
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info,
  ArrowRight,
  RefreshCw,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Button } from '../../primitives/button';

const SchemaCompatibilityPhase = ({
  selectedFile,
  analysisResult,
  onCompatibilityConfirmed,
  onNeedsMappingReview,
  uploadService
}) => {
  const [compatibilityData, setCompatibilityData] = useState(null);
  const [llmRecommendations, setLlmRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    recommendations: true
  });
  const [userDecisions, setUserDecisions] = useState({});

  /**
   * Load schema compatibility analysis and LLM recommendations
   */
  const loadCompatibilityAnalysis = useCallback(async () => {
    if (!selectedFile || !uploadService) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get target table from analysis result
      const targetTable = analysisResult?.existing_table_info?.table_name;
      
      
      if (!targetTable) {
        // No existing table - this is a create operation, skip compatibility check
        setCompatibilityData({
          success: true,
          compatibility_analysis: {
            overall_compatible: true,
            compatibility_score: 100.0,
            append_safe: true,
            operation_type: 'CREATE',
            warnings: [],
            recommendations: []
          }
        });
        setLlmRecommendations({
          recommendations: [],
          business_context: {
            domain: 'general',
            table_purpose: 'data_storage',
            criticality: 'low'
          },
          overall_confidence: 100.0
        });
        setIsLoading(false);
        return;
      }

      // Analyze schema compatibility
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Add proposed mappings if available
      const proposedMappings = {};
      if (analysisResult.mapping_suggestions) {
        analysisResult.mapping_suggestions.forEach(mapping => {
          if (mapping.source_column && mapping.target_column) {
            proposedMappings[mapping.source_column] = mapping.target_column;
          }
        });
      }
      formData.append('proposed_mappings', JSON.stringify(proposedMappings));
      
      // target_table needs to be a query parameter, not form data
      const queryParams = new URLSearchParams({
        target_table: targetTable
      });
      
      const compatibilityResponse = await fetch(
        `${uploadService.csvMappingServiceUrl}/api/data/analyze-schema-compatibility?${queryParams}`, 
        {
          method: 'POST',
          body: formData
        }
      );

      if (!compatibilityResponse.ok) {
        const errorText = await compatibilityResponse.text();
        console.error('Schema compatibility API error:', {
          status: compatibilityResponse.status,
          statusText: compatibilityResponse.statusText,
          errorText,
          url: compatibilityResponse.url
        });
        throw new Error(`Failed to analyze schema compatibility: ${compatibilityResponse.status} ${errorText}`);
      }

      const compatibilityResult = await compatibilityResponse.json();
      setCompatibilityData(compatibilityResult);

      // Filter out columns that already have good mapping suggestions
      const mappingSuggestions = analysisResult.mapping_suggestions || [];
      const CONFIDENCE_THRESHOLD = 70; // Don't flag columns with mapping confidence >= 70% as mismatches
      
      // Get columns that are mapped with high confidence
      const highConfidenceMappedSources = new Set(
        mappingSuggestions
          .filter(mapping => mapping.confidence >= CONFIDENCE_THRESHOLD && mapping.target_column)
          .map(mapping => mapping.source_column)
      );
      
      const highConfidenceMappedTargets = new Set(
        mappingSuggestions
          .filter(mapping => mapping.confidence >= CONFIDENCE_THRESHOLD && mapping.target_column)
          .map(mapping => mapping.target_column)
      );
      
      // Filter new_columns to exclude those with good mapping suggestions
      const problematicNewColumns = (analysisResult.new_columns || [])
        .map(col => typeof col === 'string' ? col : col.name)
        .filter(colName => !highConfidenceMappedSources.has(colName));
      
      // Filter missing_columns to exclude those already covered by mapping suggestions
      const problematicMissingColumns = (analysisResult.missing_columns || [])
        .map(col => typeof col === 'string' ? col : col.name)
        .filter(colName => !highConfidenceMappedTargets.has(colName));
      
      // Only call LLM analysis if there are actual problematic columns
      if (problematicNewColumns.length === 0 && problematicMissingColumns.length === 0) {
        setLlmRecommendations({
          recommendations: [],
          overall_confidence: 100.0
        });
        setUserDecisions({});
        return;
      }

      // Get LLM recommendations for truly problematic column mismatches
      const recommendationsResponse = await fetch(
        `${uploadService.csvMappingServiceUrl}/api/data/column-mismatch-analysis`,
        {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: targetTable,
            csv_columns: (analysisResult.source_columns || []).map(col => col.name),
            table_columns: (analysisResult.existing_table_info?.columns || []).reduce((acc, col) => { acc[col.name] = col.type; return acc; }, {}),
            extra_csv_columns: problematicNewColumns,
            missing_table_columns: problematicMissingColumns,
            type_mismatches: []
          })
        }
      );

      if (!recommendationsResponse.ok) {
        const errorText = await recommendationsResponse.text();
        console.error('LLM recommendations API error:', {
          status: recommendationsResponse.status,
          statusText: recommendationsResponse.statusText,
          errorText,
          url: recommendationsResponse.url,
          requestBody: {
            table_name: targetTable,
            csv_columns: (analysisResult.source_columns || []).map(col => col.name),
            table_columns: (analysisResult.existing_table_info?.columns || []).reduce((acc, col) => { acc[col.name] = col.type; return acc; }, {}),
            extra_csv_columns: problematicNewColumns,
            missing_table_columns: problematicMissingColumns,
            type_mismatches: []
          }
        });
        throw new Error(`Failed to get LLM recommendations: ${recommendationsResponse.status} ${errorText}`);
      }

      const recommendationsResult = await recommendationsResponse.json();
      setLlmRecommendations(recommendationsResult);

      // Initialize user decisions based on LLM recommendations
      const initialDecisions = {};
      recommendationsResult.recommendations?.forEach(rec => {
        initialDecisions[rec.column_name] = {
          action: rec.suggested_action,
          approved: false,
          userOverride: false
        };
      });
      setUserDecisions(initialDecisions);

    } catch (err) {
      console.error('Compatibility analysis failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, uploadService, analysisResult]);

  useEffect(() => {
    loadCompatibilityAnalysis();
  }, [loadCompatibilityAnalysis]);

  /**
   * Toggle section expansion
   */
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  /**
   * Update user decision for a column
   */
  const updateUserDecision = useCallback((columnName, action, approved = true) => {
    setUserDecisions(prev => ({
      ...prev,
      [columnName]: {
        action,
        approved,
        userOverride: action !== prev[columnName]?.action
      }
    }));
  }, []);

  /**
   * Get severity color and icon
   */
  const getSeverityDisplay = useCallback((severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return { 
          color: 'text-red-600', 
          bgColor: 'bg-red-50 border-red-200', 
          icon: AlertTriangle 
        };
      case 'medium':
        return { 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-50 border-yellow-200', 
          icon: Info 
        };
      case 'low':
        return { 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50 border-blue-200', 
          icon: Info 
        };
      default:
        return { 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-50 border-gray-200', 
          icon: Info 
        };
    }
  }, []);


  /**
   * Calculate overall status
   */
  const overallStatus = useMemo(() => {
    if (!compatibilityData || !llmRecommendations) return 'loading';
    
    const hasHighSeverityIssues = llmRecommendations.recommendations?.some(
      rec => rec.severity === 'high'
    );
    
    if (hasHighSeverityIssues) return 'requires_attention';
    if (compatibilityData.compatibility_analysis?.overall_compatible) return 'compatible';
    return 'review_needed';
  }, [compatibilityData, llmRecommendations]);

  /**
   * Check if user can proceed
   */
  const canProceed = useMemo(() => {
    if (overallStatus === 'loading') return false;
    if (overallStatus === 'compatible') return true;
    
    // Check if all high-severity issues have been addressed
    const highSeverityIssues = llmRecommendations?.recommendations?.filter(
      rec => rec.severity === 'high'
    ) || [];
    
    return highSeverityIssues.every(issue => 
      userDecisions[issue.column_name]?.approved
    );
  }, [overallStatus, llmRecommendations, userDecisions]);

  /**
   * Handle proceed action
   */
  const handleProceed = useCallback(() => {
    if (overallStatus === 'compatible') {
      onCompatibilityConfirmed({
        compatibilityData,
        llmRecommendations,
        userDecisions: {}
      });
    } else {
      onNeedsMappingReview({
        compatibilityData,
        llmRecommendations,
        userDecisions
      });
    }
  }, [overallStatus, compatibilityData, llmRecommendations, userDecisions, onCompatibilityConfirmed, onNeedsMappingReview]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prelude-800 mb-4"></div>
        <p className="text-gray-600">Analyzing schema compatibility...</p>
        <p className="text-sm text-gray-500 mt-2">Getting AI recommendations for your data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 font-medium">Compatibility Analysis Failed</p>
        <p className="text-gray-600 text-sm mt-2">{error}</p>
        <Button
          onClick={loadCompatibilityAnalysis}
          variant="outline"
          className="mt-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Analysis
        </Button>
      </div>
    );
  }

  const statusConfig = {
    compatible: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      title: 'Schema Compatible',
      description: 'Your data structure matches the target table perfectly'
    },
    requires_attention: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      title: 'Attention Required',
      description: 'Critical schema issues need to be resolved'
    },
    review_needed: {
      icon: Info,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      title: 'Review Recommended',
      description: 'Some compatibility issues detected'
    }
  };

  const currentStatus = statusConfig[overallStatus] || statusConfig.review_needed;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${currentStatus.bgColor}`}>
              <StatusIcon className={`w-6 h-6 ${currentStatus.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentStatus.title}</h3>
              <p className="text-sm text-gray-600">{currentStatus.description}</p>
            </div>
          </div>
          
          {compatibilityData?.compatibility_analysis && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(compatibilityData.compatibility_analysis.compatibility_score)}%
              </div>
              <div className="text-sm text-gray-600">Compatibility Score</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* LLM Recommendations Section */}
        {llmRecommendations?.recommendations?.length > 0 && (
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('recommendations')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-prelude-600" />
                  <CardTitle className="text-lg">AI Recommendations</CardTitle>
                  <span className="bg-prelude-100 text-prelude-800 px-2 py-1 rounded-full text-xs font-medium">
                    {llmRecommendations.recommendations.length} column differences
                  </span>
                </div>
                {expandedSections.recommendations ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            
            <AnimatePresence>
              {expandedSections.recommendations && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-4">
                    {llmRecommendations.recommendations.map((recommendation, index) => {
                      const severityDisplay = getSeverityDisplay(recommendation.severity);
                      const currentDecision = userDecisions[recommendation.column_name];
                      
                      return (
                        <div 
                          key={index}
                          className={`p-4 rounded-lg border-2 ${severityDisplay.bgColor}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-1 mb-2">
                                <span className="font-medium text-gray-900">
                                  {recommendation.column_name}
                                </span>
                                <span className={`text-sm font-medium ${severityDisplay.color}`}>
                                  ({recommendation.severity})
                                </span>
                              </div>
                              <div className="text-gray-700 text-sm">
                                {recommendation.recommendation}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant={currentDecision?.approved ? "default" : "outline"}
                              onClick={() => updateUserDecision(
                                recommendation.column_name, 
                                recommendation.suggested_action, 
                                true
                              )}
                              className="min-w-[80px] ml-4"
                            >
                              {currentDecision?.approved ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  OK
                                </>
                              ) : (
                                'Approve'
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}



      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {llmRecommendations?.overall_confidence && (
              <span>
                AI Confidence: {Math.round(llmRecommendations.overall_confidence * 100)}%
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Review Again
            </Button>
            
            <Button
              onClick={handleProceed}
              disabled={!canProceed}
              className="bg-prelude-800 hover:bg-prelude-900 text-white"
            >
              {overallStatus === 'compatible' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Proceed with Upload
                </>
              ) : (
                <>
                  Continue to Mapping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaCompatibilityPhase;