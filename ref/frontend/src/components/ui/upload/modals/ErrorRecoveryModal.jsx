/**
 * Error Recovery Modal - Modal dialog for critical errors requiring immediate user decision
 * Provides focused error handling with clear recovery paths
 */
import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  X, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ArrowRight,
  Clock,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Badge } from '../../primitives/badge';
import { Separator } from '../../primitives/separator';
import { ERROR_SEVERITY, RECOVERY_ACTIONS } from '../utils/errorConstants';

const ErrorRecoveryModal = ({
  isOpen,
  onClose,
  parsedError,
  recoveryActions = [],
  onRecoveryAction,
  onRetry,
  allowDismiss = true,
  autoRetryCountdown = null
}) => {
  const [executingAction, setExecutingAction] = useState(null);
  const [autoRetrySeconds, setAutoRetrySeconds] = useState(autoRetryCountdown);
  const [showAutoRetry, setShowAutoRetry] = useState(Boolean(autoRetryCountdown));

  // Auto-retry countdown logic
  useEffect(() => {
    if (!showAutoRetry || autoRetrySeconds <= 0) return;

    const timer = setInterval(() => {
      setAutoRetrySeconds(prev => {
        if (prev <= 1) {
          setShowAutoRetry(false);
          onRetry?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showAutoRetry, autoRetrySeconds, onRetry]);

  // Cancel auto-retry
  const cancelAutoRetry = useCallback(() => {
    setShowAutoRetry(false);
    setAutoRetrySeconds(0);
  }, []);

  // Handle recovery action execution
  const handleRecoveryAction = useCallback(async (actionType) => {
    if (!onRecoveryAction) return;

    setExecutingAction(actionType);
    try {
      const result = await onRecoveryAction(actionType);
      
      // Auto-close modal on successful action execution
      if (result?.action !== 'none' && result?.action !== 'invalid') {
        setTimeout(() => onClose(), 500);
      }
    } catch (error) {
      console.error('Recovery action failed:', error);
    } finally {
      setExecutingAction(null);
    }
  }, [onRecoveryAction, onClose]);

  // Don't render if not open or no error
  if (!isOpen || !parsedError) return null;

  // Get error severity styling
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-500',
          badgeColor: 'bg-red-100 text-red-800'
        };
      case ERROR_SEVERITY.HIGH:
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-500',
          badgeColor: 'bg-orange-100 text-orange-800'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-500',
          badgeColor: 'bg-yellow-100 text-yellow-800'
        };
    }
  };

  const severityConfig = getSeverityConfig(parsedError.severity);
  const SeverityIcon = severityConfig.icon;

  // Group actions by priority
  const primaryActions = recoveryActions.filter(action => action.primary);
  const secondaryActions = recoveryActions.filter(action => !action.primary);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black bg-opacity-60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className={`border-2 ${severityConfig.borderColor}`}>
          <CardHeader className={`${severityConfig.bgColor} border-b border-gray-200`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full bg-white shadow-sm`}>
                  <SeverityIcon className={`w-8 h-8 ${severityConfig.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {parsedError.title}
                    </CardTitle>
                    <Badge className={severityConfig.badgeColor}>
                      {parsedError.severity?.toUpperCase()} ERROR
                    </Badge>
                  </div>
                  
                  <p className="text-gray-800 leading-relaxed text-base">
                    {parsedError.userMessage}
                  </p>
                </div>
              </div>

              {/* Close button (if dismissible) */}
              {allowDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Auto-retry countdown */}
            {showAutoRetry && autoRetrySeconds > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">
                        Auto-retry in {autoRetrySeconds} seconds
                      </div>
                      <div className="text-sm text-blue-700">
                        We'll automatically retry this operation
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelAutoRetry}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Cancel Auto-retry
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Primary Recovery Actions */}
            {primaryActions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Recommended Solutions</h3>
                </div>
                
                <div className="space-y-3">
                  {primaryActions.map((action, index) => {
                    const isExecuting = executingAction === action.type;
                    
                    return (
                      <motion.div
                        key={action.type}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-1">
                              {action.label}
                            </div>
                            {action.description && (
                              <div className="text-sm text-gray-600 mb-3">
                                {action.description}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            onClick={() => handleRecoveryAction(action.type)}
                            disabled={isExecuting}
                            className="ml-4 flex items-center gap-2"
                          >
                            {isExecuting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4" />
                            )}
                            {isExecuting ? 'Processing...' : 'Execute'}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Separator between primary and secondary actions */}
            {primaryActions.length > 0 && secondaryActions.length > 0 && (
              <Separator className="my-6" />
            )}

            {/* Secondary Recovery Actions */}
            {secondaryActions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Other Options</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {secondaryActions.map((action) => {
                    const isExecuting = executingAction === action.type;
                    
                    return (
                      <Button
                        key={action.type}
                        onClick={() => handleRecoveryAction(action.type)}
                        disabled={isExecuting}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start text-left"
                      >
                        <div className="font-medium mb-1">
                          {isExecuting ? (
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Processing...
                            </div>
                          ) : (
                            action.label
                          )}
                        </div>
                        {action.description && !isExecuting && (
                          <div className="text-xs text-gray-500">
                            {action.description}
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual retry option for retryable errors */}
            {parsedError.retryable && onRetry && !showAutoRetry && (
              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 h-12"
                >
                  <RefreshCw className="w-5 h-5" />
                  Retry Operation Now
                </Button>
              </div>
            )}

            {/* Error details for debugging */}
            {parsedError.code && (
              <div className="pt-4 border-t border-gray-200">
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
                    <span>Technical Details</span>
                    <ExternalLink className="w-4 h-4" />
                  </summary>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Error Code:</span>
                        <span className="ml-2 font-mono">{parsedError.code}</span>
                      </div>
                      {parsedError.httpStatus && (
                        <div>
                          <span className="font-medium">HTTP Status:</span>
                          <span className="ml-2 font-mono">{parsedError.httpStatus}</span>
                        </div>
                      )}
                      {parsedError.type && (
                        <div>
                          <span className="font-medium">Error Type:</span>
                          <span className="ml-2 font-mono">{parsedError.type}</span>
                        </div>
                      )}
                      {parsedError.timestamp && (
                        <div>
                          <span className="font-medium">Time:</span>
                          <span className="ml-2">{new Date(parsedError.timestamp).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ErrorRecoveryModal;