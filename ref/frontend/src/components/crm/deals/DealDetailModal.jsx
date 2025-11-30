import React, { Fragment, useState, useEffect } from 'react';
import {
  Building,
  Home,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/primitives/dialog';
import DealActivityPanel from './DealActivityPanel';
import DealStageStepper from './DealStageStepper';
import NoteDetailsModal from '../interactions/NoteDetailsModal';
import InteractionDetailsModal from '../interactions/InteractionDetailsModal';
import CRMMeetingDetailsModal from '../interactions/CRMMeetingDetailsModal';
import { useCRM } from '../../../contexts/CRMContext';

const DealDetailModal = ({
  open,          // New prop name (preferred)
  isOpen,        // Legacy prop name
  onOpenChange,  // New callback (preferred)
  onClose,       // Legacy callback
  deal,
  authFetch
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

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

  // Get employees and updateDeal from CRM context
  const { employees, updateDeal } = useCRM();

  // Local deal state for managing updates - initialize with deal or null
  const [localDeal, setLocalDeal] = useState(deal || null);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Editable fields state (matching CustomerProfileDisplay pattern)
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [fieldSuccess, setFieldSuccess] = useState('');


  // Modal state for event details
  const [selectedNote, setSelectedNote] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);

  // Notes and activities state
  const [notes, setNotes] = useState([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(null);
  const [activityRefreshTrigger, setActivityRefreshTrigger] = useState(0);

  // Sync localDeal with prop when deal changes
  useEffect(() => {
    if (deal) {
      setLocalDeal(deal);
    }
  }, [deal]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!modalOpen) {
      setActiveTab('overview');
      setEditingField(null);
      setEditingValue('');
    } else if (deal) {
      // Debug: Log deal data to see what we're receiving
      console.log('DealDetailModal - Deal data:', deal);
      console.log('DealDetailModal - Client name:', deal.client_name);
      console.log('DealDetailModal - Client email:', deal.client_email);
    }
  }, [modalOpen, deal]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStageColor = (stage) => {
    const stageColors = {
      'Opportunity': 'bg-blue-100 text-blue-800',
      'Qualification': 'bg-yellow-100 text-yellow-800',
      'Proposal': 'bg-purple-100 text-purple-800',
      'Negotiation': 'bg-orange-100 text-orange-800',
      'Closed-Won': 'bg-green-100 text-green-800',
      'Closed-Lost': 'bg-red-100 text-red-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800';
  };

  // Event click handler
  const handleEventClick = (activity) => {
    console.log('Deal activity clicked:', activity);

    // Normalize the activity object to match the format expected by InteractionDetailsModal
    const normalizedEvent = {
      type: activity.activity_type,
      originalType: activity.activity_type,
      title: activity.title || activity.theme || `${activity.activity_type === 'note' ? 'Note' : activity.activity_type === 'call' ? 'Call' : activity.activity_type === 'email' ? 'Email' : 'Meeting'}`,
      description: activity.body || activity.content || '',
      date: activity.created_at,
      employeeName: activity.employee_name || 'Unknown',
      metadata: {
        interactionId: activity.interaction_id,
        interaction_id: activity.interaction_id,
        noteId: activity.note_id,
        theme: activity.theme,
        source: activity.source,
        sourceName: activity.source_name,
        sourceType: activity.source_type,
        subject: activity.subject,
        direction: activity.direction,
        from_email: activity.from_email,
        to_email: activity.to_email,
        gmailMessageId: activity.gmail_message_id
      }
    };

    if (activity.activity_type === 'note') {
      // Handle note click - open NoteDetailsModal
      const noteData = notes.find(n => n.id === activity.note_id);
      if (noteData) {
        setSelectedNote(noteData);
        setShowNoteModal(true);
      } else {
        console.error('Note not found:', activity.note_id);
      }
    } else if (activity.activity_type === 'meeting' || activity.activity_type === 'meet') {
      // Handle meeting click
      const interactionId = activity.interaction_id;
      if (!interactionId) {
        console.error('No interaction ID found for meeting activity:', activity);
        return;
      }

      const meetingData = {
        title: activity.title,
        description: activity.description,
        start_time: activity.start_time,
        end_time: activity.end_time,
        location: activity.location,
        employee_name: activity.employee_name
      };

      setSelectedMeeting({
        id: interactionId,
        data: meetingData
      });
      setShowMeetingModal(true);
    } else {
      // For call and email events, use interaction details modal with normalized data
      handleInteractionClick(normalizedEvent);
    }
  };

  const handleInteractionClick = (activity) => {
    setSelectedInteraction(activity);
    setIsInteractionModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setShowNoteModal(false);
    setSelectedNote(null);
  };

  const handleMeetingModalClose = () => {
    setShowMeetingModal(false);
    setSelectedMeeting(null);
  };

  const handleMeetingUpdate = async (updatedMeeting) => {
    console.log('Meeting updated:', updatedMeeting);
    // Trigger activity refresh by incrementing the trigger
    setActivityRefreshTrigger(prev => prev + 1);
  };

  const handleMeetingDelete = async () => {
    console.log('Meeting deleted');
    // Close modal and refresh activities
    setShowMeetingModal(false);
    setSelectedMeeting(null);
    // Trigger activity refresh
    setActivityRefreshTrigger(prev => prev + 1);
  };

  const handleInteractionModalClose = () => {
    setIsInteractionModalOpen(false);
    setSelectedInteraction(null);
  };

  const handleDeleteNote = async (noteId) => {
    if (!noteId) return;
    setIsDeletingNote(noteId);
    try {
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/deals/${localDeal.deal_id}/notes/${noteId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Remove note from state
        setNotes(notes.filter(n => n.id !== noteId));
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setIsDeletingNote(null);
    }
  };

  const handleToggleNoteStar = async (noteId, currentStar) => {
    try {
      const newStar = currentStar === 'important' ? null : 'important';
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/deals/${localDeal.deal_id}/notes/${noteId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ star: newStar })
        }
      );

      if (response.ok) {
        // Update note in state
        setNotes(notes.map(n => n.id === noteId ? { ...n, star: newStar } : n));
      }
    } catch (error) {
      console.error('Error toggling note star:', error);
    }
  };

  const handleNoteUpdate = async () => {
    // Reload notes after update
    // TODO: Implement note loading if needed
  };

  const handleCallEventDelete = async (interactionId) => {
    // Trigger activity refresh after delete
    setActivityRefreshTrigger(prev => prev + 1);
  };

  // Inline field editing handlers (similar to CustomerProfileDisplay)
  const handleFieldClick = (fieldName, currentValue) => {
    console.log(`[Deal Edit] Starting to edit field: ${fieldName}, current value:`, currentValue);
    setEditingField(fieldName);
    setEditingValue(currentValue || '');
  };

  const handleFieldCancel = () => {
    console.log(`[Deal Edit] Cancelled editing field: ${editingField}`);
    setEditingField(null);
    setEditingValue('');
  };

  const handleFieldSave = async (fieldName) => {
    if (!localDeal?.deal_id) {
      console.error('[Deal Edit] No deal ID found, cannot save');
      return;
    }

    // Check if value actually changed
    let currentValue = localDeal[fieldName];
    let newValue = editingValue;

    // Normalize values for comparison
    if (fieldName === 'employee_id') {
      currentValue = currentValue || '';
      newValue = newValue || '';

      // If values are the same, just cancel editing without saving
      if (String(currentValue) === String(newValue)) {
        console.log('[Deal Edit] No change detected, canceling edit');
        handleFieldCancel();
        return;
      }
    }

    console.log(`[Deal Edit] Saving field: ${fieldName}, old value:`, currentValue, 'new value:', newValue);
    setIsSavingField(true);

    try {
      // Prepare update data based on field type
      const updateData = {};

      if (fieldName === 'value_usd') {
        updateData[fieldName] = parseFloat(editingValue) || 0;
      } else if (fieldName === 'employee_id') {
        // Convert empty string to null, otherwise parse as integer
        updateData[fieldName] = editingValue === '' ? null : parseInt(editingValue);
      } else {
        updateData[fieldName] = editingValue;
      }

      console.log('[Deal Edit] Sending update request:', updateData);

      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/deals/${localDeal.deal_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        }
      );

      if (response.ok) {
        const updatedDeal = await response.json();
        console.log('[Deal Edit] Deal updated successfully:', updatedDeal);

        // Update local state with the response from backend
        setLocalDeal(updatedDeal);

        // Update the deal in CRM context to sync with dashboard
        updateDeal(updatedDeal);
        console.log('[Deal Edit] CRM context updated with new deal data');

        // Clear editing state
        setEditingField(null);
        setEditingValue('');
        console.log('[Deal Edit] Editing state cleared');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update deal');
      }
    } catch (error) {
      console.error('[Deal Edit] Error updating deal:', error);
      alert('Failed to update deal: ' + error.message);
    } finally {
      setIsSavingField(false);
    }
  };

  // Render editable text field
  const renderEditableField = (fieldName, value, placeholder = '', type = 'text') => {
    const isEditing = editingField === fieldName;

    if (isEditing) {
      return (
        <div>
          <div className="relative">
            <input
              type={type}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => {
                if (!isSavingField) {
                  handleFieldSave(fieldName);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFieldSave(fieldName);
                } else if (e.key === 'Escape') {
                  handleFieldCancel();
                }
              }}
              className="w-full px-2 py-1 pr-8 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
              disabled={isSavingField}
              step={type === 'number' ? '0.01' : undefined}
            />
            {isSavingField && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Press Enter or click away to save, Esc to cancel
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => handleFieldClick(fieldName, value)}
        className="cursor-pointer hover:bg-blue-50 py-1 rounded transition-colors"
        title="Click to edit"
      >
        <p className="text-gray-900">
          <span className={value ? '' : 'text-gray-400 italic'}>{value || placeholder}</span>
        </p>
      </div>
    );
  };

  // Render editable textarea field
  const renderEditableTextarea = (fieldName, value, placeholder = '') => {
    const isEditing = editingField === fieldName;

    if (isEditing) {
      return (
        <div>
          <div className="relative">
            <textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => {
                if (!isSavingField) {
                  handleFieldSave(fieldName);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleFieldSave(fieldName);
                } else if (e.key === 'Escape') {
                  handleFieldCancel();
                }
              }}
              className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              rows={4}
              autoFocus
              disabled={isSavingField}
            />
            {isSavingField && (
              <div className="absolute right-2 top-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Press Ctrl+Enter or click away to save, Esc to cancel
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => handleFieldClick(fieldName, value)}
        className="cursor-pointer hover:bg-blue-50 py-1 rounded transition-colors"
        title="Click to edit"
      >
        <p className="text-gray-900 whitespace-pre-wrap">
          <span className={value ? '' : 'text-gray-400 italic'}>{value || placeholder}</span>
        </p>
      </div>
    );
  };

  // Render editable employee dropdown
  const renderEditableEmployeeDropdown = (fieldName, employeeId, employeeName) => {
    const isEditing = editingField === fieldName;

    if (isEditing) {
      return (
        <div>
          <div className="relative">
            <select
              value={editingValue}
              onChange={(e) => {
                setEditingValue(e.target.value);
              }}
              onBlur={() => {
                // Save on blur (like EditableDealsTable pattern)
                if (!isSavingField) {
                  handleFieldSave(fieldName);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFieldSave(fieldName);
                } else if (e.key === 'Escape') {
                  handleFieldCancel();
                }
              }}
              className="w-full px-2 py-1 pr-8 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
              disabled={isSavingField}
            >
              <option value="">Unassigned</option>
              {employees?.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.name}
                </option>
              ))}
            </select>
            {isSavingField && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Select an employee and click away to save, or press Esc to cancel
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => handleFieldClick(fieldName, employeeId || '')}
        className="cursor-pointer hover:bg-blue-50 py-1 rounded transition-colors"
        title="Click to edit"
      >
        <p className="text-gray-900">
          <span className={employeeName ? '' : 'text-gray-400 italic'}>
            {employeeName || 'Unassigned'}
          </span>
        </p>
      </div>
    );
  };

  // Don't render if no deal data
  if (!localDeal) {
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
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 leading-none -mb-1">
              {localDeal.deal_name || 'Untitled Deal'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0 px-6">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600 hover:text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Home className="w-4 h-4" />
              Overview
            </Button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 px-5 bg-gray-50">
          {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                {/* Right Column - Deal Information */}
                <div className="lg:col-span-3 lg:order-2 space-y-4">
                  {/* Deal Information Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col" style={{ height: 'calc(1000px + 1rem)' }}>
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-600" />
                        Deal Information
                      </h3>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Deal Name</label>
                        {renderEditableField('deal_name', localDeal.deal_name, 'Click to add deal name')}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Client</label>
                        {/* Client is read-only - it's determined by the client_id relationship */}
                        <p className="text-gray-900">{localDeal.client_name || '-'}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Value (USD)</label>
                        {editingField === 'value_usd' ? (
                          renderEditableField('value_usd', localDeal.value_usd, '0', 'number')
                        ) : (
                          <div
                            onClick={() => handleFieldClick('value_usd', localDeal.value_usd)}
                            className="cursor-pointer hover:bg-blue-50 py-1 rounded transition-colors"
                            title="Click to edit"
                          >
                            <p className="text-gray-900 font-semibold text-lg">{formatCurrency(localDeal.value_usd)}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Assigned Salesperson</label>
                        {renderEditableEmployeeDropdown('employee_id', localDeal.employee_id, localDeal.salesman_name)}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Expected Close Date</label>
                        {renderEditableField('expected_close_date', localDeal.expected_close_date, 'Click to add date', 'date')}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Last Contact Date</label>
                        <p className="text-gray-900">{formatDate(localDeal.last_contact_date)}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Created Date</label>
                        <p className="text-gray-900">{formatDate(localDeal.created_at)}</p>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <label className="text-sm font-medium text-gray-600 block mb-1">Description</label>
                        {renderEditableTextarea('description', localDeal.description, 'Click to add description...')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left Column - Stage Stepper & Activities */}
                <div className="lg:col-span-7 lg:order-1 flex flex-col gap-4" style={{ height: 'calc(1000px + 1rem)' }}>
                  {/* Deal Stage Stepper */}
                  <div className="flex-shrink-0">
                    <DealStageStepper
                      currentStage={localDeal.stage}
                      dealId={localDeal.deal_id}
                      authFetch={authFetch}
                      stageUpdatedAt={localDeal.stage_updated_at}
                      stageUpdatedBy={localDeal.stage_updated_by}
                      stageUpdateType={localDeal.stage_update_type}
                      onStageUpdate={(newStage) => {
                        console.log('Stage updated to:', newStage);
                        // Update local deal state to trigger re-render
                        const updatedDeal = {
                          ...localDeal,
                          stage: newStage,
                          updated_at: new Date().toISOString()
                        };
                        setLocalDeal(updatedDeal);

                        // Update the deal in CRM context to sync with dashboard
                        updateDeal(updatedDeal);
                        console.log('[Deal Stage] CRM context updated with new stage:', newStage);
                      }}
                    />
                  </div>

                  {/* Activity & Notes Panel */}
                  <div className="flex-1 min-h-0">
                    <DealActivityPanel
                      key={activityRefreshTrigger} // Force re-mount when trigger changes
                      deal={localDeal}
                      authFetch={authFetch}
                      onActivityAdded={() => {
                        // Optionally refresh deal data
                      }}
                      handleEventClick={handleEventClick}
                      notes={notes}
                      isDeletingNote={isDeletingNote}
                      handleDeleteNote={handleDeleteNote}
                      onCallDeleted={handleCallEventDelete}
                    />
                  </div>
                </div>
              </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Note Details Modal */}
    <NoteDetailsModal
      note={selectedNote}
      customer={localDeal} // Pass deal as customer for API compatibility
      isOpen={showNoteModal}
      onClose={handleNoteModalClose}
      onDelete={handleDeleteNote}
      onUpdate={handleNoteUpdate}
      onToggleStar={handleToggleNoteStar}
      isDeletingNote={isDeletingNote}
      authFetch={authFetch}
    />

    {/* Meeting Details Modal */}
    <CRMMeetingDetailsModal
      isOpen={showMeetingModal}
      onClose={handleMeetingModalClose}
      meetingId={selectedMeeting?.id}
      authFetch={authFetch}
      meeting={selectedMeeting?.data}
      onUpdate={handleMeetingUpdate}
      onDelete={handleMeetingDelete}
    />

    {/* Interaction Details Modal (for calls and emails) */}
    <InteractionDetailsModal
      event={selectedInteraction}
      customer={null}
      deal={localDeal} // Pass deal context
      isOpen={isInteractionModalOpen}
      onClose={handleInteractionModalClose}
      notes={notes}
      customerInteractions={[]}
      onDelete={handleCallEventDelete}
      onUpdate={() => {}}
      authFetch={authFetch}
    />
    </Fragment>
  );
};

export default DealDetailModal;

