/**
 * Column Mapping Phase - Simplified column mapping interface
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Plus,
  Wand2,
  RotateCcw,
  Play
} from 'lucide-react';
import { Button } from '../../primitives/button';
import MappingPreview from '../components/MappingPreview';
import VirtualColumnGrid from '../components/VirtualColumnGrid';
import { DropdownProvider, useDropdownContext } from '../contexts/DropdownContext';

const ColumnMappingContent = ({
  selectedFile,
  analysisResult,
  userMappings,
  effectiveMappings,
  overallConfidence,
  validationResults,
  onUpdateMapping,
  onMappingConfirmed,
  onLoadPreview,
  llmRecommendations
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Get dropdown context for cleanup
  const { closeAllDropdowns } = useDropdownContext();
  
  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      closeAllDropdowns();
      setPreviewData(null);
    };
  }, [closeAllDropdowns]);

  const loadPreview = useCallback(async () => {
    if (!selectedFile || !onLoadPreview) return;

    setIsLoadingPreview(true);
    try {
      const result = await onLoadPreview(selectedFile);
      setPreviewData(result);
    } catch (error) {
      // Handle preview loading error silently for production
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedFile, onLoadPreview]);

  // Load preview automatically when mappings change
  useEffect(() => {
    if (selectedFile && Object.keys(userMappings).length > 0) {
      loadPreview();
    }
  }, [selectedFile, userMappings, loadPreview]);

  const handleMappingChange = useCallback((sourceColumnName, targetValue) => {
    if (onUpdateMapping) {
      // Handle special mapping options
      if (targetValue === 'import_as_new') {
        // Store as special value to maintain selection
        onUpdateMapping(sourceColumnName, 'import_as_new');
      } else if (targetValue === 'ignore_column') {
        // Store as special value to track ignored columns
        onUpdateMapping(sourceColumnName, 'ignore_column');
      } else if (targetValue === 'none' || targetValue === '') {
        // Clear mapping
        onUpdateMapping(sourceColumnName, null);
      } else {
        // Normal column mapping
        onUpdateMapping(sourceColumnName, targetValue);
      }
    }
  }, [onUpdateMapping]);

  // Dropdown state management handled by context

  const autoApplyHighConfidence = useCallback(() => {
    if (!analysisResult?.mapping_suggestions) return;

    analysisResult.mapping_suggestions
      .filter(rule => rule.target_column && rule.confidence >= 90)
      .forEach(rule => {
        onUpdateMapping(rule.source_column, rule.target_column);
      });
  }, [analysisResult?.mapping_suggestions, onUpdateMapping]);

  const resetMappings = useCallback(() => {
    if (!analysisResult?.mapping_suggestions) return;

    // Clear all user mappings first
    Object.keys(userMappings).forEach(sourceColumn => {
      onUpdateMapping(sourceColumn, null);
    });

    // Apply AI suggestions synchronously (React will batch these updates)
    analysisResult.mapping_suggestions
      .filter(rule => rule.target_column)
      .forEach(rule => {
        onUpdateMapping(rule.source_column, rule.target_column);
      });
  }, [analysisResult?.mapping_suggestions, userMappings, onUpdateMapping]);

  // Removed unused ignoreUnrecommendedColumns function

  // Bulk ignore unmapped columns
  const ignoreUnmappedColumns = () => {
    const sortedColumns = getSortedSourceColumns();
    if (!sortedColumns) return;

    sortedColumns.forEach(column => {
      const currentMapping = effectiveMappings.find(m => m.source_column === column.name);
      if (!currentMapping?.target_column) {
        onUpdateMapping(column.name, 'ignore_column');
      }
    });
  };

  // Auto-apply import as new for extra columns
  const importUnmappedAsNew = () => {
    const sortedColumns = getSortedSourceColumns();
    if (!sortedColumns) return;

    sortedColumns.forEach(column => {
      const currentMapping = effectiveMappings.find(m => m.source_column === column.name);
      if (!currentMapping?.target_column) {
        onUpdateMapping(column.name, 'import_as_new');
      }
    });
  };

  // Cache column data separately for better performance
  const sourceColumns = useMemo(() => 
    analysisResult?.source_columns || [], 
    [analysisResult?.source_columns]
  );

  const mappingSuggestions = useMemo(() => 
    analysisResult?.mapping_suggestions || [], 
    [analysisResult?.mapping_suggestions]
  );

  // Performance optimization: Memoize column position map for fast lookups
  const columnPositionMap = useMemo(() => {
    if (!sourceColumns.length) return new Map();
    
    const positionMap = new Map();
    sourceColumns.forEach(column => {
      positionMap.set(column.name, column.original_position ?? 0);
    });
    return positionMap;
  }, [sourceColumns]);

  // Source columns sorted by mapping status and confidence
  const getSortedSourceColumns = useCallback(() => {
    if (!sourceColumns.length) return [];
    
    return [...sourceColumns].sort((a, b) => {
      // Sort by mapping status (mapped first), then by confidence desc, then by original position
      const aMapping = effectiveMappings.find(rule => rule.source_column === a.name);
      const bMapping = effectiveMappings.find(rule => rule.source_column === b.name);
      const aConfidence = aMapping?.confidence || 0;
      const bConfidence = bMapping?.confidence || 0;
      
      // Mapped items first
      if (aMapping?.target_column && !bMapping?.target_column) return -1;
      if (!aMapping?.target_column && bMapping?.target_column) return 1;
      
      // Then by confidence
      if (aConfidence !== bConfidence) {
        return bConfidence - aConfidence;
      }
      
      // Finally by original CSV column position (using memoized map for performance)
      const aPosition = columnPositionMap.get(a.name) ?? 0;
      const bPosition = columnPositionMap.get(b.name) ?? 0;
      return aPosition - bPosition;
    });
  }, [sourceColumns, effectiveMappings, columnPositionMap]);

  // Removed unused memoized maps for column identifiers and sample previews

  // Extract target columns from analysis result
  const { existing_table_info = null } = analysisResult;
  const targetColumns = existing_table_info?.columns || [];

  // Get LLM recommendation for a column
  const getLlmRecommendation = useCallback((columnName) => {
    return llmRecommendations?.recommendations?.find(
      rec => rec.column_name === columnName
    );
  }, [llmRecommendations]);

  // Generate dropdown options for a specific column (lazy loading)
  const generateOptionsForColumn = useCallback((sourceColumnName) => {

    // Always allow options generation if we have source columns, even without target columns
    if (!sourceColumns.length) {
      return [];
    }

    // Get already mapped target columns to exclude them from dropdowns
    const alreadyMappedTargets = new Set();
    effectiveMappings.forEach(mapping => {
      if (mapping.target_column && mapping.target_column !== 'import_as_new') {
        alreadyMappedTargets.add(mapping.target_column);
      }
    });

    const sourceColumn = sourceColumns.find(col => col.name === sourceColumnName);
    if (!sourceColumn) {
      return [];
    }

    const aiSuggestion = mappingSuggestions.find(
      s => s.source_column === sourceColumn.name && s.target_column
    );
    const llmRec = getLlmRecommendation(sourceColumn.name);
    const currentMapping = effectiveMappings.find(m => m.source_column === sourceColumn.name);


    const options = [];

    // Always add "Choose column..." as first option if no mapping exists
    if (!currentMapping?.target_column) {
      options.push({
        value: '',
        label: 'Choose column...',
        type: 'choose',
        confidence: null,
        isRecommended: false,
        hasLlmSupport: false,
        group: 'default'
      });
    }

    // Add AI recommendation first if it exists and is available
    if (aiSuggestion && aiSuggestion.target_column &&
        (!alreadyMappedTargets.has(aiSuggestion.target_column) ||
         currentMapping?.target_column === aiSuggestion.target_column)) {
      const label = llmRec ?
        `${aiSuggestion.target_column} (AI + LLM Recommended)` :
        `${aiSuggestion.target_column} (AI Recommended)`;

      options.push({
        value: aiSuggestion.target_column,
        label,
        type: 'ai_recommendation',
        confidence: aiSuggestion.confidence,
        isRecommended: true,
        hasLlmSupport: !!llmRec,
        group: 'ai_recommendations'
      });
    }

    // If no AI suggestion exists, prioritize "Import as new column" for extra CSV columns
    if (!aiSuggestion?.target_column) {
      options.push({
        value: 'import_as_new',
        label: 'Import as new column (Recommended)',
        type: 'import_new',
        confidence: null,
        isRecommended: true,
        hasLlmSupport: false,
        group: 'import_options'
      });
    }

    // Add other available target columns (excluding already mapped ones) - only if target columns exist
    if (targetColumns.length > 0) {
      targetColumns.forEach(targetCol => {
        const isCurrentMapping = currentMapping?.target_column === targetCol.name;
        const isAlreadyMapped = alreadyMappedTargets.has(targetCol.name);
        const isAiSuggestion = aiSuggestion && targetCol.name === aiSuggestion.target_column;

        // Include column if: it's not already mapped OR it's the current mapping OR it's the AI suggestion
        if (!isAlreadyMapped || isCurrentMapping || isAiSuggestion) {
          // Skip if already added as AI suggestion
          if (!isAiSuggestion) {
            options.push({
              value: targetCol.name,
              label: targetCol.name,
              type: 'database_column',
              confidence: null,
              isRecommended: false,
              hasLlmSupport: false,
              group: 'database_columns'
            });
          }
        }
      });
    }

    // Add "Import as new column" option if not already added as recommended
    if (aiSuggestion?.target_column) {
      options.push({
        value: 'import_as_new',
        label: 'Import as new column',
        type: 'import_new',
        confidence: null,
        isRecommended: false,
        hasLlmSupport: false,
        group: 'import_options'
      });
    }

    // Always add "Ignore column" option
    options.push({
      value: 'ignore_column',
      label: 'Ignore column',
      type: 'ignore_column',
      confidence: null,
      isRecommended: false,
      hasLlmSupport: false,
      group: 'import_options',
      description: 'Exclude this column from import'
    });

    return options;
  }, [sourceColumns, mappingSuggestions, targetColumns, getLlmRecommendation, effectiveMappings]);


  // Removed unused helper functions getColumnIdentifier and getSamplePreview


  if (!analysisResult) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Removed unused getCurrentMapping function




  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-medium text-gray-900">
                Map Your Columns ({effectiveMappings.filter(m => m.target_column).length} of {analysisResult?.source_columns?.length || 0} mapped)
              </h3>
              <p className="text-sm text-gray-600">Match source columns to target database fields</p>
            </div>
            
            
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={autoApplyHighConfidence}
              title="Auto-apply high confidence mappings (90%+)"
              className="text-prelude-700 hover:text-prelude-800 hover:bg-prelude-50"
            >
              <Wand2 className="w-4 h-4 mr-1" />
              Auto Map
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={importUnmappedAsNew}
              title="Import all unmapped columns as new columns"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Import All
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={ignoreUnmappedColumns}
              title="Ignore all unmapped columns"
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            >
              <EyeOff className="w-4 h-4 mr-1" />
              Ignore All
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetMappings}
              title="Reset to AI suggestions"
              className="text-gray-600 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-gray-600 hover:text-gray-700"
            >
              <Eye className="w-4 h-4 mr-1" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>
        </div>
      </div>



      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className={`flex-1 min-h-0 grid transition-all duration-300 ${
          showPreview ? 'grid-cols-2' : 'grid-cols-1'
        } gap-0`}>

          {/* Column Mapping Section */}
          <div className="flex flex-col min-h-0 h-full">

            <div className="flex-1 min-h-0 p-6 flex flex-col">
              <VirtualColumnGrid
                columns={getSortedSourceColumns()}
                generateOptionsForColumn={generateOptionsForColumn}
                handleMappingChange={handleMappingChange}
                getLlmRecommendation={getLlmRecommendation}
                effectiveMappings={effectiveMappings}
                className="flex-1 min-h-0"
              />
            </div>
          </div>

          {/* Preview Panel */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-col border-l border-gray-200"
              >
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Data Preview</h4>
                  <p className="text-sm text-gray-600">Preview with current mappings</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  <MappingPreview
                    previewData={previewData}
                    mappings={userMappings}
                    dataIssues={analysisResult.data_issues || []}
                    isLoading={isLoadingPreview}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        {/* Validation Results */}
        {validationResults && (
          <div className="mb-4">
            {validationResults.issues.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Issues Found</h4>
                    <ul className="text-sm text-red-700 mt-1 space-y-1">
                      {validationResults.issues.slice(0, 3).map((issue, index) => (
                        <li key={index}>• {issue.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {validationResults.warnings.length > 0 && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Warnings</h4>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      {validationResults.warnings.slice(0, 2).map((warning, index) => (
                        <li key={index}>• {warning.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {overallConfidence > 0 && (
              <span>{overallConfidence}% confidence</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!showPreview && (
              <Button
                variant="ghost"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Data
              </Button>
            )}

            <Button
              onClick={onMappingConfirmed}
              disabled={!validationResults?.canProceed}
              className="bg-prelude-800 hover:bg-prelude-900 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Continue Upload
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component with DropdownProvider
const ColumnMappingPhase = (props) => {
  return (
    <DropdownProvider>
      <ColumnMappingContent {...props} />
    </DropdownProvider>
  );
};

export default ColumnMappingPhase;