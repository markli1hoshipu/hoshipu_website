import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import {
  Users,
  Download,
  RefreshCw,
  CheckCircle,
  Upload,
  FileText,
  X,
  Loader2,
  Layers,
  Network,
  Users2,
  Trash2
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { useWorkflow } from '../../contexts/WorkflowContext';
import { useCRM } from '../../contexts/CRMContext';
import leadsApiService from '../../services/leadsApi';
import leadWorkflowIntegration from '../../services/leadWorkflowIntegration';
import EnhancedLeadDisplay from './EnhancedLeadDisplay';
// Market density functionality moved to LeadGenerationHub
import UnifiedWorkflowManager from './UnifiedWorkflowManager';
import UnifiedToolbar from '../ui/toolbar/UnifiedToolbar';

const LeadGeneration = () => {
  // Context
  const { setCustomers } = useCRM();

  // State management
  const [leads, setLeads] = useState([]);
  const [workflowLeads, setWorkflowLeads] = useState([]); // Leads from integrated workflow
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'workflow', 'manual'
  const [unifiedFiltering, setUnifiedFiltering] = useState(false); // Search/filter across both tables
  const [leadStats, setLeadStats] = useState({ 
    total: 0, 
    qualified: 0, 
    hot: 0, 
    avgScore: 0,
    totalPersonnel: 0,
    companiesWithPersonnel: 0,
    avgPersonnelPerCompany: 0
  });

  // CSV Upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const scrollContainerRef = useRef(null);
  const { onWorkflowComplete, isCompleted, hasResults } = useWorkflow();

  // Tab definitions (market density removed - now handled by LeadGenerationHub)
  const tabs = [
    {
      id: 'all',
      label: 'All Leads',
      icon: Layers,
      description: 'View all leads from all sources'
    },
    {
      id: 'workflow',
      label: 'Unified Lead Generation',
      icon: Network,
      description: 'Companies and personnel from integrated workflow'
    },
    {
      id: 'manual',
      label: 'Manual Leads',
      icon: Users2,
      description: 'Manually added and imported leads'
    }
  ];

  // Auto-navigate to workflow results when workflow completes
  const handleWorkflowContextCompletion = useCallback(async (sessionData, results) => {
    console.log('Workflow context completion handler:', { sessionData, results });
    
    try {
      // Always try to get leads from database first since that's the reliable source
      console.log('Fetching processed leads from database via backend API...');
      
      // Wait a moment for backend processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try multiple times to get processed leads from database
      let dbResults = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Fetching leads from database...`);
          dbResults = await leadsApiService.getLeadsWithPersonnel({ 
            page: 1, 
            per_page: 100,
            include_recent: true 
          });
          
          if (dbResults.leads && dbResults.leads.length > 0) {
            console.log(`✅ Retrieved ${dbResults.leads.length} leads from database`);
            break;
          } else {
            console.log(`Attempt ${attempt}: No leads found yet, waiting...`);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
            }
          }
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      // Process database results if found
      if (dbResults?.leads && dbResults.leads.length > 0) {
        console.log('✅ Processing database leads:', dbResults);
        
        // Filter leads by source to separate manual vs workflow leads
        const manualSources = ['csv_upload', 'manual_entry'];
        const workflowSources = ['yellowpages', 'linkedin', 'web_scraping', 'api_import'];
        
        const allLeads = dbResults.leads || [];
        const manualLeads = allLeads.filter(lead => 
          manualSources.includes(lead.source) || 
          manualSources.includes(lead.source?.toLowerCase())
        );
        
        const workflowLeadsFiltered = allLeads.filter(lead => 
          workflowSources.includes(lead.source) || 
          workflowSources.includes(lead.source?.toLowerCase()) ||
          (lead.personnel && lead.personnel.length > 0) // Include leads with personnel data
        );
        
        console.log('✅ Filtered workflow completion leads:', {
          manual: manualLeads.length,
          workflow: workflowLeadsFiltered.length,
          total: allLeads.length
        });
        
        setLeads(manualLeads);
        setWorkflowLeads(workflowLeadsFiltered);
        
        // Update comprehensive stats
        const totalPersonnel = dbResults.total_personnel || 0;
        const companiesWithPersonnel = workflowLeadsFiltered.filter(l => l.personnel?.length > 0).length;
        const avgPersonnelPerCompany = companiesWithPersonnel > 0 
          ? (totalPersonnel / companiesWithPersonnel).toFixed(1)
          : 0;
        
        // Calculate combined stats with properly filtered leads
        const allLeadsCount = allLeads.length;
        const workflowQualified = workflowLeadsFiltered.filter(l => l.status === 'qualified').length;
        const workflowHot = workflowLeadsFiltered.filter(l => l.status === 'hot').length;
        const manualQualified = manualLeads.filter(l => l.status === 'qualified').length;
        const manualHot = manualLeads.filter(l => l.status === 'hot').length;
        const allQualified = workflowQualified + manualQualified;
        const allHot = workflowHot + manualHot;
        const allAvgScore = allLeadsCount > 0 
          ? Math.round(allLeads.reduce((sum, l) => sum + (l.score || 0), 0) / allLeadsCount)
          : 0;
        
        const newLeadStats = { 
          total: allLeadsCount, 
          qualified: allQualified, 
          hot: allHot, 
          avgScore: allAvgScore,
          totalPersonnel,
          companiesWithPersonnel,
          avgPersonnelPerCompany
        };
        
        setLeadStats(newLeadStats);
        
        console.log('✅ Updated lead stats from workflow completion:', newLeadStats);
        
        // Auto-navigate to workflow results tab
        setActiveTab('workflow');
        
        // Show success notifications
        toast.success(
          `🎉 Workflow completed! Found ${workflowLeadsFiltered.length} companies with ${totalPersonnel} personnel contacts`,
          { duration: 5000 }
        );
        
        setTimeout(() => {
          toast.success(
            `📊 ${companiesWithPersonnel} companies have personnel data with an average of ${avgPersonnelPerCompany} contacts per company`,
            { duration: 4000 }
          );
        }, 2000);
        
        if (onWorkflowComplete) {
          onWorkflowComplete(sessionData, { ...dbResults, leads: workflowLeadsFiltered });
        }
      } else {
        console.log('⚠️ No database results found, trying integration fallback...');
        
        // Fallback to integration results if available
        if (results && results.leads && results.leads.length > 0) {
          console.log('✅ Using integration results as fallback:', results);
          setWorkflowLeads(results.leads);
          
          // Update basic stats from integration results
          const leadCount = results.leads.length;
          const qualified = results.leads.filter(l => l.status === 'qualified').length;
          const hot = results.leads.filter(l => l.status === 'hot').length;
          const avgScore = leadCount > 0 
            ? Math.round(results.leads.reduce((sum, l) => sum + (l.score || 0), 0) / leadCount)
            : 0;
          
          const newLeadStats = { 
            total: leadCount + leads.length, 
            qualified: qualified + leads.filter(l => l.status === 'qualified').length, 
            hot: hot + leads.filter(l => l.status === 'hot').length, 
            avgScore,
            totalPersonnel: results.total_personnel || 0,
            companiesWithPersonnel: results.companies_with_personnel || 0,
            avgPersonnelPerCompany: results.avg_personnel_per_company || 0
          };
          
          setLeadStats(newLeadStats);
          
          // Auto-navigate to workflow results tab
          setActiveTab('workflow');
          
          toast.success(
            `🎉 Workflow completed! Found ${leadCount} leads via integration`,
            { duration: 4000 }
          );
          
          if (onWorkflowComplete) {
            onWorkflowComplete(sessionData, results);
          }
        } else {
          console.log('❌ No results found in database or integration');
          toast.error('Workflow completed but no results were found. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Error in workflow completion handler:', error);
      toast.error('Error processing workflow results. Please refresh and try again.');
    }
  }, [leads, onWorkflowComplete]);

  // Register the workflow completion handler
  useEffect(() => {
    if (onWorkflowComplete) {
      // The workflow context will call this when a workflow completes
      console.log('Registered workflow completion handler');
    }
  }, [onWorkflowComplete]);

  // Handle workflow complete event
  const handleWorkflowComplete = useCallback(async (sessionData, results) => {
    console.log('🎯 Direct workflow completion event:', { sessionData, results });
    await handleWorkflowContextCompletion(sessionData, results);
  }, [handleWorkflowContextCompletion]);

  // Load leads from APIs
  const loadLeads = useCallback(async (force = false) => {
    if (loading && !force) return;
    
    setLoading(true);
    try {
      console.log('🔄 Loading leads from API services...');
      
      // Load all leads with personnel data to get complete dataset
      let allLeadsResponse = { leads: [], total_personnel: 0 };
      
      // Try to get all leads with personnel data first (pagination with max 100 per page)
      try {
        const allLeads = [];
        let page = 1;
        let totalPersonnel = 0;
        
        while (true) {
          const response = await leadsApiService.getLeadsWithPersonnel({ page, per_page: 100 });
          const leads = response.leads || [];
          
          if (leads.length === 0) {
            break; // No more leads
          }
          
          allLeads.push(...leads);
          totalPersonnel = response.total_personnel || totalPersonnel;
          
          // If we got less than 100, this was the last page
          if (leads.length < 100) {
            break;
          }
          
          page++;
          
          // Safety limit to prevent infinite loop
          if (page > 50) {
            console.warn('⚠️ Reached maximum page limit (50), stopping pagination');
            break;
          }
        }
        
        allLeadsResponse = { 
          leads: allLeads, 
          total_personnel: totalPersonnel 
        };
        
        console.log('✅ All leads loaded via pagination:', {
          leads: allLeads.length,
          personnel: totalPersonnel,
          pages: page
        });
      } catch (error) {
        console.error('❌ Failed to load leads with personnel, trying regular leads:', error);
        // Fallback to regular leads if personnel endpoint fails
        try {
          const allLeads = [];
          let page = 1;
          
          while (true) {
            const response = await leadsApiService.getLeads(page, 100);
            const leads = response.leads || [];
            
            if (leads.length === 0) {
              break; // No more leads
            }
            
            allLeads.push(...leads);
            
            // If we got less than 100, this was the last page
            if (leads.length < 100) {
              break;
            }
            
            page++;
            
            // Safety limit to prevent infinite loop
            if (page > 50) {
              console.warn('⚠️ Reached maximum page limit (50), stopping pagination');
              break;
            }
          }
          
          allLeadsResponse = { 
            leads: allLeads, 
            total_personnel: 0 
          };
          
          console.log('✅ Regular leads loaded via pagination:', {
            leads: allLeads.length,
            pages: page
          });
        } catch (fallbackError) {
          console.error('❌ Failed to load any leads:', fallbackError);
          allLeadsResponse = { leads: [], total_personnel: 0 };
        }
      }

      const allLeads = allLeadsResponse.leads || [];
      
      // Filter leads by source to separate manual vs workflow leads
      const manualSources = ['csv_upload', 'manual_entry'];
      const workflowSources = ['yellowpages', 'linkedin', 'web_scraping', 'api_import'];
      
      const manualLeads = allLeads.filter(lead => 
        manualSources.includes(lead.source) || 
        manualSources.includes(lead.source?.toLowerCase())
      );
      
      const workflowLeads = allLeads.filter(lead => 
        workflowSources.includes(lead.source) || 
        workflowSources.includes(lead.source?.toLowerCase()) ||
        (lead.personnel && lead.personnel.length > 0) // Include leads with personnel data
      );
      
      console.log('✅ Filtered leads:', {
        manual: manualLeads.length,
        workflow: workflowLeads.length,
        total: allLeads.length
      });

      // Set filtered leads
      setLeads(manualLeads);
      setWorkflowLeads(workflowLeads);
      
      // Calculate comprehensive stats
      const totalPersonnel = allLeadsResponse.total_personnel || 0;
      const companiesWithPersonnel = workflowLeads.filter(l => l.personnel?.length > 0).length;
      const avgPersonnelPerCompany = companiesWithPersonnel > 0 
        ? (totalPersonnel / companiesWithPersonnel).toFixed(1)
        : 0;
      
      // Calculate combined stats
      const allLeadsCount = allLeads.length;
      const workflowQualified = workflowLeads.filter(l => l.status === 'qualified').length;
      const workflowHot = workflowLeads.filter(l => l.status === 'hot').length;
      const manualQualified = manualLeads.filter(l => l.status === 'qualified').length;
      const manualHot = manualLeads.filter(l => l.status === 'hot').length;
      const allQualified = workflowQualified + manualQualified;
      const allHot = workflowHot + manualHot;
      const allAvgScore = allLeadsCount > 0 
        ? Math.round(allLeads.reduce((sum, l) => sum + (l.score || 0), 0) / allLeadsCount)
        : 0;
      
      const newLeadStats = { 
        total: allLeadsCount, 
        qualified: allQualified, 
        hot: allHot, 
        avgScore: allAvgScore,
        totalPersonnel,
        companiesWithPersonnel,
        avgPersonnelPerCompany
      };
      
      setLeadStats(newLeadStats);
      
      console.log('✅ Updated lead stats:', newLeadStats);
      
      if (force) {
        toast.success(`Refreshed! ${allLeadsCount} leads loaded (${manualLeads.length} manual, ${workflowLeads.length} workflow)`);
      }
    } catch (error) {
      console.error('❌ Error loading leads:', error);
      toast.error('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Auto-load leads on mount
  useEffect(() => {
    const autoLoadLeads = async () => {
      setLoading(true);
      try {
        console.log('🔄 Auto-loading leads from database...');
        
        // Load all leads with personnel data to get complete dataset
        let allLeadsResponse = { leads: [], total_personnel: 0 };
        
        // Helper function to load leads in chunks (max 100 per request)
        const loadLeadsInChunks = async (usePersonnel = true) => {
          let allLeads = [];
          let totalPersonnel = 0;
          let currentPage = 1;
          const perPage = 100; // Backend limit
          
          while (true) {
            try {
              let response;
              if (usePersonnel) {
                response = await leadsApiService.getLeadsWithPersonnel({ page: currentPage, per_page: perPage });
                totalPersonnel += response.total_personnel || 0;
              } else {
                response = await leadsApiService.getLeads(currentPage, perPage);
              }
              
              const leads = response.leads || [];
              allLeads = allLeads.concat(leads);
              
              // If we got fewer leads than requested, we've reached the end
              if (leads.length < perPage) {
                break;
              }
              
              currentPage++;
            } catch (error) {
              console.error(`Error loading page ${currentPage}:`, error);
              break;
            }
          }
          
          return { leads: allLeads, total_personnel: totalPersonnel };
        };
        
        // Try to get all leads with personnel data first
        try {
          allLeadsResponse = await loadLeadsInChunks(true);
          console.log('✅ All leads auto-loaded:', {
            leads: allLeadsResponse.leads?.length || 0,
            personnel: allLeadsResponse.total_personnel || 0
          });
        } catch (error) {
          console.error('❌ Failed to auto-load leads with personnel, trying regular leads:', error);
          // Fallback to regular leads if personnel endpoint fails
          try {
            allLeadsResponse = await loadLeadsInChunks(false);
            console.log('✅ Regular leads auto-loaded as fallback:', allLeadsResponse.leads.length);
          } catch (fallbackError) {
            console.error('❌ Failed to auto-load any leads:', fallbackError);
            allLeadsResponse = { leads: [], total_personnel: 0 };
          }
        }

        const allLeads = allLeadsResponse.leads || [];
        
        // Filter leads by source to separate manual vs workflow leads
        const manualSources = ['csv_upload', 'manual_entry'];
        const workflowSources = ['yellowpages', 'linkedin', 'web_scraping', 'api_import'];
        
        const manualLeads = allLeads.filter(lead => 
          manualSources.includes(lead.source) || 
          manualSources.includes(lead.source?.toLowerCase())
        );
        
        const workflowLeads = allLeads.filter(lead => 
          workflowSources.includes(lead.source) || 
          workflowSources.includes(lead.source?.toLowerCase()) ||
          (lead.personnel && lead.personnel.length > 0) // Include leads with personnel data
        );
        
        console.log('✅ Auto-filtered leads:', {
          manual: manualLeads.length,
          workflow: workflowLeads.length,
          total: allLeads.length
        });

        // Set filtered leads
        setLeads(manualLeads);
        setWorkflowLeads(workflowLeads);
        
        // Calculate comprehensive stats
        const totalPersonnel = allLeadsResponse.total_personnel || 0;
        const companiesWithPersonnel = workflowLeads.filter(l => l.personnel?.length > 0).length;
        const avgPersonnelPerCompany = companiesWithPersonnel > 0 
          ? (totalPersonnel / companiesWithPersonnel).toFixed(1)
          : 0;
        
        // Calculate combined stats
        const allLeadsCount = allLeads.length;
        const workflowQualified = workflowLeads.filter(l => l.status === 'qualified').length;
        const workflowHot = workflowLeads.filter(l => l.status === 'hot').length;
        const manualQualified = manualLeads.filter(l => l.status === 'qualified').length;
        const manualHot = manualLeads.filter(l => l.status === 'hot').length;
        const allQualified = workflowQualified + manualQualified;
        const allHot = workflowHot + manualHot;
        const allAvgScore = allLeadsCount > 0 
          ? Math.round(allLeads.reduce((sum, l) => sum + (l.score || 0), 0) / allLeadsCount)
          : 0;
        
        const newLeadStats = { 
          total: allLeadsCount, 
          qualified: allQualified, 
          hot: allHot, 
          avgScore: allAvgScore,
          totalPersonnel,
          companiesWithPersonnel,
          avgPersonnelPerCompany
        };
        
        setLeadStats(newLeadStats);
        
        console.log('✅ Auto-loaded lead stats:', newLeadStats);
        
        // If we have fresh workflow results, auto-navigate to workflow tab
        if (workflowLeads.length > 0 && hasResults) {
          setActiveTab('workflow');
        }
      } catch (error) {
        console.error('❌ Error auto-loading leads:', error);
      } finally {
        setLoading(false);
      }
    };

    autoLoadLeads();
  }, [hasResults]);

  // Clear all leads and workflow data
  const handleClearAllLeads = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear ALL leads and workflow data? This will remove:\n\n' +
      '• All companies and personnel from database\n' +
      '• All workflow sessions and results\n' +
      '• All cached data\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);
      
      console.log('🗑️ Starting comprehensive data clear...');
      
      // 1. Clear backend data (leads + workflow sessions)
      await leadsApiService.clearAllLeads();
      console.log('✅ Backend data cleared');
      
      // 2. Clear all frontend state
      setLeads([]);
      setWorkflowLeads([]);
      setSelectedLead(null);
      setSearchTerm('');
      setFilterStatus('all');
      setActiveTab('all');
      
      // 3. Reset stats completely
      setLeadStats({
        total: 0,
        qualified: 0,
        hot: 0,
        avgScore: 0,
        totalPersonnel: 0,
        companiesWithPersonnel: 0,
        avgPersonnelPerCompany: 0
      });
      
      // 4. Clear workflow integration cache
      try {
        if (leadWorkflowIntegration && typeof leadWorkflowIntegration.clearCache === 'function') {
          leadWorkflowIntegration.clearCache();
          console.log('✅ Workflow integration cache cleared');
        }
      } catch (error) {
        console.warn('⚠️ Could not clear workflow integration cache:', error);
      }
      
      // 5. Clear any local storage and session storage related to leads
      try {
        // Clear localStorage entries
        const localKeysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('lead') || key.includes('workflow') || key.includes('session'))) {
            localKeysToRemove.push(key);
          }
        }
        localKeysToRemove.forEach(key => localStorage.removeItem(key));
        if (localKeysToRemove.length > 0) {
          console.log(`✅ Cleared ${localKeysToRemove.length} localStorage entries`);
        }

        // Clear sessionStorage entries
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('lead') || key.includes('workflow') || key.includes('session'))) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        if (sessionKeysToRemove.length > 0) {
          console.log(`✅ Cleared ${sessionKeysToRemove.length} sessionStorage entries`);
        }
      } catch (error) {
        console.warn('⚠️ Could not clear storage:', error);
      }
      
      console.log('🎉 Comprehensive data clear completed');
      
      toast.success(
        '🗑️ All data cleared successfully! Database, workflow sessions, and cache have been reset.',
        { duration: 4000 }
      );
      
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      toast.error('Failed to clear all data. Some items may still remain.');
    } finally {
      setLoading(false);
    }
  }, [leadWorkflowIntegration]);

  // Utility functions
  const getStatusColor = useCallback((status) => {
    const colors = {
      hot: 'bg-red-100 text-red-800',
      warm: 'bg-yellow-100 text-yellow-800',
      cold: 'bg-blue-100 text-blue-800',
      qualified: 'bg-green-100 text-green-800',
      contacted: 'bg-purple-100 text-purple-800',
      converted: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // Get current leads based on active tab
  const getCurrentLeads = useMemo(() => {
    switch (activeTab) {
      case 'workflow':
        return workflowLeads;
      case 'manual':
        return leads;
      case 'all':
      default:
        // Deduplicate leads based on ID to avoid React key conflicts
        const combined = [...workflowLeads, ...leads];
        const seen = new Set();
        return combined.filter(lead => {
          const id = lead.id || `${lead.company}-${lead.email}`;
          if (seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
    }
  }, [activeTab, workflowLeads, leads]);

  // Get all leads regardless of tab for unified filtering
  const getAllLeadsForFiltering = useMemo(() => {
    const combined = [...workflowLeads, ...leads];
    const seen = new Set();
    return combined.filter(lead => {
      const id = lead.id || `${lead.company}-${lead.email}`;
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }, [workflowLeads, leads]);

  // Filter leads based on search and status
  const filteredLeads = useMemo(() => {
    // Use all leads if unified filtering is enabled, otherwise use current tab leads
    const sourceLeads = unifiedFiltering ? getAllLeadsForFiltering : getCurrentLeads;
    
    const filtered = sourceLeads.filter(lead => {
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
      const matchesSearch = searchTerm.length === 0 || 
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });

    // If unified filtering is enabled, we still need to show results in current tab context
    // But the filtering was applied across all leads
    if (unifiedFiltering) {
      // Filter the results to show only leads that match the current tab
      switch (activeTab) {
        case 'workflow':
          return filtered.filter(lead => workflowLeads.some(wl => 
            (wl.id || `${wl.company}-${wl.email}`) === (lead.id || `${lead.company}-${lead.email}`)
          ));
        case 'manual':
          return filtered.filter(lead => leads.some(ml => 
            (ml.id || `${ml.company}-${ml.email}`) === (lead.id || `${lead.company}-${lead.email}`)
          ));
        case 'all':
        default:
          return filtered;
      }
    }
    
    return filtered;
  }, [getCurrentLeads, getAllLeadsForFiltering, filterStatus, searchTerm, unifiedFiltering, activeTab, workflowLeads, leads]);

  // Handle lead selection
  const handleSelectLead = useCallback((lead) => {
    setSelectedLead(lead);
  }, []);

  // Handle contact lead action
  const handleContactLead = useCallback((lead) => {
    toast.success(`Initiating contact with ${lead.name || lead.company}...`);
    // TODO: Implement actual contact logic
  }, []);

  // Handle add lead to CRM action
  const handleAddToCRM = useCallback(async (lead, person = null) => {
    try {
      setLoading(true);
      const loadingToastId = toast.loading(
        `Adding ${lead.company}${person ? ` (${person.first_name || person.name})` : ''} to CRM...`
      );

      const result = await leadsApiService.addLeadToCRM(
        lead.id,
        person?.personnel_id || null
      );

      toast.dismiss(loadingToastId);

      if (result.success) {
        // Show appropriate message based on whether customer already existed
        if (result.already_exists) {
          toast.success(
            `ℹ️ ${lead.company} already exists in CRM (Customer ID: ${result.crm_customer_id})`,
            { duration: 4000 }
          );
        } else {
          toast.success(
            `✅ Successfully added ${lead.company} to CRM! (Customer ID: ${result.crm_customer_id})`,
            { duration: 4000 }
          );

          // Optimistically add to CRM customer list (same pattern as CRM addCustomer)
          if (setCustomers && result.customer) {
            setCustomers(prev => [result.customer, ...prev]);
            console.log('✅ Added customer to CRM list immediately');
          }
        }

        // Refresh leads to show updated status
        await loadLeads();
      } else {
        toast.error(`❌ Failed to add to CRM: ${result.message}`, { duration: 6000 });
      }
    } catch (error) {
      toast.error(`❌ Error adding to CRM: ${error.message}`, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  }, [loadLeads, setCustomers]);

  // Handle CSV download
  const handleDownloadCSV = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Starting CSV download...');
      
      toast.loading('Preparing CSV download...', { id: 'csv-download' });
      
      const result = await leadsApiService.exportLeadsToCSV();
      
      toast.dismiss('csv-download');
      toast.success(
        `✅ Downloaded ${result.total_leads} leads (${result.total_rows} rows)${
          result.personnel_count > 0 ? ` with ${result.personnel_count} personnel contacts` : ''
        }`,
        { duration: 5000 }
      );
      
      console.log('CSV download completed:', result);
    } catch (error) {
      console.error('CSV download failed:', error);
      toast.dismiss('csv-download');
      toast.error('Failed to download CSV. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle sample CSV download
  const handleDownloadSampleCSV = useCallback(async () => {
    try {
      console.log('Starting sample CSV download...');
      
      toast.loading('Downloading sample CSV...', { id: 'sample-csv' });
      
      await leadsApiService.getSampleCsv();
      
      toast.dismiss('sample-csv');
      toast.success('Sample CSV template downloaded successfully!');
      
    } catch (error) {
      console.error('Sample CSV download failed:', error);
      toast.dismiss('sample-csv');
      toast.error('Failed to download sample CSV. Please try again.');
    }
  }, []);

  // Handle CSV file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload the CSV file
      const response = await leadsApiService.uploadDataToTable(file, 'leads');
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        if (response.leads_created > 0) {
          toast.success(
            `Successfully uploaded ${response.leads_created} leads${
              response.leads_failed > 0 ? ` (${response.leads_failed} failed)` : ''
            }`
          );
          
          // Show errors if any
          if (response.sync_errors && response.sync_errors.length > 0) {
            console.warn('Upload errors:', response.sync_errors);
            const errorSummary = response.sync_errors.slice(0, 2).join('; ');
            toast.warning(
              `Some rows had issues: ${errorSummary}${response.sync_errors.length > 2 ? '...' : ''}`,
              { duration: 6000 }
            );
          }
        } else {
          toast.error(
            `Failed to upload any leads. ${
              response.sync_errors && response.sync_errors.length > 0 
                ? response.sync_errors[0] 
                : 'Please check your CSV format.'
            }`
          );
        }
        
        setIsUploadModalOpen(false);
        setUploadProgress(0);
        
        // Reload leads to show uploaded data
        loadLeads(true);
        
        // Auto-navigate to manual tab to show uploaded leads
        setActiveTab('manual');
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      
      // Show specific error message
      let errorMessage = 'Failed to upload CSV file';
      if (error.message.includes('Name is required') || error.message.includes('Company is required') || error.message.includes('Location is required')) {
        errorMessage = 'CSV must contain "name", "company", and "location" columns';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }, [loadLeads]);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const onFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div></div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => loadLeads(true)} 
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadCSV}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClearAllLeads}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>


        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button 
            variant="outline" 
            onClick={handleDownloadCSV}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadSampleCSV}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Sample CSV
          </Button>
        </div>

      </div>

      {/* Main Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-6">
          {/* Workflow Manager */}
          <UnifiedWorkflowManager 
            onLeadsGenerated={(generatedLeads) => {
              console.log('🎯 Unified workflow generated leads:', generatedLeads);
              
              // Immediately add the generated leads to workflow leads state
              if (generatedLeads && generatedLeads.length > 0) {
                console.log(`✅ Adding ${generatedLeads.length} generated leads to workflow state`);
                
                // Map the leads to match our expected format
                const mappedLeads = generatedLeads.map(lead => ({
                  ...lead,
                  // Ensure proper source classification
                  source: 'yellowpages',
                  personnel: lead.personnel || [],
                  // Map unified workflow fields to our expected format
                  company_name: lead.company,
                  final_score: lead.score,
                  emails: lead.email ? [lead.email] : [],
                  phones: lead.phone ? [lead.phone] : [],
                  websites: lead.website ? [lead.website] : []
                }));
                
                setWorkflowLeads(mappedLeads);
                
                // Update stats immediately
                const newStats = {
                  total: (leads.length || 0) + mappedLeads.length,
                  qualified: (leads.filter(l => l.status === 'qualified').length || 0) + mappedLeads.filter(l => l.score >= 80).length,
                  hot: (leads.filter(l => l.status === 'hot').length || 0) + mappedLeads.filter(l => l.score >= 60 && l.score < 80).length,
                  avgScore: mappedLeads.length > 0 ? Math.round(mappedLeads.reduce((sum, l) => sum + (l.score || 0), 0) / mappedLeads.length) : 0,
                  totalPersonnel: mappedLeads.reduce((sum, l) => sum + (l.personnel?.length || 0), 0),
                  companiesWithPersonnel: mappedLeads.filter(l => l.personnel?.length > 0).length,
                  avgPersonnelPerCompany: 0
                };
                
                const companiesWithPersonnel = newStats.companiesWithPersonnel;
                newStats.avgPersonnelPerCompany = companiesWithPersonnel > 0 
                  ? (newStats.totalPersonnel / companiesWithPersonnel).toFixed(1)
                  : 0;
                
                setLeadStats(newStats);
                
                // Auto-navigate to workflow tab to show results
                setActiveTab('workflow');
                
                console.log(`✅ Successfully processed ${mappedLeads.length} workflow leads`);
              }
              
              // Also refresh from database to get any saved leads
              setTimeout(() => {
                loadLeads();
              }, 1000);
            }}
          />
          
          {/* Lead Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Tab Headers */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500">
                  {filteredLeads.length} of {unifiedFiltering ? getAllLeadsForFiltering.length : getCurrentLeads.length} leads
                  {unifiedFiltering && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      <Network className="w-3 h-3" />
                      Unified Search
                    </span>
                  )}
                  {hasResults && activeTab === 'workflow' && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Fresh Results
                    </span>
                  )}
                </div>
              </div>
              
              {/* Tab Navigation and Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      {tab.id === 'workflow' && workflowLeads.length > 0 && (
                        <span className="ml-1 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                          {workflowLeads.length}
                        </span>
                      )}
                      {tab.id === 'manual' && leads.length > 0 && (
                        <span className="ml-1 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                          {leads.length}
                        </span>
                      )}
                    </Button>
                  );
                })}
                </div>
                
                {/* Unified Filtering Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={unifiedFiltering ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUnifiedFiltering(!unifiedFiltering)}
                    className={`flex items-center gap-2 ${
                      unifiedFiltering 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={unifiedFiltering 
                      ? 'Currently searching across all tables. Click to search only current tab.' 
                      : 'Currently searching only current tab. Click to search across all tables.'}
                  >
                    {unifiedFiltering ? (
                      <Network className="w-4 h-4" />
                    ) : (
                      <Layers className="w-4 h-4" />
                    )}
                    {unifiedFiltering ? 'Unified Search' : 'Tab Search'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                <div className="space-y-4">
                  {/* Unified Toolbar with Search and Filters */}
                  <UnifiedToolbar
                    config={{
                      search: {
                        placeholder: unifiedFiltering 
                          ? 'Search across all leads (unified mode)...' 
                          : 'Search leads by name, company, email, or phone...',
                        value: searchTerm,
                        onChange: setSearchTerm,
                        onClear: () => setSearchTerm('')
                      },
                      filters: [
                        {
                          id: 'status-filter',
                          icon: 'status',
                          label: 'Lead Status',
                          title: 'Filter by Lead Status',
                          hasActiveFilters: filterStatus !== 'all',
                          content: ({ onClose }) => (
                            <div className="space-y-2">
                              {[
                                { value: 'all', label: 'All Status' },
                                { value: 'hot', label: 'Hot' },
                                { value: 'warm', label: 'Warm' },
                                { value: 'cold', label: 'Cold' },
                                { value: 'qualified', label: 'Qualified' },
                                { value: 'contacted', label: 'Contacted' },
                                { value: 'converted', label: 'Converted' },
                                { value: 'lost', label: 'Lost' }
                              ].map((option) => (
                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="status"
                                    value={option.value}
                                    checked={filterStatus === option.value}
                                    onChange={() => {
                                      setFilterStatus(option.value);
                                      onClose();
                                    }}
                                    className="text-blue-600"
                                  />
                                  <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          ),
                          actions: [
                            {
                              label: 'Reset',
                              variant: 'outline',
                              onClick: () => setFilterStatus('all')
                            }
                          ]
                        }
                      ],
                      themeColor: 'blue'
                    }}
                  />

                  {/* CSV Upload Section for Manual Tab */}
                  {activeTab === 'manual' && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Upload className="w-5 h-5 text-blue-600" />
                          <h4 className="font-medium text-blue-900">Upload CSV Leads</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadSampleCSV}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Download Sample
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload CSV
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-blue-700">
                        Import your existing leads from a CSV file. Required columns: name, company, location.
                        {leads.length > 0 && (
                          <span className="ml-2 font-medium">
                            Currently showing {leads.length} manually uploaded/entered leads.
                          </span>
                        )}
                        {leads.length === 0 && (
                          <span className="ml-2 text-blue-600">
                            No manual leads yet. Upload a CSV or manually enter leads to see them here.
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Leads Display */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading leads...</p>
                      </div>
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No leads match your current filters.'
                          : activeTab === 'manual' 
                            ? 'No manual leads yet. Upload a CSV file or manually enter leads to get started.'
                            : activeTab === 'workflow'
                              ? 'No workflow leads yet. Run the integrated workflow to generate leads automatically.'
                              : 'Start by running a workflow or adding leads manually.'
                        }
                      </p>
                      {(searchTerm || filterStatus !== 'all') && (
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <EnhancedLeadDisplay
                      leads={filteredLeads}
                      onLeadSelect={handleSelectLead}
                      onContactLead={handleContactLead}
                      onAddToCRM={handleAddToCRM}
                      showPersonnel={activeTab === 'workflow' || activeTab === 'all'}
                      showSourceIndicators={activeTab === 'all'}
                      className="min-h-[400px]"
                    />
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
            onClick={() => setIsUploadModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Upload className="text-blue-600" />
                    Upload Manual Leads
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Import your existing lead data from a CSV file.
                </p>
              </div>
              
              <div className="p-6">
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="font-semibold text-gray-700">Drop your CSV file here</p>
                  <p className="text-sm text-gray-500 mb-2">or</p>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={onFileSelect} 
                    accept=".csv" 
                    className="hidden"
                  />
                </div>
                
                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {uploadProgress}% uploaded
                    </p>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Required columns:</strong> name, company, location</li>
                    <li>• <strong>Optional columns:</strong> position, industry, email, phone, website</li>
                    <li>• <strong>File format:</strong> CSV (.csv)</li>
                    <li>• <strong>Encoding:</strong> UTF-8</li>
                  </ul>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSampleCSV}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Sample CSV
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadGeneration; 