import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DefineLeads from './DefineLeads';
import RefineSearch from './RefineSearch';
import ChooseCompanies from './ChooseCompanies';
import EnrichAndSave from './EnrichAndSave';
import ProgressStepper from './ProgressStepper';
import WorkflowHistoryDrawer from './WorkflowHistoryDrawer';
import { Button } from '../../ui/primitives/button';
import { History, Loader2 } from 'lucide-react';
import leadsApiService from '../../../services/leadsApi';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { getCookie, setCookie } from '../../../utils/cookieManager';

const CACHE_KEY = 'leadgen_workflow_cache';
const STEP_CACHE_KEY = 'leadgen_workflow_step';

const LeadGenWorkflowWizard = () => {
  // Use persisted state for current step - now using cookies
  const [currentStep, setCurrentStep] = usePersistedState('leadgen_workflow_step', 1, { expires: 7 }); // 7 days expiry

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Track if user has completed step 4 at least once (to enable auto-recovery)
  // Persisted across sessions to detect returning users with empty data
  const [hasCompletedWorkflow, setHasCompletedWorkflow] = usePersistedState('leadgen_workflow_completed', false, { expires: 7 });

  // Token usage state
  const [tokenUsage, setTokenUsage] = useState({
    tokens_used: 0,
    tokens_limit: 300,
    tokens_remaining: 300
  });
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);

  // Workflow data - now using cookies for persistence
  const [workflowData, setWorkflowData] = useState(() => {
    try {
      // First try cookies (new approach)
      const cookieData = getCookie('leadgen_workflow_data');
      if (cookieData) {
        console.log('📦 Restoring workflow data from cookies:', {
          hasPreviewResults: !!cookieData.previewResults,
          previewResultsLength: cookieData.previewResults?.length || 0,
          hasSelectedCompanies: !!cookieData.selectedCompanies,
          selectedCompaniesLength: cookieData.selectedCompanies?.length || 0
        });

        // Convert selectedCompanies array back to Set
        if (cookieData.selectedCompanies && Array.isArray(cookieData.selectedCompanies)) {
          cookieData.selectedCompanies = new Set(cookieData.selectedCompanies);
        }

        // Also check sessionStorage cache for step-specific data that might be newer
        try {
          const sessionCache = sessionStorage.getItem('leadgen_workflow_cache');
          if (sessionCache) {
            const cacheData = JSON.parse(sessionCache);
            console.log('📦 Found sessionStorage cache:', {
              hasPreviewResults: !!cacheData.previewResults,
              previewResultsLength: cacheData.previewResults?.length || 0,
              hasSelectedCompanies: !!cacheData.selectedCompanies,
              selectedCompaniesLength: cacheData.selectedCompanies?.length || 0
            });

            // Use sessionStorage data if it has more complete data
            if (cacheData.previewResults && cacheData.previewResults.length > 0 &&
                (!cookieData.previewResults || cookieData.previewResults.length === 0)) {
              console.log('📦 Using previewResults from sessionStorage');
              cookieData.previewResults = cacheData.previewResults;
            }
            if (cacheData.selectedCompanies && cacheData.selectedCompanies.length > 0 &&
                (!cookieData.selectedCompanies || cookieData.selectedCompanies.length === 0)) {
              console.log('📦 Using selectedCompanies from sessionStorage');
              cookieData.selectedCompanies = new Set(cacheData.selectedCompanies);
            }
          }
        } catch (e) {
          console.error('Error reading sessionStorage cache:', e);
        }

        return {
          query: cookieData.query || '',
          parsedIntent: cookieData.parsedIntent || null,
          numberOfLeads: cookieData.numberOfLeads || 10,
          previewResults: cookieData.previewResults || [],
          selectedCompanies: cookieData.selectedCompanies || new Set(),
          enrichedResults: cookieData.enrichedResults || null
        };
      }

      // Fallback to sessionStorage for migration
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Migrating from old sessionStorage cache');
        // Convert selectedCompanies array back to Set
        if (parsed.selectedCompanies && Array.isArray(parsed.selectedCompanies)) {
          parsed.selectedCompanies = new Set(parsed.selectedCompanies);
        }
        // Migrate to cookies
        const dataToSave = {
          ...parsed,
          selectedCompanies: Array.from(parsed.selectedCompanies || [])
        };
        setCookie('leadgen_workflow_data', dataToSave, { expires: 7 });
        // Don't clear sessionStorage - it's still used by child components
        return {
          query: parsed.query || '',
          parsedIntent: parsed.parsedIntent || null,
          numberOfLeads: parsed.numberOfLeads || 10,
          previewResults: parsed.previewResults || [],
          selectedCompanies: parsed.selectedCompanies || new Set(),
          enrichedResults: parsed.enrichedResults || null
        };
      }
    } catch (error) {
      console.error('Error loading workflow cache:', error);
    }

    console.log('📦 No cache found, using default empty state');
    return {
      query: '',
      parsedIntent: null,
      numberOfLeads: 10,
      previewResults: [],
      selectedCompanies: new Set(),
      enrichedResults: null
    };
  });

  // Don't auto-save workflowData - child components manage their own cache
  // Only save the current step

  // Load token usage
  const loadTokenUsage = useCallback(async () => {
    try {
      setIsLoadingTokens(true);
      const usage = await leadsApiService.getMonthlyTokenUsage();
      setTokenUsage(usage);
    } catch (error) {
      console.error('Error loading token usage:', error);
      // Keep default values on error
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  // Load token usage on mount
  useEffect(() => {
    loadTokenUsage();
  }, [loadTokenUsage]);

  // Auto-recovery: If on step 3 or 4 with empty required data, reset to step 1
  // This runs after initial mount to catch returning users with corrupted/empty data
  useEffect(() => {
    // Add a small delay to allow data to load from cache before checking
    const timeoutId = setTimeout(() => {
      console.log('🔍 Auto-recovery check:', {
        currentStep,
        hasCompletedWorkflow,
        hasPreviewResults: !!workflowData.previewResults && workflowData.previewResults.length > 0,
        hasSelectedCompanies: !!workflowData.selectedCompanies && workflowData.selectedCompanies.size > 0
      });

      // Skip if user is still on step 1 or 2 (normal progression)
      if (currentStep < 3) {
        return;
      }

      // Skip auto-recovery if user hasn't completed workflow yet AND is progressing normally
      // Normal progression means they have data in earlier steps
      if (!hasCompletedWorkflow && currentStep === 3 && workflowData.query) {
        // User is progressing normally through workflow, don't reset
        console.log('✅ User progressing normally through step 3, skipping auto-recovery');
        return;
      }

      if (!hasCompletedWorkflow && currentStep === 4 && workflowData.query && workflowData.previewResults?.length > 0) {
        // User is progressing normally through workflow, don't reset
        console.log('✅ User progressing normally through step 4, skipping auto-recovery');
        return;
      }

      // Check for empty data on step 3 or 4
      if (currentStep === 3 && (!workflowData.previewResults || workflowData.previewResults.length === 0)) {
        console.warn('⚠️ Step 3 has no preview results, resetting to step 1');
        setCurrentStep(1);
        setHasCompletedWorkflow(false); // Reset flag
        // Clear cache
        try {
          sessionStorage.removeItem('leadgen_workflow_cache');
          setCookie('leadgen_workflow_data', '', { expires: -1 });
        } catch (e) {
          console.error('Error clearing cache:', e);
        }
      } else if (currentStep === 4 &&
                 (!workflowData.selectedCompanies || workflowData.selectedCompanies.size === 0 ||
                  !workflowData.previewResults || workflowData.previewResults.length === 0)) {
        console.warn('⚠️ Step 4 has empty required data, resetting to step 1');
        setCurrentStep(1);
        setHasCompletedWorkflow(false); // Reset flag
        // Clear cache
        try {
          sessionStorage.removeItem('leadgen_workflow_cache');
          setCookie('leadgen_workflow_data', '', { expires: -1 });
        } catch (e) {
          console.error('Error clearing cache:', e);
        }
      }
    }, 500); // 500ms delay to allow data to load

    return () => clearTimeout(timeoutId);
  }, [currentStep, workflowData.previewResults, workflowData.selectedCompanies, workflowData.query, hasCompletedWorkflow, setCurrentStep, setHasCompletedWorkflow]);

  // Save workflow data to cookies when it changes
  useEffect(() => {
    try {
      // Convert Set to Array for JSON serialization
      const dataToSave = {
        ...workflowData,
        selectedCompanies: Array.from(workflowData.selectedCompanies || [])
      };
      setCookie('leadgen_workflow_data', dataToSave, { expires: 7 });
    } catch (error) {
      console.error('Error saving workflow data to cookies:', error);
    }
  }, [workflowData]);

  // Step definitions
  const steps = [
    { number: 1, title: 'Define Leads' },
    { number: 2, title: 'Refine Search' },
    { number: 3, title: 'Choose Companies' },
    { number: 4, title: 'Enrich & Save' }
  ];

  // Step 1 -> 2: Pass query and parsedIntent
  const handleStepOneComplete = useCallback((query, parsedIntent) => {
    // Clear future step cache FIRST (before changing step) - now using cookies
    try {
      const cacheData = getCookie('leadgen_workflow_data') || {};
      cacheData.previewResults = [];
      cacheData.selectedCompanies = [];
      cacheData.enrichedResults = null;
      cacheData.selectedLeads = [];
      setCookie('leadgen_workflow_data', cacheData, { expires: 7 });
      console.log('🗑️ Cleared future step cache (steps 3-4)');

      // Clear sessionStorage cache for future steps (but keep structure intact)
      try {
        const cached = sessionStorage.getItem('leadgen_workflow_cache');
        if (cached) {
          const sessionCache = JSON.parse(cached);
          sessionCache.previewResults = [];
          sessionCache.selectedCompanies = [];
          sessionCache.enrichedResults = null;
          sessionCache.selectedLeads = [];
          sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(sessionCache));
        }
      } catch (e) {
        console.error('Error clearing sessionStorage cache:', e);
      }
    } catch (error) {
      console.error('Error clearing future cache:', error);
    }

    setWorkflowData(prev => ({
      ...prev,
      query,
      parsedIntent
    }));

    setCurrentStep(2);
  }, []);

  // Step 2 -> 3: Pass numberOfLeads (keywords auto-selected)
  const handleStepTwoComplete = useCallback((numberOfLeads, updatedIntent) => {
    // Clear future step cache FIRST (before changing step)
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      if (cached) {
        const cacheData = JSON.parse(cached);
        cacheData.previewResults = [];
        cacheData.selectedCompanies = [];
        cacheData.enrichedResults = null;
        cacheData.selectedLeads = [];
        cacheData._clearTimestamp = Date.now(); // Add timestamp to detect cache clears
        sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
        console.log('🗑️ Cleared future step cache (steps 3-4)', {
          previewResults: cacheData.previewResults,
          timestamp: cacheData._clearTimestamp
        });
      }
    } catch (error) {
      console.error('Error clearing future cache:', error);
    }

    setWorkflowData(prev => ({
      ...prev,
      numberOfLeads,
      parsedIntent: updatedIntent || prev.parsedIntent  // Update with filtered keywords
    }));

    setCurrentStep(3);
  }, []);

  // Step 3 -> 4: Pass preview results and selected companies
  const handleStepThreeComplete = useCallback((previewResults, selectedCompanies) => {
    console.log('📥 Wizard received from step 3:', {
      previewResultsCount: previewResults?.length || 0,
      selectedCompaniesCount: selectedCompanies?.size || 0,
      selectedCompaniesType: selectedCompanies?.constructor?.name
    });

    // Clear future step cache FIRST (before changing step)
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      if (cached) {
        const cacheData = JSON.parse(cached);
        cacheData.enrichedResults = null;
        cacheData.selectedLeads = [];
        sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
        console.log('🗑️ Cleared future step cache (step 4)');
      }
    } catch (error) {
      console.error('Error clearing future cache:', error);
    }

    setWorkflowData(prev => {
      const newData = {
        ...prev,
        previewResults,
        selectedCompanies
      };
      console.log('📝 Updated workflowData:', {
        previewResultsCount: newData.previewResults?.length || 0,
        selectedCompaniesCount: newData.selectedCompanies?.size || 0
      });
      return newData;
    });

    setCurrentStep(4);

    // Refresh history cache when continuing from Choose Companies
    try {
      sessionStorage.setItem('leadgen_history_refresh', Date.now().toString());
    } catch (error) {
      console.error('Error refreshing history cache:', error);
    }
  }, []);

  // Step 4: Complete - enriched results
  const handleStepFourComplete = useCallback((enrichedResults) => {
    setWorkflowData(prev => ({
      ...prev,
      enrichedResults
    }));

    // Mark that user has completed the workflow (enables auto-recovery on future visits)
    setHasCompletedWorkflow(true);

    // Refresh history cache when saving to database
    try {
      sessionStorage.setItem('leadgen_history_refresh', Date.now().toString());
    } catch (error) {
      console.error('Error refreshing history cache:', error);
    }

    // Refresh token usage after saving leads
    loadTokenUsage();
  }, [loadTokenUsage]);

  // Back navigation - preserves cached data
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Reset workflow - clears all cache
  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setWorkflowData({
      query: '',
      parsedIntent: null,
      numberOfLeads: 10,
      previewResults: [],
      selectedCompanies: new Set(),
      enrichedResults: null
    });

    // Reset completion flag (starting fresh workflow)
    setHasCompletedWorkflow(false);

    // Clear cache
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(STEP_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing workflow cache:', error);
    }
  }, []);

  // Determine token badge color based on remaining tokens
  const getTokenBadgeColor = () => {
    const remaining = tokenUsage.tokens_remaining;
    if (remaining <= 20) return 'bg-red-100 text-red-800 border border-red-300';
    if (remaining <= 100) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    return 'bg-green-100 text-green-800 border border-green-300';
  };

  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      {/* Header with Token Usage and View History button */}
      <div className="flex items-center justify-start gap-3 px-6 py-2 bg-white border-b border-gray-200">
        {/* View History Button */}
        <Button
          variant="outline"
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-2 border-gray-300"
        >
          <History className="w-4 h-4" />
          View History
        </Button>

        {/* Token Usage Badge */}
        <div
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${getTokenBadgeColor()}`}
          title="Tokens remaining for lead enrichments this month"
        >
          {isLoadingTokens ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </span>
          ) : (
            <span>{tokenUsage.tokens_remaining} / {tokenUsage.tokens_limit} tokens remaining</span>
          )}
        </div>
      </div>

      {/* Workflow Title */}
      <div className="px-8 pt-12 pb-4 bg-blue-50 text-center">
        <h2 className="text-2xl font-bold mb-3 text-indigo-900">LeadGen Workflow</h2>
        <p className="text-base text-gray-600">Find and enrich your perfect leads in 4 simple steps</p>
      </div>

      {/* Progress Stepper */}
      <div className="px-8 py-6 bg-blue-50">
        <ProgressStepper steps={steps} currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DefineLeads
                    onComplete={handleStepOneComplete}
                    initialQuery={workflowData.query}
                  />
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <RefineSearch
                    query={workflowData.query}
                    parsedIntent={workflowData.parsedIntent}
                    initialNumberOfLeads={workflowData.numberOfLeads}
                    onComplete={handleStepTwoComplete}
                    onBack={handleBack}
                  />
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key={`step-3-${workflowData.numberOfLeads}-${workflowData.query}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChooseCompanies
                    query={workflowData.query}
                    parsedIntent={workflowData.parsedIntent}
                    numberOfLeads={workflowData.numberOfLeads}
                    onComplete={handleStepThreeComplete}
                    onBack={handleBack}
                  />
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key={`step-4-${workflowData.selectedCompanies.size}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <EnrichAndSave
                    previewResults={workflowData.previewResults}
                    selectedCompanies={workflowData.selectedCompanies}
                    onComplete={handleStepFourComplete}
                    onBack={handleBack}
                    onReset={handleReset}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* History Drawer */}
      <WorkflowHistoryDrawer
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </div>
  );
};

export default LeadGenWorkflowWizard;
