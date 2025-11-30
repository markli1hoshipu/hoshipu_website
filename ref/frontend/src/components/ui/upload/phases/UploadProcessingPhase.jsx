/**
 * Upload Processing Phase - Final step showing upload progress and results
 */
import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Download,
  Clock,
  Database,
  TrendingUp,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Button } from '../../primitives/button';
import { UPLOAD_STATES } from '../hooks/useUploadProgress';
import ErrorDisplay from '../components/ErrorDisplay';

const UploadProcessingPhase = ({
  selectedFile,
  uploadMode,
  userMappings,
  uploadState,
  progress,
  uploadResult,
  uploadError,
  parsedError,
  recoveryActions = [],
  logs,
  uploadStats,
  onStartUpload,
  onUploadComplete,
  onRetry,
  onRecoveryAction,
  formattedError,
  canAutoRetry,
  hasRecoveryOptions
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const completionCalledRef = useRef(false);

  // Auto-start upload when phase loads
  useEffect(() => {
    if (selectedFile && uploadState === UPLOAD_STATES.IDLE && onStartUpload) {
      onStartUpload(selectedFile, userMappings, uploadMode);
    }
  }, [selectedFile, uploadState, userMappings, uploadMode, onStartUpload]);

  // Handle upload completion - only call once per upload result
  useEffect(() => {
    if (uploadState === UPLOAD_STATES.SUCCESS && uploadResult && onUploadComplete && !completionCalledRef.current) {
      completionCalledRef.current = true;
      onUploadComplete(uploadResult);
    }
    
    // Reset the flag when upload state changes back to non-success states
    if (uploadState !== UPLOAD_STATES.SUCCESS) {
      completionCalledRef.current = false;
    }
  }, [uploadState, uploadResult, onUploadComplete]);

  const getStatusIcon = () => {
    switch (uploadState) {
      case UPLOAD_STATES.UPLOADING:
      case UPLOAD_STATES.PROCESSING:
        return <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />;
      case UPLOAD_STATES.RETRYING:
        return <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />;
      case UPLOAD_STATES.SUCCESS:
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case UPLOAD_STATES.ERROR:
      case UPLOAD_STATES.CANCELLED:
        return <X className="w-8 h-8 text-red-600" />;
      default:
        return <Upload className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (uploadState) {
      case UPLOAD_STATES.UPLOADING:
        return 'Uploading your file...';
      case UPLOAD_STATES.PROCESSING:
        return 'Processing data and applying mappings...';
      case UPLOAD_STATES.RETRYING:
        return `Retrying upload${uploadStats?.retryAttempts ? ` (attempt ${uploadStats.retryAttempts + 1})` : ''}...`;
      case UPLOAD_STATES.SUCCESS:
        return 'Upload completed successfully!';
      case UPLOAD_STATES.ERROR:
        return parsedError?.title || 'Upload failed';
      case UPLOAD_STATES.CANCELLED:
        return 'Upload was cancelled';
      default:
        return 'Preparing upload...';
    }
  };


  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {getStatusMessage()}
          </h3>
          {selectedFile && (
            <p className="text-gray-600 mt-1">
              {selectedFile.name} • {uploadMode === 'quick' ? 'Quick Upload' : 'Advanced Upload'}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {(uploadState === UPLOAD_STATES.UPLOADING || uploadState === UPLOAD_STATES.PROCESSING || uploadState === UPLOAD_STATES.RETRYING) && (
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
              {uploadStats?.retryAttempts > 0 && (
                <span className="text-orange-600 text-xs">
                  (Retry #{uploadStats.retryAttempts + 1})
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${
                  uploadState === UPLOAD_STATES.RETRYING 
                    ? 'bg-orange-600' 
                    : 'bg-prelude-800'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {uploadState === UPLOAD_STATES.RETRYING && (
              <div className="mt-2 text-xs text-orange-700 text-center">
                {canAutoRetry ? 'Auto-retry in progress...' : 'Manual retry in progress...'}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Upload Stats */}
      {uploadStats && (uploadStats.inProgress || uploadStats.success || uploadStats.failed) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upload Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {uploadStats.duration?.formatted || '---'}
                  </div>
                  <div className="text-gray-600">Duration</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{progress}%</div>
                  <div className="text-gray-600">Progress</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{uploadStats.logs}</div>
                  <div className="text-gray-600">Log Entries</div>
                </div>
                <div className="text-center">
                  <div className={`font-semibold ${
                    uploadStats.errors > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {uploadStats.errors}
                  </div>
                  <div className="text-gray-600">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Success Results */}
      {uploadState === UPLOAD_STATES.SUCCESS && uploadResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-green-900 mb-2">
                    Upload Successful!
                  </h4>
                  <p className="text-green-800 mb-4">
                    Your data has been successfully uploaded and processed.
                  </p>
                  
                  {/* Results Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {uploadResult.rows_processed && (
                      <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                        <Database className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="font-semibold text-green-900">
                          {uploadResult.rows_processed.toLocaleString()}
                        </div>
                        <div className="text-sm text-green-700">Rows Processed</div>
                      </div>
                    )}
                    
                    {uploadResult.columns_mapped && (
                      <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                        <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="font-semibold text-green-900">
                          {uploadResult.columns_mapped}
                        </div>
                        <div className="text-sm text-green-700">Columns Mapped</div>
                      </div>
                    )}
                    
                    {uploadResult.data_quality_score && (
                      <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="font-semibold text-green-900">
                          {Math.round(uploadResult.data_quality_score)}%
                        </div>
                        <div className="text-sm text-green-700">Quality Score</div>
                      </div>
                    )}
                    
                    <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                      <FileText className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="font-semibold text-green-900">
                        {uploadResult.table_name || 'N/A'}
                      </div>
                      <div className="text-sm text-green-700">Table Created</div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {uploadResult.message && (
                    <div className="p-3 bg-white rounded border border-green-200">
                      <p className="text-sm text-green-800">{uploadResult.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {uploadResult.warnings && uploadResult.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Warnings</h4>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      {uploadResult.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Error Results */}
      {uploadState === UPLOAD_STATES.ERROR && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ErrorDisplay
            error={{ message: uploadError }}
            parsedError={parsedError}
            recoveryActions={recoveryActions}
            onRecoveryAction={onRecoveryAction}
            onRetry={onRetry}
            showTechnicalDetails={true}
            className="mb-6"
          />
          
          {/* Upload Context Information */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Upload Context
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-orange-800">File:</span>
                  <div className="text-orange-700">{selectedFile?.name || 'Unknown'}</div>
                  <div className="text-xs text-orange-600">
                    {selectedFile?.size ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-orange-800">Mode:</span>
                  <div className="text-orange-700 capitalize">{uploadMode || 'Unknown'}</div>
                  <div className="text-xs text-orange-600">
                    {Object.keys(userMappings || {}).length} column mappings
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-orange-800">Attempts:</span>
                  <div className="text-orange-700">{(uploadStats?.retryAttempts || 0) + 1}</div>
                  <div className="text-xs text-orange-600">
                    {uploadStats?.duration?.formatted || 'No duration'}
                  </div>
                </div>
              </div>
              
              {canAutoRetry && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm text-blue-800">
                    <strong>Auto-retry available:</strong> This error type supports automatic retry.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Cancelled Results */}
      {uploadState === UPLOAD_STATES.CANCELLED && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <X className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-yellow-900 mb-2">
                    Upload Cancelled
                  </h4>
                  
                  <p className="text-yellow-800 mb-4">
                    The upload process was cancelled before completion. No data was modified.
                  </p>

                  <div className="flex gap-3">
                    <Button
                      onClick={onRetry}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Start Over
                    </Button>
                    
                    {logs.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowLogs(true)}
                        className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Progress Log
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Logs Panel */}
      <AnimatePresence>
        {showLogs && logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Upload Logs</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLogs(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto space-y-2 font-mono text-sm">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 rounded text-xs ${
                        log.type === 'error' ? 'bg-red-100 text-red-800' :
                        log.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        log.type === 'success' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <span className="text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      {' - '}
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {!uploadStats?.inProgress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          {logs.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowLogs(!showLogs)}
            >
              <FileText className="w-4 h-4 mr-2" />
              {showLogs ? 'Hide Logs' : 'View Logs'}
            </Button>
          )}

          {uploadResult?.view_url && (
            <Button
              variant="ghost"
              onClick={() => window.open(uploadResult.view_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Data
            </Button>
          )}

          {uploadResult?.download_url && (
            <Button variant="ghost">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default UploadProcessingPhase;