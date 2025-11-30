/**
 * Error Display Component - Comprehensive error display for upload operations
 * Handles different error types with specific UI patterns and recovery actions
 */
import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Shield,
  Database,
  Network,
  Settings,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Badge } from '../../primitives/badge';
import { ERROR_SEVERITY, RECOVERY_ACTIONS } from '../utils/errorConstants';

const ErrorDisplay = ({
  error,
  parsedError,
  recoveryActions = [],
  onRecoveryAction,
  onRetry,
  showTechnicalDetails = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [executingAction, setExecutingAction] = useState(null);

  // Get error severity styling
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeColor: 'bg-red-100 text-red-800'
        };
      case ERROR_SEVERITY.HIGH:
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeColor: 'bg-orange-100 text-orange-800'
        };
      case ERROR_SEVERITY.MEDIUM:
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeColor: 'bg-yellow-100 text-yellow-800'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800'
        };
    }
  };

  // Get icon for recovery actions
  const getActionIcon = (actionType) => {
    const iconMap = {
      [RECOVERY_ACTIONS.RETRY]: RefreshCw,
      [RECOVERY_ACTIONS.RETRY_WITH_BACKOFF]: Clock,
      [RECOVERY_ACTIONS.SELECT_DIFFERENT_TABLE]: Database,
      [RECOVERY_ACTIONS.USE_ADVANCED_MAPPING]: Settings,
      [RECOVERY_ACTIONS.CONTACT_ADMIN]: HelpCircle,
      [RECOVERY_ACTIONS.REFRESH_CONNECTION]: Network
    };
    return iconMap[actionType] || Settings;
  };

  // Handle recovery action execution
  const handleRecoveryAction = useCallback(async (actionType) => {
    if (!onRecoveryAction) return;

    setExecutingAction(actionType);
    try {
      await onRecoveryAction(actionType);
    } catch (error) {
      console.error('Recovery action failed:', error);
    } finally {
      setExecutingAction(null);
    }
  }, [onRecoveryAction]);

  // Use parsed error if available, otherwise create basic error display
  const displayError = parsedError || {
    title: 'Upload Error',
    userMessage: error?.message || 'An unexpected error occurred',
    severity: ERROR_SEVERITY.HIGH,
    recoverable: false,
    retryable: false,
    type: 'unknown_error'
  };

  const severityConfig = getSeverityConfig(displayError.severity);
  const SeverityIcon = severityConfig.icon;

  // Group recovery actions by priority
  const primaryActions = recoveryActions.filter(action => action.primary);
  const secondaryActions = recoveryActions.filter(action => !action.primary);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${className}`}
    >
      <Card className={`${severityConfig.borderColor} ${severityConfig.bgColor}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${severityConfig.bgColor}`}>
              <SeverityIcon className={`w-6 h-6 ${severityConfig.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {displayError.title}
                </CardTitle>
                <Badge className={severityConfig.badgeColor}>
                  {displayError.severity?.toUpperCase()}
                </Badge>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                {displayError.userMessage}
              </p>
              
              {/* Error metadata */}
              {parsedError && (
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  {parsedError.recoverable && (
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      <span>Recoverable</span>
                    </div>
                  )}
                  {parsedError.retryable && (
                    <div className="flex items-center gap-1">
                      <RefreshCw className="w-4 h-4" />
                      <span>Retryable</span>
                    </div>
                  )}
                  <div className="text-xs">
                    Type: {parsedError.type}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Primary Recovery Actions */}
          {primaryActions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Recommended Actions</h4>
              <div className="flex flex-wrap gap-2">
                {primaryActions.map((action) => {
                  const ActionIcon = getActionIcon(action.type);
                  const isExecuting = executingAction === action.type;
                  
                  return (
                    <Button
                      key={action.type}
                      onClick={() => handleRecoveryAction(action.type)}
                      disabled={isExecuting}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isExecuting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ActionIcon className="w-4 h-4" />
                      )}
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Secondary Recovery Actions */}
          {secondaryActions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Other Options</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {secondaryActions.map((action) => {
                  const ActionIcon = getActionIcon(action.type);
                  const isExecuting = executingAction === action.type;
                  
                  return (
                    <Button
                      key={action.type}
                      onClick={() => handleRecoveryAction(action.type)}
                      disabled={isExecuting}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 justify-start h-auto p-3"
                    >
                      {isExecuting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ActionIcon className="w-4 h-4" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {action.description}
                          </div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Retry Button for Retryable Errors */}
          {displayError.retryable && onRetry && (
            <div className="pt-2 border-t border-gray-200">
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Technical Details (Expandable) */}
          {(showTechnicalDetails || parsedError) && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Technical Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show Technical Details
                  </>
                )}
              </Button>
              
              {showDetails && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-3 text-sm">
                    {parsedError?.code && (
                      <div>
                        <span className="font-medium text-gray-700">Error Code:</span>
                        <span className="ml-2 font-mono text-gray-600">{parsedError.code}</span>
                      </div>
                    )}
                    
                    {parsedError?.httpStatus && (
                      <div>
                        <span className="font-medium text-gray-700">HTTP Status:</span>
                        <span className="ml-2 font-mono text-gray-600">{parsedError.httpStatus}</span>
                      </div>
                    )}
                    
                    {parsedError?.message && parsedError.message !== parsedError.userMessage && (
                      <div>
                        <span className="font-medium text-gray-700">Technical Message:</span>
                        <div className="mt-1 p-2 bg-white rounded border font-mono text-xs text-gray-600 whitespace-pre-wrap">
                          {parsedError.message}
                        </div>
                      </div>
                    )}
                    
                    {parsedError?.details && Object.keys(parsedError.details).length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Additional Details:</span>
                        <div className="mt-1 p-2 bg-white rounded border">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(parsedError.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {parsedError?.timestamp && (
                      <div>
                        <span className="font-medium text-gray-700">Timestamp:</span>
                        <span className="ml-2 font-mono text-gray-600">
                          {new Date(parsedError.timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Link for Critical Errors */}
          {displayError.severity === ERROR_SEVERITY.CRITICAL && (
            <div className="pt-2 border-t border-gray-200">
              <Button
                variant="link"
                size="sm"
                className="w-full flex items-center justify-center gap-2 text-gray-500"
                onClick={() => {
                  // Open help documentation or support
                  window.open(`/help/upload-errors#${displayError.type}`, '_blank');
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Get Help with This Error
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ErrorDisplay;