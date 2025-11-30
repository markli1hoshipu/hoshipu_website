/**
 * Progressive Upload Modal - Main component for intelligent file upload system
 */
import React, { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { Button } from '../../primitives/button';

// Import phase components
import FileSelectionPhase from './FileSelectionPhase';
import ModeDecisionPhase from './ModeDecisionPhase';
import SchemaCompatibilityPhase from './SchemaCompatibilityPhase';
import ColumnMappingPhase from './ColumnMappingPhase';
import UploadProcessingPhase from './UploadProcessingPhase';

// Import modals
import ErrorRecoveryModal from '../modals/ErrorRecoveryModal';

// Import hooks and services
import { useFileAnalysis } from '../hooks/useFileAnalysis';
import { useColumnMapping } from '../hooks/useColumnMapping';
import { useUploadProgress } from '../hooks/useUploadProgress';
import UploadService from '../services/uploadService';

// Import configuration
import { getServiceConfig, UPLOAD_PHASES } from '../utils/uploadConfig';

const ProgressiveUploadModal = ({
  isOpen,
  onClose,
  onUploadSuccess,
  config: customConfig = {}
}) => {
  // State management
  const [currentPhase, setCurrentPhase] = useState('file-selection');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileOptions, setFileOptions] = useState({});
  const [uploadMode, setUploadMode] = useState(null);
  const [compatibilityData, setCompatibilityData] = useState(null);
  const [llmRecommendations, setLlmRecommendations] = useState(null);
  
  // Error handling state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [criticalError, setCriticalError] = useState(null);
  const [errorRecoveryActions, setErrorRecoveryActions] = useState([]);

  // Create service configuration
  const config = useMemo(
    () => getServiceConfig(customConfig.targetService || 'nl2sql', customConfig),
    [customConfig]
  );

  // Initialize upload service
  const uploadService = useMemo(() => new UploadService(config), [config]);

  // Custom hooks
  const {
    analysisResult,
    isAnalyzing,
    analysisError,
    analyzeFile,
    resetAnalysis,
    getAnalysisSummary,
    isQuickUploadRecommended,
    getDataQuality
  } = useFileAnalysis(uploadService, config);

  const {
    userMappings,
    effectiveMappings,
    mappingStats,
    overallConfidence,
    validationResults,
    updateMapping,
    clearAllMappings,
    loadPreview,
    exportMappings
  } = useColumnMapping(analysisResult, uploadService);

  const {
    uploadState,
    progress,
    uploadResult,
    error: uploadError,
    parsedError,
    recoveryActions,
    logs,
    startUpload,
    resetUpload,
    retryUpload,
    executeRecoveryAction,
    getUploadStats,
    getFormattedError,
    canAutoRetry,
    hasRecoveryOptions
  } = useUploadProgress(uploadService);

  /**
   * Phase navigation configuration
   */
  const phases = {
    'file-selection': {
      component: FileSelectionPhase,
      title: 'Upload Data File',
      description: 'Choose your file and let AI analyze it',
      showBack: false
    },
    'mode-decision': {
      component: ModeDecisionPhase,
      title: 'Choose Upload Method',
      description: 'Select how you want to process your data',
      showBack: true
    },
    'schema-compatibility': {
      component: SchemaCompatibilityPhase,
      title: 'Schema Compatibility Review',
      description: 'AI recommendations for data structure',
      showBack: true
    },
    'column-mapping': {
      component: ColumnMappingPhase,
      title: 'Map Your Columns',
      description: 'Review and customize column mappings',
      showBack: true
    },
    'upload-processing': {
      component: UploadProcessingPhase,
      title: 'Processing Upload',
      description: 'Your data is being processed',
      showBack: false
    }
  };

  /**
   * Handle file selection and analysis
   */
  const handleFileSelected = useCallback(async (file, options = {}) => {
    setSelectedFile(file);
    setFileOptions(options); // Store file options including target_table
    
    try {
      const analysis = await analyzeFile(file, options);
      
      // Determine next phase based on analysis
      if (analysis.recommended_flow === 'quick_upload' && isQuickUploadRecommended()) {
        setUploadMode('quick');
        // For append operations, always show schema compatibility first
        if (analysis.existing_table_info) {
          setCurrentPhase('schema-compatibility');
        } else {
          setCurrentPhase('upload-processing');
        }
      } else {
        setCurrentPhase('mode-decision');
      }
      
    } catch (error) {
      console.error('File analysis failed:', error);
      // Handle analysis errors with enhanced error handling
      handleCriticalError(error, 'analysis');
    }
  }, [analyzeFile, isQuickUploadRecommended]);

  /**
   * Handle mode selection
   */
  const handleModeSelected = useCallback((mode) => {
    setUploadMode(mode);
    
    if (mode === 'quick') {
      // For append operations, show schema compatibility first
      if (analysisResult?.existing_table_info) {
        setCurrentPhase('schema-compatibility');
      } else {
        setCurrentPhase('upload-processing');
      }
    } else {
      // For advanced mode, check if we need schema compatibility review
      if (analysisResult?.existing_table_info && (analysisResult?.new_columns?.length > 0 || analysisResult?.missing_columns?.length > 0)) {
        setCurrentPhase('schema-compatibility');
      } else {
        setCurrentPhase('column-mapping');
      }
    }
  }, [analysisResult]);

  /**
   * Handle schema compatibility decisions
   */
  const handleCompatibilityConfirmed = useCallback((data) => {
    setCompatibilityData(data.compatibilityData);
    setLlmRecommendations(data.llmRecommendations);
    
    // Proceed directly to upload processing
    setCurrentPhase('upload-processing');
  }, []);
  
  const handleNeedsMappingReview = useCallback((data) => {
    setCompatibilityData(data.compatibilityData);
    setLlmRecommendations(data.llmRecommendations);
    setCurrentPhase('column-mapping');
  }, []);

  /**
   * Handle mapping completion
   */
  const handleMappingConfirmed = useCallback(() => {
    // Proceed directly to upload processing
    setCurrentPhase('upload-processing');
  }, []);
  

  /**
   * Handle upload start with stored file options
   */
  const handleStartUpload = useCallback((file, mappings, mode) => {
    return startUpload(file, mappings, mode, fileOptions);
  }, [startUpload, fileOptions]);

  /**
   * Handle upload completion
   */
  const handleUploadComplete = useCallback((result) => {
    if (onUploadSuccess) {
      onUploadSuccess(result);
    }
  }, [onUploadSuccess]);

  /**
   * Navigate back to previous phase
   */
  const handleBack = useCallback(() => {
    switch (currentPhase) {
      case 'mode-decision':
        setCurrentPhase('file-selection');
        break;
      case 'schema-compatibility':
        setCurrentPhase('mode-decision');
        break;
      case 'column-mapping':
        // Check if we came from schema compatibility or mode decision
        if (compatibilityData) {
          setCurrentPhase('schema-compatibility');
        } else {
          setCurrentPhase('mode-decision');
        }
        break;
      case 'upload-processing':
        if (uploadMode === 'advanced') {
          setCurrentPhase('column-mapping');
        } else if (compatibilityData) {
          setCurrentPhase('schema-compatibility');
        } else {
          setCurrentPhase('mode-decision');
        }
        break;
      default:
        break;
    }
  }, [currentPhase, uploadMode, compatibilityData]);

  /**
   * Handle critical errors that require immediate attention
   */
  const handleCriticalError = useCallback((error, context = {}) => {
    console.error('Critical error occurred:', error, context);
    
    // Check if this is a service-level critical error
    if (uploadService.isCriticalError(error)) {
      const displayError = uploadService.getDisplayError(error);
      setCriticalError(error.parsedError || displayError);
      setErrorRecoveryActions(error.parsedError?.suggestedActions || displayError.actions || []);
      setShowErrorModal(true);
    }
  }, [uploadService]);

  /**
   * Reset modal state including error state
   */
  const resetModal = useCallback(() => {
    setCurrentPhase('file-selection');
    setSelectedFile(null);
    setFileOptions({});
    setUploadMode(null);
    setCompatibilityData(null);
    setLlmRecommendations(null);
    
    // Reset error state
    setShowErrorModal(false);
    setCriticalError(null);
    setErrorRecoveryActions([]);
    
    resetAnalysis();
    clearAllMappings();
    resetUpload();
  }, [resetAnalysis, clearAllMappings, resetUpload]);

  /**
   * Handle error recovery actions
   */
  const handleErrorRecovery = useCallback(async (actionType, additionalContext = {}) => {
    try {
      const result = await executeRecoveryAction(actionType, additionalContext);
      
      // Handle different recovery actions
      switch (result.action) {
        case 'navigate':
          setCurrentPhase(result.phase);
          setShowErrorModal(false);
          break;
          
        case 'configure':
          if (result.mode === 'create') {
            setFileOptions({ ...fileOptions, target_table: null });
            setUploadMode('create');
          }
          if (result.clearTargetTable) {
            setFileOptions({ ...fileOptions, target_table: null });
          }
          setShowErrorModal(false);
          break;
          
        case 'retry':
          setShowErrorModal(false);
          if (result.immediate) {
            await retryUpload();
          }
          break;
          
        case 'cancel':
          setShowErrorModal(false);
          resetModal();
          break;
          
        case 'external':
          if (result.type === 'contact_admin') {
            // Handle admin contact logic
            console.log('Contact admin requested for error:', result.errorDetails);
          }
          break;
          
        default:
          console.log('Unhandled recovery action result:', result);
      }
      
      return result;
    } catch (recoveryError) {
      console.error('Error recovery action failed:', recoveryError);
      throw recoveryError;
    }
  }, [executeRecoveryAction, fileOptions, retryUpload, resetModal]);

  /**
   * Handle upload errors from the upload progress hook
   */
  const handleUploadError = useCallback((error) => {
    if (parsedError && parsedError.severity === 'critical') {
      setCriticalError(parsedError);
      setErrorRecoveryActions(recoveryActions);
      setShowErrorModal(true);
    }
  }, [parsedError, recoveryActions]);

  // Monitor upload errors
  React.useEffect(() => {
    if (uploadState === 'error' && parsedError) {
      handleUploadError(parsedError);
    }
  }, [uploadState, parsedError, handleUploadError]);

  /**
   * Handle modal close with error state consideration
   */
  const handleClose = useCallback(() => {
    // Prevent closing during upload or recovery
    if (uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'retrying' || uploadState === 'recovering') {
      return;
    }
    
    // Close error modal if open
    if (showErrorModal) {
      setShowErrorModal(false);
      return;
    }
    
    resetModal();
    onClose();
  }, [uploadState, showErrorModal, resetModal, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  const currentPhaseConfig = phases[currentPhase];
  const CurrentPhaseComponent = currentPhaseConfig.component;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-[110rem] w-full h-[95vh] flex flex-col"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <AnimatePresence>
              {currentPhaseConfig.showBack && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="p-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Service Icon */}
            <div className="w-10 h-10 bg-prelude-800 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-semibold">
                {config.displayName?.[0] || 'U'}
              </span>
            </div>

            {/* Title and Description */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {currentPhaseConfig.title}
              </h2>
              <p className="text-sm text-gray-600">
                {currentPhaseConfig.description}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'retrying' || uploadState === 'recovering'}
            className="p-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Step {Object.keys(phases).indexOf(currentPhase) + 1} of {Object.keys(phases).length}</span>
            <span>{config.displayName}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <motion.div
              className="bg-prelude-800 h-1 rounded-full"
              initial={{ width: '20%' }}
              animate={{ 
                width: currentPhase === 'file-selection' ? '20%' :
                       currentPhase === 'mode-decision' ? '40%' :
                       currentPhase === 'schema-compatibility' ? '60%' :
                       currentPhase === 'column-mapping' ? '80%' : '100%'
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Phase Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <CurrentPhaseComponent
                // Common props
                config={config}
                uploadService={uploadService}
                
                // File selection phase
                onFileSelected={handleFileSelected}
                
                // Analysis results
                analysisResult={analysisResult}
                isAnalyzing={isAnalyzing}
                analysisError={analysisError}
                analysisSummary={getAnalysisSummary()}
                dataQuality={getDataQuality()}
                
                // Mode decision phase
                onModeSelected={handleModeSelected}
                isQuickRecommended={isQuickUploadRecommended()}
                
                // Schema compatibility phase
                onCompatibilityConfirmed={handleCompatibilityConfirmed}
                onNeedsMappingReview={handleNeedsMappingReview}
                
                // Column mapping phase
                llmRecommendations={llmRecommendations}
                compatibilityData={compatibilityData}
                selectedFile={selectedFile}
                userMappings={userMappings}
                effectiveMappings={effectiveMappings}
                mappingStats={mappingStats}
                overallConfidence={overallConfidence}
                validationResults={validationResults}
                onUpdateMapping={updateMapping}
                onMappingConfirmed={handleMappingConfirmed}
                onLoadPreview={loadPreview}
                
                // Upload processing phase
                uploadMode={uploadMode}
                uploadState={uploadState}
                progress={progress}
                uploadResult={uploadResult}
                uploadError={uploadError}
                parsedError={parsedError}
                recoveryActions={recoveryActions}
                logs={logs}
                uploadStats={getUploadStats()}
                onStartUpload={handleStartUpload}
                onUploadComplete={handleUploadComplete}
                onRetry={() => setCurrentPhase('file-selection')}
                onRecoveryAction={handleErrorRecovery}
                formattedError={getFormattedError()}
                canAutoRetry={canAutoRetry()}
                hasRecoveryOptions={hasRecoveryOptions}
                
                // Export mappings for debugging
                exportMappings={exportMappings}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Error Recovery Modal */}
      <ErrorRecoveryModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        parsedError={criticalError}
        recoveryActions={errorRecoveryActions.map(actionType => {
          const action = recoveryActions.find(a => a.type === actionType);
          return action || { type: actionType, label: actionType.replace(/_/g, ' '), primary: false };
        })}
        onRecoveryAction={handleErrorRecovery}
        onRetry={retryUpload}
        allowDismiss={criticalError?.severity !== 'critical'}
        autoRetryCountdown={canAutoRetry() && criticalError?.retryable ? 10 : null}
      />
    </div>
  );
};

export default ProgressiveUploadModal;