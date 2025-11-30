import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLeadContext } from '../../contexts/LeadContext';
import { useCRM } from '../../contexts/CRMContext';
import { useEmailSync } from '../../contexts/EmailSyncContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePersistedState, usePersistedSearch, usePersistedFilters, usePersistedColumns } from '../../hooks/usePersistedState';
import { useAuth } from '../../auth/hooks/useAuth';

import {
  Users,
  RefreshCw,
  Trash2,
  Loader2,
  Upload,
  ChevronDown,
  Building,
  Building2,
  MapPin,
  Phone,
  User,
  Mail,
  Check,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Settings,
  Globe,
  MoreVertical,
  Plus,
  Download,
  Calendar,
  FilterX
} from 'lucide-react';

import { Button } from '../ui/primitives/button';
import leadsApiService from '../../services/leadsApi';
import ConfirmDialog from '../ui/feedback/ConfirmDialog';
import LeadDetailModal from './LeadDetailModal';
import AddLeadModal from './AddLeadModal';
import CSVUploadModal from './CSVUploadModal';
import MassEmailComposer from './MassEmailComposer';
import FilterDropdown from '../crm/shared/FilterDropdown';
import SearchBarWithColumns from '../crm/shared/SearchBarWithColumns';
import { EmptyState } from '../ui/states/EmptyState';
import ScoreBadge from './ScoreBadge';

const LeadManagement = () => {
  // Auth
  const { authFetch } = useAuth();

  // Contexts
  const { setCustomers } = useCRM();

  // Use Lead Context
  const {
    leads,
    workflowLeads,
    isLoading,
    authLoading,
    hasInitialLoad,
    loadLeads,
    updateLead: contextUpdateLead,
    updateLeadStatus: contextUpdateLeadStatus,
    updateLeadStatusUIOnly: contextUpdateLeadStatusUIOnly,
    deleteLead: contextDeleteLead,
    removeLeadFromState,
    isCacheValid
  } = useLeadContext();

  // Use Email Sync Context
  const {
    isSyncing: isBackgroundSyncing,
    lastSyncTime: backgroundLastSyncTime,
    registerSyncCallback
  } = useEmailSync();

  // Use Notifications Context
  const { addNotification } = useNotifications();

  // Persisted filter state
  const [filters, setFilters] = usePersistedFilters('lead', {
    status: 'all',
    columnFilters: {}
  });
  const filterStatus = filters.status;
  const columnFilters = filters.columnFilters;
  const setFilterStatus = (status) => setFilters(prev => ({ ...prev, status }));
  const setColumnFilters = (colFilters) => setFilters(prev => ({ ...prev, columnFilters: colFilters }));

  // Persisted search preferences
  const { searchTerm, searchColumns, setSearchTerm, setSearchColumns } = usePersistedSearch('lead', {
    term: '',
    columns: {
      company: true,
      location: true,
      industry: true,
      email: true,
      phone: true,
      website: true,
      dates: true
    }
  });

  // Persisted sort preferences
  const [sortPreferences, setSortPreferences] = usePersistedState('lead_sort', {
    sortBy: 'company',
    sortOrder: 'asc'
  });
  const sortBy = sortPreferences.sortBy;
  const sortOrder = sortPreferences.sortOrder;
  const setSortBy = (by) => setSortPreferences(prev => ({ ...prev, sortBy: by }));
  const setSortOrder = (order) => setSortPreferences(prev => ({ ...prev, sortOrder: order }));
  
  // Non-persisted state
  const [selectedLead, setSelectedLead] = useState(null);
  const [localLoading, setLocalLoading] = useState(false); // For local UI operations

  // Mass email state
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [showMassEmailComposer, setShowMassEmailComposer] = useState(false);

  // Mass delete state
  const [showMassDeleteModal, setShowMassDeleteModal] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  // Modal and dropdown states - modalActiveTab is persisted for user preference
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showCSVUploadModal, setShowCSVUploadModal] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
  const [modalActiveTab, setModalActiveTab] = usePersistedState('lead_modal_tab', 'information'); // 'information' or 'email'

  // AI suggestions state - keyed by lead ID
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [aiSuggestionsError, setAiSuggestionsError] = useState({});

  // Email reply auto-sync state
  const [isSyncingReplies, setIsSyncingReplies] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [manualSyncLoading, setManualSyncLoading] = useState(false);

  // Persisted column visibility - default to only essential columns
  const [visibleColumns, setVisibleColumns] = usePersistedColumns('lead', {
    company: true,    // Always visible - cannot be deselected
    score: true,      // Default visible - lead quality score
    location: false,
    industry: true,   // Default visible
    email: true,      // Default visible - shows decision maker emails
    phone: false,
    website: true,    // Default visible
    status: true,     // Default visible
    dates: false      // Default hidden
  });

  // New lead creation state
  const [isAddingNewLead, setIsAddingNewLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    company: '',
    location: '',
    industry: '',
    email: '',
    phone: '',
    website: '',
    status: 'new'
  });

  // Inline editing state for table cells
  const [editingCell, setEditingCell] = useState(null); // { leadId, field }
  const [editingValue, setEditingValue] = useState('');

  // Dropdown states
  const [showAddLeadsDropdown, setShowAddLeadsDropdown] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Refs
  const scrollContainerRef = useRef(null);
  const addLeadsDropdownRef = useRef(null);
  const moreOptionsDropdownRef = useRef(null);
  const statusButtonRefs = useRef({});

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addLeadsDropdownRef.current && !addLeadsDropdownRef.current.contains(event.target)) {
        setShowAddLeadsDropdown(false);
      }
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setShowMoreOptionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle sorting
  const handleSort = (field) => {
    try {
      if (!field) return;

      let newSortOrder = 'asc';
      if (sortBy === field && sortOrder === 'asc') {
        newSortOrder = 'desc';
      }
      setSortBy(field);
      setSortOrder(newSortOrder);
    } catch (error) {
      console.error('Error in handleSort:', error);
    }
  };

  // Handle column visibility toggle
  const handleColumnToggle = (columnId, isVisible) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  // Apply column filter (similar to CRM implementation)
  const applyColumnFilter = (value, filter) => {
    if (!filter || !filter.condition) return true;

    const { condition, value: filterValue } = filter;
    const strValue = String(value || '').toLowerCase();
    const strFilterValue = String(filterValue || '').toLowerCase();

    switch (condition) {
      case 'contains': return strValue.includes(strFilterValue);
      case 'not_contains': return !strValue.includes(strFilterValue);
      case 'equals': return strValue === strFilterValue;
      case 'not_equals': return strValue !== strFilterValue;
      case 'starts_with': return strValue.startsWith(strFilterValue);
      case 'ends_with': return strValue.endsWith(strFilterValue);
      case 'is_empty': return !value || value === '';
      case 'not_empty': return value && value !== '';
      case 'greater_than': return parseFloat(value) > parseFloat(filterValue);
      case 'less_than': return parseFloat(value) < parseFloat(filterValue);
      case 'greater_equal': return parseFloat(value) >= parseFloat(filterValue);
      case 'less_equal': return parseFloat(value) <= parseFloat(filterValue);
      case 'between': {
        const [min, max] = filterValue.split(',').map(v => parseFloat(v));
        const numValue = parseFloat(value);
        return numValue >= min && numValue <= max;
      }
      case 'in': return filterValue.split(',').includes(String(value));
      case 'not_in': return !filterValue.split(',').includes(String(value));
      default: return true;
    }
  };

  // Handle adding new lead
  const handleAddNewLead = () => {
    setIsAddingNewLead(true);
    setNewLeadData({
      company: '',
      location: '',
      industry: '',
      email: '',
      phone: '',
      website: '',
      status: 'new'
    });
  };

  // Handle saving new lead
  const handleSaveNewLead = async () => {
    try {
      // Validate required fields
      if (!newLeadData.company.trim()) {
        toast.error('Company name is required');
        return;
      }

      // Prepare lead data for API - only include non-empty fields
      const leadData = {
        company: newLeadData.company.trim(),
        location: newLeadData.location.trim() || null,
        industry: newLeadData.industry.trim() || null,
        email: newLeadData.email.trim() || null,
        phone: newLeadData.phone.trim() || null,
        website: newLeadData.website.trim() || null,
        status: newLeadData.status || 'new',
        source: 'manual_entry'
      };

      // Call API to save lead
      const response = await leadsApiService.createLead(leadData);

      // Check if response indicates success
      if (response && (response.success !== false)) {
        toast.success('Lead added successfully');
        setIsAddingNewLead(false);
        // Refresh leads to show the new one
        await loadLeads(true);
      } else {
        throw new Error(response?.error || response?.message || 'Failed to add lead');
      }
    } catch (error) {
      console.error('Error saving new lead:', error);
      toast.error(`Failed to add lead: ${error.message}`);
    }
  };

  // Handle canceling new lead
  const handleCancelNewLead = () => {
    setIsAddingNewLead(false);
    setNewLeadData({
      company: '',
      location: '',
      industry: '',
      email: '',
      phone: '',
      website: '',
      status: 'new'
    });
  };

  // Handle new lead data change
  const handleNewLeadChange = (field, value) => {
    setNewLeadData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Render new lead input row
  const renderNewLeadRow = () => {
    if (!isAddingNewLead) return null;

    return (
      <tr className="bg-blue-50 border-2 border-blue-200">
        {/* Empty checkbox cell for add lead row - aligns with mass email checkbox column */}
        <td className="px-4 py-3"></td>

        {/* Company column - always visible */}
        {visibleColumns.company && (
          <td className="px-6 py-3 whitespace-nowrap">
            <input
              type="text"
              value={newLeadData.company}
              onChange={(e) => handleNewLeadChange('company', e.target.value)}
              placeholder="Company name *"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </td>
        )}
        {/* Location column */}
        {visibleColumns.location && (
          <td className="px-4 py-3 whitespace-nowrap">
            <input
              type="text"
              value={newLeadData.location}
              onChange={(e) => handleNewLeadChange('location', e.target.value)}
              placeholder="Location"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
        )}
        {/* Industry column */}
        {visibleColumns.industry && (
          <td className="px-6 py-3 whitespace-nowrap">
            <input
              type="text"
              value={newLeadData.industry}
              onChange={(e) => handleNewLeadChange('industry', e.target.value)}
              placeholder="Industry"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
        )}
        {/* Email column */}
        {visibleColumns.email && (
          <td className="px-6 py-3 whitespace-nowrap">
            <input
              type="email"
              value={newLeadData.email}
              onChange={(e) => handleNewLeadChange('email', e.target.value)}
              placeholder="Email"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
        )}
        {/* Phone column */}
        {visibleColumns.phone && (
          <td className="px-4 py-3 whitespace-nowrap">
            <input
              type="tel"
              value={newLeadData.phone}
              onChange={(e) => handleNewLeadChange('phone', e.target.value)}
              placeholder="Phone"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
        )}
        {/* Website column */}
        {visibleColumns.website && (
          <td className="px-6 py-3 whitespace-nowrap">
            <input
              type="url"
              value={newLeadData.website}
              onChange={(e) => handleNewLeadChange('website', e.target.value)}
              placeholder="Website"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
        )}
        {/* Status column */}
        {visibleColumns.status && (
          <td className="px-2 py-3 whitespace-nowrap">
            <select
              value={newLeadData.status}
              onChange={(e) => handleNewLeadChange('status', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </td>
        )}
        {/* Dates column */}
        {visibleColumns.dates && (
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="text-xs text-gray-500 italic">Auto-generated</span>
          </td>
        )}
        {/* Actions column - always visible */}
        <td className="px-4 py-2 text-right">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleSaveNewLead}
              className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors"
              title="Save Lead"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelNewLead}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Status options for the dropdown
  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-purple-100 text-purple-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
  ];

  // Get status option by value
  const getStatusOption = (status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  // Field configuration for inline editing - matches backend schema exactly
  const fieldConfig = {
    company: {
      id: 'company',
      type: 'text',
      label: 'Company',
      icon: Building,
      required: true,
      sortable: true,
      disabled: true, // Cannot be deselected
      validation: (value) => value?.length >= 2 ? null : 'Company name must be at least 2 characters'
    },
    location: {
      id: 'location',
      type: 'text',
      label: 'Location',
      icon: MapPin,
      sortable: true
    },
    industry: {
      id: 'industry',
      type: 'text',
      label: 'Industry',
      icon: Building2,
      sortable: true
    },
    email: {
      id: 'email',
      type: 'email',
      label: 'Email',
      icon: Mail,
      sortable: true,
      validation: (value) => {
        if (!value) return null; // Email is optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : 'Invalid email format';
      }
    },
    phone: {
      id: 'phone',
      type: 'tel',
      label: 'Phone',
      icon: Phone,
      sortable: true,
      validation: (value) => !value || value.length >= 10 ? null : 'Phone number must be at least 10 digits'
    },
    website: {
      id: 'website',
      type: 'url',
      label: 'Website',
      icon: Globe,
      sortable: true,
      validation: (value) => {
        if (!value) return null; // Website is optional
        try {
          new URL(value);
          return null;
        } catch {
          return 'Invalid website URL';
        }
      }
    },
    status: {
      id: 'status',
      type: 'select',
      label: 'Status',
      icon: Activity,
      sortable: true,
      options: statusOptions
    },
    dates: {
      id: 'dates',
      type: 'text',
      label: 'Dates',
      icon: Calendar,
      sortable: true
    }
  };

  // Sort leads function
  const sortLeads = useCallback((leadsArray) => {
    return [...leadsArray].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle special cases
      if (sortBy === 'created_at' || sortBy === 'dates') {
        // For dates column, use created_at field
        const aDate = sortBy === 'dates' ? a.created_at : aVal;
        const bDate = sortBy === 'dates' ? b.created_at : bVal;
        aVal = new Date(aDate || 0);
        bVal = new Date(bDate || 0);
      } else if (sortBy === 'status') {
        // Sort by status priority
        const statusPriority = { 'converted': 7, 'qualified': 6, 'hot': 5, 'warm': 4, 'contacted': 3, 'new_lead': 2, 'cold': 1, 'lost': 0 };
        aVal = statusPriority[aVal] || 0;
        bVal = statusPriority[bVal] || 0;
      } else if (sortBy === 'score') {
        // Sort by numeric score value
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        // String comparison
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortBy, sortOrder]);

  // Auto-load leads on mount or when cache expires
  useEffect(() => {
    if (!hasInitialLoad || !isCacheValid) {
      loadLeads();
    }
  }, [hasInitialLoad, isCacheValid, loadLeads]);

  // Failsafe: Ensure leads are loaded even if context cache has issues
  useEffect(() => {
    const checkAndLoad = setTimeout(() => {
      // If we think we loaded but have no data, force a reload
      if (hasInitialLoad && leads.length === 0 && workflowLeads.length === 0 && !isLoading) {
        loadLeads(true);
      }
    }, 500); // Check after a brief delay to let context initialize

    return () => clearTimeout(checkAndLoad);
  }, []); // Run once on mount

  // Register callback for app-level background sync
  useEffect(() => {
    const handleBackgroundSyncComplete = async (result) => {
      // Update last sync time
      setLastSyncTime(new Date().toISOString());

      // Refresh leads if any statuses were updated
      if (result.leads_status_updated > 0) {
        await loadLeads(true);
      }
    };

    // Register the callback with the app-level sync context
    const unregister = registerSyncCallback(handleBackgroundSyncComplete);

    // Cleanup on unmount
    return unregister;
  }, [registerSyncCallback, loadLeads]);

  // Handle opening lead modal from notification click (custom event)
  useEffect(() => {
    const handleOpenLeadModal = async (event) => {
      const leadIdToOpen = event.detail.leadId;

      // Check if lead exists in local array first
      const lead = leads.find(l => l.id === leadIdToOpen);

      if (lead) {
        // Lead found in current list - open immediately
        // (notifications are already filtered by assignment, so access is guaranteed)
        setSelectedLead(lead);
        setShowLeadModal(true);
      } else {
        // Lead not in local array - fetch from API
        // If access was revoked, backend will return 403/404 and we'll show error
        try {
          const leadData = await leadsApiService.getLeadById(leadIdToOpen);

          if (leadData) {
            setSelectedLead(leadData);
            setShowLeadModal(true);
          } else {
            toast.error('Lead not found');
          }
        } catch (error) {
          console.error('Error fetching lead:', error);
          // Handle access denied or not found errors from backend
          if (error.message?.includes('403') || error.message?.includes('Access')) {
            toast.error('Access Denied: This lead is not assigned to you');
          } else if (error.message?.includes('404')) {
            toast.error('Lead not found');
          } else {
            toast.error('Failed to open lead details');
          }
        }
      }
    };

    // Listen for custom event from NotificationCenter
    window.addEventListener('openLeadModal', handleOpenLeadModal);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('openLeadModal', handleOpenLeadModal);
    };
  }, [leads]);

  // Export CSV function - exports filtered leads
  const handleExportCSV = async () => {
    try {
      setLocalLoading(true);
      toast.loading('Preparing CSV export...');

      // Collect filter parameters based on current state
      const filterParams = {
        search: searchTerm || undefined,
        search_columns: searchTerm ? Object.keys(searchColumns).filter(key => searchColumns[key]) : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        column_filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
        sort_by: sortBy || 'company',
        sort_order: sortOrder || 'asc'
      };

      // Call export API
      const result = await leadsApiService.exportLeadsCSV(filterParams);

      // Create blob and trigger download
      const blob = new Blob([result], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.href = url;
      link.download = `leads_export_${timestamp}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.dismiss();
      toast.error(`Failed to export CSV: ${error.message}`);
    } finally {
      setLocalLoading(false);
    }
  };

  // Manual sync email replies function
  const handleManualCheckReplies = async () => {
    try {
      // Check which email provider the user is authenticated with
      const authProvider = localStorage.getItem('auth_provider');

      if (!authProvider || (authProvider !== 'google' && authProvider !== 'microsoft')) {
        toast.error('Please log in with Google or Microsoft to check email replies');
        return;
      }

      // Get the appropriate access token based on provider
      const accessToken = localStorage.getItem(`${authProvider}_access_token`);

      if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
        const providerName = authProvider === 'google' ? 'Gmail' : 'Outlook';
        toast.error(`${providerName} access token not available. Please log in with ${authProvider === 'google' ? 'Google' : 'Microsoft'}.`);
        return;
      }

      setManualSyncLoading(true);
      setIsSyncingReplies(true);

      const providerName = authProvider === 'google' ? 'Gmail' : 'Outlook';

      const result = await leadsApiService.checkAllReplies({
        access_token: accessToken,
        provider: authProvider === 'google' ? 'gmail' : 'outlook',
        days_back: 7,
        max_leads: 100
      });

      setLastSyncTime(new Date().toISOString());
      localStorage.setItem('leads_last_reply_sync', Date.now().toString());

      const newReplies = result.new_replies_processed || 0;
      const leadsQualified = result.leads_status_updated || 0;
      const qualifiedCompanies = result.qualified_companies || [];

      // Extract new fields
      const positiveNewlyQualified = result.positive_newly_qualified_companies || [];
      const positiveAlreadyQualified = result.positive_already_qualified_companies || [];
      const notPositive = result.not_positive_companies || [];
      const subjects = result.reply_subjects || {};
      const reply_lead_mapping = result.reply_lead_mapping || {};

      // Add notification to notification center if there are new replies
      if (newReplies > 0) {
        // Build multi-line message
        const allPositive = [...positiveNewlyQualified, ...positiveAlreadyQualified];

        let message = `${providerName}: ${newReplies} new ${newReplies === 1 ? 'reply' : 'replies'} from leads`;

        // Add positive replies with subjects
        if (allPositive.length > 0) {
          const positiveWithSubjects = allPositive.map(company => {
            const subject = subjects[company];
            return subject ? `${company} '${subject}'` : company;
          }).join(', ');
          message += `\n• ${allPositive.length} positive: ${positiveWithSubjects}`;
        }

        // Add not interested replies
        if (notPositive.length > 0) {
          message += `\n• ${notPositive.length} not interested: ${notPositive.join(', ')}`;
        }

        // Add qualified leads at the end with celebration emoji
        if (leadsQualified > 0) {
          message += `\n🎉 ${leadsQualified} ${leadsQualified === 1 ? 'lead' : 'leads'} qualified: ${positiveNewlyQualified.join(', ')} (contacted → qualified)`;
        }

        // Build structured lead objects array for expandable notification
        const leadsWithReplies = [];

        // Add positive leads (both newly qualified and already qualified)
        allPositive.forEach(company => {
          leadsWithReplies.push({
            leadId: reply_lead_mapping[company],
            companyName: company,
            replySubject: subjects[company],
            sentiment: 'positive',
            statusChanged: positiveNewlyQualified.includes(company),
            newStatus: positiveNewlyQualified.includes(company) ? 'qualified' : null
          });
        });

        // Add not positive leads
        notPositive.forEach(company => {
          leadsWithReplies.push({
            leadId: reply_lead_mapping[company],
            companyName: company,
            replySubject: subjects[company],
            sentiment: 'negative',
            statusChanged: false,
            newStatus: null
          });
        });

        // Add to notification center
        addNotification('lead-reply', message, {
          newReplies,
          leadsQualified,
          qualifiedCompanies,
          positiveAlreadyQualified,
          notPositive,
          provider: providerName,
          leadsWithReplies,
          expandable: true,
          manualSync: true  // Flag to distinguish manual vs automatic sync
        });

        // Show immediate toast feedback
        toast.success(`Loaded ${newReplies} new ${newReplies === 1 ? 'reply' : 'replies'}!`);
      } else {
        toast.success('No new replies found');
      }

      // Refresh leads if any statuses were updated
      if (result.leads_status_updated > 0) {
        await loadLeads(true);
      }

    } catch (error) {
      console.error('Manual check failed:', error);
      toast.error(`Failed to check replies: ${error.message}`);
    } finally {
      setManualSyncLoading(false);
      setIsSyncingReplies(false);
    }
  };

  // Filter workflow leads
  const filteredWorkflowLeads = useMemo(() => {
    const filtered = workflowLeads.map((lead, index) => ({
      ...lead,
      id: lead.id || `workflow-${index}`, // Ensure every lead has an ID
      status: lead.status || 'new' // Ensure default status
    })).filter(lead => {
      // Search filter with column selection
      const matchesSearch = searchTerm.length === 0 || (() => {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [];
        
        if (searchColumns.company) searchableFields.push(lead.company);
        if (searchColumns.name) searchableFields.push(lead.name);
        if (searchColumns.email) searchableFields.push(lead.email);
        if (searchColumns.phone) searchableFields.push(lead.phone);
        if (searchColumns.location) searchableFields.push(lead.address);
        
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
      })();

      // Status filter
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;

      // Column filters
      for (const [field, filters] of Object.entries(columnFilters)) {
        // Handle both old format (single filter) and new format (array of filters)
        const filterArray = Array.isArray(filters) ? filters : [filters];

        // ALL conditions for a field must pass (AND logic within field)
        const allConditionsPass = filterArray.every(filter =>
          applyColumnFilter(lead[field], filter)
        );

        if (!allConditionsPass) {
          return false;
        }
      }

      return matchesSearch && matchesStatus;
    });

    return sortLeads(filtered);
  }, [workflowLeads, filterStatus, searchTerm, searchColumns, columnFilters, sortLeads]);

  // Filter manual leads
  const filteredManualLeads = useMemo(() => {
    const filtered = leads.map((lead, index) => ({
      ...lead,
      id: lead.id || `manual-${index}`, // Ensure every lead has an ID
      status: lead.status || 'new' // Ensure default status
    })).filter(lead => {
      // Search filter with column selection
      const matchesSearch = searchTerm.length === 0 || (() => {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [];
        
        if (searchColumns.company) searchableFields.push(lead.company);
        if (searchColumns.name) searchableFields.push(lead.name);
        if (searchColumns.email) searchableFields.push(lead.email);
        if (searchColumns.phone) searchableFields.push(lead.phone);
        if (searchColumns.location) searchableFields.push(lead.address);
        
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
      })();

      // Status filter
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;

      // Column filters
      for (const [field, filters] of Object.entries(columnFilters)) {
        // Handle both old format (single filter) and new format (array of filters)
        const filterArray = Array.isArray(filters) ? filters : [filters];

        // ALL conditions for a field must pass (AND logic within field)
        const allConditionsPass = filterArray.every(filter =>
          applyColumnFilter(lead[field], filter)
        );

        if (!allConditionsPass) {
          return false;
        }
      }

      return matchesSearch && matchesStatus;
    });

    return sortLeads(filtered);
  }, [leads, filterStatus, searchTerm, searchColumns, columnFilters, sortLeads]);

  // Combined filtered leads for selection
  const filteredLeads = useMemo(() => {
    return [...filteredWorkflowLeads, ...filteredManualLeads];
  }, [filteredWorkflowLeads, filteredManualLeads]);

  // Handle status update
  const handleStatusUpdate = useCallback(async (leadId, newStatus) => {
    try {
      // Update using context method
      await contextUpdateLeadStatus(leadId, newStatus);

      const statusLabel = getStatusOption(newStatus).label;
      toast.success(`Lead status updated to ${statusLabel}`);
      setStatusDropdownOpen(null);
    } catch (error) {
      toast.error('Failed to update lead status');
      console.error('Status update error:', error);
    }
  }, [contextUpdateLeadStatus, getStatusOption]);

  // Handle row click to open modal
  const handleRowClick = useCallback((lead, e) => {
    // Don't open modal if user clicked on an editable cell or a button
    if (e.target.closest('.editable-cell') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
      return;
    }
    setSelectedLead(lead);
    setShowLeadModal(true);
    setModalActiveTab('information'); // Reset to information tab
    // Don't reset AI suggestions - they're now keyed by lead ID
    setIsLoadingAiSuggestions(false);
  }, []);

  // Load cached AI suggestions when lead profile opens (does not generate new)
  const loadCachedAiSuggestions = useCallback(async (leadId) => {
    if (!leadId) return;

    try {
      const cached = await leadsApiService.getCachedAISuggestions(leadId);

      if (cached) {
        // Store cached suggestions
        setAiSuggestions(prev => ({
          ...prev,
          [leadId]: cached
        }));
      }
    } catch (error) {
      console.error('❌ Failed to load cached AI analysis:', error);
      // Silent fail - user can still click Regenerate Report button
    }
  }, []);

  // Regenerate AI suggestions for the selected lead (always generates fresh)
  const regenerateAiSuggestions = useCallback(async (leadId) => {
    if (!leadId) return;

    setIsLoadingAiSuggestions(true);
    // Clear error for this specific lead
    setAiSuggestionsError(prev => ({
      ...prev,
      [leadId]: null
    }));

    try {
      const suggestions = await leadsApiService.regenerateAISuggestions(leadId);

      // Store suggestions keyed by lead ID
      setAiSuggestions(prev => ({
        ...prev,
        [leadId]: suggestions
      }));
    } catch (error) {
      console.error('❌ Failed to regenerate AI analysis:', error);

      // Store error keyed by lead ID
      setAiSuggestionsError(prev => ({
        ...prev,
        [leadId]: error.message || 'Failed to regenerate AI analysis'
      }));
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  }, []);


  // Handle email sent
  const handleEmailSent = useCallback(async (emailData) => {
    toast.success('Email sent successfully!');

    // Update the lead status if it was changed by the email send
    if (emailData && emailData.status_changed === true && emailData.new_status) {
      try {
        // Find the lead ID from the email data - we need to match by email address
        const leadToUpdate = [...leads, ...workflowLeads].find(lead =>
          lead.email === emailData.sent_to
        );

        if (leadToUpdate) {
          await contextUpdateLeadStatus(leadToUpdate.lead_id, emailData.new_status);
          toast.success(`Lead status updated to ${emailData.new_status}`);
        }
      } catch (error) {
        console.error('❌ Failed to update lead status:', error);
        toast.error('Email sent, but failed to update lead status');
      }
    }
  }, [leads, workflowLeads, contextUpdateLeadStatus]);

  // Handle lead update from inline editing
  const handleLeadUpdated = useCallback((updatedLead) => {
    console.log('✅ Lead updated in backend:', updatedLead);

    // IMPORTANT: Update selectedLead immediately to show changes in modal
    setSelectedLead(prevLead => {
      if (!prevLead) return updatedLead;

      // Merge updated data with existing lead data
      return {
        ...prevLead,
        ...updatedLead,
        // Ensure we preserve the lead_id field
        lead_id: updatedLead.lead_id || prevLead.lead_id,
        id: updatedLead.id || updatedLead.lead_id || prevLead.id
      };
    });

    // Update lead in context (like CRM does) - this updates the table immediately
    console.log('🔄 Updating lead in context...');
    contextUpdateLead(updatedLead);
  }, [contextUpdateLead]);

  // Handle table cell editing
  const handleCellClick = useCallback((lead, field, currentValue) => {
    setEditingCell({ leadId: lead.lead_id || lead.id, field });
    setEditingValue(currentValue || '');
  }, []);

  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);

  const handleCellSave = useCallback(async (leadId, field) => {
    try {
      console.log(`💾 [Table] Saving ${field} for lead ${leadId}:`, editingValue);

      const response = await authFetch(`${import.meta.env.VITE_BACKEND_LEAD_API_URL || 'http://localhost:9000'}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: editingValue
        })
      });

      if (response.ok) {
        const updatedLead = await response.json();
        console.log('✅ [Table] Lead updated:', updatedLead);

        // Update lead in context (same as modal does)
        contextUpdateLead(updatedLead);

        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated!`);
        setEditingCell(null);
        setEditingValue('');
      } else {
        toast.error('Failed to update lead');
      }
    } catch (error) {
      console.error('❌ [Table] Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  }, [editingValue, contextUpdateLead, authFetch]);

  // Render editable table cell
  const renderEditableCell = useCallback((lead, field, value, maxWidth = '200px') => {
    const leadId = lead.lead_id || lead.id;
    const isEditing = editingCell?.leadId === leadId && editingCell?.field === field;

    if (isEditing) {
      return (
        <td className="px-4 py-3" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCellSave(leadId, field);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCellCancel();
                }
              }}
              className="w-full px-2 py-1 pr-20 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {/* Save/Cancel Buttons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCellSave(leadId, field);
                }}
                className="p-1 hover:bg-green-100 rounded text-green-600 hover:text-green-800 transition-colors"
                title="Save (Enter)"
                style={{ minWidth: '28px', minHeight: '28px' }}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCellCancel();
                }}
                className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-800 transition-colors"
                title="Cancel (Esc)"
                style={{ minWidth: '28px', minHeight: '28px' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </td>
      );
    }

    return (
      <td className="px-4 py-3" style={{ maxWidth }}>
        <div className="truncate" title={value || '-'}>
          <span
            className="text-gray-900 cursor-pointer hover:bg-blue-50 px-1 py-0.5 -mx-1 -my-0.5 rounded inline-block"
            onClick={(e) => {
              e.stopPropagation();
              handleCellClick(lead, field, value);
            }}
            title={`Click to edit ${field}`}
          >
            {value || '-'}
          </span>
        </div>
      </td>
    );
  }, [editingCell, editingValue, handleCellClick, handleCellCancel, handleCellSave]);

  // Handle add lead to CRM action
  const handleAddToCRM = useCallback(async (lead, person = null) => {
    try {
      setLocalLoading(true);
      const loadingToastId = toast.loading(
        `Adding ${lead.company}${person ? ` (${person.first_name || person.name})` : ''} to CRM...`
      );

      const result = await leadsApiService.addLeadToCRM(
        lead.id,
        person?.personnel_id || null
      );

      toast.dismiss(loadingToastId);

      if (result.success) {
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

        // Remove lead from local state (optimistic update)
        removeLeadFromState(lead.id);

        // Close modal if this lead is currently selected
        if (selectedLead?.id === lead.id) {
          setSelectedLead(null);
          setShowLeadModal(false);
        }
      } else {
        toast.error(`❌ Failed to add to CRM: ${result.message}`, { duration: 6000 });
      }
    } catch (error) {
      toast.error(`❌ Error adding to CRM: ${error.message}`, { duration: 6000 });
    } finally {
      setLocalLoading(false);
    }
  }, [removeLeadFromState, selectedLead, setCustomers, loadLeads]);

  // Mass email selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allLeadIds = filteredLeads.map(lead => lead.lead_id || lead.id);
      setSelectedLeadIds(new Set(allLeadIds));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleLeadSelection = (leadId, isChecked) => {
    const newSelection = new Set(selectedLeadIds);
    if (isChecked) {
      newSelection.add(leadId);
    } else {
      newSelection.delete(leadId);
    }
    setSelectedLeadIds(newSelection);
  };

  const handleMassEmailSuccess = (result) => {
    // OPTIMISTIC UI UPDATE - update frontend status immediately
    // Database updates ONLY when background job sends each email

    if (result.updated_lead_ids && result.updated_lead_ids.length > 0) {
      // Update UI only (does NOT call backend API)
      // Backend will update database when each email actually sends
      for (const leadId of result.updated_lead_ids) {
        contextUpdateLeadStatusUIOnly(leadId, 'contacted');
      }

      toast.success(
        `📧 Emails queued! Status updated in UI.\n` +
        `Database will update as each email sends (2-3 min delays).`,
        { duration: 5000 }
      );
    }

    setSelectedLeadIds(new Set());
    setShowMassEmailComposer(false);
  };

  const handleMassDelete = async () => {
    setIsDeletingMultiple(true);
    const idsToDelete = Array.from(selectedLeadIds);
    let successCount = 0;

    for (const id of idsToDelete) {
      try {
        await contextDeleteLead(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete lead ${id}:`, error);
      }
    }

    toast.success(
      successCount > 0
        ? `Deleted ${successCount} of ${idsToDelete.length} leads successfully`
        : 'Failed to delete leads',
      { duration: 3000 }
    );

    setSelectedLeadIds(new Set());
    setShowMassDeleteModal(false);
    setIsDeletingMultiple(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 bg-white">
        {/* Unified Toolbar */}
        <div className="flex items-center justify-between mb-4">
          {/* Left Side - Add Leads */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={addLeadsDropdownRef}>
              <button
                onClick={() => setShowAddLeadsDropdown(!showAddLeadsDropdown)}
                disabled={isLoading || localLoading}
                className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-manrope h-10 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Manage Leads"
                tabIndex="0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Manage Leads
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAddLeadsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Manage Leads Dropdown */}
              {showAddLeadsDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleAddNewLead();
                        setShowAddLeadsDropdown(false);
                      }}
                      disabled={isAddingNewLead}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Add Lead</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCSVUploadModal(true);
                        setShowAddLeadsDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">Import CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setShowAddLeadsDropdown(false);
                      }}
                      disabled={isLoading || localLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      <span className="font-medium">Export CSV</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Search, Filters, More Options */}
          <div className="flex items-center gap-3">
            {/* Search with Column Selection */}
            <SearchBarWithColumns
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              searchColumns={searchColumns}
              onColumnChange={setSearchColumns}
              availableColumns={[
                { key: 'company', label: 'Company', icon: Building },
                { key: 'name', label: 'Name', icon: User },
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'phone', label: 'Phone', icon: Phone },
                { key: 'location', label: 'Location', icon: MapPin }
              ]}
              placeholder="Search leads..."
            />

            {/* Filter Dropdown */}
            <FilterDropdown
              columns={[
                { id: 'company', label: 'Company', type: 'text' },
                { id: 'location', label: 'Location', type: 'text' },
                { id: 'industry', label: 'Industry', type: 'text' },
                { id: 'email', label: 'Email', type: 'email' },
                { id: 'phone', label: 'Phone', type: 'tel' },
                { id: 'website', label: 'Website', type: 'text' },
                {
                  id: 'status',
                  label: 'Status',
                  type: 'select',
                  options: statusOptions.map(opt => ({ value: opt.value, label: opt.label }))
                }
              ]}
              onApplyFilters={setColumnFilters}
              activeFilters={columnFilters}
            />

            {/* More Options Dropdown */}
            <div className="relative" ref={moreOptionsDropdownRef}>
              <button
                onClick={(e) => {
                  const button = e.currentTarget;
                  const rect = button.getBoundingClientRect();

                  // Smart positioning for More Options dropdown
                  const dropdownHeight = 500; // max-h-[500px]
                  const dropdownWidth = 256; // w-64 = 16rem = 256px
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  const buffer = 20;

                  let top;
                  if (spaceBelow >= dropdownHeight + buffer) {
                    // Enough space below
                    top = rect.bottom + 8;
                  } else if (spaceAbove >= dropdownHeight + buffer) {
                    // Not enough space below but enough above
                    top = rect.top - dropdownHeight - 8;
                  } else {
                    // Not enough space either way - position below
                    top = rect.bottom + 8;
                  }

                  setDropdownPosition({
                    top: top,
                    left: rect.right - dropdownWidth // Align right edge
                  });
                  setShowMoreOptionsDropdown(!showMoreOptionsDropdown);
                }}
                className="inline-flex items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-inter text-xs h-8 w-8 p-0 rounded-lg transition-all duration-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
                title="More options"
                aria-label="More Options"
                tabIndex="0"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* More Options Dropdown */}
              {showMoreOptionsDropdown && (
                <div
                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-[500px] overflow-y-auto"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`
                  }}
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleManualCheckReplies();
                        setShowMoreOptionsDropdown(false);
                      }}
                      disabled={manualSyncLoading || isSyncingReplies}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">
                        {manualSyncLoading ? 'Checking Replies...' : 'Check All Replies'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        loadLeads(true);
                        setShowMoreOptionsDropdown(false);
                      }}
                      disabled={isLoading || localLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      <span className="font-medium">
                        {isLoading ? 'Refreshing...' : 'Refresh Data'}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-1"></div>

                    {/* Column Selector Section */}
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Select Columns</span>
                        <span className="text-xs text-gray-500">
                          {Object.values(visibleColumns).filter(Boolean).length}/{Object.values(fieldConfig).length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {Object.values(fieldConfig).map((column) => {
                          const Icon = column.icon;
                          return (
                            <label
                              key={column.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                                column.disabled
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'hover:bg-blue-50 cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns[column.id] !== false}
                                onChange={() => {
                                  if (!column.disabled) {
                                    handleColumnToggle(column.id, !visibleColumns[column.id]);
                                  }
                                }}
                                disabled={column.disabled}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              {Icon && <Icon className="w-4 h-4 text-gray-500" />}
                              <span className="text-sm text-gray-700 flex-1">
                                {column.label}
                                {column.disabled && <span className="text-xs text-gray-400 ml-1">(Required)</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Lead Tables */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto px-4 pb-2">
        {(authLoading || (isLoading && !hasInitialLoad)) ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">{authLoading ? 'Authenticating...' : 'Loading leads...'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Workflow Generated Section */}
            {filteredWorkflowLeads.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                  <table className="w-full" key={JSON.stringify(visibleColumns)}>
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {/* Checkbox column for mass email selection */}
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label="Select all leads"
                        />
                      </th>
                      {/* Company - always visible */}
                      {visibleColumns.company && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('company')}
                          >
                            <Building className="w-4 h-4" />
                            <span>Company</span>
                            {sortBy === 'company' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Score */}
                      {visibleColumns.score && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('score')}
                          >
                            <Activity className="w-4 h-4" />
                            <span>Score</span>
                            {sortBy === 'score' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Location */}
                      {visibleColumns.location && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('location')}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Location</span>
                            {sortBy === 'location' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Industry */}
                      {visibleColumns.industry && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('industry')}
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Industry</span>
                            {sortBy === 'industry' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Email */}
                      {visibleColumns.email && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('email')}
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                            {sortBy === 'email' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Phone */}
                      {visibleColumns.phone && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('phone')}
                          >
                            <Phone className="w-4 h-4" />
                            <span>Phone</span>
                            {sortBy === 'phone' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Website */}
                      {visibleColumns.website && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('website')}
                          >
                            <Globe className="w-4 h-4" />
                            <span>Website</span>
                            {sortBy === 'website' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Status */}
                      {visibleColumns.status && (
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('status')}
                          >
                            <Activity className="w-4 h-4" />
                            <span>Status</span>
                            {sortBy === 'status' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Dates */}
                      {visibleColumns.dates && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('dates')}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Dates</span>
                            {sortBy === 'dates' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {renderNewLeadRow()}
                    {filteredWorkflowLeads.map((lead, index) => (
                      <tr
                        key={lead.id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors cursor-pointer`}
                        onClick={(e) => handleRowClick(lead, e)}
                      >
                        {/* Checkbox column */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.lead_id || lead.id)}
                            onChange={(e) => handleLeadSelection(lead.lead_id || lead.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label={`Select ${lead.company}`}
                          />
                        </td>
                        {/* Company column - Editable */}
                        {visibleColumns.company && renderEditableCell(lead, 'company', lead.company, '380px')}

                        {/* Score column */}
                        {visibleColumns.score && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ScoreBadge score={lead.score} size="sm" />
                          </td>
                        )}

                        {/* Location column - Editable */}
                        {visibleColumns.location && renderEditableCell(lead, 'location', lead.location, '200px')}

                        {/* Industry column - Editable */}
                        {visibleColumns.industry && renderEditableCell(lead, 'industry', lead.industry, '150px')}

                        {/* Email column - Editable */}
                        {visibleColumns.email && renderEditableCell(lead, 'email', lead.email, '250px')}

                        {/* Phone column - Editable */}
                        {visibleColumns.phone && renderEditableCell(lead, 'phone', lead.phone, '150px')}

                        {/* Website column - Editable */}
                        {visibleColumns.website && renderEditableCell(lead, 'website', lead.website, '200px')}
                        {/* Status column */}
                        {visibleColumns.status && (
                          <td className="px-4 py-3 whitespace-nowrap" style={{ maxWidth: '120px'}}>
                            <div className="relative">
                              <button
                                ref={(el) => {
                                  if (el) statusButtonRefs.current[lead.id] = el;
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const button = statusButtonRefs.current[lead.id];
                                  if (button) {
                                    const rect = button.getBoundingClientRect();

                                    // Smart positioning: check if dropdown fits below button
                                    const dropdownHeight = 192; // max-h-48 = 12rem = 192px (4 options × ~48px each)
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    const buffer = 20; // safety buffer

                                    let top;
                                    if (spaceBelow >= dropdownHeight + buffer) {
                                      // Enough space below - position below button
                                      top = rect.bottom + 4;
                                    } else if (spaceAbove >= dropdownHeight + buffer) {
                                      // Not enough space below but enough above - position above button
                                      top = rect.top - dropdownHeight - 4;
                                    } else {
                                      // Not enough space either way - position below and let it scroll
                                      top = rect.bottom + 4;
                                    }

                                    setDropdownPosition({
                                      top: top,
                                      left: rect.left
                                    });
                                  }
                                  setStatusDropdownOpen(statusDropdownOpen === lead.id ? null : lead.id);
                                }}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusOption(lead.status).color} hover:opacity-80 transition-opacity`}
                              >
                                {getStatusOption(lead.status).label}
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </button>
                              {statusDropdownOpen === lead.id && (
                                <div
                                  className="fixed w-36 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] max-h-48 overflow-y-auto"
                                  style={{
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`
                                  }}
                                >
                                  {statusOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(lead.id, option.value);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0 block"
                                    >
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                                        {option.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Dates column */}
                        {visibleColumns.dates && (
                          <td className="px-4 py-3 whitespace-nowrap" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.created_at}>
                              <span className="text-gray-900">
                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : '-'}
                              </span>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    </tbody>
                  </table>
              </div>
            )}

            {/* Manual/Uploaded Section */}
            {filteredManualLeads.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <div className="px-4 pt-2 bg-purple-50 border-b border-purple-200 rounded-t-lg">
                  <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Manual/Uploaded ({filteredManualLeads.length})
                  </h3>
                </div>
                  <table className="w-full" key={JSON.stringify(visibleColumns)}>
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {/* Checkbox column for mass email selection */}
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label="Select all leads"
                        />
                      </th>
                      {/* Company */}
                      {visibleColumns.company && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('company')}
                          >
                            <Building className="w-4 h-4" />
                            <span>Company</span>
                            {sortBy === 'company' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Score */}
                      {visibleColumns.score && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('score')}
                          >
                            <Activity className="w-4 h-4" />
                            <span>Score</span>
                            {sortBy === 'score' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Location */}
                      {visibleColumns.location && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('location')}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Location</span>
                            {sortBy === 'location' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Industry */}
                      {visibleColumns.industry && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('industry')}
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Industry</span>
                            {sortBy === 'industry' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Email */}
                      {visibleColumns.email && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('email')}
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                            {sortBy === 'email' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Phone */}
                      {visibleColumns.phone && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('phone')}
                          >
                            <Phone className="w-4 h-4" />
                            <span>Phone</span>
                            {sortBy === 'phone' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Website */}
                      {visibleColumns.website && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('website')}
                          >
                            <Globe className="w-4 h-4" />
                            <span>Website</span>
                            {sortBy === 'website' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Status */}
                      {visibleColumns.status && (
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('status')}
                          >
                            <Activity className="w-4 h-4" />
                            <span>Status</span>
                            {sortBy === 'status' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Dates */}
                      {visibleColumns.dates && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('dates')}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Dates</span>
                            {sortBy === 'dates' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredManualLeads.map((lead, index) => (
                      <tr
                        key={lead.id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors cursor-pointer`}
                        onClick={(e) => handleRowClick(lead, e)}
                      >
                        {/* Checkbox column */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.lead_id || lead.id)}
                            onChange={(e) => handleLeadSelection(lead.lead_id || lead.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label={`Select ${lead.company}`}
                          />
                        </td>
                        {/* Company column */}
                        {visibleColumns.company && (
                          <td className="px-6 py-3" style={{ maxWidth: '380px'}}>
                            <div className="flex items-center min-w-0">
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="truncate" title={lead.company}>
                                  <span className="text-gray-900">{lead.company}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {/* Score column */}
                        {visibleColumns.score && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ScoreBadge score={lead.score} size="sm" />
                          </td>
                        )}
                        {/* Location column */}
                        {visibleColumns.location && (
                          <td className="px-4 py-3" style={{ maxWidth: '200px'}}>
                            <div className="truncate" title={lead.location}>
                              <span className="text-gray-900">{lead.location || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Industry column */}
                        {visibleColumns.industry && (
                          <td className="px-6 py-3" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.industry}>
                              <span className="text-gray-900">{lead.industry || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Email column */}
                        {visibleColumns.email && (
                          <td className="px-6 py-3" style={{ maxWidth: '250px'}}>
                            <div className="truncate" title={lead.email}>
                              <span className="text-gray-900">{lead.email || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Phone column */}
                        {visibleColumns.phone && (
                          <td className="px-4 py-3" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.phone}>
                              <span className="text-gray-900">{lead.phone || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Website column */}
                        {visibleColumns.website && (
                          <td className="px-6 py-3" style={{ maxWidth: '200px'}}>
                            <div className="truncate" title={lead.website}>
                              {lead.website ? (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {lead.website}
                                </a>
                              ) : (
                                <span className="text-gray-900">-</span>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Status column */}
                        {visibleColumns.status && (
                          <td className="px-2 py-3 whitespace-nowrap" style={{ maxWidth: '120px'}}>
                            <div className="relative">
                              <button
                                ref={(el) => {
                                  if (el) statusButtonRefs.current[lead.id] = el;
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const button = statusButtonRefs.current[lead.id];
                                  if (button) {
                                    const rect = button.getBoundingClientRect();

                                    // Smart positioning: check if dropdown fits below button
                                    const dropdownHeight = 192; // max-h-48 = 12rem = 192px (4 options × ~48px each)
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    const buffer = 20; // safety buffer

                                    let top;
                                    if (spaceBelow >= dropdownHeight + buffer) {
                                      // Enough space below - position below button
                                      top = rect.bottom + 4;
                                    } else if (spaceAbove >= dropdownHeight + buffer) {
                                      // Not enough space below but enough above - position above button
                                      top = rect.top - dropdownHeight - 4;
                                    } else {
                                      // Not enough space either way - position below and let it scroll
                                      top = rect.bottom + 4;
                                    }

                                    setDropdownPosition({
                                      top: top,
                                      left: rect.left
                                    });
                                  }
                                  setStatusDropdownOpen(statusDropdownOpen === lead.id ? null : lead.id);
                                }}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusOption(lead.status).color} hover:opacity-80 transition-opacity`}
                              >
                                {getStatusOption(lead.status).label}
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </button>
                              {statusDropdownOpen === lead.id && (
                                <div
                                  className="fixed w-36 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] max-h-48 overflow-y-auto"
                                  style={{
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`
                                  }}
                                >
                                  {statusOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(lead.id, option.value);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0 block"
                                    >
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                                        {option.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Dates column */}
                        {visibleColumns.dates && (
                          <td className="px-4 py-3 whitespace-nowrap" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.created_at}>
                              <span className="text-gray-900">
                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : '-'}
                              </span>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  </table>
              </div>
            )}

            {/* Empty State */}
            {filteredWorkflowLeads.length === 0 && filteredManualLeads.length === 0 && (() => {
              const hasFilters = searchTerm || filterStatus !== 'all' || sortBy !== 'company' || sortOrder !== 'asc';
              return (
                <EmptyState
                  icon={Users}
                  iconColor="text-blue-500"
                  iconBgGradient="from-blue-50 to-cyan-50"
                  title={hasFilters ? 'No leads match your filters' : 'No leads yet'}
                  description={hasFilters
                    ? 'Try adjusting your search and filter criteria to see more results.'
                    : 'Generate your first leads to start building your sales pipeline.'
                  }
                  action={hasFilters ? (
                    <Button onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      setSortBy('company');
                      setSortOrder('asc');
                    }} variant="outline">
                      <FilterX className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  ) : (
                    <Button onClick={() => setShowAddLeadModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Lead Manually
                    </Button>
                  )}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        selectedLead={selectedLead}
        modalActiveTab={modalActiveTab}
        setModalActiveTab={setModalActiveTab}
        aiSuggestions={selectedLead ? aiSuggestions[selectedLead.id] : null}
        isLoadingAiSuggestions={isLoadingAiSuggestions}
        aiSuggestionsError={selectedLead ? aiSuggestionsError[selectedLead.id] : null}
        loadCachedAiSuggestions={loadCachedAiSuggestions}
        regenerateAiSuggestions={regenerateAiSuggestions}
        handleAddToCRM={handleAddToCRM}
        handleEmailSent={handleEmailSent}
        onLeadUpdated={handleLeadUpdated}
      />

      {/* Click outside to close dropdown */}
      {statusDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setStatusDropdownOpen(null)}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showCSVUploadModal}
        onClose={() => setShowCSVUploadModal(false)}
      />

      {/* Floating Mass Email Button */}
      {selectedLeadIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 px-6 py-3 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setShowMassEmailComposer(true)}
              className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95"
            >
              <Mail className="w-4 h-4 mr-2" />
              Mass Email
            </button>
            <button
              onClick={() => setShowMassDeleteModal(true)}
              className="inline-flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Mass Email Composer Modal */}
      {showMassEmailComposer && (
        <MassEmailComposer
          selectedLeadIds={selectedLeadIds}
          allLeads={[...leads, ...workflowLeads]}
          onClose={() => setShowMassEmailComposer(false)}
          onEmailsSent={handleMassEmailSuccess}
        />
      )}

      {/* Mass Delete Confirmation Modal */}
      {showMassDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Selected Items</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Delete {selectedLeadIds.size} selected {selectedLeadIds.size === 1 ? 'lead' : 'leads'}?
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMassDeleteModal(false)}
                  disabled={isDeletingMultiple}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMassDelete}
                  disabled={isDeletingMultiple}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isDeletingMultiple ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeadManagement;