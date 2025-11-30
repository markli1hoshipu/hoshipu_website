import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Edit3,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  User,
  Building,
  Building2,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Filter,
  Bell,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Send
} from 'lucide-react';
import { useCRM } from '../../../contexts/CRMContext';
import { useAuth } from '../../../auth/hooks/useAuth';
import { EmptyState } from '../../ui/states/EmptyState';
import CustomerProfileDisplay from '../customer-profile/CustomerProfileDisplay';
import FilterDropdown from '../shared/FilterDropdown';
import DeleteConfirmationModal from '../shared/DeleteConfirmationModal';
import MassEmailComposer from '../shared/MassEmailComposer';
import { Button } from '../../ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../ui/primitives/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '../../ui/primitives/alert-dialog';

// Pagination constant
const CUSTOMERS_PER_PAGE = 25;

const EditableCustomerTable = ({
  searchTerm: propSearchTerm,
  setSearchTerm: propSetSearchTerm,
  searchColumns,
  isAddingCustomer: propIsAddingCustomer,
  setIsAddingCustomer: propSetIsAddingCustomer,
  showFilters: propShowFilters,
  setShowFilters: propSetShowFilters,
  columnFilters: propColumnFilters,
  setColumnFilters: propSetColumnFilters,
  visibleColumns,
  onColumnToggle
}) => {
  const { customers, customersLoading, customersError, updateCustomer, deleteCustomer, addCustomer, setCustomers, loadCustomers, employees, loadEmployees, CRM_API_BASE_URL, authFetch } = useCRM();
  const { isAuthenticated, user } = useAuth();
  const [editingCells, setEditingCells] = useState(new Set());
  const [editValues, setEditValues] = useState({});
  const [savingCells, setSavingCells] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    churnRisk: '',
    // NOTE: healthScore removed - DO NOT ADD BACK
    industry: '',
    status: '',
    expansionPotential: ''
  });
  const [localShowFilters, setLocalShowFilters] = useState(false);
  const [churnAlerts, setChurnAlerts] = useState([]);
  const [showChurnAlertsModal, setShowChurnAlertsModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localIsAddingCustomer, setLocalIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({});
  const [localColumnFilters, setLocalColumnFilters] = useState({});
  const [isSavingNewCustomer, setIsSavingNewCustomer] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
  const [loadingCurrentUser, setLoadingCurrentUser] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Mass email selection state
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [showMassEmailModal, setShowMassEmailModal] = useState(false);

  // Mass delete state
  const [showMassDeleteModal, setShowMassDeleteModal] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  // Use props when available, fallback to local state
  const searchTerm = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;
  const setSearchTerm = propSetSearchTerm || setLocalSearchTerm;
  const isAddingCustomer = propIsAddingCustomer !== undefined ? propIsAddingCustomer : localIsAddingCustomer;
  const setIsAddingCustomer = propSetIsAddingCustomer || setLocalIsAddingCustomer;
  const showFilters = propShowFilters !== undefined ? propShowFilters : localShowFilters;
  const setShowFilters = propSetShowFilters || setLocalShowFilters;
  const columnFilters = propColumnFilters !== undefined ? propColumnFilters : localColumnFilters;
  const setColumnFilters = propSetColumnFilters || setLocalColumnFilters;

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load employees on component mount
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Fetch current user's employee ID for auto-assignment
  useEffect(() => {
    const fetchCurrentUserEmployeeId = async () => {
      if (!isAuthenticated || !user?.email) {
        setLoadingCurrentUser(false);
        return;
      }

      try {
        setLoadingCurrentUser(true);

        // Fetch all employees and find current user
        const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/employees`);

        if (response.ok) {
          const employees = await response.json();
          const currentEmployee = employees.find(emp => emp.email === user.email);

          if (currentEmployee) {
            setCurrentUserEmployeeId(currentEmployee.employee_id);
          } else {
            console.warn('⚠️ Current user not found in employee_info table');
            setCurrentUserEmployeeId(null);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching current user employee ID:', error);
        setCurrentUserEmployeeId(null);
      } finally {
        setLoadingCurrentUser(false);
      }
    };

    fetchCurrentUserEmployeeId();
  }, [isAuthenticated, user?.email, CRM_API_BASE_URL, authFetch]);

  // Set default assignedSalesman when adding a new customer
  useEffect(() => {
    if (isAddingCustomer && currentUserEmployeeId && !newCustomer.assignedSalesman) {
      setNewCustomer(prev => ({
        ...prev,
        assignedSalesman: currentUserEmployeeId
      }));
    }
  }, [isAddingCustomer, currentUserEmployeeId]);

  // Removed backend filtering - now handled locally to avoid continuous refreshing
  
  // Monitor for high churn risk customers
  useEffect(() => {
    const highChurnCustomers = customers.filter(c => c.churnRisk === 'high' && c.id);
    if (highChurnCustomers.length > 0) {
      setChurnAlerts(highChurnCustomers.map(c => ({
        id: c.id,
        company: c.company,
        message: `${c.company} has high churn risk! Consider immediate engagement.`
      })));
    } else {
      setChurnAlerts([]);
    }
  }, [customers]);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, columnFilters, sortConfig]);
  
  // Handle sorting
  const handleSort = (key) => {
    try {
      if (!key) return;
      
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    } catch (error) {
      console.error('Error in handleSort:', error);
    }
  };

  // Field configurations with types and validation
  const fieldConfig = {
    company: {
      type: 'text',
      label: 'Company',
      icon: Building,
      required: true,
      sortable: true,
      validation: (value) => value?.length >= 2 ? null : 'Company name must be at least 2 characters'
    },
    primaryContact: {
      type: 'text',
      label: 'Contact',
      icon: User,
      sortable: true,
      validation: (value) => value?.length >= 1 ? null : 'Contact name is required'
    },
    email: {
      type: 'email',
      label: 'Email',
      icon: Mail,
      validation: (value) => {
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : 'Invalid email format';
      }
    },
    phone: {
      type: 'tel',
      label: 'Phone',
      icon: Phone,
      validation: (value) => !value || value.length >= 10 ? null : 'Phone number must be at least 10 digits'
    },
    industry: {
      type: 'text',
      label: 'Industry',
      icon: Building2,
      sortable: true
    },
    churnRisk: {
      type: 'select',
      label: 'Churn Risk',
      icon: TrendingUp,
      sortable: true,
      readOnly: true, // Churn Risk is read-only
      options: [
        { value: 'low', label: 'Active', color: 'bg-green-100 text-green-800' },
        { value: 'medium', label: 'Active', color: 'bg-green-100 text-green-800' },
        { value: 'high', label: 'Inactive', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'declining', label: 'Declining', color: 'bg-red-100 text-red-800' }
      ]
    },
    lifetimeValue: { 
      type: 'currency', 
      label: 'Lifetime Value', 
      icon: DollarSign,
      validation: (value) => {
        const num = parseFloat(value);
        return isNaN(num) || num < 0 ? 'Must be a valid positive number' : null;
      }
    },
    expansionPotential: { 
      type: 'select', 
      label: 'Upsell Potential',
      icon: TrendingUp,
      sortable: true,
      options: [
        { value: 'very low', label: 'Very Low', color: 'bg-gray-100 text-gray-800' },
        { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
        { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'high', label: 'High', color: 'bg-green-100 text-green-800' },
        { value: 'very high', label: 'Very High', color: 'bg-emerald-100 text-emerald-800' }
      ]
    },
    // NOTE: Health Score field configuration removed - DO NOT ADD BACK
    lastContact: {
      type: 'date',
      label: 'Last Contacted',
      icon: Calendar,
      sortable: true
    },
    assignedSalesman: {
      type: 'select',
      label: 'Assigned Salesman',
      icon: User,
      required: false,
      // Make options dynamic - will be computed when rendering
      get options() {
        // Use actual employees from employee_info table
        const options = employees?.map(emp => ({
          value: emp.employee_id,
          label: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee ${emp.employee_id}`
        })) || [];
        return options;
      }
    }
  };

  // Apply column filter
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

  // Sort and filter customers locally to avoid API calls and page refreshing
  const sortedAndFilteredCustomers = React.useMemo(() => {
    let result = customers.filter(customer => {
      // Search filter with column selection
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [];
        
        // Build searchable fields based on searchColumns (or default if not provided)
        const columnsToSearch = searchColumns || {
          company: true,
          primaryContact: true,
          email: true,
          industry: true
        };
        
        if (columnsToSearch.company) searchableFields.push(customer.company);
        if (columnsToSearch.primaryContact) searchableFields.push(customer.primaryContact);
        if (columnsToSearch.email) searchableFields.push(customer.email);
        if (columnsToSearch.industry) searchableFields.push(customer.industry);
        if (columnsToSearch.phone) searchableFields.push(customer.phone);
        if (columnsToSearch.status) searchableFields.push(customer.status);
        if (columnsToSearch.notes) searchableFields.push(customer.notes);
        
        if (!searchableFields.some(field => field?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      // Column filters for advanced filtering
      for (const [field, filters] of Object.entries(columnFilters)) {
        const filterArray = Array.isArray(filters) ? filters : [filters];
        const allConditionsPass = filterArray.every(filter =>
          applyColumnFilter(customer[field], filter)
        );
        if (!allConditionsPass) {
          return false;
        }
      }
      
      // Status, industry, churn risk and other filters
      if (filters.churnRisk && customer.churnRisk !== filters.churnRisk) return false;
      if (filters.status && customer.status !== filters.status) return false;
      if (filters.industry && !customer.industry?.toLowerCase().includes(filters.industry.toLowerCase())) return false;
      if (filters.expansionPotential && customer.expansionPotential !== filters.expansionPotential) return false;
      
      return true;
    });

    // Sort results
    if (sortConfig.key && result.length > 0) {
      try {
        result.sort((a, b) => {
          // Safely get values
          let aValue = a && a[sortConfig.key] !== undefined ? a[sortConfig.key] : '';
          let bValue = b && b[sortConfig.key] !== undefined ? b[sortConfig.key] : '';
          
          // Get field config safely
          const config = fieldConfig[sortConfig.key];
          
          // Handle different data types
          if (config?.type === 'currency' || sortConfig.key === 'lifetimeValue') {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
          } else if (config?.type === 'date' || sortConfig.key === 'lastContact') {
            aValue = new Date(aValue || '1900-01-01');
            bValue = new Date(bValue || '1900-01-01');
          } else if (config?.type === 'select') {
            // Handle select fields as strings
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
          } else {
            // Handle as string
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
          }
          
          // Safe comparison
          try {
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          } catch (compareError) {
            console.error('Error comparing values:', compareError);
            return 0;
          }
        });
      } catch (sortError) {
        console.error('Error sorting customers:', sortError);
      }
    }

    return result;
  }, [customers, sortConfig, columnFilters, searchTerm, searchColumns, filters]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedAndFilteredCustomers.length / CUSTOMERS_PER_PAGE);
  const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
  const endIndex = startIndex + CUSTOMERS_PER_PAGE;
  const paginatedCustomers = sortedAndFilteredCustomers.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedClientIds.size === paginatedCustomers.length) {
      // Deselect all
      setSelectedClientIds(new Set());
    } else {
      // Select all on current page
      setSelectedClientIds(new Set(paginatedCustomers.map(c => c.id)));
    }
  };

  const handleSelectClient = (clientId) => {
    setSelectedClientIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const handleMassEmailSent = (result) => {
    // Refresh customers after sending emails
    loadCustomers();
    // Clear selection
    setSelectedClientIds(new Set());
  };

  const handleMassDelete = async () => {
    setIsDeletingMultiple(true);
    const idsToDelete = Array.from(selectedClientIds);
    let successCount = 0;

    for (const id of idsToDelete) {
      try {
        const result = await deleteCustomer(id);
        if (result.success) successCount++;
      } catch (error) {
        console.error(`Failed to delete customer ${id}:`, error);
      }
    }

    setNotification({
      type: successCount > 0 ? 'success' : 'error',
      message: successCount > 0
        ? `Deleted ${successCount} of ${idsToDelete.length} customers successfully`
        : 'Failed to delete customers'
    });

    setSelectedClientIds(new Set());
    setShowMassDeleteModal(false);
    setIsDeletingMultiple(false);
  };

  // fieldConfig moved before sortedAndFilteredCustomers to fix initialization order

  // Get cell ID for tracking editing state
  const getCellId = (customerId, field) => `${customerId}-${field}`;

  // Handle clicking on a customer row to view details
  const handleCustomerRowClick = (customer, e) => {
    // Don't open modal if user clicked on an editable cell or a button
    if (e.target.closest('.editable-cell') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
      return;
    }
    setModalCustomer(customer);
    setShowModal(true);
  };

  // Keep modalCustomer in sync with customers array when it updates
  useEffect(() => {
    if (modalCustomer && showModal) {
      const updatedCustomer = customers.find(c => c.id === modalCustomer.id);
      if (updatedCustomer) {
        setModalCustomer(updatedCustomer);
      }
    }
  }, [customers, modalCustomer?.id, showModal]);

  // Start editing a cell
  const startEditing = (customerId, field, currentValue) => {
    const cellId = getCellId(customerId, field);
    setEditingCells(prev => new Set([...prev, cellId]));
    setEditValues(prev => ({
      ...prev,
      [cellId]: currentValue || ''
    }));
    setErrors(prev => ({
      ...prev,
      [cellId]: null
    }));
  };

  // Cancel editing a cell
  const cancelEditing = (customerId, field) => {
    const cellId = getCellId(customerId, field);
    setEditingCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(cellId);
      return newSet;
    });
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[cellId];
      return newValues;
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[cellId];
      return newErrors;
    });
  };
  // Save cell value
  const saveCell = async (customerId, field) => {
    const cellId = getCellId(customerId, field);
    const newValue = editValues[cellId];
    const config = fieldConfig[field];

    // Check authentication
    if (!isAuthenticated) {
      setErrors(prev => ({
        ...prev,
        [cellId]: 'You must be logged in to edit data'
      }));
      return;
    }

    // Get current value from customer
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      console.error('Customer not found:', customerId);
      return;
    }

    // Get the current value for comparison
    let currentValue = customer[field];
    if (field === 'assignedSalesman') {
      currentValue = customer.assignedEmployeeId;
    }

    // Check if value actually changed
    const valueChanged = String(newValue || '') !== String(currentValue || '');
    if (!valueChanged) {
      // Value unchanged, just exit edit mode without API call
      setEditingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[cellId];
        return newValues;
      });
      return;
    }

    // Validate the value
    if (config?.validation) {
      const error = config.validation(newValue);
      if (error) {
        setErrors(prev => ({
          ...prev,
          [cellId]: error
        }));
        return;
      }
    }

    // Show saving state
    setSavingCells(prev => new Set([...prev, cellId]));

    try {
      // Prepare the update payload
      let processedValue = newValue;
      let fieldName = field;

      // Special handling for assignedSalesman - map to assignedEmployeeId for backend
      if (field === 'assignedSalesman') {
        fieldName = 'assignedEmployeeId';
        processedValue = parseInt(newValue) || null;
      }
      // Process different field types
      else if (config?.type === 'currency' || config?.type === 'number') {
        processedValue = parseFloat(newValue) || 0;
      } else if (config?.type === 'date') {
        processedValue = newValue || null;
      }

      // Make API call to update customer using authenticated fetch
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [fieldName]: processedValue
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to update customer`);
      }

      const updatedCustomer = await response.json();

      // Update the customer in context - this will trigger a re-render
      updateCustomer(updatedCustomer);

      // Exit editing mode
      setEditingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });

      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[cellId];
        return newValues;
      });

      // Show success notification for employee assignment changes
      if (field === 'assignedSalesman') {
        // Find the employee name for the notification
        const employeeName = employees?.find(emp => emp.employee_id === parseInt(newValue))?.name || 'employee';
        setNotification({
          type: 'success',
          message: `Assigned salesman updated to ${employeeName}`
        });
      }

    } catch (error) {
      console.error('Error updating customer:', error);
      setErrors(prev => ({
        ...prev,
        [cellId]: 'Failed to save changes'
      }));
      
      // Show error notification
      setNotification({
        type: 'error',
        message: `Failed to update: ${error.message}`
      });
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
    }
  };

  // Format display value
  const formatDisplayValue = (value, field, customer) => {
    const config = fieldConfig[field];

    // Special handling for assignedSalesman field
    if (field === 'assignedSalesman') {
      // First try to use assignedEmployeeName from backend
      if (customer?.assignedEmployeeName) {
        return customer.assignedEmployeeName;
      }
      // If name not available but we have an ID, look it up in employees array
      if (customer?.assignedEmployeeId) {
        const employee = employees?.find(emp => emp.employee_id === customer.assignedEmployeeId);
        if (employee) {
          return employee.name || `Employee ${customer.assignedEmployeeId}`;
        }
        return `Employee ${customer.assignedEmployeeId}`;
      }
      // No assignment
      return '-';
    }

    if (!value && value !== 0) return '-';

    switch (config?.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'select':
        const option = config.options?.find(opt => opt.value === value);
        return option ? option.label : value;
      default:
        return value;
    }
  };
  
  // Render health score bar
  // NOTE: Health score bar rendering function removed - DO NOT ADD BACK
  
  // Render churn risk indicator
  const renderChurnRiskIndicator = (risk) => {
    // Map churn risk values to appropriate colors
    const riskLower = (risk || 'low').toLowerCase();
    const config = {
      low: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
      medium: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
      high: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
      declining: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' }
    };

    const riskConfig = config[riskLower] || config.low;

    return (
      <div className={`flex items-center px-2 py-1 rounded-lg ${riskConfig.bgColor}`}>
        <span className={`text-xs font-medium ${riskConfig.textColor}`}>
          {(() => {
            if (riskLower === 'low' || riskLower === 'medium') return 'Active';
            if (riskLower === 'high') return 'Inactive';
            if (riskLower === 'declining') return 'Declining';
            return 'Active';
          })()}
        </span>
      </div>
    );
  };

  // Get badge color for select fields
  const getBadgeColor = (value, field) => {
    const config = fieldConfig[field];
    if (config?.type === 'select') {
      const option = config.options?.find(opt => opt.value === value);
      return option?.color || 'bg-gray-100 text-gray-800';
    }
    return '';
  };

  // Render editable cell
  const renderEditableCell = (customer, field) => {
    const cellId = getCellId(customer.id, field);
    const isEditing = editingCells.has(cellId);
    const isSaving = savingCells.has(cellId);
    const error = errors[cellId];
    const config = fieldConfig[field];

    // Special handling for assignedSalesman field - use assignedEmployeeId from backend
    let currentValue = customer[field];
    if (field === 'assignedSalesman') {
      currentValue = customer.assignedEmployeeId;
    }

    const editValue = editValues[cellId];

    if (isEditing) {
      return (
        <div className="relative">
          <div className="flex items-center gap-1">
            {config?.type === 'select' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValues(prev => ({
                  ...prev,
                  [cellId]: e.target.value
                }))}
                onBlur={() => !isSaving && saveCell(customer.id, field)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveCell(customer.id, field);
                  } else if (e.key === 'Escape') {
                    cancelEditing(customer.id, field);
                  }
                }}
                className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 ${
                  error ? 'border-red-300' : 'border-blue-500'
                }`}
                autoFocus
                disabled={isSaving}
              >
                {config.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={config?.type || 'text'}
                value={editValue}
                onChange={(e) => setEditValues(prev => ({
                  ...prev,
                  [cellId]: e.target.value
                }))}
                onBlur={() => !isSaving && saveCell(customer.id, field)}
                className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 ${
                  error ? 'border-red-300' : 'border-blue-500'
                }`}
                min={config?.min}
                max={config?.max}
                step={config?.type === 'currency' ? '0.01' : undefined}
                autoFocus
                disabled={isSaving}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveCell(customer.id, field);
                  } else if (e.key === 'Escape') {
                    cancelEditing(customer.id, field);
                  }
                }}
              />
            )}

            {/* Save/Cancel Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      saveCell(customer.id, field);
                    }}
                    className="p-1 hover:bg-green-100 rounded text-green-600 hover:text-green-800 transition-colors"
                    title="Save (Enter)"
                    disabled={isSaving}
                    style={{ minWidth: '28px', minHeight: '28px' }}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelEditing(customer.id, field);
                    }}
                    className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-800 transition-colors"
                    title="Cancel (Esc)"
                    disabled={isSaving}
                    style={{ minWidth: '28px', minHeight: '28px' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 shadow-sm z-10">
              {error}
            </div>
          )}
        </div>
      );
    }

    // NOTE: Health score special rendering removed - DO NOT ADD BACK

    if (field === 'churnRisk') {
      return (
        <div
          className="px-2 py-1 rounded flex items-center min-h-[32px]"
          title="Status (read-only - calculated from data)"
        >
          {renderChurnRiskIndicator(currentValue || 'low')}
        </div>
      );
    }

    // Default display mode
    return (
      <div
        className="group cursor-pointer hover:bg-blue-50 px-2 py-1 rounded flex items-center justify-between min-h-[32px] editable-cell border border-transparent hover:border-blue-200 hover:border-dashed transition-all"
        onClick={() => startEditing(customer.id, field, currentValue)}
        title="Click to edit"
      >
        {config?.type === 'select' ? (
          <span className={`px-2 py-1 rounded-full text-xs ${getBadgeColor(currentValue, field)}`}>
            {formatDisplayValue(currentValue, field, customer)}
          </span>
        ) : (
          <span className={currentValue ? 'text-gray-900' : 'text-gray-400 italic'}>
            {formatDisplayValue(currentValue, field, customer)}
          </span>
        )}

        <Edit3 className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading customers...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg flex items-center justify-between animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {customersLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading customers...</span>
        </div>
      )}

      {/* Error State */}
      {customersError && !customersLoading && (
        <div className="p-3">
          <div className="border-red-200 bg-red-50 rounded-lg p-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Cannot load database</h3>
                <p className="text-sm mt-1">{customersError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!customersLoading && !customersError && (
        <>

      {/* Churn Risk Alerts - Banner */}
      {churnAlerts.length > 0 && (
        <div className="mb-4">
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => setShowChurnAlertsModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600 animate-pulse" />
                <span className="text-red-800 font-semibold">
                  {churnAlerts.length} {churnAlerts.length === 1 ? 'customer has' : 'customers have'} high churn risk
                </span>
                <span className="text-red-600 text-sm">- Click to view details</span>
              </div>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto border border-gray-200 rounded-lg">
        <div className="h-full min-w-max">
          <table className="w-full bg-white table-auto min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Checkbox Column */}
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedClientIds.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>

              {/* Company Column */}
              {(!visibleColumns || visibleColumns.company !== false) && (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('company')}
                  >
                    <Building className="w-4 h-4" />
                    <span>Company</span>
                    {sortConfig.key === 'company' ? (
                      sortConfig.direction === 'asc' ?
                        <ArrowUp className="w-3 h-3 text-blue-600" /> :
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Contact Column */}
              {(!visibleColumns || visibleColumns.primaryContact !== false) && (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('primaryContact')}
                  >
                    <User className="w-4 h-4" />
                    <span>Contact</span>
                    {sortConfig.key === 'primaryContact' ? (
                      sortConfig.direction === 'asc' ?
                        <ArrowUp className="w-3 h-3 text-blue-600" /> :
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Other Columns */}
              {Object.entries(fieldConfig)
                .filter(([field]) => field !== 'company' && field !== 'primaryContact')
                .filter(([field]) => !visibleColumns || visibleColumns[field] !== false)
                .map(([field, config]) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort(field)}
                    >
                      {config.icon && <config.icon className="w-4 h-4" />}
                      <span>{config.label}</span>
                      {sortConfig.key === field ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="w-3 h-3 text-blue-600" /> :
                          <ArrowDown className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Add Customer Row */}
            {isAddingCustomer && (
              <tr className="bg-blue-50 border-2 border-blue-200">
                {/* Empty checkbox cell for add customer row */}
                <td className="px-4 py-3"></td>

                {(!visibleColumns || visibleColumns.company !== false) && (
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Company name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newCustomer.company || ''}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                      autoFocus
                    />
                  </td>
                )}
                {(!visibleColumns || visibleColumns.primaryContact !== false) && (
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Contact name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newCustomer.primaryContact || ''}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, primaryContact: e.target.value }))}
                    />
                  </td>
                )}
                {/* Render remaining fields based on fieldConfig */}
                {Object.keys(fieldConfig).filter(field => !['company', 'primaryContact'].includes(field)).filter(field => !visibleColumns || visibleColumns[field] !== false).map(field => {
                  const config = fieldConfig[field];

                  return (
                    <td key={field} className="px-4 py-3">
                      {config.type === 'select' ? (
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newCustomer[field] || (field === 'assignedSalesman' ? currentUserEmployeeId : (config.options?.[0]?.value || ''))}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, [field]: e.target.value }))}
                        >
                          {field === 'assignedSalesman' && <option value="">Select salesman...</option>}
                          {config.options?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : config.type === 'currency' ? (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newCustomer[field] || ''}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, [field]: e.target.value }))}
                        />
                      ) : config.type === 'date' ? (
                        <span className="text-gray-400 text-sm">-</span>
                      ) : (
                        <input
                          type={config.type || 'text'}
                          placeholder={config.label}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newCustomer[field] || ''}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, [field]: e.target.value }))}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={async () => {
                        // Prevent duplicate submissions
                        if (isSavingNewCustomer) {
                          return;
                        }

                        try {
                          setIsSavingNewCustomer(true);

                          // Validate required fields
                          if (!newCustomer.company) {
                            setNotification({
                              type: 'error',
                              message: 'Company name is required'
                            });
                            return;
                          }

                          // Generate placeholder email if not provided
                          const placeholderEmail = newCustomer.email || `${newCustomer.company.toLowerCase().replace(/\s+/g, '')}@placeholder.com`;

                          // Use context's addCustomer function to ensure cache is updated
                          const result = await addCustomer({
                            name: newCustomer.company,  // Backend expects 'name' not 'company'
                            primary_contact: newCustomer.primaryContact || '',
                            email: placeholderEmail,  // Use actual email if provided, otherwise placeholder
                            phone: newCustomer.phone || '',
                            industry: newCustomer.industry || 'Business',
                            status: newCustomer.status || 'active',
                            churn_risk: newCustomer.churnRisk || 'low',
                            contract_value: parseFloat(newCustomer.lifetimeValue) || 0
                            // NOTE: healthScore removed - DO NOT ADD BACK
                          });

                          if (result.success) {
                            setNotification({
                              type: 'success',
                              message: 'Customer added successfully'
                            });

                            setIsAddingCustomer(false);
                            setNewCustomer({});
                          } else {
                            throw new Error(result.error || 'Failed to create customer');
                          }
                        } catch (error) {
                          console.error('Error creating customer:', error);
                          setNotification({
                            type: 'error',
                            message: error.message || 'Failed to create customer'
                          });
                        } finally {
                          setIsSavingNewCustomer(false);
                        }
                      }}
                      disabled={isSavingNewCustomer}
                      className={`p-1 ${isSavingNewCustomer ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-800'}`}
                      title={isSavingNewCustomer ? "Saving..." : "Save customer"}
                    >
                      {isSavingNewCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCustomer(false);
                        setNewCustomer({});
                      }}
                      disabled={isSavingNewCustomer}
                      className={`p-1 ${isSavingNewCustomer ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {paginatedCustomers.map((customer, index) => (
              <tr
                key={customer.id}
                className={`cursor-pointer hover:bg-gray-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                onClick={(e) => handleCustomerRowClick(customer, e)}
                title="Click row to view details • Click cells to edit"
              >
                {/* Checkbox cell */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedClientIds.has(customer.id)}
                    onChange={() => handleSelectClient(customer.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>

                {(!visibleColumns || visibleColumns.company !== false) && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        {renderEditableCell(customer, 'company')}
                      </div>
                    </div>
                  </td>
                )}
                {(!visibleColumns || visibleColumns.primaryContact !== false) && (
                  <td className="px-4 py-2 relative">
                    {renderEditableCell(customer, 'primaryContact')}
                  </td>
                )}
                {Object.keys(fieldConfig)
                  .filter(field => field !== 'company' && field !== 'primaryContact')
                  .filter(field => !visibleColumns || visibleColumns[field] !== false)
                  .map((field) => (
                    <td key={field} className="px-4 py-2 relative">
                      {renderEditableCell(customer, field)}
                    </td>
                  ))}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedAndFilteredCustomers.length === 0 && customers.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No customers match the current search and filters</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilters({
                churnRisk: '',
                // NOTE: healthScore removed - DO NOT ADD BACK
                industry: '',
                status: '',
                expansionPotential: ''
              });
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear search and filters
          </button>
        </div>
      )}


      {customers.length === 0 && !customersLoading && (
        <EmptyState
          icon={Building}
          iconColor="text-pink-500"
          iconBgGradient="from-pink-50 to-rose-50"
          title="No customers yet"
          description="Add your first customer to start tracking relationships and managing your CRM pipeline."
          action={
            <Button onClick={() => setIsAddingCustomer(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Customer
            </Button>
          }
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 px-4 border-t">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedAndFilteredCustomers.length)} of {sortedAndFilteredCustomers.length} customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

        </>
      )}

      {/* Customer Detail Modal */}
      <CustomerProfileDisplay
        customer={modalCustomer}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCustomerDeleted={(customerId) => {
          // Remove customer from local state
          setShowModal(false);
          setModalCustomer(null);
          // The customer list will be updated via the CRM context
        }}
      />

      {/* Churn Risk Alerts Modal */}
      <Dialog open={showChurnAlertsModal} onOpenChange={setShowChurnAlertsModal}>
        <DialogContent
          className="sm:max-w-2xl max-h-[80vh] flex flex-col"
          onClose={() => setShowChurnAlertsModal(false)}
        >
          <DialogHeader className="bg-red-50 -mx-6 -mt-6 px-6 py-4 rounded-t-lg border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-red-600" />
              <DialogTitle className="text-xl font-semibold text-red-800">
                High Churn Risk Alerts ({churnAlerts.length})
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4">
            <DialogDescription className="text-sm text-gray-600">
              The following customers require immediate engagement to prevent churn:
            </DialogDescription>
            <div className="space-y-3">
              {churnAlerts.map((alert) => {
                const customer = customers.find(c => c.id === alert.id);
                return (
                  <div
                    key={alert.id}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between hover:bg-red-100 transition-colors cursor-pointer group"
                    onClick={() => {
                      setModalCustomer(customer);
                      setShowModal(true);
                      setShowChurnAlertsModal(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span className="text-red-900 font-medium">{alert.company}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChurnAlerts(prev => prev.filter(a => a.id !== alert.id));
                        if (churnAlerts.length === 1) {
                          setShowChurnAlertsModal(false);
                        }
                      }}
                      className="text-red-400 hover:text-red-700 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Dismiss alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setChurnAlerts([])}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Dismiss All
            </Button>
            <Button
              onClick={() => setShowChurnAlertsModal(false)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Mass Email Button */}
      {selectedClientIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 px-6 py-3 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedClientIds.size} {selectedClientIds.size === 1 ? 'client' : 'clients'} selected
            </span>
            <button
              onClick={() => setShowMassEmailModal(true)}
              className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95"
            >
              <Send className="w-4 h-4 mr-2" />
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
              onClick={() => setSelectedClientIds(new Set())}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Mass Email Composer Modal */}
      {showMassEmailModal && (
        <MassEmailComposer
          selectedClientIds={selectedClientIds}
          onClose={() => setShowMassEmailModal(false)}
          onEmailsSent={handleMassEmailSent}
        />
      )}

      {/* Mass Delete Confirmation Modal */}
      <AlertDialog open={showMassDeleteModal} onOpenChange={setShowMassDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete {selectedClientIds.size} selected {selectedClientIds.size === 1 ? 'customer' : 'customers'}?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <p className="text-sm text-gray-500">This action cannot be undone.</p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMultiple}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMassDelete}
              disabled={isDeletingMultiple}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingMultiple ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditableCustomerTable;