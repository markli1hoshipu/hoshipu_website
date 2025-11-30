import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import UnifiedHeader from '../../ui/header/UnifiedHeader';
import UnifiedToolbar from '../../ui/toolbar/UnifiedToolbar';
import { usePersistedState, usePersistedColumns, usePersistedFilters, usePersistedSearch } from '../../../hooks/usePersistedState';
import { useNotifications } from '../../../contexts/NotificationContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/primitives/dialog';

import {
  Users,
  Mail,
  Building,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  Zap,
  Plus,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Activity,
  BarChart3,
  PieChart,
  UserCheck,
  MessageSquare,
  ShieldCheck,
  Mic,
  Upload,
  Settings,
  Database,
  TrendingUp as TrendingUpIcon,
  Trash2,
  Clock,
  Home,
  FileText,
  Phone,
  MapPin,
  Globe,
  Send,
  Building2,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/primitives/card';
import { Button } from '../../ui/primitives/button';
import CustomerProfileDisplay from '../customer-profile/CustomerProfileDisplay';

import EditableCustomerTable from '../tables/EditableCustomerTable';
import FilterDropdown from '../shared/FilterDropdown';
import SearchBarWithColumns from '../shared/SearchBarWithColumns';
import CustomerCsvUpload from '../tables/CustomerCsvUpload';
import { useAuth } from '../../../auth/hooks/useAuth';
import { useCRM } from '../../../contexts/CRMContext';
import { toast } from 'react-hot-toast';

const CustomerRelationshipManagement = ({ wsConnection }) => {
  const { authFetch, isAuthenticated } = useAuth();

  // Get data from CRM context
  const {
    customers,
    customersLoading,
    customersError,
    refreshCustomers,
    addCustomer: contextAddCustomer,
    deleteCustomer: contextDeleteCustomer,
    employees,
    employeesLoading,
    analyticsInsights,
    insightsLoading,
    insightsError,
    refreshAnalytics,
    CRM_API_BASE_URL,
    loadCustomers,
    loadEmployees,
    isInitialized,
    hasInitialLoad,
    isLoadedFromCache
  } = useCRM();

  // Use faster animation when data is loaded from cache (50ms vs 300ms)
  const animationDuration = isLoadedFromCache ? 0.05 : 0.3;

  // Get notification function
  const { addNotification } = useNotifications();

  // Tab state - persisted
  const [activeTab, setActiveTab] = usePersistedState('crm_active_tab', 'customer-management');

  // Persisted search state
  const { searchTerm, searchColumns, setSearchTerm, setSearchColumns } = usePersistedSearch('crm', {
    term: '',
    columns: {
      company: true,
      primaryContact: true,
      email: true,
      industry: true,
      phone: false,
      status: false,
      notes: false
    }
  });

  // Persisted filter state
  const [filters, setFilters] = usePersistedFilters('crm', {
    status: 'all',
    healthScore: 'all',
    columnFilters: {}
  });
  const filterStatus = filters.status;
  const filterHealthScore = filters.healthScore;
  const columnFilters = filters.columnFilters;
  const setFilterStatus = (status) => setFilters(prev => ({ ...prev, status }));
  const setFilterHealthScore = (score) => setFilters(prev => ({ ...prev, healthScore: score }));
  const setColumnFilters = (colFilters) => setFilters(prev => ({ ...prev, columnFilters: colFilters }));

  // Persisted column visibility
  const [visibleColumns, setVisibleColumns] = usePersistedColumns('crm', {
    company: true,
    primaryContact: true,
    email: true,
    phone: false,
    industry: false,
    status: true,
    churnRisk: true,
    lifetimeValue: false,
    expansionPotential: false,
    lastContact: true,
    assignedSalesman: false
  });

  // Persisted UI preferences
  const [uiPreferences, setUiPreferences] = usePersistedState('crm_ui_preferences', {
    showARR: true,
    showFilters: false,
    showSearch: false
  });
  const showARR = uiPreferences.showARR;
  const showFilters = uiPreferences.showFilters;
  const showSearch = uiPreferences.showSearch;
  const setShowARR = (show) => setUiPreferences(prev => ({ ...prev, showARR: show }));
  const setShowFilters = (show) => setUiPreferences(prev => ({ ...prev, showFilters: show }));
  const setShowSearch = (show) => setUiPreferences(prev => ({ ...prev, showSearch: show }));

  // Non-persisted UI state (modal states, temporary selections)
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showSearchColumnDropdown, setShowSearchColumnDropdown] = useState(false);
  const [showAddCustomersDropdown, setShowAddCustomersDropdown] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false);

  // New state for Main tab

  // Customer Management modal state
  const [showModal, setShowModal] = useState(false);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState("overview");
  // Persisted sort preferences
  const [sortPreferences, setSortPreferences] = usePersistedState('crm_sort', {
    sortBy: 'company',
    sortOrder: 'asc'
  });
  const sortBy = sortPreferences.sortBy;
  const sortOrder = sortPreferences.sortOrder;
  const setSortBy = (by) => setSortPreferences(prev => ({ ...prev, sortBy: by }));
  const setSortOrder = (order) => setSortPreferences(prev => ({ ...prev, sortOrder: order }));

  // Activity timeline state
  const [customerInteractions, setCustomerInteractions] = useState([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Customer summary state (like CustomerProfileDisplay)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [generatedSummaries, setGeneratedSummaries] = useState({});
  const [summaryPeriod, setSummaryPeriod] = useState(30); // Default 30 days

  // Dropdown refs for click outside handling
  const addCustomersDropdownRef = React.useRef(null);
  const moreOptionsDropdownRef = React.useRef(null);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: '',
    emailType: 'cold_outreach',
    generatedEmail: null,
    editMode: false,
    editedSubject: '',
    editedBody: ''
  });
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Gmail sync state
  const [emailSyncLoading, setEmailSyncLoading] = useState(false);
  const [emailSyncProgress, setEmailSyncProgress] = useState(null);
  const [emailSyncError, setEmailSyncError] = useState(null);
  const [showEmailSyncNotification, setShowEmailSyncNotification] = useState(false);

  // Analytics state is now managed by context

  // Track if CRM has been initialized
  const [crmInitialized, setCrmInitialized] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addCustomersDropdownRef.current && !addCustomersDropdownRef.current.contains(event.target)) {
        setShowAddCustomersDropdown(false);
      }
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setShowMoreOptionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load CRM data on first mount - now relies on context pre-loading
  useEffect(() => {
    if (!crmInitialized && isInitialized) {
      console.log('Checking if CRM data needs initialization...');

      // Only load if data is not already cached (context will handle caching)
      // This ensures data loads if context hasn't pre-loaded yet
      Promise.all([
        loadCustomers(false), // Will use cache if valid
        loadEmployees(false)   // Will use cache if valid
      ]).then(() => {
        setCrmInitialized(true);
        console.log('CRM data ready (from cache or fresh load)');
      }).catch(error => {
        console.error('Error ensuring CRM data:', error);
        setCrmInitialized(true); // Mark as initialized even on error to prevent retry loops
      });
    }
  }, [crmInitialized, isInitialized, loadCustomers, loadEmployees]);

  // Handle opening customer profile from notification click (custom event)
  useEffect(() => {
    const handleOpenCustomerProfile = async (event) => {
      const customerIdToOpen = event.detail.customerId;
      console.log('[CRM] Opening customer profile for ID:', customerIdToOpen);

      // Check if customer exists in local array first (compare as strings since ID comes from backend as string)
      const customer = customers.find(c => String(c.id) === String(customerIdToOpen));

      if (customer) {
        // Customer found in current list - open immediately
        // (notifications are already filtered by assignment, so access is guaranteed)
        console.log('[CRM] Customer found in list, opening modal:', customer);
        setModalCustomer(customer);
        setShowModal(true);
      } else {
        // Customer not in local array - fetch from API
        // If access was revoked, backend will return 403/404 and we'll show error
        console.log('[CRM] Customer not in list, fetching from API...');
        try {
          const response = await fetch(`${CRM_API_BASE_URL}/api/crm/customers/${customerIdToOpen}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('id_token')}`
            }
          });

          if (response.ok) {
            const customerData = await response.json();
            console.log('[CRM] Customer data fetched, opening modal:', customerData);
            setModalCustomer(customerData);
            setShowModal(true);
          } else if (response.status === 403) {
            console.error('[CRM] Access denied to customer:', customerIdToOpen);
            toast.error('Access Denied: This customer is not assigned to you');
          } else if (response.status === 404) {
            console.error('[CRM] Customer not found:', customerIdToOpen);
            toast.error('Customer not found');
          } else {
            console.error('[CRM] Failed to fetch customer:', response.status);
            toast.error('Failed to load customer data');
          }
        } catch (error) {
          console.error('[CRM] Error fetching customer:', error);
          toast.error('Error loading customer data');
        }
      }
    };

    // Listen for custom event from NotificationCenter
    window.addEventListener('openCustomerProfile', handleOpenCustomerProfile);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('openCustomerProfile', handleOpenCustomerProfile);
    };
  }, [customers, CRM_API_BASE_URL]);

  // Tab configuration - removed single tab display as it's redundant
  const tabs = [];

  // Helper function to get employee by ID
  const getEmployeeById = (employeeId) => {
    return employees.find(emp => emp.id === employeeId);
  };

  // Handle column visibility toggle
  const handleColumnToggle = (columnId, isVisible) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  // Add function to generate analytics insights
  const generateAnalyticsInsights = async () => {
    if (analyticsInsights && !insightsError) {
      // Use cached insights from context
      return;
    }
    refreshAnalytics();
  };

  // Manual refresh function for testing
  const handleRefreshData = () => {
    refreshCustomers();
  };

  // Add customer function
  const handleAddCustomer = async (customerData) => {
    setIsAddingCustomer(true);
    try {
      const result = await contextAddCustomer(customerData);
      if (result.success) {
        setShowAddCustomerModal(false);
        // Show success message or notification here if needed
      } else {
        console.error('Failed to add customer:', result.error);
        // Handle error - show notification to user
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      // Handle error - show notification to user
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Handle CSV import completion
  const handleCsvImportComplete = (importResult) => {
    setShowCsvUpload(false);
    // Refresh customer data to show newly imported customers
    refreshCustomers();
    // Could show a success notification with import stats here
    console.log('CSV import completed:', importResult);
  };



  // Helper function to apply filter conditions
  const applyFilterCondition = (fieldValue, condition, filterValue) => {
    if (fieldValue === null || fieldValue === undefined) {
      return ['is_empty'].includes(condition);
    }

    const stringValue = String(fieldValue).toLowerCase();
    const filterValueLower = String(filterValue || '').toLowerCase();

    switch (condition) {
      case 'contains':
        return stringValue.includes(filterValueLower);
      case 'equals':
        return stringValue === filterValueLower;
      case 'starts_with':
        return stringValue.startsWith(filterValueLower);
      case 'ends_with':
        return stringValue.endsWith(filterValueLower);
      case 'not_contains':
        return !stringValue.includes(filterValueLower);
      case 'not_equals':
        return stringValue !== filterValueLower;
      case 'is_empty':
        return !stringValue || stringValue.trim() === '';
      case 'not_empty':
        return stringValue && stringValue.trim() !== '';
      case 'greater_than':
        return Number(fieldValue) > Number(filterValue);
      case 'less_than':
        return Number(fieldValue) < Number(filterValue);
      case 'greater_equal':
        return Number(fieldValue) >= Number(filterValue);
      case 'less_equal':
        return Number(fieldValue) <= Number(filterValue);
      case 'between':
        const [min, max] = filterValue.split(',').map(v => Number(v.trim()));
        return Number(fieldValue) >= min && Number(fieldValue) <= max;
      case 'before':
        return new Date(fieldValue) < new Date(filterValue);
      case 'after':
        return new Date(fieldValue) > new Date(filterValue);
      case 'last_days':
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(filterValue));
        return new Date(fieldValue) >= daysAgo;
      case 'next_days':
        const daysFromNow = new Date();
        daysFromNow.setDate(daysFromNow.getDate() + Number(filterValue));
        return new Date(fieldValue) <= daysFromNow;
      case 'in':
        const values = filterValue.split(',').map(v => v.trim().toLowerCase());
        return values.includes(stringValue);
      case 'not_in':
        const notValues = filterValue.split(',').map(v => v.trim().toLowerCase());
        return !notValues.includes(stringValue);
      default:
        return true;
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    const matchesHealthScore = filterHealthScore === 'all' ||
      (filterHealthScore === 'high' && customer.healthScore >= 80) ||
      (filterHealthScore === 'medium' && customer.healthScore >= 50 && customer.healthScore < 80) ||
      (filterHealthScore === 'low' && customer.healthScore < 50);
    
    // Enhanced search logic with column selection
    const assignedEmployee = getEmployeeById(customer.assignedEmployeeId);
    const searchString = (searchTerm || '').toLowerCase();
    let matchesSearch = !searchTerm; // If no search term, match all
    
    if (searchTerm) {
      const searchableFields = [];
      if (searchColumns.company) searchableFields.push(customer.company || '');
      if (searchColumns.primaryContact) searchableFields.push(customer.primaryContact || '');
      if (searchColumns.email) searchableFields.push(customer.email || '');
      if (searchColumns.industry) searchableFields.push(customer.industry || '');
      if (searchColumns.phone) searchableFields.push(customer.phone || '');
      if (searchColumns.status) searchableFields.push(customer.status || '');
      if (searchColumns.notes) searchableFields.push(customer.notes || '');
      
      matchesSearch = searchableFields.some(field => 
        field.toLowerCase().includes(searchString)
      );
    }

    // Apply column filters from FilterDropdown
    let matchesColumnFilters = true;
    if (Object.keys(columnFilters).length > 0) {
      matchesColumnFilters = Object.entries(columnFilters).every(([columnId, filters]) => {
        const fieldValue = customer[columnId];

        // Handle both old format (single filter) and new format (array of filters)
        const filterArray = Array.isArray(filters) ? filters : [filters];

        // ALL conditions for a field must pass (AND logic within field)
        return filterArray.every(filter => {
          if (!filter.condition) return true; // Skip if no condition set
          return applyFilterCondition(fieldValue, filter.condition, filter.value);
        });
      });
    }
    
    return matchesStatus && matchesHealthScore && matchesSearch && matchesColumnFilters;
  });

  // Sorted customers for Customer Management tab
  const sortedCustomers = useMemo(() => {
    if (activeTab !== 'customer-management' || !filteredCustomers || filteredCustomers.length === 0) return [];

    return [...filteredCustomers].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortBy) {
        case 'company':
          aValue = a.company || '';
          bValue = b.company || '';
          break;
        case 'contact':
          aValue = a.primaryContact || '';
          bValue = b.primaryContact || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'lastInteraction':
          aValue = a.lastContact || '';
          bValue = b.lastContact || '';
          break;
        case 'healthScore':
          aValue = a.healthScore || 0;
          bValue = b.healthScore || 0;
          break;
        case 'dateAdded':
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        default:
          aValue = a.company || '';
          bValue = b.company || '';
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [activeTab, filteredCustomers, sortBy, sortOrder]);

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerProfile(true);
  };

  const handleExportData = async () => {
    try {
              const response = await fetch(`${CRM_API_BASE_URL}/api/crm/export-customers`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]
        : 'customer_data.csv';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Email sync function (uses current auth provider)
  const handleEmailSync = async () => {
    console.log('🚀 [FRONTEND] handleEmailSync() called');
    setEmailSyncLoading(true);
    setEmailSyncError(null);
    setEmailSyncProgress({ status: 'Starting sync...', percentage: 0 });

    try {
      // Get the auth provider from login
      console.log('🔍 [FRONTEND] Step 1: Getting auth provider from localStorage...');
      const authProvider = localStorage.getItem('auth_provider');
      console.log('✅ [FRONTEND] Auth provider:', authProvider);

      if (!authProvider) {
        console.error('❌ [FRONTEND] No auth provider found');
        throw new Error('Please log in with Google or Microsoft to enable email sync.');
      }

      // Use only the provider that matches login
      console.log('🔍 [FRONTEND] Step 2: Getting access token from localStorage...');
      const providerKey = authProvider === 'google' ? 'google' : 'microsoft';
      const accessToken = localStorage.getItem(`${providerKey}_access_token`);
      const userEmail = localStorage.getItem(`${providerKey}_user_email`);

      console.log('✅ [FRONTEND] Token check:', {
        authProvider,
        providerKey,
        hasToken: !!accessToken,
        userEmail,
        tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : null
      });

      if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
        console.error('❌ [FRONTEND] No valid access token found');
        throw new Error(`Please log in with ${authProvider === 'google' ? 'Google' : 'Microsoft'} to enable email sync.`);
      }

      if (!userEmail) {
        console.error('❌ [FRONTEND] No user email found');
        throw new Error('Email address not available. Please log in again.');
      }

      console.log('🔍 [FRONTEND] Step 3: Determining provider and endpoint...');
      const provider = authProvider === 'google' ? 'gmail' : 'outlook';
      console.log('✅ [FRONTEND] Provider:', provider);

      setEmailSyncProgress({
        status: `Connecting to ${provider === 'gmail' ? 'Gmail' : 'Outlook'}...`,
        percentage: 25
      });

      // Use regular fetch instead of authFetch to avoid automatic logout on 401
      console.log('🔍 [FRONTEND] Step 4: Getting ID token for authentication...');
      const idToken = localStorage.getItem('id_token');
      console.log('✅ [FRONTEND] Authentication check:', {
        hasIdToken: !!idToken,
        idTokenValue: idToken?.substring(0, 20) + '...',
        provider,
        endpoint: `${CRM_API_BASE_URL}/api/crm/${provider === 'gmail' ? 'gmail/sync' : 'outlook/sync'}`
      });

      if (!idToken) {
        console.error('❌ [FRONTEND] No ID token found');
        // Check if user has any auth tokens
        const hasGoogleToken = !!localStorage.getItem('google_access_token');
        const hasOutlookToken = !!localStorage.getItem('outlook_access_token');

        if (hasGoogleToken || hasOutlookToken) {
          throw new Error('You are connected to email but not logged into the main app. Please log in to Prelude first, then try syncing emails.');
        } else {
          throw new Error('Not authenticated. Please log in to Prelude first.');
        }
      }

      console.log('🔍 [FRONTEND] Step 5: Preparing to call backend API...');
      setEmailSyncProgress({ status: 'Syncing emails...', percentage: 50 });

      const endpoint = provider === 'gmail' ? 'gmail/sync' : 'outlook/sync';
      const fullUrl = `${CRM_API_BASE_URL}/api/crm/${endpoint}`;

      console.log('📡 [FRONTEND] Making POST request to:', fullUrl);
      console.log('📋 [FRONTEND] Request body:', {
        access_token: accessToken ? `${accessToken.substring(0, 10)}...` : null,
        include_body: true,
        include_sent: true,
        include_received: true
      });

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          access_token: accessToken,
          include_body: true,
          include_sent: true,
          include_received: true
        })
      });

      console.log('✅ [FRONTEND] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        console.log('🔍 [FRONTEND] Step 6: Parsing response JSON...');
        const data = await response.json();
        console.log('✅ [FRONTEND] Response data:', data);

        // Individual sync completes immediately (no job monitoring needed)
        setEmailSyncProgress({
          status: `Successfully synced ${data.emails_synced || 0} emails!`,
          percentage: 100,
          complete: true,
          emailsSynced: data.emails_synced || 0,
          totalEmails: data.total_emails_synced || 0
        });

        // Show success notification
        setShowEmailSyncNotification(true);
        console.log('🎉 [FRONTEND] Email sync completed successfully!');

        // Add to notification center if new emails were synced
        if (data.emails_synced > 0) {
          const providerName = provider === 'gmail' ? 'Gmail' : 'Outlook';
          const customerEmails = data.customer_emails || [];

          // Build enriched notification message (matching lead_gen format)
          let message = `${providerName}: ${data.emails_synced} new ${data.emails_synced === 1 ? 'email' : 'emails'} from customers`;

          // Add customer emails with subjects (like positive emails in lead_gen)
          if (customerEmails.length > 0) {
            const emailsWithSubjects = customerEmails.map(email =>
              `${email.customer_name} '${email.subject}'`
            ).join(', ');
            message += `\n• ${emailsWithSubjects}`;
          }

          // Build structured customer objects array for expandable notification
          const customersWithEmails = customerEmails.map(email => ({
            customerId: email.customer_id,
            customerName: email.customer_name,
            emailSubject: email.subject
          }));

          addNotification('crm-sync', message, {
            emailsSynced: data.emails_synced,
            totalEmails: data.total_emails_synced,
            provider: providerName,
            customerEmails,
            customersWithEmails,
            expandable: true
          });
        }

        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowEmailSyncNotification(false);
          setEmailSyncProgress(null);
        }, 5000);

      } else {
        console.error('❌ [FRONTEND] Response not OK');
        let errorMessage = 'Failed to sync emails';
        console.error('Email sync failed:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (response.status === 404) {
          errorMessage = 'Gmail sync service not available. Please restart the CRM service.';
        } else if (response.status === 401) {
          try {
            const errorData = await response.json();
            console.error('401 Error details:', errorData);

            // Check if it's a Gmail token expiration
            if (errorData.detail && errorData.detail.includes('Gmail access token expired')) {
              errorMessage = '⏰ Your Gmail access has expired. Please log out and log back in with Google to refresh your access.';
            } else if (errorData.detail && errorData.detail !== 'Not authenticated') {
              errorMessage = errorData.detail;
            } else {
              const hasIdToken = !!localStorage.getItem('id_token');
              const hasEmailToken = !!localStorage.getItem('google_access_token') || !!localStorage.getItem('outlook_access_token');

              if (!hasIdToken && hasEmailToken) {
                errorMessage = 'You need to log in to the main Prelude app first. After logging in, you can sync your emails.';
              } else if (!hasIdToken) {
                errorMessage = 'Session expired. Please log in to Prelude again.';
              } else {
                errorMessage = '⏰ Your email access has expired. Please log out and log back in to refresh your access.';
              }
            }
          } catch (e) {
            console.error('Could not parse error response:', e);
            errorMessage = '⏰ Your email access has expired. Please log out and log back in to refresh your access.';
          }
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          try {
            const data = await response.json();
            errorMessage = data.detail || errorMessage;
          } catch {}
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('❌ [FRONTEND] Error in handleEmailSync:', err);
      console.error('❌ [FRONTEND] Error message:', err.message);
      console.error('❌ [FRONTEND] Error stack:', err.stack);
      setEmailSyncError(err.message || 'Error syncing emails');
      setEmailSyncProgress(null);
    } finally {
      console.log('🏁 [FRONTEND] handleEmailSync() finished');
      setEmailSyncLoading(false);
      // Clear progress after 3 seconds if there was an error
      if (emailSyncError) {
        setTimeout(() => setEmailSyncProgress(null), 3000);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(parsedDate);
  };


  // Database Tab Content (existing functionality)
  const renderDatabaseTab = () => (
    <div className="h-full flex">
      {/* Customer List */}
      <div className={`${showCustomerProfile ? 'w-1/2' : 'w-full'} border-r overflow-y-auto`}>
        <div className="p-4">
          {/* Unified Toolbar with Search and Filters */}
          <div className="mb-4">
            <UnifiedToolbar
              config={{
                primaryAction: null,
                search: null,
                filters: [
                  {
                    id: 'customer-filters',
                    icon: 'filter',
                    label: 'Filters',
                    title: 'Filter & Sort Customers',
                    hasActiveFilters: filterStatus !== 'all' || filterHealthScore !== 'all',
                    content: ({ onClose }) => (
                      <div className="space-y-6">
                        {/* Status Filter Section */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Status</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                              <input
                                type="radio"
                                name="status-filter"
                                value="all"
                                checked={filterStatus === 'all'}
                                onChange={() => setFilterStatus('all')}
                                className="text-pink-600"
                              />
                              <span className="text-sm text-gray-700 font-medium">All Status</span>
                            </label>
                            {[
                              { value: 'active', label: 'Active' },
                              { value: 'at-risk', label: 'At Risk' },
                              { value: 'renewal-pending', label: 'Renewal Pending' }
                            ].map((option) => (
                              <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                                <input
                                  type="radio"
                                  name="status-filter"
                                  value={option.value}
                                  checked={filterStatus === option.value}
                                  onChange={() => setFilterStatus(option.value)}
                                  className="text-pink-600"
                                />
                                <span className="text-sm text-gray-700">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Health Score Filter Section */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Health Score</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                              <input
                                type="radio"
                                name="health-score-filter"
                                value="all"
                                checked={filterHealthScore === 'all'}
                                onChange={() => setFilterHealthScore('all')}
                                className="text-pink-600"
                              />
                              <span className="text-sm text-gray-700 font-medium">All Health Scores</span>
                            </label>
                            {[
                              { value: 'high', label: 'High (80+)' },
                              { value: 'medium', label: 'Medium (50-79)' },
                              { value: 'low', label: 'Low (<50)' }
                            ].map((option) => (
                              <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                                <input
                                  type="radio"
                                  name="health-score-filter"
                                  value={option.value}
                                  checked={filterHealthScore === option.value}
                                  onChange={() => setFilterHealthScore(option.value)}
                                  className="text-pink-600"
                                />
                                <span className="text-sm text-gray-700">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Reset Button */}
                        <div className="pt-3 border-t border-gray-200 flex justify-end">
                          <button
                            onClick={() => {
                              setFilterStatus('all');
                              setFilterHealthScore('all');
                              onClose();
                            }}
                            className="text-sm text-pink-600 hover:text-pink-800 font-medium"
                          >
                            Reset filters
                          </button>
                        </div>
                      </div>
                    )
                  }
                ],
                themeColor: 'pink'
              }}
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                onClick={() => handleCustomerClick(customer)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedCustomer?.id === customer.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{customer.company}</h3>
                    <div className="text-sm text-gray-600">{customer.primaryContact}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${getHealthScoreColor(customer.healthScore)}`}>
                      {customer.healthScore}% Health
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full mt-1 ${getStatusColor(customer.status)}`}>
                      {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Profile */}
      {showCustomerProfile && selectedCustomer && (
        <div className="w-1/2 overflow-y-auto">
          <CustomerProfileDisplay
            customer={selectedCustomer}
            isOpen={showCustomerProfile}
            onClose={() => {
              setShowCustomerProfile(false);
              setSelectedCustomer(null);
            }}
          />
        </div>
      )}
    </div>
  );

  // Customer Management Tab Content (adapted from Database Tab)
  const renderCustomerManagementTab = () => {
    const handleCustomerModalClick = (customer) => {
      setModalCustomer(customer);
      setShowModal(true);
    };

    const handleDeleteCustomer = async (customerId, e) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        try {
          const result = await contextDeleteCustomer(customerId);
          if (result.success) {
            console.log('Customer deleted successfully');
            // Refresh the customer list to reflect the deletion
            refreshCustomers();
          } else {
            console.error('Failed to delete customer:', result.error);
            alert('Failed to delete customer: ' + result.error);
          }
        } catch (error) {
          console.error('Error deleting customer:', error);
          alert('Error deleting customer: ' + error.message);
        }
      }
    };

    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          {/* Left Side - Add Customers */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={addCustomersDropdownRef}>
              <button
                onClick={() => setShowAddCustomersDropdown(!showAddCustomersDropdown)}
                disabled={!isAuthenticated}
                className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-manrope h-10 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add Customers"
                tabIndex="0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Customers
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAddCustomersDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Add Customers Dropdown */}
              {showAddCustomersDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsAddingCustomer(true);
                        setShowAddCustomersDropdown(false);
                      }}
                      disabled={isAddingCustomer}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Add Customer</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCsvUpload(true);
                        setShowAddCustomersDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">Upload CSV</span>
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
                { key: 'primaryContact', label: 'Contact', icon: User },
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'phone', label: 'Phone', icon: Phone },
                { key: 'industry', label: 'Industry', icon: Building2 },
                { key: 'status', label: 'Status', icon: TrendingUp },
                { key: 'notes', label: 'Notes', icon: FileText }
              ]}
              placeholder="Search customers..."
            />

            {/* Filter Dropdown */}
            <FilterDropdown
              columns={[
                { id: 'company', label: 'Company', type: 'text' },
                { id: 'primaryContact', label: 'Contact', type: 'text' },
                { id: 'email', label: 'Email', type: 'email' },
                { id: 'phone', label: 'Phone', type: 'tel' },
                { id: 'industry', label: 'Industry', type: 'text' },
                {
                  id: 'churnRisk',
                  label: 'Churn Risk',
                  type: 'select',
                  options: [
                    { value: 'low', label: 'Active (Low Risk)' },
                    { value: 'medium', label: 'Active (Medium Risk)' },
                    { value: 'high', label: 'Inactive (High Risk)' },
                    { value: 'declining', label: 'Declining' }
                  ]
                },
                { id: 'lifetimeValue', label: 'Lifetime Value', type: 'currency' },
                {
                  id: 'expansionPotential',
                  label: 'Upsell Potential',
                  type: 'select',
                  options: [
                    { value: 'very low', label: 'Very Low' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'very high', label: 'Very High' }
                  ]
                },
                { id: 'lastContact', label: 'Last Contacted', type: 'date' }
              ]}
              onApplyFilters={setColumnFilters}
              activeFilters={columnFilters}
            />

            {/* More Options Dropdown */}
            <div className="relative" ref={moreOptionsDropdownRef}>
              <button
                onClick={() => setShowMoreOptionsDropdown(!showMoreOptionsDropdown)}
                className="inline-flex items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-inter text-xs h-8 w-8 p-0 rounded-lg transition-all duration-200 text-gray-500 hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100"
                title="More options"
                aria-label="More Options"
                tabIndex="0"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* More Options Dropdown */}
              {showMoreOptionsDropdown && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleEmailSync();
                        setShowMoreOptionsDropdown(false);
                      }}
                      disabled={emailSyncLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">
                        {emailSyncLoading ? 'Syncing Emails...' : 'Sync Emails'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        handleRefreshData();
                        setShowMoreOptionsDropdown(false);
                      }}
                      disabled={customersLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${customersLoading ? 'animate-spin' : ''}`} />
                      <span className="font-medium">
                        {customersLoading ? 'Refreshing...' : 'Refresh Data'}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-1"></div>

                    {/* Column Selector Section */}
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Select Columns</span>
                        <span className="text-xs text-gray-500">
                          {Object.values(visibleColumns).filter(Boolean).length}/
                          {[
                            { id: 'company', label: 'Company', icon: Building, disabled: true },
                            { id: 'primaryContact', label: 'Contact', icon: User },
                            { id: 'email', label: 'Email', icon: Mail },
                            { id: 'phone', label: 'Phone', icon: Phone },
                            { id: 'industry', label: 'Industry', icon: Building2 },
                            { id: 'churnRisk', label: 'Churn Risk', icon: TrendingUp },
                            { id: 'lifetimeValue', label: 'Lifetime Value', icon: DollarSign },
                            { id: 'expansionPotential', label: 'Upsell Potential', icon: TrendingUp },
                            { id: 'lastContact', label: 'Last Contacted', icon: Clock },
                            { id: 'assignedSalesman', label: 'Assigned Salesman', icon: User }
                          ].length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: 'company', label: 'Company', icon: Building, disabled: true },
                          { id: 'primaryContact', label: 'Contact', icon: User },
                          { id: 'email', label: 'Email', icon: Mail },
                          { id: 'phone', label: 'Phone', icon: Phone },
                          { id: 'industry', label: 'Industry', icon: Building2 },
                          { id: 'churnRisk', label: 'Churn Risk', icon: TrendingUp },
                          { id: 'lifetimeValue', label: 'Lifetime Value', icon: DollarSign },
                          { id: 'expansionPotential', label: 'Upsell Potential', icon: TrendingUp },
                          { id: 'lastContact', label: 'Last Contacted', icon: Clock },
                          { id: 'assignedSalesman', label: 'Assigned Salesman', icon: User }
                        ].map((column) => {
                          const Icon = column.icon;
                          return (
                            <label
                              key={column.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                                column.disabled
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'hover:bg-pink-50 cursor-pointer'
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
                                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                              />
                              <Icon className="w-4 h-4 text-gray-500" />
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


        {/* Email Sync Progress */}
        {emailSyncProgress && (
          <div className={`mb-4 rounded-lg p-4 ${
            emailSyncProgress.complete ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
          }`}>
              <div className="flex items-center gap-2 mb-2">
                {emailSyncProgress.complete ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                <span className={`text-sm font-medium ${
                  emailSyncProgress.complete ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {emailSyncProgress.status}
                </span>
              </div>
              {!emailSyncProgress.complete && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${emailSyncProgress.percentage}%` }}
                  />
                </div>
              )}
              {emailSyncProgress.complete && emailSyncProgress.emailsSynced !== undefined && (
                <div className="text-sm text-green-600 mt-2">
                  {emailSyncProgress.emailsSynced} new emails synced • Total: {emailSyncProgress.totalEmails} emails
                </div>
            )}
          </div>
        )}

        {/* Email Sync Error */}
        {emailSyncError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{emailSyncError}</span>
              <button
                onClick={() => setEmailSyncError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
          </div>
        )}

        {/* Editable Customer Table */}
        <div className="flex-1 min-h-[600px] overflow-hidden">
          <div className="h-full flex flex-col">
            <EditableCustomerTable 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchColumns={searchColumns}
              isAddingCustomer={isAddingCustomer}
              setIsAddingCustomer={setIsAddingCustomer}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              visibleColumns={visibleColumns}
              onColumnToggle={handleColumnToggle}
            />
          </div>
        </div>

        {/* Customer Detail Modal */}
        <CustomerProfileDisplay
          customer={modalCustomer}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCustomerDeleted={(customerId) => {
            // Handle customer deletion if needed
            console.log('Customer deleted:', customerId);
          }}
        />

        {/* Modal has been moved to CustomerProfileModal component */}
      </div>
    );
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'customer-management':
        return renderCustomerManagementTab();
      default:
        return renderCustomerManagementTab();
    }
  };

  // Show loading only on initial load (before any data has been loaded)
  // Use hasInitialLoad flag to prevent showing loading screen when navigating back to CRM with cached data
  const loading = customersLoading && !hasInitialLoad;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = customers.reduce((sum, c) => sum + c.contractValue, 0);
  const avgHealthScore = customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length) : 0;
  const atRiskCustomers = customers.filter(c => c.churnRisk === 'high').length;
  const expansionOpportunities = customers.filter(c => c.status === 'expansion-opportunity').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <UnifiedHeader
        title="Customer Relations"
        themeColor="pink"
        tabs={tabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          isActive: activeTab === tab.id,
          onClick: () => setActiveTab(tab.id)
        }))}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 overflow-y-auto" style={{ minHeight: '700px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDuration }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onClose={() => setShowAddCustomerModal(false)}
          >
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const customerData = {
                name: formData.get('name'),
                primary_contact: formData.get('primary_contact'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                industry: formData.get('industry'),
                location: formData.get('location'),
                status: formData.get('status'),
                client_type: formData.get('client_type'),
                notes: formData.get('notes'),
                contract_value: parseFloat(formData.get('contract_value')) || 0,
                monthly_value: parseFloat(formData.get('monthly_value')) || 0,
                health_score: parseFloat(formData.get('health_score')) || 75,
                satisfaction_score: parseFloat(formData.get('satisfaction_score')) || 80,
                churn_risk: formData.get('churn_risk'),
                expansion_potential: formData.get('expansion_potential'),
                current_stage: formData.get('current_stage'),
                renewal_date: formData.get('renewal_date') || null,
                contact_birthday: formData.get('contact_birthday') || null,
              };
              handleAddCustomer(customerData);
            }} className="space-y-4">

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter company name"
                  />
                </div>

                {/* Primary Contact Section */}
                <div className="col-span-2 border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Primary Contact Information</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Add the main contact for this customer. You can add additional contacts later from the customer profile.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Contact *
                  </label>
                  <input
                    type="text"
                    name="primary_contact"
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    name="industry"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Business">Business</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="at-risk">At Risk</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Type
                  </label>
                  <select
                    name="client_type"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>

              {/* Financial Information */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Value ($)
                    </label>
                    <input
                      type="number"
                      name="contract_value"
                      min="0"
                      step="0.01"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Value ($)
                    </label>
                    <input
                      type="number"
                      name="monthly_value"
                      min="0"
                      step="0.01"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Renewal Date
                    </label>
                    <input
                      type="date"
                      name="renewal_date"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Metrics */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Customer Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Health Score (0-100)
                    </label>
                    <input
                      type="number"
                      name="health_score"
                      min="0"
                      max="100"
                      defaultValue="75"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Satisfaction Score (0-100)
                    </label>
                    <input
                      type="number"
                      name="satisfaction_score"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue="80"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Churn Risk
                    </label>
                    <select
                      name="churn_risk"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expansion Potential
                    </label>
                    <select
                      name="expansion_potential"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="very low">Very Low</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="very high">Very High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stage
                    </label>
                    <select
                      name="current_stage"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed-won">Closed Won</option>
                      <option value="closed-lost">Closed Lost</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Birthday
                    </label>
                    <input
                      type="date"
                      name="contact_birthday"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows="3"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter any additional notes about the customer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingCustomer}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isAddingCustomer ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}



      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <CustomerCsvUpload
          onImportComplete={handleCsvImportComplete}
          onClose={() => setShowCsvUpload(false)}
        />
      )}

      {/* Email Sync Success Notification */}
      {showEmailSyncNotification && emailSyncProgress?.complete && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="bg-green-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md"
          >
            <CheckCircle className="w-6 h-6 text-green-100" />
            <div>
              <div className="font-medium">Email Sync Complete!</div>
              <div className="text-sm text-green-100">
                Successfully synced {emailSyncProgress.emailsSynced} new emails
              </div>
            </div>
            <button
              onClick={() => setShowEmailSyncNotification(false)}
              className="ml-auto text-green-100 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CustomerRelationshipManagement;