import React, { useState, useEffect, Fragment } from 'react';
import {
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  Activity,
  TrendingUp,
  FileText,
  User,
  Edit3,
  Copy,
  Send,
  Plus,
  Sparkles,
  Home,
  Trash2,
  Brain,
  ChevronDown,
  ChevronUp,
  Users,
  Check,
  Star
} from 'lucide-react';
import { Card, CardContent } from '../../ui/primitives/card';
import { Button } from '../../ui/primitives/button';
import { useCRM } from '../../../contexts/CRMContext';
import { useEmailSync } from '../../../contexts/EmailSyncContext';
import CRMMeetingDetailsModal from '../interactions/CRMMeetingDetailsModal';
import InteractionDetailsModal from '../interactions/InteractionDetailsModal';
import AddNoteModal from '../interactions/AddNoteModal';
import ActivityPanel from '../interactions/ActivityPanel';
import NoteDetailsModal from '../interactions/NoteDetailsModal';
import CustomerEmailComposer from '../shared/CustomerEmailComposer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/primitives/dialog';

const CustomerProfileDisplay = ({
  customer,
  open,          // New prop name (preferred)
  isOpen,        // Legacy prop name
  onOpenChange,  // New callback (preferred)
  onClose,       // Legacy callback
  onCustomerDeleted
}) => {
  // Backward compatibility: support both old and new prop names
  const modalOpen = open !== undefined ? open : isOpen;

  // Backward compatibility: support both callback names
  const handleOpenChange = (newOpen) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else if (onClose) {
      if (!newOpen) onClose();
    }
  };
  const { authFetch, deleteCustomer: contextDeleteCustomer, refreshCustomers, updateCustomer, cachedSummaries, refreshCachedSummaries, employees, loadEmployees } = useCRM();
  const { registerCrmSyncCallback } = useEmailSync();

  // Modal state
  const [modalActiveTab, setModalActiveTab] = useState("overview");

  // Interaction details modal state
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);

  // Activity timeline collapse state
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const TIMELINE_COLLAPSED_LIMIT = 3;

  // Panel expansion state - only one can be expanded at a time
  const [expandedPanel, setExpandedPanel] = useState(null); // 'activity' or 'summary' or null

  // Summary state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryPeriod, setSummaryPeriod] = useState(30);

  // Smart send window state
  const [smartSendWindow, setSmartSendWindow] = useState(null);

  // Fetch smart send window when customer profile opens
  useEffect(() => {
    const fetchSmartSendWindow = async () => {
      if (!customer?.id || !modalOpen) return;

      try {
        console.log('[SmartSendWindow] Pre-fetching for customer:', customer.id);
        const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
        const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/email-send-window`);
        if (response.ok) {
          const data = await response.json();
          console.log('[SmartSendWindow] Pre-fetched data:', data);
          setSmartSendWindow(data);
        }
      } catch (err) {
        console.error('[SmartSendWindow] Error pre-fetching:', err);
      }
    };

    fetchSmartSendWindow();
  }, [customer?.id, modalOpen, authFetch]);

  // Interactions state
  const [customerInteractions, setCustomerInteractions] = useState([]);
  const [interactionsCache, setInteractionsCache] = useState({}); // Cache interactions by customer ID
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Timeline filtering state
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [timelineSearch, setTimelineSearch] = useState('');

  // Meeting modal state
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Note modal state
  const [selectedNote, setSelectedNote] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesCache, setNotesCache] = useState({}); // Cache notes by customer ID
  const [newNote, setNewNote] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteStar, setNewNoteStar] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isRefreshingNotes, setIsRefreshingNotes] = useState(false);
  const [noteFilter, setNoteFilter] = useState('all'); // 'all', 'starred', 'email', 'call', 'meeting'
  const [noteError, setNoteError] = useState('');
  const [noteSuccess, setNoteSuccess] = useState('');

  // Add Note Modal state
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [selectedInteractionForNote, setSelectedInteractionForNote] = useState(null);

  // Editable fields state
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  // Deals state
  const [deals, setDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState('');

  // Contacts state
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    notes: ''
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  // API base URL
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Note validation constants
  const MAX_NOTE_LENGTH = 2000;
  const MIN_NOTE_LENGTH = 1;
  const MAX_TITLE_LENGTH = 200;

  // Helper function to check if note is starred
  const isNoteStarred = (star) => {
    return star === 'important' || star === 'urgent' || star === 'starred';
  };

  // Helper function to get star display text
  const getStarDisplayText = (star) => {
    switch(star) {
      case 'important': return 'Important';
      case 'urgent': return 'Urgent';
      case 'starred': return 'Starred';
      default: return '';
    }
  };

  // Helper function to get assigned employee name
  const getAssignedEmployeeName = () => {
    // Use the assigned employee name from the customer object (from employee_client_links table)
    if (customer?.assignedEmployeeName) {
      return customer.assignedEmployeeName;
    }
    return 'Not Assigned';
  };

  // Handle field editing
  const handleFieldClick = (fieldName, currentValue, displayValue) => {
    console.log(`[Edit] Starting to edit field: ${fieldName}, current value:`, currentValue);
    setEditingField(fieldName);
    // For assignedEmployee, use the actual ID value, not the display name
    setEditingValue(currentValue || '');
  };

  const handleFieldCancel = () => {
    console.log(`[Edit] Cancelled editing field: ${editingField}`);
    setEditingField(null);
    setEditingValue('');
  };

  const handleFieldSave = async (fieldName) => {
    if (!customer?.id) {
      console.error('[Edit] No customer ID found, cannot save');
      return;
    }

    console.log(`[Edit] Saving field: ${fieldName}`);
    console.log(`[Edit] Customer ID: ${customer.id}`);
    console.log(`[Edit] Old value:`, customer[fieldName]);
    console.log(`[Edit] New value:`, editingValue);

    setIsSavingField(true);
    try {
      // Map frontend field names to backend field names
      const fieldMapping = {
        'company': 'company',
        'industry': 'industry',
        'location': 'location',
        'email': 'email',
        'phone': 'phone',
        'primaryContact': 'primaryContact',
        'assignedEmployee': 'assignedEmployeeId'  // Special mapping for assigned employee
      };

      const backendField = fieldMapping[fieldName];
      if (!backendField) {
        console.error('[Edit] Unknown field:', fieldName);
        return;
      }

      console.log(`[Edit] Mapped to backend field: ${backendField}`);

      // Process the value based on field type
      let processedValue = editingValue;
      if (fieldName === 'assignedEmployee') {
        // Convert to integer for employee ID
        processedValue = parseInt(editingValue) || null;
      }

      const payload = {
        [backendField]: processedValue
      };
      console.log('[Edit] Sending payload to API:', payload);

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('[Edit] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Edit] API error response:', errorText);
        throw new Error('Failed to update customer');
      }

      const updatedCustomer = await response.json();
      console.log('[Edit] Updated customer data received:', updatedCustomer);

      // Update the customer in the context (this updates the global state smoothly)
      updateCustomer(updatedCustomer);
      console.log('[Edit] Customer updated in context');

      // Clear editing state
      setEditingField(null);
      setEditingValue('');
      console.log('[Edit] Editing state cleared');

      // Show success message
      if (fieldName === 'assignedEmployee') {
        // Find the employee name for the notification
        const employeeName = employees?.find(emp => emp.employee_id === parseInt(editingValue))?.name || 'employee';
        setNoteSuccess(`Assigned employee updated to ${employeeName}`);
      } else {
        setNoteSuccess('Field updated successfully!');
      }
      setTimeout(() => setNoteSuccess(''), 3000);
      console.log('[Edit] Success notification displayed');
    } catch (error) {
      console.error('[Edit] Error updating field:', error);
      console.error('[Edit] Error stack:', error.stack);
      setNoteError('Failed to update field');
      setTimeout(() => setNoteError(''), 3000);
    } finally {
      setIsSavingField(false);
      console.log('[Edit] Save operation completed');
    }
  };

  // Render editable field
  const renderEditableField = (fieldName, displayValue, placeholder = '', isSelect = false, options = [], actualValue = null) => {
    const isEditing = editingField === fieldName;

    // Use actualValue for editing (e.g., employee ID), displayValue for display (e.g., employee name)
    const valueForEditing = actualValue !== null ? actualValue : displayValue;

    if (isEditing) {
      return (
        <div>
          <div className="relative">
            {isSelect ? (
              <select
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => !isSavingField && handleFieldSave(fieldName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFieldSave(fieldName);
                  } else if (e.key === 'Escape') {
                    handleFieldCancel();
                  }
                }}
                className="w-full px-2 py-1 pr-20 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                autoFocus
                disabled={isSavingField}
              >
                {options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => !isSavingField && handleFieldSave(fieldName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFieldSave(fieldName);
                  } else if (e.key === 'Escape') {
                    handleFieldCancel();
                  }
                }}
                className="w-full px-2 py-1 pr-20 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                autoFocus
                disabled={isSavingField}
              />
            )}
            {/* Save/Cancel Buttons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {isSavingField ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleFieldSave(fieldName);
                    }}
                    className="p-1 hover:bg-green-100 rounded text-green-600 hover:text-green-800 transition-colors"
                    title="Save (Enter)"
                    disabled={isSavingField}
                    style={{ minWidth: '28px', minHeight: '28px' }}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleFieldCancel();
                    }}
                    className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-800 transition-colors"
                    title="Cancel (Esc)"
                    disabled={isSavingField}
                    style={{ minWidth: '28px', minHeight: '28px' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
            <span className="inline-block w-3 h-3 text-center">⌨️</span>
            <span>Press Enter to save, Esc to cancel</span>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => handleFieldClick(fieldName, valueForEditing)}
        className="cursor-pointer hover:bg-blue-50 py-1 px-2 rounded transition-colors border border-transparent hover:border-blue-200 hover:border-dashed"
        title="Click to edit"
      >
        <p className="text-gray-900">
          <span className={displayValue ? '' : 'text-gray-400 italic'}>{displayValue || placeholder}</span>
        </p>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // CONTACTS MANAGEMENT FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  // Load contacts from customer data
  useEffect(() => {
    if (customer?.contacts) {
      setContacts(customer.contacts);
    }
  }, [customer]);

  // Open contacts modal
  const handleOpenContactsModal = () => {
    setShowContactsModal(true);
    setContactError('');
    setContactSuccess('');
  };

  // Close contacts modal
  const handleCloseContactsModal = () => {
    setShowContactsModal(false);
    setShowContactForm(false);
    setEditingContact(null);
    setContactFormData({ name: '', email: '', phone: '', title: '', notes: '' });
    setContactError('');
    setContactSuccess('');
  };

  // Open contact form for adding
  const handleAddContactClick = () => {
    setEditingContact(null);
    setContactFormData({ name: '', email: '', phone: '', title: '', notes: '' });
    setShowContactForm(true);
    setContactError('');
  };

  // Open contact form for editing
  const handleEditContactClick = (contact) => {
    setEditingContact(contact);
    setContactFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      notes: contact.notes || ''
    });
    setShowContactForm(true);
    setContactError('');
  };

  // Cancel contact form
  const handleCancelContactForm = () => {
    setShowContactForm(false);
    setEditingContact(null);
    setContactFormData({ name: '', email: '', phone: '', title: '', notes: '' });
    setContactError('');
  };

  // Save contact (add or update)
  const handleSaveContact = async () => {
    try {
      setIsSavingContact(true);
      setContactError('');

      // Validate
      if (!contactFormData.name.trim()) {
        setContactError('Contact name is required');
        return;
      }
      if (!contactFormData.email.trim()) {
        setContactError('Contact email is required');
        return;
      }

      const payload = {
        name: contactFormData.name.trim(),
        email: contactFormData.email.trim(),
        phone: contactFormData.phone.trim(),
        title: contactFormData.title.trim(),
        notes: contactFormData.notes.trim(),
        is_primary: false // New contacts are not primary by default
      };

      let response;
      if (editingContact) {
        // Update existing contact
        response = await authFetch(
          `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts/${editingContact.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
      } else {
        // Add new contact
        response = await authFetch(
          `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save contact');
      }

      const result = await response.json();

      // Update local contacts state
      let updatedContacts;
      if (editingContact) {
        updatedContacts = contacts.map(c => c.id === editingContact.id ? result.contact : c);
        setContacts(updatedContacts);
        setContactSuccess('Contact updated successfully!');
      } else {
        updatedContacts = [...contacts, result.contact];
        setContacts(updatedContacts);
        setContactSuccess('Contact added successfully!');
      }

      // Update customer object in context without full refresh
      const updatedCustomer = { ...customer, contacts: updatedContacts };
      updateCustomer(updatedCustomer);

      // Close form
      handleCancelContactForm();

      // Clear success message after 3 seconds
      setTimeout(() => setContactSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving contact:', error);
      setContactError(error.message || 'Failed to save contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (contact) => {
    if (!confirm(`Are you sure you want to delete contact "${contact.name}"?`)) {
      return;
    }

    try {
      setContactError('');

      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts/${contact.id}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete contact');
      }

      // Update local contacts state
      const updatedContacts = contacts.filter(c => c.id !== contact.id);
      setContacts(updatedContacts);
      setContactSuccess('Contact deleted successfully!');

      // Update customer object in context without full refresh
      const updatedCustomer = { ...customer, contacts: updatedContacts };
      updateCustomer(updatedCustomer);

      // Clear success message after 3 seconds
      setTimeout(() => setContactSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting contact:', error);
      setContactError(error.message || 'Failed to delete contact');
    }
  };

  // Set contact as primary
  const handleSetPrimaryContact = async (contact) => {
    try {
      setContactError('');

      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/contacts/${contact.id}/set-primary`,
        {
          method: 'PUT'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to set primary contact');
      }

      // Update local contacts state
      const updatedContacts = contacts.map(c => ({
        ...c,
        is_primary: c.id === contact.id
      }));
      setContacts(updatedContacts);
      setContactSuccess(`${contact.name} set as primary contact!`);

      // Update customer object in context without full refresh
      const updatedCustomer = { ...customer, contacts: updatedContacts };
      updateCustomer(updatedCustomer);

      // Clear success message after 3 seconds
      setTimeout(() => setContactSuccess(''), 3000);
    } catch (error) {
      console.error('Error setting primary contact:', error);
      setContactError(error.message || 'Failed to set primary contact');
    }
  };

  // Fetch deals for this customer (optimized: filtered at database level)
  const fetchDeals = async () => {
    if (!customer?.id) return;

    setIsLoadingDeals(true);
    setDealsError('');

    try {
      console.log('[Deals] Fetching deals for customer:', customer.id);
      // Use new customer-specific endpoint for better performance
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/deals/customer/${customer.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const customerDeals = await response.json();
      console.log('[Deals] Customer deals received:', customerDeals.length);

      setDeals(customerDeals);
    } catch (error) {
      console.error('[Deals] Error fetching deals:', error);
      setDealsError('Failed to load deals');
    } finally {
      setIsLoadingDeals(false);
    }
  };

  // Fetch deals when modal opens and deals tab is selected
  useEffect(() => {
    if (isOpen && customer && modalActiveTab === 'deals') {
      fetchDeals();
    }
  }, [isOpen, customer, modalActiveTab]);

  // Fetch customer interactions with caching
  const fetchCustomerInteractions = async (forceRefresh = false) => {
    if (!customer?.id) return;

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && interactionsCache[customer.id]) {
      console.log('Loading interactions from cache for customer', customer.id);
      setCustomerInteractions(interactionsCache[customer.id]);
      return;
    }

    setLoadingInteractions(true);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/interactions`);
      if (response.ok) {
        const interactions = await response.json();

        // Update both current interactions and cache
        setCustomerInteractions(interactions);
        setInteractionsCache(prev => ({
          ...prev,
          [customer.id]: interactions
        }));

        console.log('Interactions loaded from API and cached for customer', customer.id);
      }
    } catch (err) {
      console.error('Error fetching interactions:', err);
    } finally {
      setLoadingInteractions(false);
    }
  };



  // Load employees when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen, loadEmployees]);

  // Load interactions and notes in parallel when customer changes
  useEffect(() => {
    if (customer?.id && isOpen) {
      setSummaryError('');
      // Load interactions and notes in parallel for faster loading
      Promise.all([
        fetchCustomerInteractions(),
        loadCustomerNotes()
      ]).catch(err => {
        console.error('Error loading customer data:', err);
      });
    }
  }, [customer?.id, isOpen]);

  // NEW: Register callback to refresh interactions when CRM sync completes
  useEffect(() => {
    if (!isOpen || !customer?.id) return;

    console.log('[CustomerProfile] Registering CRM sync callback for customer', customer.id);

    // Register callback that will be called when CRM sync completes
    const unregister = registerCrmSyncCallback((syncResult) => {
      console.log('[CustomerProfile] CRM sync completed, refreshing interactions for customer', customer.id);
      // Refresh interactions to show newly synced emails
      fetchCustomerInteractions(true);
    });

    // Cleanup: unregister when modal closes or customer changes
    return () => {
      console.log('[CustomerProfile] Unregistering CRM sync callback');
      unregister();
    };
  }, [isOpen, customer?.id, registerCrmSyncCallback]);

  // Get current cached summary for the customer
  const getCurrentCachedSummary = () => {
    if (!customer?.id) return null;
    return cachedSummaries[customer.id] || null;
  };

  // Load customer notes with caching
  const loadCustomerNotes = async (forceRefresh = false) => {
    if (!customer?.id) return;

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && notesCache[customer.id]) {
      console.log('Loading notes from cache for customer', customer.id);
      setNotes(notesCache[customer.id]);
      return;
    }

    // Set appropriate loading state
    if (forceRefresh) {
      setIsRefreshingNotes(true);
    } else {
      setIsLoadingNotes(true);
    }

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/notes`);
      if (response.ok) {
        const notesData = await response.json();

        // Transform API response to match frontend format
        const transformedNotes = notesData.map(note => {
          return {
            id: note.note_id,
            content: note.title ? `${note.title}: ${note.body}` : note.body,
            date: new Date(note.created_at),
            author: 'You', // Simplified from employee ID display
            type: 'user',
            title: note.title,
            body: note.body,
            star: note.star,
            employee_id: note.employee_id,
            updated_at: new Date(note.updated_at),
            isStarred: isNoteStarred(note.star),
            interaction_id: note.interaction_id  // NEW: Include interaction link
          };
        });

        // Update both current notes and cache
        setNotes(transformedNotes);
        setNotesCache(prev => ({
          ...prev,
          [customer.id]: transformedNotes
        }));

        console.log('Notes loaded from API and cached for customer', customer.id);
      } else {
        console.error('Failed to load notes:', response.status);
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading customer notes:', error);
      setNotes([]);
    } finally {
      setIsLoadingNotes(false);
      setIsRefreshingNotes(false);
    }
  };

  // Invalidate notes cache for current customer
  const invalidateNotesCache = () => {
    if (customer?.id) {
      setNotesCache(prev => {
        const newCache = { ...prev };
        delete newCache[customer.id];
        return newCache;
      });
      console.log('Notes cache invalidated for customer', customer.id);
    }
  };

  // Invalidate interactions cache for current customer
  const invalidateInteractionsCache = () => {
    if (customer?.id) {
      setInteractionsCache(prev => {
        const newCache = { ...prev };
        delete newCache[customer.id];
        return newCache;
      });
      console.log('Interactions cache invalidated for customer', customer.id);
    }
  };

  // Refresh interactions manually
  const refreshInteractions = async () => {
    invalidateInteractionsCache();
    await fetchCustomerInteractions(true);
  };

  // Refresh notes manually
  const refreshNotes = async () => {
    invalidateNotesCache();
    await loadCustomerNotes(true);
  };

  // Refresh all customer data (interactions + notes)
  const refreshAllCustomerData = async () => {
    invalidateInteractionsCache();
    invalidateNotesCache();
    await Promise.all([
      fetchCustomerInteractions(true),
      loadCustomerNotes(true)
    ]);
  };

  // Handle note added - refresh only notes (notes are NOT in interactions table)
  const handleNoteAdded = async () => {
    // Invalidate notes cache to ensure fresh data
    invalidateNotesCache();

    // Reload only notes
    await loadCustomerNotes(true);
  };

  // Handle interaction added (calls, meetings) - refresh only interactions
  const handleInteractionAdded = async () => {
    // Invalidate interactions cache to ensure fresh data
    invalidateInteractionsCache();

    // Reload only interactions
    await fetchCustomerInteractions(true);
  };

  // Validate note input
  const validateNote = (noteText, titleText = '') => {
    const trimmedNote = noteText.trim();
    const trimmedTitle = titleText.trim();

    if (trimmedNote.length < MIN_NOTE_LENGTH) {
      return 'Note cannot be empty';
    }
    if (trimmedNote.length > MAX_NOTE_LENGTH) {
      return `Note cannot exceed ${MAX_NOTE_LENGTH} characters`;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return `Title cannot exceed ${MAX_TITLE_LENGTH} characters`;
    }
    return null;
  };

  // Clear messages after timeout
  const clearMessages = () => {
    setTimeout(() => {
      setNoteError('');
      setNoteSuccess('');
    }, 3000);
  };

  // Add new note (handles both general notes and interaction-linked notes)
  const handleAddNote = async (noteData = null) => {
    if (!customer?.id) return;

    // Determine if this is from modal (interaction note) or Notes tab (general note)
    const isInteractionNote = noteData && selectedInteractionForNote;

    // Use different form values depending on context
    const noteTitle = isInteractionNote ? noteData.title : newNoteTitle;
    const noteBody = isInteractionNote ? noteData.body : newNote;
    const noteStar = isInteractionNote ? noteData.star : newNoteStar;
    const interactionId = isInteractionNote ? selectedInteractionForNote.id : null;

    // Validate input
    const validationError = validateNote(noteBody, noteTitle);
    if (validationError) {
      setNoteError(validationError);
      clearMessages();
      return;
    }

    // Clear any previous messages
    setNoteError('');
    setNoteSuccess('');

    const payload = {
      title: noteTitle.trim() || '',
      body: noteBody.trim(),
      star: noteStar ? 'important' : null,
      interaction_id: interactionId
    };

    setIsAddingNote(true);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Invalidate cache and reload ALL notes
        invalidateNotesCache();
        await loadCustomerNotes(true);

        // Reset appropriate form and close modal if needed
        if (isInteractionNote) {
          setAddNoteModalOpen(false);
          setSelectedInteractionForNote(null);
        } else {
          setNewNote('');
          setNewNoteTitle('');
          setNewNoteStar(false);
        }

        setNoteSuccess('Note added successfully!');
        clearMessages();
      } else {
        const errorData = await response.json();
        console.error('Failed to add note:', errorData);
        setNoteError('Failed to add note: ' + (errorData.detail || 'Unknown error'));
        clearMessages();
      }
    } catch (error) {
      console.error('Error adding note:', error);
      setNoteError('Error adding note: ' + error.message);
      clearMessages();
    } finally {
      setIsAddingNote(false);
    }
  };

  // Event click handlers
  const handleEventClick = (event) => {
    console.log('Timeline event clicked:', event);

    if (event.originalType === 'note') {
      // Handle note click - open NoteDetailsModal
      const noteData = notes.find(n => n.id === event.metadata?.noteId);
      if (noteData) {
        setSelectedNote(noteData);
        setShowNoteModal(true);
      } else {
        console.error('Note not found:', event.metadata?.noteId);
      }
    } else if (event.originalType === 'meeting') {
      // Get the interaction ID for CRM meeting
      const interactionId = event.metadata?.interactionId;

      if (!interactionId) {
        console.error('No interaction ID found for meeting event:', event);
        return;
      }

      // Prepare meeting data from parsed content if available
      const parsedData = event.metadata?.parsedMeetingData;
      let meetingData = null;

      if (parsedData) {
        // Use pre-loaded data for immediate display
        meetingData = {
          interaction_id: interactionId,
          customer_id: customer?.id,
          title: parsedData.title || event.metadata?.theme || event.title,
          description: parsedData.description,
          start_time: parsedData.start_time,
          end_time: parsedData.end_time,
          attendees: parsedData.attendees || [],
          location: parsedData.location,
          meeting_link: parsedData.meeting_link,
          timezone: parsedData.timezone || 'UTC',
          created_at: event.date,
          updated_at: event.metadata?.updatedAt
        };
      }

      console.log('Opening CRM meeting modal with data:', meetingData);
      setSelectedMeeting({
        id: interactionId,
        data: meetingData
      });
      setShowMeetingModal(true);
    } else {
      // For all other events (email, call, etc.), use the interaction details modal
      handleInteractionClick(event);
    }
  };

  const handleMeetingModalClose = () => {
    setShowMeetingModal(false);
    setSelectedMeeting(null);
  };

  const handleMeetingUpdate = async (updatedMeeting) => {
    console.log('Meeting updated:', updatedMeeting);
    // Refresh customer interactions to show updated meeting (force refresh to bypass cache)
    await fetchCustomerInteractions(true);
  };

  const handleMeetingDelete = async () => {
    console.log('Meeting deleted');
    // Close modal and refresh interactions
    setShowMeetingModal(false);
    setSelectedMeeting(null);
    await fetchCustomerInteractions();
  };

  // Note modal handlers
  const handleNoteModalClose = () => {
    setShowNoteModal(false);
    setSelectedNote(null);
  };

  const handleNoteUpdate = async (updatedNote) => {
    // Refresh notes after update
    await loadCustomerNotes(true);
  };

  // Call event handlers
  const handleCallEventDelete = async (interactionId) => {
    // Refresh interactions after delete
    await fetchCustomerInteractions(true);
  };

  const handleCallEventUpdate = async (updatedCallSummary) => {
    // Refresh interactions after update
    await fetchCustomerInteractions(true);
  };

  // Interaction modal handlers
  const handleInteractionClick = (event) => {
    setSelectedInteraction(event);
    setIsInteractionModalOpen(true);
  };

  const handleInteractionModalClose = () => {
    setIsInteractionModalOpen(false);
    setSelectedInteraction(null);
  };

  // Timeline collapse/expand handler
  const handleTimelineToggle = () => {
    setIsTimelineExpanded(!isTimelineExpanded);
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    if (!noteId) return;

    setIsDeletingNote(noteId);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistically remove the note from the UI
        setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));

        // Also update cache
        if (customer?.id && notesCache[customer.id]) {
          setNotesCache(prev => ({
            ...prev,
            [customer.id]: prev[customer.id].filter(note => note.id !== noteId)
          }));
        }

        setNoteSuccess('Note deleted successfully!');
        clearMessages();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete note:', errorData);
        setNoteError('Failed to delete note: ' + (errorData.detail || 'Unknown error'));
        clearMessages();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      setNoteError('Error deleting note: ' + error.message);
      clearMessages();
    } finally {
      setIsDeletingNote(null);
    }
  };

  // Toggle note star/importance status with optimistic updates
  const handleToggleNoteStar = async (noteId, currentStarStatus) => {
    if (!noteId) return;

    // Determine new star status (toggle between important and null)
    const newStarStatus = isNoteStarred(currentStarStatus) ? null : 'important';
    const newIsStarred = isNoteStarred(newStarStatus);

    // Store original state for potential rollback
    const originalNotes = [...notes];

    // OPTIMISTIC UPDATE: Immediately update the UI
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === noteId
          ? {
              ...note,
              star: newStarStatus,
              isStarred: newIsStarred
            }
          : note
      )
    );

    // Also update the cache optimistically
    if (customer?.id && notesCache[customer.id]) {
      setNotesCache(prev => ({
        ...prev,
        [customer.id]: prev[customer.id].map(note =>
          note.id === noteId
            ? {
                ...note,
                star: newStarStatus,
                isStarred: newIsStarred
              }
            : note
        )
      }));
    }

    // Background API call (no loading indicators)
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          star: newStarStatus
        }),
      });

      if (response.ok) {
        // Success - the optimistic update was correct
        const action = newStarStatus ? 'marked as important' : 'unmarked as important';
        setNoteSuccess(`Note ${action} successfully!`);
        clearMessages();

        // Optional: Refresh from backend to ensure absolute consistency
        // This happens silently in the background
        setTimeout(() => {
          invalidateNotesCache();
          loadCustomerNotes(true);
        }, 1000);
      } else {
        // API call failed - revert the optimistic update
        console.error('Failed to toggle note star - reverting optimistic update');
        setNotes(originalNotes);

        // Also revert the cache
        if (customer?.id) {
          setNotesCache(prev => ({
            ...prev,
            [customer.id]: originalNotes
          }));
        }

        const errorData = await response.json();
        setNoteError('Failed to update note importance: ' + (errorData.detail || 'Unknown error'));
        clearMessages();
      }
    } catch (error) {
      // Network/other error - revert the optimistic update
      console.error('Error toggling note star - reverting optimistic update:', error);
      setNotes(originalNotes);

      // Also revert the cache
      if (customer?.id) {
        setNotesCache(prev => ({
          ...prev,
          [customer.id]: originalNotes
        }));
      }

      setNoteError('Error updating note importance: ' + error.message);
      clearMessages();
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setModalActiveTab("overview");
      setSummaryError('');
      setCustomerInteractions([]);
      setTimelineFilter('all'); // Always reset to 'all' filter
      setTimelineSearch('');
      setIsTimelineExpanded(false);
      setSelectedMeeting(null);
      setShowMeetingModal(false);
      setNotes([]);
      setNotesCache({}); // Clear entire cache when modal closes
      setInteractionsCache({}); // Clear interactions cache when modal closes
      setNewNote('');
      setNewNoteTitle('');
      setNewNoteStar(false);
      setIsDeletingNote(null);
      setIsLoadingNotes(false);
      setIsRefreshingNotes(false);
      setNoteFilter('all');
      setNoteError('');
      setNoteSuccess('');
      // Reset modal states
      setAddNoteModalOpen(false);
      setSelectedInteractionForNote(null);
    }
  }, [isOpen]);

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

  const formatNoteDate = (date) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(parsedDate);
  };

  const handleGenerateSummary = async () => {
    if (!customer?.id) return;

    setIsGeneratingSummary(true);
    setSummaryError('');

    try {
      // Use GET endpoint with force_refresh=true to generate fresh summary and replace existing one
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/interaction-summary/${customer.id}?days_back=${summaryPeriod}&force_refresh=true`);

      const data = await response.json();
      if (response.ok) {
        console.log('Summary generated successfully:', data);
        // Refresh cached summaries to get the newly generated summary
        await refreshCachedSummaries();
      } else {
        setSummaryError('Failed to generate interaction summary');
      }
    } catch (err) {
      console.error('Error:', err);
      setSummaryError('Error connecting to server');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const getTimelineEvents = () => {
    const events = [];

    // Add customer timeline events if available
    if (customer.timeline && Array.isArray(customer.timeline)) {
      customer.timeline.forEach((event, index) => {
        if (event.date && !isNaN(new Date(event.date).getTime())) {
          let normalizedType = event.type ? event.type.toLowerCase().trim() : 'activity';

          // Map database types to filter types for consistency
          const typeMapping = {
            'meet': 'meeting',  // Database uses 'meet', UI filter uses 'meeting'
            'call': 'call',
            'email': 'email'
          };

          const mappedType = typeMapping[normalizedType] || normalizedType;

          events.push({
            type: mappedType,
            originalType: mappedType,
            title: event.title || event.type || 'Customer Activity',
            description: event.description || event.content || '',
            date: event.date,
            employeeName: event.employeeName || 'System',
            metadata: event.metadata || {}
          });
        }
      });
    }

    // Add recent activities if available
    if (customer.recentActivities && Array.isArray(customer.recentActivities)) {
      customer.recentActivities.forEach((activity, index) => {
        const date = activity.date || activity.createdAt || new Date().toISOString();
        if (!isNaN(new Date(date).getTime())) {
          events.push({
            type: 'activity',
            originalType: 'activity',
            title: activity.title || activity.type || 'Customer Activity',
            description: activity.description || activity.content || '',
            date: date,
            employeeName: activity.employeeName || 'System',
            metadata: activity.metadata || {}
          });
        }
      });
    }

    // Add interactions from API with enhanced data
    customerInteractions.forEach(interaction => {
      if (interaction.createdAt && !isNaN(new Date(interaction.createdAt).getTime())) {
        // Normalize the interaction type to ensure consistent filtering
        let normalizedType = interaction.type ? interaction.type.toLowerCase().trim() : 'activity';

        // Map database types to filter types for consistency
        const typeMapping = {
          'meet': 'meeting',  // Database uses 'meet', UI filter uses 'meeting'
          'call': 'call',
          'email': 'email'
        };

        const mappedType = typeMapping[normalizedType] || normalizedType;

        // Parse meeting content if it's a meeting type
        let description = interaction.content;
        let title;
        let parsedMeetingData = null;

        // Set title based on event type
        if (mappedType === 'email') {
          // For email events: Show subject as title, content as description
          title = interaction.theme || interaction.subject || 'No subject';
          description = interaction.content || '';
        } else {
          // For other types: Use theme or default format
          title = interaction.theme || `${mappedType.toUpperCase()}: ${interaction.employeeName}`;
        }

        if (mappedType === 'meeting' && interaction.content) {
          try {
            parsedMeetingData = JSON.parse(interaction.content);

            // Add "MEETING:" prefix to theme field
            const meetingTheme = interaction.theme || parsedMeetingData.title || 'Meeting';
            title = `MEETING: ${meetingTheme}`;

            // Format meeting description with start time and attendees
            const startTime = parsedMeetingData.start_time
              ? new Date(parsedMeetingData.start_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Time not specified';

            const meetingDescription = parsedMeetingData.description;
            const attendees = parsedMeetingData.attendees;

            // Build formatted description with start time, description, and attendees
            let descriptionParts = [startTime];
            if (meetingDescription) {
              descriptionParts.push(meetingDescription);
            }
            if (attendees && Array.isArray(attendees) && attendees.length > 0) {
              const attendeesList = attendees.join(', ');
              descriptionParts.push(`Attendees: ${attendeesList}`);
            }

            description = descriptionParts.join(' • ');
          } catch (e) {
            console.warn('Failed to parse meeting content JSON:', e);
            // Keep original content if parsing fails
          }
        }

        const eventData = {
          type: mappedType,
          originalType: mappedType,
          title: title,
          description: description,
          date: interaction.createdAt,
          employeeName: interaction.employeeName,
          metadata: {
            interactionId: interaction.id,
            employeeRole: interaction.employeeRole,
            employeeDepartment: interaction.employeeDepartment,
            duration: interaction.duration,
            outcome: interaction.outcome,
            subject: interaction.subject,
            gmailMessageId: interaction.gmailMessageId,
            updatedAt: interaction.updatedAt,
            theme: interaction.theme,
            source: interaction.source,
            sourceName: interaction.sourceName,
            sourceType: interaction.sourceType,
            direction: interaction.direction,  // Add email direction (sent/received)
            from_email: interaction.fromEmail,  // Add sender email
            to_email: interaction.toEmail,      // Add recipient email
            // Add parsed meeting data to metadata for modal use
            parsedMeetingData: parsedMeetingData
          }
        };
        events.push(eventData);
      }
    });

    // Filter events based on search and filter criteria
    let filteredEvents = events.filter(event => event.date && !isNaN(new Date(event.date).getTime()));

    // Apply type filter
    if (timelineFilter !== 'all') {
      filteredEvents = filteredEvents.filter(event => {
        // Normalize both the event type and filter for comparison
        const eventType = event.originalType ? event.originalType.toLowerCase().trim() : '';
        const filterType = timelineFilter.toLowerCase().trim();
        return eventType === filterType;
      });
    }

    // Apply search filter
    if (timelineSearch.trim()) {
      const searchLower = timelineSearch.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.employeeName.toLowerCase().includes(searchLower)
      );
    }

    const finalEvents = filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Debug summary
    const eventTypeCounts = finalEvents.reduce((acc, event) => {
      acc[event.originalType] = (acc[event.originalType] || 0) + 1;
      return acc;
    }, {});

    console.log('🔍 DEBUG: Final filtered events:', finalEvents.map(e => ({ type: e.type, originalType: e.originalType, title: e.title })));
    console.log('🔍 DEBUG: Event type distribution:', eventTypeCounts);
    console.log('🔍 DEBUG: Total events returned:', finalEvents.length);

    return finalEvents;
  };

  // Don't render if no customer
  if (!customer) {
    return null;
  }

  return (
    <Fragment>
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-full w-full h-[95vh] flex flex-col p-0"
        onClose={() => handleOpenChange(false)}
      >
        {/* Header - Fixed */}
        <DialogHeader className="pt-5 pb-3 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 leading-none -mb-1">{customer.company}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Navigation Tabs - Fixed */}
        <div className="border-b border-gray-200 flex-shrink-0 px-6">
          <div className="flex">
            <Button
              variant="ghost"
              onClick={() => setModalActiveTab("overview")}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                modalActiveTab === "overview"
                  ? "border-pink-600 text-pink-600 hover:text-pink-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Home className="w-4 h-4" />
              Overview
            </Button>
            <Button
              variant="ghost"
              onClick={() => setModalActiveTab("email")}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                modalActiveTab === "email"
                  ? "border-pink-600 text-pink-600 hover:text-pink-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Mail className="w-4 h-4" />
              Send Email
            </Button>
            <Button
              variant="ghost"
              onClick={() => setModalActiveTab("deals")}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                modalActiveTab === "deals"
                  ? "border-pink-600 text-pink-600 hover:text-pink-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Deals
            </Button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 px-5 bg-gray-50">
          {modalActiveTab === "overview" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                {/* Left Column - Customer Information */}
                <div className="lg:col-span-3 lg:order-2 space-y-4">
                  {/* Basic & Contact Information */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col" style={{ height: 'calc(1000px + 1rem)' }}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                      <Building className="w-4 h-4 text-pink-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Company</label>
                        {renderEditableField('company', customer.company, 'Company name')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Industry</label>
                        {renderEditableField('industry', customer.industry, 'Industry')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Location</label>
                        {renderEditableField('location', customer.location, 'Location')}
                      </div>

                      {/* Contact Information */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-gray-600">Primary Contact</label>
                          <button
                            onClick={handleOpenContactsModal}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            title="View All Contacts"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{contacts.length > 1 ? `${contacts.length} contacts` : 'View'}</span>
                          </button>
                        </div>
                        {renderEditableField('primaryContact', customer.primaryContact, 'Contact name')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Email</label>
                        {renderEditableField('email', customer.email, 'Email address')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Phone</label>
                        {renderEditableField('phone', customer.phone, 'Phone number')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Website</label>
                        <p className="text-gray-900">
                          {customer.website ? (
                            <a
                              href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              {customer.website}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">No website</span>
                          )}
                        </p>
                      </div>

                      {/* Assigned Employee - Editable with Dropdown */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Assigned Employee</label>
                        {renderEditableField(
                          'assignedEmployee',
                          customer.assignedEmployeeName || getAssignedEmployeeName(),
                          'Not Assigned',
                          true,
                          [
                            { value: '', label: 'Not Assigned' },
                            ...(employees?.map(emp => ({
                              value: emp.employee_id,
                              label: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee ${emp.employee_id}`
                            })) || [])
                          ],
                          customer.assignedEmployeeId || ''
                        )}
                      </div>

                      {/* Stats Information */}
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-pink-600" />
                          Quick Stats
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-1">Status</label>
                            <div className="text-gray-900 font-medium">
                              {(() => {
                                // Map churn risk to status
                                const churnRisk = customer.churnRisk || getCurrentCachedSummary()?.churn_risk || getCurrentCachedSummary()?.summary_data?.churn_risk;
                                if (!churnRisk) return 'Unknown';

                                const riskLower = churnRisk.toLowerCase();
                                let statusText = 'Unknown';
                                let colorClass = 'text-gray-600';

                                if (riskLower === 'low' || riskLower === 'medium') {
                                  statusText = 'Active';
                                  colorClass = 'text-green-600';
                                } else if (riskLower === 'high') {
                                  statusText = 'Inactive';
                                  colorClass = 'text-yellow-600';
                                } else if (riskLower === 'declining') {
                                  statusText = 'Declining';
                                  colorClass = 'text-red-600';
                                }

                                return (
                                  <span className={`font-semibold ${colorClass}`}>
                                    {statusText}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-1">Annual Recurring Revenue</label>
                            <p className="text-gray-900 font-medium">${customer.revenue || customer.contractValue || '0'}</p>
                          </div>

                          {/* Interaction Count and Engagement Level */}
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-1">Interactions (Last 2 weeks)</label>
                            <div className="text-gray-900 font-medium">
                              {getCurrentCachedSummary()?.summary_data?.interaction_count || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Activity & Summary */}
                <div className="lg:col-span-7 lg:order-1 space-y-4">

                  {/* Activity Panel */}
                  <ActivityPanel
                    customer={customer}
                    customerInteractions={customerInteractions}
                    loadingInteractions={loadingInteractions}
                    timelineFilter={timelineFilter}
                    setTimelineFilter={setTimelineFilter}
                    timelineSearch={timelineSearch}
                    setTimelineSearch={setTimelineSearch}
                    isTimelineExpanded={isTimelineExpanded}
                    handleTimelineToggle={handleTimelineToggle}
                    expandedPanel={expandedPanel}
                    setExpandedPanel={setExpandedPanel}
                    handleEventClick={handleEventClick}
                    getTimelineEvents={getTimelineEvents}
                    authFetch={authFetch}
                    onNoteAdded={handleNoteAdded}
                    onInteractionAdded={handleInteractionAdded}
                    notes={notes}
                    isLoadingNotes={isLoadingNotes}
                    isRefreshingNotes={isRefreshingNotes}
                    handleDeleteNote={handleDeleteNote}
                    handleToggleNoteStar={handleToggleNoteStar}
                    isDeletingNote={isDeletingNote}
                    onCallDeleted={handleCallEventDelete}
                  />

                  {/* Interaction Summary */}
                  <div className={`bg-white rounded-lg border border-gray-200 flex flex-col transition-all duration-300 ${
                    expandedPanel === 'summary' ? 'h-[calc(1000px+1rem-60px-1rem)] p-6' : expandedPanel === 'activity' ? 'h-[60px] overflow-visible px-6 py-3' : 'h-[500px] p-6'
                  }`}>
                    <div className={`flex items-center justify-between flex-shrink-0 ${expandedPanel === 'activity' ? 'mb-0' : 'mb-6'}`}>
                      <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-pink-600" />
                        Interaction Summary
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Refresh Summary Button */}
                        <Button
                          id="refresh-summary-button"
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-x-2 whitespace-nowrap"
                          onClick={handleGenerateSummary}
                          disabled={isGeneratingSummary || !customer?.id}
                        >
                          <Brain className="w-4 h-4 flex-shrink-0" />
                          {isGeneratingSummary
                            ? 'Analyzing...'
                            : getCurrentCachedSummary()
                              ? 'Refresh Summary'
                              : 'Generate Summary'
                          }
                        </Button>
                        <button
                          onClick={() => setExpandedPanel(expandedPanel === 'summary' ? null : 'summary')}
                          className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded flex-shrink-0"
                          title={expandedPanel === 'summary' ? 'Collapse' : 'Expand'}
                        >
                          {expandedPanel === 'summary' ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronUp className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {expandedPanel !== 'activity' && (
                    <div className="flex-1 overflow-y-auto">
                      {isGeneratingSummary ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <RefreshCw className="w-8 h-8 text-purple-600 mx-auto mb-3 animate-spin" />
                            <p className="text-gray-600">Analyzing customer interactions...</p>
                          </div>
                        </div>
                      ) : getCurrentCachedSummary() ? (
                        <div className="space-y-4">
                          {/* AI Insights */}
                          {getCurrentCachedSummary()?.summary_data?.recent_activities && getCurrentCachedSummary().summary_data.recent_activities.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-5">
                              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                  <Sparkles className="w-4 h-4 text-blue-600" />
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">AI Insights</h4>
                              </div>
                              <div className="space-y-4">
                                {getCurrentCachedSummary().summary_data.recent_activities.map((activity, index) => (
                                  <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold mt-0.5">
                                      {index + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{activity}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Next Steps */}
                          {getCurrentCachedSummary()?.summary_data?.next_steps && getCurrentCachedSummary().summary_data.next_steps.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-5">
                              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-blue-600" />
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">Next Steps</h4>
                              </div>
                              <div className="space-y-4">
                                {getCurrentCachedSummary().summary_data.next_steps.map((step, index) => (
                                  <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold mt-0.5">
                                      {index + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : summaryError ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-red-600">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Error generating summary</p>
                            <p className="text-xs text-gray-500 mt-1">{summaryError}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No interaction summary available</p>
                            <p className="text-gray-400 text-xs mt-1">Click "Generate Summary" to create AI-powered insights</p>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {modalActiveTab === "email" && (
            <div className="p-6 h-full">
              {customer && (
                <CustomerEmailComposer
                  customer={customer}
                  onClose={() => setModalActiveTab('overview')}
                  onEmailSent={async (emailData) => {
                    console.log('Email sent:', emailData);
                    // Small delay to ensure database commit is fully visible
                    await new Promise(resolve => setTimeout(resolve, 300));
                    // Refresh interactions to show the newly sent email
                    await fetchCustomerInteractions(true);
                    setModalActiveTab('overview');
                  }}
                  embedded={true}
                  smartSendWindow={smartSendWindow}
                />
              )}
            </div>
          )}

          {modalActiveTab === "deals" && (
            <div className="space-y-6">
              <div className="w-4/5 mx-auto">
                {/* Deals Header with Stats */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-pink-600" />
                      <h3 className="text-xl font-semibold text-gray-900">Deals with {customer.company}</h3>
                    </div>
                    <button
                      onClick={fetchDeals}
                      disabled={isLoadingDeals}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                      title="Refresh deals"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingDeals ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {/* Summary Stats under title */}
                  {!isLoadingDeals && !dealsError && deals.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <span className="text-xs text-gray-600">Total Deals</span>
                        <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Total Value</span>
                        <p className="text-2xl font-bold text-pink-600">
                          ${deals.reduce((sum, deal) => sum + (deal.value_usd || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Active Deals</span>
                        <p className="text-2xl font-bold text-blue-600">
                          {deals.filter(d => !['won', 'lost'].includes(d.stage)).length}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Deals Table */}
                {isLoadingDeals ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                      <span className="text-gray-600">Loading deals...</span>
                    </div>
                  </div>
                ) : dealsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <span className="text-red-700">{dealsError}</span>
                  </div>
                ) : deals.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No deals found</p>
                    <p className="text-gray-400 text-sm">There are currently no deals associated with this customer.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full bg-white">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span>Deal Name</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span>Value</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              <span>Stage</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>Last Contact</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Expected Close</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>Created</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {deals.map((deal, index) => (
                          <tr
                            key={deal.deal_id}
                            className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            {/* Deal Name */}
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{deal.deal_name}</p>
                                {deal.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{deal.description}</p>
                                )}
                              </div>
                            </td>

                            {/* Value */}
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-pink-600">
                                ${deal.value_usd ? deal.value_usd.toLocaleString() : '0'}
                              </span>
                            </td>

                            {/* Stage */}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                deal.stage === 'won' ? 'bg-green-100 text-green-800' :
                                deal.stage === 'lost' ? 'bg-red-100 text-red-800' :
                                deal.stage === 'negotiation' ? 'bg-blue-100 text-blue-800' :
                                deal.stage === 'proposal' ? 'bg-purple-100 text-purple-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
                              </span>
                            </td>

                            {/* Last Contact Date */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">
                                {deal.last_contact_date
                                  ? new Date(deal.last_contact_date).toLocaleDateString()
                                  : '-'}
                              </span>
                            </td>

                            {/* Expected Close Date */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">
                                {deal.expected_close_date
                                  ? new Date(deal.expected_close_date).toLocaleDateString()
                                  : '-'}
                              </span>
                            </td>

                            {/* Created Date */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">
                                {new Date(deal.created_at).toLocaleDateString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* CRM Meeting Details Modal */}
    <CRMMeetingDetailsModal
      key="meeting-modal"
      isOpen={showMeetingModal}
      onClose={handleMeetingModalClose}
      meetingId={selectedMeeting?.id}
      authFetch={authFetch}
      meeting={selectedMeeting?.data}
      onUpdate={handleMeetingUpdate}
      onDelete={handleMeetingDelete}
    />

    {/* Interaction Details Modal */}
    <InteractionDetailsModal
      key="interaction-modal"
      event={selectedInteraction}
      customer={customer}
      isOpen={isInteractionModalOpen}
      onClose={handleInteractionModalClose}
      notes={notes}
      customerInteractions={customerInteractions}
        onDelete={handleCallEventDelete}
        onUpdate={handleCallEventUpdate}
        authFetch={authFetch}
      />

      {/* Note Details Modal */}
      <NoteDetailsModal
        key="note-details-modal"
        note={selectedNote}
        customer={customer}
        isOpen={showNoteModal}
        onClose={handleNoteModalClose}
        onDelete={handleDeleteNote}
        onUpdate={handleNoteUpdate}
        onToggleStar={handleToggleNoteStar}
        isDeletingNote={isDeletingNote}
        authFetch={authFetch}
    />

      {/* Add Note Modal */}
      <AddNoteModal
        key="add-note-modal"
        isOpen={addNoteModalOpen}
        onClose={() => {
          setAddNoteModalOpen(false);
          setSelectedInteractionForNote(null);
        }}
        onAddNote={handleAddNote}
        interaction={selectedInteractionForNote}
        isAdding={isAddingNote}
      />

      {/* Contacts Management Modal */}
      {showContactsModal && (
        <Dialog open={showContactsModal} onOpenChange={(open) => !open && handleCloseContactsModal()}>
          <DialogContent
            className="max-w-3xl max-h-[90vh] flex flex-col"
            onClose={handleCloseContactsModal}
          >
            {/* Modal Header */}
            <DialogHeader className="p-6 pb-0 border-b-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Customer Contacts</DialogTitle>
                  <p className="text-sm text-gray-500">{customer.company}</p>
                </div>
              </div>
            </DialogHeader>

            {/* Success/Error Messages */}
            {contactSuccess && (
              <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">{contactSuccess}</p>
              </div>
            )}
            {contactError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{contactError}</p>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!showContactForm ? (
                <>
                  {/* Contacts List */}
                  <div className="space-y-3">
                    {/* Sort contacts to show primary first */}
                    {[...contacts].sort((a, b) => {
                      if (a.is_primary && !b.is_primary) return -1;
                      if (!a.is_primary && b.is_primary) return 1;
                      return 0;
                    }).map((contact) => (
                      <div
                        key={contact.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                              {contact.is_primary && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  <Star className="w-3 h-3 fill-current" />
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4" />
                                <span>{contact.email}</span>
                              </div>
                              {contact.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{contact.phone}</span>
                                </div>
                              )}
                              {contact.title && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <User className="w-4 h-4" />
                                  <span>{contact.title}</span>
                                </div>
                              )}
                              {contact.notes && (
                                <div className="flex items-start gap-2 text-gray-600 mt-2">
                                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs">{contact.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleEditContactClick(contact)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit contact"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {!contact.is_primary && (
                              <>
                                <button
                                  onClick={() => handleSetPrimaryContact(contact)}
                                  className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                  title="Set as primary"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteContact(contact)}
                                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete contact"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Contact Button */}
                  <button
                    onClick={handleAddContactClick}
                    className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">Add Contact</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Contact Form */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {editingContact ? 'Edit Contact' : 'Add New Contact'}
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactFormData.name}
                        onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contact name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={contactFormData.email}
                        onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={contactFormData.phone}
                        onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={contactFormData.title}
                        onChange={(e) => setContactFormData({ ...contactFormData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Job title"
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleCancelContactForm}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={isSavingContact}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveContact}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        disabled={isSavingContact}
                      >
                        {isSavingContact ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>{editingContact ? 'Update Contact' : 'Add Contact'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Fragment>
  );
};

export default CustomerProfileDisplay;