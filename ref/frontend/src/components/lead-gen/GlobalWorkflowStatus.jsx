import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  X,
  Eye
} from 'lucide-react';
import { useWorkflow } from '../../contexts/WorkflowContext';
import { Button } from '../ui/primitives/button';

const GlobalWorkflowStatus = () => {
  const {
    currentSessionId,
    sessionStatus,
    isRunning,
    isCompleted,
    isFailed,
    isCancelled,
    progress,
    companiesFound,
    personnelFound,
    leadsCreated,
    cancelWorkflow,
    resetWorkflow
  } = useWorkflow();

  // Don't show if no active session
  if (!currentSessionId || !sessionStatus) {
    return null;
  }

  // Status configurations
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Pending'
    },
    running: {
      icon: Loader2,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Running',
      animate: true
    },
    completed: {
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Failed'
    },
    cancelled: {
      icon: AlertCircle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Cancelled'
    }
  };

  const config = statusConfig[sessionStatus.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`fixed top-16 right-4 z-40 ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg max-w-sm`}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-full ${config.color}`}>
                <StatusIcon 
                  className={`w-4 h-4 text-white ${config.animate ? 'animate-spin' : ''}`} 
                />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">Lead Workflow</h4>
                <p className={`text-xs ${config.textColor}`}>{config.label}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Navigate to leads button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Dispatch custom event to navigate to leads
                  window.dispatchEvent(new CustomEvent('navigate-to-leads'));
                }}
                className="p-1 h-auto"
                title="View in Leads section"
              >
                <Eye className="w-3 h-3" />
              </Button>
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetWorkflow}
                className="p-1 h-auto"
                title="Close"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className="bg-blue-500 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-gray-900">{companiesFound}</div>
              <div className="text-gray-500">Companies</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{personnelFound}</div>
              <div className="text-gray-500">Personnel</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{leadsCreated}</div>
              <div className="text-gray-500">Leads</div>
            </div>
          </div>

          {/* Actions */}
          {isRunning && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelWorkflow}
                className="w-full text-xs h-7"
              >
                Cancel Workflow
              </Button>
            </div>
          )}

          {(isCompleted || isFailed || isCancelled) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={resetWorkflow}
                className="w-full text-xs h-7"
              >
                Clear Status
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalWorkflowStatus; 