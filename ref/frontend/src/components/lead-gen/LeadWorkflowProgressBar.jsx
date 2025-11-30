import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Users,
  Building,
  Target,
  Activity,
  Search,
  Database,
  Zap
} from 'lucide-react';

const LeadWorkflowProgressBar = ({ 
  progress = 0, 
  status = 'pending', 
  companiesFound = 0,
  personnelFound = 0,
  leadsCreated = 0,
  currentStep = '',
  errors = [],
  className = ''
}) => {
  // Define workflow steps with icons and descriptions
  const workflowSteps = [
    {
      id: 'yellowpages_scraping',
      icon: Search,
      label: 'Yellow Pages Search',
      description: 'Finding companies in target location',
      progressRange: [0, 40]
    },
    {
      id: 'linkedin_scraping',
      icon: Users,
      label: 'LinkedIn Personnel Search',
      description: 'Searching for personnel and contacts',
      progressRange: [40, 80]
    },
    {
      id: 'data_processing',
      icon: Activity,
      label: 'Data Processing',
      description: 'Processing and enriching data',
      progressRange: [80, 90]
    },
    {
      id: 'database_storage',
      icon: Database,
      label: 'Database Storage',
      description: 'Saving leads to database',
      progressRange: [90, 100]
    }
  ];

  // Get current step info
  const getCurrentStepInfo = () => {
    if (!currentStep) {
      // Determine step based on progress
      const stepFromProgress = workflowSteps.find(step => 
        progress >= step.progressRange[0] && progress < step.progressRange[1]
      );
      return stepFromProgress || workflowSteps[0];
    }
    
    return workflowSteps.find(step => step.id === currentStep) || workflowSteps[0];
  };

  const currentStepInfo = getCurrentStepInfo();

  // Status configurations
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-100',
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

  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Progress bar color based on status
  const getProgressBarColor = () => {
    switch (status) {
      case 'running':
        return 'bg-gradient-to-r from-blue-500 to-purple-500';
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'failed':
        return 'bg-gradient-to-r from-red-500 to-pink-500';
      case 'cancelled':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      default:
        return 'bg-gray-300';
    }
  };

  // Check if step is completed
  const isStepCompleted = (step) => {
    return progress > step.progressRange[1];
  };
    
  // Check if step is current
  const isStepCurrent = (step) => {
    return currentStepInfo.id === step.id;
  };

  // Get step status
  const getStepStatus = (step) => {
    if (isStepCompleted(step)) return 'completed';
    if (isStepCurrent(step)) return 'current';
    return 'pending';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Status Header */}
      <motion.div 
        className={`flex items-center gap-4 p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`p-3 rounded-full ${config.color} shadow-lg`}>
          <StatusIcon 
            className={`w-6 h-6 text-white ${config.animate ? 'animate-spin' : ''}`} 
          />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-lg font-bold ${config.textColor}`}>
              {config.label}
            </span>
            <span className={`text-xl font-mono font-bold ${config.textColor}`}>
              {progress}%
            </span>
          </div>
          
          {status === 'running' && currentStepInfo && (
            <div className="flex items-center gap-2">
              <currentStepInfo.icon className="w-4 h-4 text-gray-600" />
              <p className="text-sm text-gray-700 font-medium">
                {currentStepInfo.description}
            </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Enhanced Progress Bar */}
      <div className="space-y-4">
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
              className={`h-full ${getProgressBarColor()} rounded-full shadow-sm`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ 
              duration: 0.8, 
              ease: "easeOut",
              type: "spring",
              stiffness: 100
            }}
          />
          </div>
          
          {/* Progress pulse effect during running */}
          {status === 'running' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30"
              style={{ width: `${Math.min(progress, 100)}%` }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </div>
        
        {/* Progress Labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Start</span>
          <span>In Progress</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Step-by-Step Progress Indicators */}
      {status === 'running' && (
        <motion.div 
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            Workflow Steps
          </h4>
          
          <div className="space-y-3">
            {workflowSteps.map((step, index) => {
              const stepStatus = getStepStatus(step);
              const StepIcon = step.icon;
              
              return (
                <motion.div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                    stepStatus === 'completed' ? 'bg-green-50 border border-green-200' :
                    stepStatus === 'current' ? 'bg-blue-50 border border-blue-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className={`p-2 rounded-full ${
                    stepStatus === 'completed' ? 'bg-green-500' :
                    stepStatus === 'current' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}>
                    {stepStatus === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : stepStatus === 'current' ? (
                      <StepIcon className="w-4 h-4 text-white animate-pulse" />
                    ) : (
                      <StepIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        stepStatus === 'completed' ? 'text-green-700' :
                        stepStatus === 'current' ? 'text-blue-700' :
                        'text-gray-600'
                      }`}>
                        {step.label}
                      </span>
                      {stepStatus === 'current' && (
                        <motion.div
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [0.8, 1.2, 0.8]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      )}
                    </div>
                    <p className={`text-xs ${
                      stepStatus === 'completed' ? 'text-green-600' :
                      stepStatus === 'current' ? 'text-blue-600' :
                      'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div 
          className="bg-white border border-blue-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">
              {companiesFound}
            </span>
          </div>
          <span className="text-sm text-gray-600 font-medium">Companies Found</span>
        </motion.div>

        <motion.div 
          className="bg-white border border-purple-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">
              {personnelFound}
            </span>
          </div>
          <span className="text-sm text-gray-600 font-medium">Personnel Found</span>
        </motion.div>

        <motion.div 
          className="bg-white border border-green-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">
              {leadsCreated}
            </span>
          </div>
          <span className="text-sm text-gray-600 font-medium">Leads Created</span>
        </motion.div>
      </div>

      {/* Errors Section */}
      {errors && errors.length > 0 && (
        <motion.div 
          className="bg-red-50 border border-red-200 rounded-xl p-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold text-red-700">
              Errors ({errors.length})
            </span>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {errors.slice(0, 3).map((error, index) => (
              <div key={index} className="text-sm text-red-700 bg-white px-3 py-2 rounded-lg border border-red-200">
                {error}
              </div>
            ))}
            {errors.length > 3 && (
              <div className="text-sm text-red-600 italic font-medium">
                +{errors.length - 3} more errors...
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Enhanced Activity Indicator */}
      {status === 'running' && (
        <motion.div 
          className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
          <span className="text-sm font-medium text-blue-700">
            Workflow in progress - Please wait...
          </span>
          <motion.div
            className="flex space-x-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LeadWorkflowProgressBar; 