import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Play,
  Square,
  RotateCcw,
  Settings,
  Info,
  MapPin,
  Building2,
  Tag,
  Hash,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Target
} from 'lucide-react';

import { Button } from '../ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import leadWorkflowApiService from '../../services/leadWorkflowApi';
import leadWorkflowIntegration from '../../services/leadWorkflowIntegration';
import { useLeadWorkflowSession } from '../../hooks/useLeadWorkflowSession';
import { useWorkflow } from '../../contexts/WorkflowContext';
import LeadWorkflowProgressBar from './LeadWorkflowProgressBar';

const LeadWorkflowManager = ({ onWorkflowComplete = null, className = '' }) => {
  // Form state
  const [formData, setFormData] = useState({
    location: '',
    industry: '',
    keywords: '',
    maxResults: 50,
    sessionName: ''
  });

  // UI state
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [availableWorkflows, setAvailableWorkflows] = useState([]);
  const [scraperInfo, setScraperInfo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Current session state
  const [isExecuting, setIsExecuting] = useState(false);

  // Global workflow context
  const {
    currentSessionId,
    sessionStatus: session,
    isRunning,
    isCompleted,
    isFailed,
    isCancelled,
    progress,
    companiesFound,
    personnelFound,
    leadsCreated,
    workflowHistory,
    executeWorkflow: globalExecuteWorkflow,
    cancelWorkflow: globalCancelWorkflow,
    resetWorkflow: globalResetWorkflow,
    loadWorkflowHistory
  } = useWorkflow();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load available workflows
        const workflows = await leadWorkflowApiService.getAvailableWorkflows();
        setAvailableWorkflows(workflows.workflows || []);

        // Load scraper info
        const info = await leadWorkflowApiService.getScraperInfo();
        setScraperInfo(info);

        // Load workflow history
        await loadWorkflowHistory();

      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Failed to load workflow information');
      }
    };

    loadInitialData();
  }, []);

  // Workflow completion is now handled directly in executeWorkflow function
  // The integration service provides enhanced results with proper company and personnel data

  // Auto-start monitoring is handled by the hook itself with autoStart: true

  // Auto-start monitoring is handled by the hook itself with autoStart: true

  // Handle form input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [validationErrors]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }

    if (formData.maxResults < 1 || formData.maxResults > 100) {
      errors.maxResults = 'Max results must be between 1 and 100';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Execute workflow using enhanced integration service
  const executeWorkflow = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix form errors before starting workflow');
      return;
    }

    try {
      setIsExecuting(true);
      globalResetWorkflow();

      // Prepare workflow parameters
      const params = {
        workflow_name: 'yellowpages_linkedin',
        location: formData.location,
        industry: formData.industry,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        max_results: formData.maxResults,
        session_name: formData.sessionName || `Workflow - ${new Date().toLocaleString()}`,
        user_id: 'frontend_user'
      };

      toast.loading('Starting integrated workflow...', { id: 'workflow-start' });
      
      // Execute workflow using global context (this will enable progress tracking)
      const result = await globalExecuteWorkflow(params);
      
      toast.dismiss('workflow-start');
      toast.success('Workflow started successfully! Watch the progress below.');
      
      // The completion will be handled by the global context callback system
      // The progress bar will now show properly since currentSessionId is set
      
      setIsFormExpanded(false);
      setIsExecuting(false);

    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.dismiss('workflow-start');
      toast.error(`Failed to execute workflow: ${error.message}`);
      setIsExecuting(false);
    }
  }, [formData, validateForm, globalResetWorkflow, globalExecuteWorkflow]);

  // Cancel current workflow
  const handleCancelWorkflow = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      await globalCancelWorkflow();
      toast.success('Workflow cancelled successfully');
      setIsExecuting(false);
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      toast.error(`Failed to cancel workflow: ${error.message}`);
    }
  }, [currentSessionId, globalCancelWorkflow]);

  // Reset workflow
  const handleResetWorkflow = useCallback(() => {
    globalResetWorkflow();
    setIsExecuting(false);
    setIsFormExpanded(true);
  }, [globalResetWorkflow]);

  // Format keywords for display
  const formatKeywords = useCallback((keywords) => {
    if (!keywords) return '';
    return Array.isArray(keywords) ? keywords.join(', ') : keywords;
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Unified Lead Generation
          </h2>
          <p className="text-gray-600 mt-1">
            Yellow Pages → LinkedIn → Database (Automated lead enrichment)
          </p>
        </div>
        
        {/* Workflow Stats */}
        {scraperInfo && (
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {scraperInfo.total_scrapers} scrapers • {scraperInfo.total_workflows} workflows
            </div>
          </div>
        )}
      </div>

      {/* Workflow Form */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Workflow Configuration
            </span>
            {isFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        
        <AnimatePresence>
          {isFormExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="space-y-4">
                {/* Location Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isExecuting}
                  />
                  {validationErrors.location && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.location}</p>
                  )}
                </div>

                {/* Industry Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    placeholder="e.g., technology, healthcare, finance"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isExecuting}
                  />
                </div>

                {/* Keywords Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => handleInputChange('keywords', e.target.value)}
                    placeholder="e.g., software, startup, consulting (comma-separated)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isExecuting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate multiple keywords with commas
                  </p>
                </div>

                {/* Max Results and Session Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Max Results
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.maxResults}
                      onChange={(e) => handleInputChange('maxResults', parseInt(e.target.value) || 50)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.maxResults ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={isExecuting}
                    />
                    {validationErrors.maxResults && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.maxResults}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Session Name
                    </label>
                    <input
                      type="text"
                      value={formData.sessionName}
                      onChange={(e) => handleInputChange('sessionName', e.target.value)}
                      placeholder="Optional session name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isExecuting}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={executeWorkflow}
                    disabled={isExecuting || isRunning}
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isExecuting ? 'Starting...' : 'Start Workflow'}
                  </Button>

                  {(isRunning || isExecuting) && (
                    <Button
                      onClick={handleCancelWorkflow}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  )}

                  {(isCompleted || isFailed || isCancelled) && (
                    <Button
                      onClick={handleResetWorkflow}
                      variant="outline"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Progress Section */}
      {currentSessionId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Workflow Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeadWorkflowProgressBar
              progress={progress}
              status={session?.status || 'pending'}
              companiesFound={companiesFound}
              personnelFound={personnelFound}
              leadsCreated={leadsCreated}
              currentStep={session?.current_step}
              errors={[]}
            />
          </CardContent>
        </Card>
      )}

      {/* Workflow History */}
      {workflowHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflowHistory.map((historySession, index) => (
                <div
                  key={historySession.session_id || index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {historySession.session_name || `Session ${index + 1}`}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        historySession.status === 'completed' ? 'bg-green-100 text-green-700' :
                        historySession.status === 'failed' ? 'bg-red-100 text-red-700' :
                        historySession.status === 'cancelled' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {historySession.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {historySession.input_params?.location} • {historySession.input_params?.industry} 
                      {historySession.input_params?.keywords && ` • ${formatKeywords(historySession.input_params.keywords)}`}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {historySession.leads_created || 0} leads
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(historySession.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Error Display */}
      {session?.error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-red-500" />
            <span className="font-medium text-red-700">Session Error</span>
          </div>
          <p className="text-red-600 mt-1">{session.error}</p>
        </motion.div>
      )}
    </div>
  );
};

export default LeadWorkflowManager; 