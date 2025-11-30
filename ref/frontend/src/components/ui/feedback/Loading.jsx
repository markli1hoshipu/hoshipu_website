import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// Simple spinner component
export const Spinner = ({ size = "md", color = "text-blue-600" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  return (
    <Loader2 className={`${sizeClasses[size]} ${color} animate-spin`} />
  );
};

// Button loading state
export const ButtonLoader = ({ children, isLoading, loadingText = "Loading..." }) => {
  return (
    <div className="flex items-center gap-2">
      {isLoading && <Spinner size="sm" color="text-current" />}
      <span>{isLoading ? loadingText : children}</span>
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay = ({ 
  isVisible, 
  message = "Loading...", 
  description = null 
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="text-center">
        <Spinner size="xl" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">{message}</h3>
        {description && (
          <p className="mt-2 text-gray-600 max-w-md">{description}</p>
        )}
      </div>
    </motion.div>
  );
};

// Card loading skeleton
export const CardSkeleton = ({ count = 1, height = "h-32" }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`bg-gray-200 rounded-lg ${height} animate-pulse`}>
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Inline loading for sections
export const InlineLoader = ({ 
  text = "Loading...", 
  size = "md",
  showText = true 
}) => {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <Spinner size={size} />
      {showText && <span className="text-sm">{text}</span>}
    </div>
  );
};

// Status indicator with loading states
export const StatusIndicator = ({ 
  status = "loading", // loading, success, error, idle
  message = "",
  size = "md"
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className={`w-${size === 'sm' ? '4' : '5'} h-${size === 'sm' ? '4' : '5'} text-green-600`} />,
          color: "text-green-600",
          bgColor: "bg-green-50"
        };
      case 'error':
        return {
          icon: <AlertCircle className={`w-${size === 'sm' ? '4' : '5'} h-${size === 'sm' ? '4' : '5'} text-red-600`} />,
          color: "text-red-600",
          bgColor: "bg-red-50"
        };
      case 'loading':
        return {
          icon: <Spinner size={size === 'sm' ? 'sm' : 'md'} />,
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        };
      default:
        return {
          icon: null,
          color: "text-gray-600",
          bgColor: "bg-gray-50"
        };
    }
  };

  const config = getStatusConfig();

  if (status === 'idle' && !message) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor}`}>
      {config.icon}
      {message && (
        <span className={`text-sm font-medium ${config.color}`}>
          {message}
        </span>
      )}
    </div>
  );
};

// Progress bar for multi-step processes
export const ProgressBar = ({ 
  current = 0, 
  total = 100, 
  label = null,
  showPercentage = true 
}) => {
  const percentage = Math.min(Math.max((current / total) * 100, 0), 100);

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-blue-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};

// Auto-save indicator
export const AutoSaveIndicator = ({ 
  status = "idle", // idle, saving, saved, error
  lastSaved = null 
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Spinner size="sm" />,
          text: "Saving...",
          color: "text-blue-600"
        };
      case 'saved':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: lastSaved ? `Saved ${lastSaved}` : "Saved",
          color: "text-green-600"
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-600" />,
          text: "Save failed",
          color: "text-red-600"
        };
      default:
        return null;
    }
  };

  const display = getStatusDisplay();
  if (!display) return null;

  return (
    <div className={`flex items-center gap-1 text-xs ${display.color}`}>
      {display.icon}
      <span>{display.text}</span>
    </div>
  );
};

// Form loading overlay for modal forms
export const FormLoadingOverlay = ({ 
  isVisible, 
  message = "Processing...",
  progress = null 
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
    >
      <div className="text-center p-6">
        <Spinner size="lg" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">{message}</h3>
        {progress && (
          <div className="mt-4 w-48">
            <ProgressBar current={progress.current} total={progress.total} showPercentage />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Error recovery component
export const ErrorRecovery = ({
  title = "Something went wrong",
  message = "We couldn't complete your request right now.",
  onRetry,
  onCancel,
  retryText = "Try Again",
  cancelText = "Cancel"
}) => {
  return (
    <div className="text-center p-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
      <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">{title}</h3>
      <p className="text-red-700 dark:text-red-300 mb-6 max-w-md mx-auto">{message}</p>
      <div className="flex gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            {retryText}
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            {cancelText}
          </button>
        )}
      </div>
    </div>
  );
};

export default {
  Spinner,
  ButtonLoader,
  LoadingOverlay,
  CardSkeleton,
  InlineLoader,
  StatusIndicator,
  ProgressBar,
  AutoSaveIndicator,
  FormLoadingOverlay,
  ErrorRecovery
}; 