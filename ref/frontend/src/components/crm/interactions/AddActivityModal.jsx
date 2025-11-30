import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  FileText,
  PhoneCall,
  Star,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Textarea } from '../../ui/primitives/textarea';
import { Label } from '../../ui/primitives/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/primitives/dialog';
import MeetingScheduler from './MeetingScheduler';

/**
 * AddActivityModal - Enhanced with shadcn Dialog primitive
 *
 * Now uses shadcn's Dialog for better accessibility and consistency.
 * Supports both old (isOpen/onClose) and new (open/onOpenChange) prop names for backward compatibility.
 *
 * @param {boolean} open - Whether the modal is visible (new prop name)
 * @param {boolean} isOpen - Legacy prop name (backward compatibility)
 * @param {function} onOpenChange - Callback when modal state changes (new prop name)
 * @param {function} onClose - Legacy callback (backward compatibility)
 * @param {object} customer - Customer object
 * @param {function} onNoteAdded - Callback when note is added
 * @param {function} onInteractionAdded - Callback when interaction is added
 * @param {function} authFetch - Authentication fetch function
 * @param {string} initialActivityType - Initial activity type to display
 */
const AddActivityModal = ({
  open,
  isOpen, // Legacy prop
  onOpenChange,
  onClose, // Legacy prop
  customer,
  onNoteAdded,
  onInteractionAdded,
  authFetch,
  initialActivityType = 'note'
}) => {
  const MAX_TITLE_LENGTH = 200;
  const MAX_NOTE_LENGTH = 2000;
  const MAX_CALL_SUMMARY_LENGTH = 5000;
  const MAX_THEME_LENGTH = 50;
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Support both new (open) and legacy (isOpen) prop names
  const modalOpen = open !== undefined ? open : isOpen;

  // Support both new (onOpenChange) and legacy (onClose) callbacks
  const handleOpenChange = (newOpen) => {
    if (!newOpen && !isSubmitting) {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else if (onClose) {
        onClose();
      }
    }
  };

  // State
  const [activityType, setActivityType] = useState(initialActivityType);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteStar, setNoteStar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Call Summary State
  const [callSummary, setCallSummary] = useState('');
  const [callTheme, setCallTheme] = useState('');

  // Reset form when modal opens/closes or activity type changes
  useEffect(() => {
    if (!modalOpen) {
      setNoteTitle('');
      setNoteBody('');
      setNoteStar(false);
      setCallSummary('');
      setCallTheme('');
      setError('');
      setSuccess('');
    } else {
      // When modal opens, set the activity type to the initial one
      setActivityType(initialActivityType);
    }
  }, [modalOpen, initialActivityType]);

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Validate note input
  const validateNote = () => {
    const trimmedBody = noteBody.trim();
    const trimmedTitle = noteTitle.trim();

    if (trimmedBody.length === 0) {
      return 'Note content cannot be empty';
    }
    if (trimmedBody.length > MAX_NOTE_LENGTH) {
      return `Note cannot exceed ${MAX_NOTE_LENGTH} characters`;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return `Title cannot exceed ${MAX_TITLE_LENGTH} characters`;
    }
    return null;
  };

  // Validate call summary input
  const validateCallSummary = () => {
    const trimmedSummary = callSummary.trim();
    const trimmedTheme = callTheme.trim();

    if (trimmedSummary.length === 0) {
      return 'Call summary cannot be empty';
    }
    if (trimmedSummary.length > MAX_CALL_SUMMARY_LENGTH) {
      return `Call summary cannot exceed ${MAX_CALL_SUMMARY_LENGTH} characters`;
    }
    if (trimmedTheme.length > MAX_THEME_LENGTH) {
      return `Theme cannot exceed ${MAX_THEME_LENGTH} characters`;
    }
    return null;
  };

  // Handle note submission
  const handleSubmitNote = async () => {
    if (!customer?.id) return;

    const validationError = validateNote();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const payload = {
      title: noteTitle.trim() || '',
      body: noteBody.trim(),
      star: noteStar ? 'important' : null,
      interaction_id: null // General note, not linked to interaction
    };

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess('Note added successfully!');

        // Trigger data refresh in background (don't wait)
        if (onNoteAdded) {
          onNoteAdded().catch(err => {
            console.error('Error refreshing notes after creation:', err);
          });
        }

        // Close modal immediately after brief success message display
        setTimeout(() => {
          handleOpenChange(false);
        }, 500);
      } else {
        const errorData = await response.json();
        setError('Failed to add note: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Error adding note: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle call summary submission
  const handleSubmitCallSummary = async () => {
    if (!customer?.id) return;

    const validationError = validateCallSummary();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const payload = {
      content: callSummary.trim(),
      theme: callTheme.trim() || null,
      source: 'manual',
      duration_minutes: null
    };

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/call-summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess('Call summary added successfully!');

        // Trigger interaction refresh in background (call summaries are interactions)
        if (onInteractionAdded) {
          onInteractionAdded().catch(err => {
            console.error('Error refreshing interactions after call summary creation:', err);
          });
        }

        // Close modal immediately after brief success message display
        setTimeout(() => {
          handleOpenChange(false);
        }, 500);
      } else {
        const errorData = await response.json();
        setError('Failed to add call summary: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding call summary:', err);
      setError('Error adding call summary: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get tab configuration
  const tabs = [
    { key: 'note', label: 'Add Note', icon: FileText },
    { key: 'meeting', label: 'Schedule Meeting', icon: Calendar },
    { key: 'callSummary', label: 'Add Call Summary', icon: PhoneCall }
  ];

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-full w-[95vw] h-[90vh] flex flex-col p-0"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader className="flex-shrink-0 pt-5 pb-3 px-6 border-b border-gray-200">
          <DialogTitle className="text-2xl">Add Activity</DialogTitle>
        </DialogHeader>

        {/* Activity Type Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0 px-6">
          <div className="flex gap-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActivityType(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activityType === key
                    ? 'border-pink-600 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                disabled={isSubmitting}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-6 px-6 bg-gray-50">
              {/* Success/Error Messages */}
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Note Form */}
              {activityType === 'note' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    {/* Title Input */}
                    <div className="space-y-2">
                      <Label htmlFor="note-title-activity">
                        Note Title <span className="text-gray-400">(Optional)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="note-title-activity"
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Enter note title..."
                          className="pr-20"
                          maxLength={MAX_TITLE_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {noteTitle.length}/{MAX_TITLE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Note Body */}
                    <div className="space-y-2">
                      <Label htmlFor="note-body-activity">
                        Note Content <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Textarea
                          id="note-body-activity"
                          value={noteBody}
                          onChange={(e) => setNoteBody(e.target.value)}
                          placeholder="Add your note..."
                          className="h-48 pr-20 resize-none"
                          maxLength={MAX_NOTE_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {noteBody.length}/{MAX_NOTE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Star Toggle */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noteStar}
                          onChange={(e) => setNoteStar(e.target.checked)}
                          disabled={isSubmitting}
                          className="sr-only"
                        />
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                          noteStar
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}>
                          <Star className={`w-4 h-4 ${noteStar ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          {noteStar ? 'Important' : 'Mark as Important'}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Meeting Scheduler */}
              {activityType === 'meeting' && (
                <MeetingScheduler
                  customer={customer}
                  onMeetingCreated={async (meeting) => {
                    setSuccess('✅ Meeting created and synced to Google Calendar!');

                    // Trigger interaction refresh in background (meetings are interactions)
                    if (onInteractionAdded) {
                      onInteractionAdded().catch(err => {
                        console.error('Error refreshing interactions after meeting creation:', err);
                      });
                    }

                    // Close modal immediately after brief success message display
                    setTimeout(() => {
                      handleOpenChange(false);
                    }, 500);
                  }}
                  authFetch={authFetch}
                />
              )}

              {/* Call Summary Form */}
              {activityType === 'callSummary' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    {/* Call Theme Input */}
                    <div className="space-y-2">
                      <Label htmlFor="call-theme">
                        Call Theme <span className="text-gray-400">(Optional)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="call-theme"
                          type="text"
                          value={callTheme}
                          onChange={(e) => setCallTheme(e.target.value)}
                          placeholder="e.g., Product Demo, Follow-up, Support..."
                          className="pr-20"
                          maxLength={MAX_THEME_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {callTheme.length}/{MAX_THEME_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Call Summary Content */}
                    <div className="space-y-2">
                      <Label htmlFor="call-summary">
                        Call Summary <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Textarea
                          id="call-summary"
                          value={callSummary}
                          onChange={(e) => setCallSummary(e.target.value)}
                          placeholder="Summarize the key discussion points, outcomes, and any follow-up actions..."
                          className="h-48 pr-20 resize-none"
                          maxLength={MAX_CALL_SUMMARY_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {callSummary.length}/{MAX_CALL_SUMMARY_LENGTH}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 flex-shrink-0 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {activityType === 'note' && (
            <Button
              className="bg-pink-600 hover:bg-pink-700 text-white disabled:bg-gray-400"
              onClick={handleSubmitNote}
              disabled={!noteBody.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding Note...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </>
              )}
            </Button>
          )}
          {activityType === 'callSummary' && (
            <Button
              className="bg-pink-600 hover:bg-pink-700 text-white disabled:bg-gray-400"
              onClick={handleSubmitCallSummary}
              disabled={!callSummary.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding Call Summary...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Call Summary
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityModal;

