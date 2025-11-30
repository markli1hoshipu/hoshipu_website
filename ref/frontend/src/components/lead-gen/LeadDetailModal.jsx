import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  User,
  Mail,
  X,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  Brain,
  Check as CheckIcon,
  X as XIcon
} from 'lucide-react';
import { Button } from '../ui/primitives/button';
import LeadEmailTimeline from './LeadEmailTimeline';
import LeadEmailComposer from './LeadEmailComposer';
import leadsApiService from '../../services/leadsApi';
import { useAuth } from '../../auth/hooks/useAuth';

const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
const LEADGEN_API_BASE_URL = import.meta.env.VITE_BACKEND_LEAD_API_URL || 'http://localhost:9000';

const LeadDetailModal = ({
  isOpen,
  onClose,
  selectedLead,
  modalActiveTab,
  setModalActiveTab,
  aiSuggestions,
  isLoadingAiSuggestions,
  aiSuggestionsError,
  loadCachedAiSuggestions,
  regenerateAiSuggestions,
  handleAddToCRM,
  handleEmailSent,
  onLeadUpdated  // New prop to notify parent of updates
}) => {
  const { authFetch } = useAuth();
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);

  // Inline editing state
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Employees list for assignment dropdown
  const [employees, setEmployees] = useState([]);

  // Smart send window state
  const [smartSendWindow, setSmartSendWindow] = useState(null);

  // Fetch all modal data in parallel for faster loading
  useEffect(() => {
    if (!isOpen) return;

    const loadAllModalData = async () => {
      const leadId = selectedLead?.lead_id || selectedLead?.id;

      // Collect all API calls to run in parallel
      const promises = [];

      // 1. Fetch employees for assignment dropdown
      promises.push(
        authFetch(`${CRM_API_BASE_URL}/api/crm/employees`)
          .then(response => response.ok ? response.json() : null)
          .then(data => data && setEmployees(data))
          .catch(error => console.error('Error fetching employees:', error))
      );

      // 2. Fetch smart send window if leadId exists
      if (leadId) {
        promises.push(
          leadsApiService.getSmartSendWindow(leadId)
            .then(data => {
              console.log('[SmartSendWindow] Pre-fetched data:', data);
              setSmartSendWindow(data);
            })
            .catch(err => console.error('[SmartSendWindow] Error pre-fetching:', err))
        );

        // 3. Load cached AI suggestions if available
        if (loadCachedAiSuggestions) {
          promises.push(
            Promise.resolve(loadCachedAiSuggestions(leadId))
              .catch(err => console.error('[AI Suggestions] Error loading:', err))
          );
        }
      }

      // Run all API calls in parallel
      await Promise.all(promises);
    };

    loadAllModalData();
  }, [isOpen, selectedLead?.lead_id, selectedLead?.id, authFetch, loadCachedAiSuggestions]);

  // Handle field editing
  const handleFieldClick = (fieldName, currentValue) => {
    setEditingField(fieldName);
    setEditingValue(currentValue || '');
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const handleFieldSave = async (fieldName) => {
    if (!selectedLead?.id && !selectedLead?.lead_id) {
      console.error('No lead ID found');
      return;
    }

    const leadId = selectedLead.lead_id || selectedLead.id;
    console.log(`💾 Saving field '${fieldName}' for lead ${leadId}...`);
    console.log(`📝 Current value: "${editingValue}"`);
    setIsSavingField(true);

    try {
      // Map frontend field names to backend field names
      const fieldMapping = {
        'company': 'company',
        'industry': 'industry',
        'location': 'location',
        'email': 'email',
        'phone': 'phone',
        'website': 'website',
        'assignedEmployee': 'assigned_to'  // Changed from 'assignedTo' to 'assigned_to'
      };

      const backendField = fieldMapping[fieldName];
      if (!backendField) {
        console.error('Unknown field:', fieldName);
        return;
      }

      let processedValue = editingValue;
      if (fieldName === 'assignedEmployee') {
        // Handle empty string for "Not Assigned"
        if (editingValue === '' || editingValue === null) {
          processedValue = null;
        } else {
          processedValue = String(editingValue);  // Keep as string
        }
        console.log(`👤 Assigning to employee: ${processedValue}`);
      }

      const payload = {
        [backendField]: processedValue
      };

      console.log('📤 Payload:', JSON.stringify(payload, null, 2));

      const response = await authFetch(`${LEADGEN_API_BASE_URL}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update failed:', errorText);
        throw new Error('Failed to update lead');
      }

      const updatedLead = await response.json();
      console.log('✅ Lead updated successfully:', updatedLead);
      console.log('📊 Updated lead company name:', updatedLead.company);
      console.log('📊 Updated lead data keys:', Object.keys(updatedLead));

      // Notify parent component of update
      if (onLeadUpdated) {
        console.log('📢 Notifying parent of update with data:', updatedLead);
        onLeadUpdated(updatedLead);
        console.log('📢 Parent notified');
      } else {
        console.warn('⚠️ No onLeadUpdated callback provided');
      }

      // Clear editing state
      setEditingField(null);
      setEditingValue('');

      // Show success message
      if (fieldName === 'assignedEmployee') {
        const employeeName = processedValue ? (employees?.find(emp => String(emp.employee_id) === String(processedValue))?.name || 'employee') : 'Not Assigned';
        setSuccessMessage(`Assigned to: ${employeeName}`);
      } else {
        setSuccessMessage('Field updated successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error updating field:', error);
      setErrorMessage('Failed to update field');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsSavingField(false);
    }
  };

  // Render editable field
  const renderEditableField = (fieldName, displayValue, placeholder = '', isSelect = false, options = [], actualValue = null) => {
    const isEditing = editingField === fieldName;
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
                className="w-full px-2 py-1 pr-20 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                disabled={isSavingField}
                placeholder={placeholder}
              />
            )}
            {/* Save/Cancel Buttons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {isSavingField ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
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
                    <CheckIcon className="w-4 h-4" />
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
                    <XIcon className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <p
        className="text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 -mx-2 -my-1 rounded border border-transparent hover:border-blue-200 transition-colors"
        onClick={() => handleFieldClick(fieldName, valueForEditing)}
      >
        {displayValue || placeholder || '-'}
      </p>
    );
  };

  const handleCheckReplies = async () => {
    if (!selectedLead?.lead_id && !selectedLead?.id) return;

    const leadId = selectedLead.lead_id || selectedLead.id;
    setIsCheckingReplies(true);

    try {
      const result = await leadsApiService.checkReplies(leadId, 7);

      if (result.status_changed && result.new_status && handleEmailSent) {
        const emailData = {
          status_changed: true,
          new_status: result.new_status,
          sent_to: selectedLead.email,
          positive_replies_count: result.positive_replies_count
        };
        await handleEmailSent(emailData);
      }
    } catch (error) {
      console.error('Error checking replies:', error);
    } finally {
      setIsCheckingReplies(false);
    }
  };

  if (!isOpen || !selectedLead) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex justify-center pt-8 px-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="w-full bg-white rounded-lg shadow-2xl relative h-full flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header - Fixed */}
          <div className="flex items-center justify-between pt-5 pb-3 px-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 leading-none self-center -mb-1">{selectedLead.company}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-5 h-5 text-gray-500" />
            </Button>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          {/* Navigation Tabs - Fixed */}
          <div className="border-b border-gray-200 flex-shrink-0 px-6">
            <div className="flex">
              <Button
                variant="ghost"
                onClick={() => setModalActiveTab('information')}
                className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                  modalActiveTab === 'information'
                    ? "border-blue-600 text-blue-600 hover:text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <User className="w-4 h-4" />
                Overview
              </Button>
              <Button
                variant="ghost"
                onClick={() => setModalActiveTab('email')}
                className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                  modalActiveTab === 'email'
                    ? "border-blue-600 text-blue-600 hover:text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto py-4 px-5 bg-gray-50">
            {/* Information Tab */}
            {modalActiveTab === 'information' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                  {/* Left Column */}
                  <div className="lg:col-span-7 lg:order-1 space-y-4">
                    {/* Email Timeline */}
                    <LeadEmailTimeline
                      selectedLead={selectedLead}
                      onAddToCRM={() => handleAddToCRM(selectedLead)}
                      onCheckReplies={handleCheckReplies}
                      isCheckingReplies={isCheckingReplies}
                    />

                    {/* Company Intelligence & Analysis */}
                    <div className="bg-white rounded-lg border border-gray-200 flex flex-col" style={{ height: 'calc(1000px + 1rem - 500px - 1rem)' }}>
                      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                        <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                          <Brain className="w-5 h-5 text-blue-600" />
                          Company Intelligence & Analysis by AI
                        </h3>
                        <Button
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-x-2"
                          onClick={() => regenerateAiSuggestions(selectedLead?.id)}
                          disabled={isLoadingAiSuggestions}
                        >
                          {isLoadingAiSuggestions ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4" />
                              Generate Report
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex-1 bg-gray-50 border-t border-gray-200 overflow-y-auto">
                        {isLoadingAiSuggestions && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                              <p className="text-gray-600">AI is analyzing this lead...</p>
                              <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
                            </div>
                          </div>
                        )}

                        {aiSuggestionsError && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                              <p className="text-red-700 font-medium">Failed to generate AI suggestions</p>
                              <p className="text-sm text-red-600 mt-1">{aiSuggestionsError}</p>
                            </div>
                          </div>
                        )}

                        {!isLoadingAiSuggestions && !aiSuggestionsError && !aiSuggestions && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <h4 className="text-lg font-medium text-gray-600 mb-2">No Analysis Available</h4>
                              <p className="text-sm text-gray-500">Click "Regenerate Report" to generate company intelligence</p>
                            </div>
                          </div>
                        )}

                        {aiSuggestions && !isLoadingAiSuggestions && (
                          <div className="bg-white p-8">
                            {/* AI Insights - CRM-style numbered list */}
                            {aiSuggestions.insights && aiSuggestions.insights.length > 0 && (
                              <div className="space-y-4 mb-6">
                                {aiSuggestions.insights.map((insight, index) => (
                                  <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold mt-0.5">
                                      {index + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{insight}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Metadata footer */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 pt-4 border-t border-gray-200">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Generated on {new Date(aiSuggestions.generated_at).toLocaleString()}
                              <span className="ml-2 px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-medium">
                                Prelude AI
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Unified Information Box */}
                  <div className="lg:col-span-3 lg:order-2">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col" style={{ height: 'calc(1000px + 1rem)' }}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                        <Building className="w-4 h-4 text-blue-600" />
                        Lead Information
                      </h3>
                      <div className="space-y-4 flex-1 overflow-y-auto">
                        {/* Basic Information - Editable Fields */}
                        <div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Company</label>
                              {renderEditableField('company', selectedLead.company, 'Company name')}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Industry</label>
                              {renderEditableField('industry', selectedLead.industry, 'Industry')}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Location</label>
                              {renderEditableField('location', selectedLead.address || selectedLead.location, 'Location')}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Source</label>
                              <p className="text-gray-900">{selectedLead.source || 'Web Scraping'}</p>
                            </div>

                            {/* Contact Information - Editable */}
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Email</label>
                              {renderEditableField('email', selectedLead.email, 'Email address')}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Phone</label>
                              {renderEditableField('phone', selectedLead.phone, 'Phone number')}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Website</label>
                              {renderEditableField('website', selectedLead.website, 'Website URL')}
                            </div>

                            {/* Assigned Employee - Dropdown */}
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Assigned To</label>
                              {renderEditableField(
                                'assignedEmployee',
                                selectedLead.assignedEmployeeName || 'Not Assigned',
                                'Not Assigned',
                                true,
                                [
                                  { value: '', label: 'Not Assigned' },
                                  ...employees.map(emp => ({
                                    value: emp.employee_id,
                                    label: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee ${emp.employee_id}`
                                  }))
                                ],
                                selectedLead.assignedEmployeeId || selectedLead.assigned_to || ''
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Personnel */}
                        {selectedLead.personnel && selectedLead.personnel.length > 0 && (
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600" />
                              Personnel ({selectedLead.personnel.length})
                            </h4>
                            <div className="space-y-4">
                              {selectedLead.personnel.slice(0, 10).map((person, index) => (
                                <div key={index}>
                                  <label className="text-sm font-medium text-gray-600 block mb-1">
                                    {person.full_name || person.name || 'Unknown'}
                                  </label>
                                  <p className="text-gray-900">{person.position || 'N/A'}</p>
                                  {person.email && (
                                    <p className="text-gray-900 text-sm">{person.email}</p>
                                  )}
                                  {person.phone && (
                                    <p className="text-gray-600 text-sm">{person.phone}</p>
                                  )}
                                  {person.linkedin_url && (
                                    <a
                                      href={person.linkedin_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                    >
                                      LinkedIn Profile
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email Tab */}
            {modalActiveTab === 'email' && (
              <div className="p-6 h-full">
                {selectedLead && (
                  <LeadEmailComposer
                    lead={selectedLead}
                    onClose={() => setModalActiveTab('information')}
                    onEmailSent={(emailData) => {
                      handleEmailSent(emailData);
                      setModalActiveTab('information');
                    }}
                    embedded={true}
                    smartSendWindow={smartSendWindow}
                  />
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LeadDetailModal;