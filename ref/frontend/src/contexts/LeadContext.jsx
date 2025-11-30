import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import leadsApiService from '../services/leadsApi';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { getCachedData, setCachedData } from '../utils/dataCache';

const LeadContext = createContext();

// Cache expiration time (30 minutes)
const CACHE_EXPIRATION_TIME = 30 * 60 * 1000;

export const useLeadContext = () => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLeadContext must be used within a LeadProvider');
  }
  return context;
};

export const LeadProvider = ({ children }) => {
  // Authentication state
  const { user, isLoading: authLoading } = useAuth();

  // Get user email for cache isolation
  const userEmail = user?.email || user?.user_email;

  // Load initial data from localStorage cache immediately (user-specific)
  const initialCachedLeads = getCachedData('leads_manual', CACHE_EXPIRATION_TIME, userEmail) || [];
  const initialCachedWorkflowLeads = getCachedData('leads_workflow', CACHE_EXPIRATION_TIME, userEmail) || [];
  const initialCachedStats = getCachedData('leads_stats', CACHE_EXPIRATION_TIME, userEmail) || {
    total: 0,
    qualified: 0,
    hot: 0,
    totalPersonnel: 0,
    companiesWithPersonnel: 0,
    avgPersonnelPerCompany: 0
  };

  // Lead data states - initialize from cache
  const [leads, setLeads] = useState(initialCachedLeads);
  const [workflowLeads, setWorkflowLeads] = useState(initialCachedWorkflowLeads);
  const [leadStats, setLeadStats] = useState(initialCachedStats);

  // No auth initialization needed - leadsApi uses test token


  // Cache management states
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(initialCachedLeads.length > 0 || initialCachedWorkflowLeads.length > 0);
  const [isLoadedFromCache, setIsLoadedFromCache] = useState(initialCachedLeads.length > 0 || initialCachedWorkflowLeads.length > 0);

  // Check if cache is still valid
  const isCacheValid = useCallback(() => {
    if (!lastFetchTime) return false;
    const now = Date.now();
    return (now - lastFetchTime) < CACHE_EXPIRATION_TIME;
  }, [lastFetchTime]);

  // Load leads from API
  const loadLeads = useCallback(async (force = false) => {
    // Wait for authentication before loading leads
    if (!user) {
      console.log('⏳ Waiting for authentication...');
      return;
    }

    // If not forcing and cache is valid, skip loading
    if (!force && isCacheValid() && hasInitialLoad) {
      console.log('✅ Using cached lead data');
      return;
    }

    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Loading leads from API...');
      
      // Load all leads with personnel data
      let allLeadsResponse = { leads: [], total_personnel: 0 };
      
      try {
        const allLeads = [];
        let page = 1;
        let totalPersonnel = 0;
        
        while (true) {
          // Get user email for database lookup
          const userEmail = user?.email || user?.user_email;
          const response = await leadsApiService.getLeadsWithPersonnel({ page, per_page: 1000, userEmail });
          const leads = response.leads || [];

          if (leads.length === 0) break;

          allLeads.push(...leads);
          totalPersonnel = response.total_personnel || totalPersonnel;

          if (leads.length < 1000) break;

          page++;

          if (page > 10) {
            console.warn('⚠️ Reached maximum page limit (10)');
            break;
          }
        }
        
        allLeadsResponse = { 
          leads: allLeads, 
          total_personnel: totalPersonnel 
        };
        
        console.log('✅ Leads loaded:', {
          leads: allLeads.length,
          personnel: totalPersonnel,
          pages: page
        });
      } catch (error) {
        console.error('❌ Failed to load leads with personnel:', error);
        
        // Fallback to regular leads
        try {
          const allLeads = [];
          let page = 1;
          
          while (true) {
            const response = await leadsApiService.getLeads(page, 1000);
            const leads = response.leads || [];

            if (leads.length === 0) break;

            allLeads.push(...leads);

            if (leads.length < 1000) break;

            page++;

            if (page > 10) break;
          }
          
          allLeadsResponse = { 
            leads: allLeads, 
            total_personnel: 0 
          };
        } catch (fallbackError) {
          console.error('❌ Failed to load any leads:', fallbackError);
          allLeadsResponse = { leads: [], total_personnel: 0 };
        }
      }

      const allLeads = allLeadsResponse.leads || [];
      
      // Filter leads by source
      const manualSources = ['csv_upload', 'manual_entry'];
      const workflowSources = ['yellowpages', 'linkedin', 'web_scraping', 'api_import'];
      
      const manualLeads = allLeads.filter(lead => 
        manualSources.includes(lead.source) || 
        manualSources.includes(lead.source?.toLowerCase())
      ).map(lead => ({
        ...lead,
        status: lead.status || 'new'
      }));
      
      const workflowLeadsFiltered = allLeads.filter(lead => 
        workflowSources.includes(lead.source) || 
        workflowSources.includes(lead.source?.toLowerCase()) ||
        (lead.personnel && lead.personnel.length > 0)
      ).map(lead => ({
        ...lead,
        status: lead.status || 'new'
      }));

      // Get user email for cache
      const userEmail = user?.email || user?.user_email;

      // Update state and cache (user-specific)
      setLeads(manualLeads);
      setWorkflowLeads(workflowLeadsFiltered);
      setCachedData('leads_manual', manualLeads, userEmail);
      setCachedData('leads_workflow', workflowLeadsFiltered, userEmail);

      // Calculate stats
      const totalPersonnel = allLeadsResponse.total_personnel || 0;
      const companiesWithPersonnel = workflowLeadsFiltered.filter(l => l.personnel?.length > 0).length;
      const avgPersonnelPerCompany = companiesWithPersonnel > 0
        ? (totalPersonnel / companiesWithPersonnel).toFixed(1)
        : 0;

      const allLeadsCount = allLeads.length;
      const workflowQualified = workflowLeadsFiltered.filter(l => l.status === 'qualified').length;
      const workflowHot = workflowLeadsFiltered.filter(l => l.status === 'hot').length;
      const manualQualified = manualLeads.filter(l => l.status === 'qualified').length;
      const manualHot = manualLeads.filter(l => l.status === 'hot').length;
      const allQualified = workflowQualified + manualQualified;
      const allHot = workflowHot + manualHot;

      const newLeadStats = {
        total: allLeadsCount,
        qualified: allQualified,
        hot: allHot,
        totalPersonnel,
        companiesWithPersonnel,
        avgPersonnelPerCompany
      };

      setLeadStats(newLeadStats);
      setCachedData('leads_stats', newLeadStats, userEmail);

      // Update cache timestamp
      setLastFetchTime(Date.now());
      setHasInitialLoad(true);
      setIsLoadedFromCache(false); // Mark as freshly loaded from API

      console.log(`✅ Lead data cached to localStorage successfully for ${userEmail}`);
      
      if (force) {
        toast.success(`Refreshed! ${allLeadsCount} leads loaded`);
      }
    } catch (error) {
      console.error('❌ Error loading leads:', error);
      toast.error('Failed to load leads. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isCacheValid, isLoading, hasInitialLoad]);

  // Load leads on mount (wait for auth to complete)
  useEffect(() => {
    // Only load if we have a user, auth is complete, and we haven't loaded yet
    if (user && !authLoading && !hasInitialLoad) {
      loadLeads();
    }
  }, [user, authLoading, hasInitialLoad, loadLeads]);

  // Clear cache
  const clearCache = useCallback(() => {
    setLeads([]);
    setWorkflowLeads([]);
    setLeadStats({
      total: 0,
      qualified: 0,
      hot: 0,
      totalPersonnel: 0,
      companiesWithPersonnel: 0,
      avgPersonnelPerCompany: 0
    });
    setLastFetchTime(null);
    setHasInitialLoad(false);
    console.log('🗑️ Lead cache cleared');
  }, []);

  // Update lead status (calls backend API)
  const updateLeadStatus = useCallback(async (leadId, newStatus) => {
    try {
      await leadsApiService.updateLeadStatus(leadId, newStatus);

      // Update local state
      setLeads(prev => prev.map(lead =>
        (lead.id === leadId || lead.lead_id === leadId) ? { ...lead, status: newStatus } : lead
      ));
      setWorkflowLeads(prev => prev.map(lead =>
        (lead.id === leadId || lead.lead_id === leadId) ? { ...lead, status: newStatus } : lead
      ));

      return true;
    } catch (error) {
      console.error('Failed to update lead status:', error);
      throw error;
    }
  }, []);

  // Update lead status in UI only (does NOT call backend API)
  // Use this for optimistic updates where backend will update later
  const updateLeadStatusUIOnly = useCallback((leadId, newStatus) => {
    setLeads(prev => prev.map(lead =>
      (lead.id === leadId || lead.lead_id === leadId) ? { ...lead, status: newStatus } : lead
    ));
    setWorkflowLeads(prev => prev.map(lead =>
      (lead.id === leadId || lead.lead_id === leadId) ? { ...lead, status: newStatus } : lead
    ));
  }, []);

  // Delete lead
  const deleteLead = useCallback(async (leadId) => {
    try {
      await leadsApiService.deleteLead(leadId);
      
      // Remove from local state
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      setWorkflowLeads(prev => prev.filter(lead => lead.id !== leadId));
      
      // Recalculate stats after deletion
      const remainingLeads = [...leads, ...workflowLeads].filter(lead => lead.id !== leadId);
      const newTotal = remainingLeads.length;
      const newQualified = remainingLeads.filter(l => l.status === 'qualified').length;
      const newHot = remainingLeads.filter(l => l.status === 'hot').length;

      setLeadStats(prev => ({
        ...prev,
        total: newTotal,
        qualified: newQualified,
        hot: newHot
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to delete lead:', error);
      throw error;
    }
  }, [leads, workflowLeads]);

  // Update a lead in the local state (for inline editing)
  const updateLead = useCallback((updatedLead) => {
    try {
      const leadId = updatedLead.lead_id || updatedLead.id;
      console.log('🔄 Updating lead in context:', leadId);

      // Update in leads array
      setLeads(prev => prev.map(lead =>
        (lead.lead_id === leadId || lead.id === leadId)
          ? { ...lead, ...updatedLead, id: leadId, lead_id: leadId }
          : lead
      ));

      // Update in workflow leads array
      setWorkflowLeads(prev => prev.map(lead =>
        (lead.lead_id === leadId || lead.id === leadId)
          ? { ...lead, ...updatedLead, id: leadId, lead_id: leadId }
          : lead
      ));

      console.log('✅ Lead updated in context');
      return true;
    } catch (error) {
      console.error('Failed to update lead in context:', error);
      return false;
    }
  }, []);

  // Remove lead from local state (optimistic update for CRM sync)
  const removeLeadFromState = useCallback((leadId) => {
    try {
      // Remove from local state
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      setWorkflowLeads(prev => prev.filter(lead => lead.id !== leadId));

      // Recalculate stats after removal
      const remainingLeads = [...leads, ...workflowLeads].filter(lead => lead.id !== leadId);
      const newTotal = remainingLeads.length;
      const newQualified = remainingLeads.filter(l => l.status === 'qualified').length;
      const newHot = remainingLeads.filter(l => l.status === 'hot').length;

      setLeadStats(prev => ({
        ...prev,
        total: newTotal,
        qualified: newQualified,
        hot: newHot
      }));

      return true;
    } catch (error) {
      console.error('Failed to remove lead from state:', error);
      return false;
    }
  }, [leads, workflowLeads]);

  const value = {
    // Data
    leads,
    workflowLeads,
    leadStats,
    isLoading,
    authLoading,
    hasInitialLoad,
    isLoadedFromCache,

    // Actions
    loadLeads,
    clearCache,
    updateLead,
    updateLeadStatus,
    updateLeadStatusUIOnly,
    deleteLead,
    removeLeadFromState,

    // Cache info
    lastFetchTime,
    isCacheValid: isCacheValid()
  };

  return (
    <LeadContext.Provider value={value}>
      {children}
    </LeadContext.Provider>
  );
};