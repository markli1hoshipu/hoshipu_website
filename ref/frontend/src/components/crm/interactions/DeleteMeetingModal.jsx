import React, { useState } from 'react';
import { X, Trash2, Calendar, Clock, Users, MapPin, FileText, ExternalLink } from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/primitives/dialog';

/**
 * MeetingDetailModal - Enhanced with shadcn Dialog primitive
 *
 * Now uses shadcn's Dialog for better accessibility and consistency.
 * Supports both old (onClose) and new (open/onOpenChange) prop names for backward compatibility.
 *
 * @param {boolean} open - Whether the modal is visible (new prop name)
 * @param {boolean} isOpen - Legacy prop name (backward compatibility)
 * @param {function} onOpenChange - Callback when modal state changes (new prop name)
 * @param {function} onClose - Legacy callback (backward compatibility)
 * @param {object} meeting - Meeting object
 * @param {function} onDelete - Callback when meeting is deleted
 * @param {function} authFetch - Authentication fetch function
 * @param {string} googleAccessToken - Google Calendar access token
 */
const MeetingDetailModal = ({
  open,
  isOpen, // Legacy prop
  onOpenChange,
  onClose, // Legacy prop
  meeting,
  onDelete,
  authFetch,
  googleAccessToken
}) => {
  // Support both new (open) and legacy (isOpen) prop names
  const modalOpen = open !== undefined ? open : (meeting ? true : false);

  // Support both new (onOpenChange) and legacy (onClose) callbacks
  const handleOpenChange = (newOpen) => {
    if (!newOpen && !isDeleting) {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else if (onClose) {
        onClose();
      }
    }
  };

  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper function to strip HTML tags and decode HTML entities
  const stripHtml = (html) => {
    if (!html) return '';

    // Create a temporary div element
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // Get text content (strips all HTML tags)
    let text = tmp.textContent || tmp.innerText || '';

    // Clean up excessive whitespace and dots
    text = text.replace(/\.{10,}/g, ''); // Remove long sequences of dots
    text = text.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    text = text.trim();

    return text;
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      // NEW: Use auto-refresh method - no need to pass token!
      // Backend will use stored tokens with auto-refresh
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/meetings/${meeting.interaction_id}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok) {
        // Success - close modal and refresh calendar
        onDelete();
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.detail || 'Failed to delete meeting';

        // Check for specific error types
        if (errorMsg.includes('No valid Google access token') || errorMsg.includes('reconnect')) {
          alert('❌ Please reconnect Google Calendar. Go to Calendar page and sign in again.');
        } else if (errorMsg.includes('permission') || errorMsg.includes('ownership')) {
          alert('❌ You do not have permission to delete this meeting.');
        } else {
          alert(`❌ Failed to delete meeting: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert(`❌ Error deleting meeting: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date and time for display
  const formatDateTime = () => {
    if (!meeting.start_time) return 'No date specified';
    
    const startDate = new Date(meeting.start_time);
    const endDate = meeting.end_time ? new Date(meeting.end_time) : null;

    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    const endTimeStr = endDate ? endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }) : '';

    return `${dateStr} • ${startTimeStr}${endTimeStr ? ` - ${endTimeStr}` : ''}`;
  };

  // Open Google Calendar event link
  const openInGoogleCalendar = () => {
    if (meeting.google_calendar_event_id) {
      window.open(`https://calendar.google.com/calendar/event?eid=${meeting.google_calendar_event_id}`, '_blank');
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader className="bg-gradient-to-r from-pink-50 to-purple-50 -mx-6 -mt-6 px-6 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Calendar className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">{meeting.title || 'Untitled Meeting'}</DialogTitle>
              <p className="text-sm text-gray-600 mt-0.5">Meeting Details</p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
          {/* Date & Time Section */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 mb-1">Date & Time</div>
              <div className="text-base text-gray-900">{formatDateTime()}</div>
            </div>
          </div>

          {/* Attendees Section */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-1">Attendees</div>
                <div className="text-base text-gray-900">
                  {Array.isArray(meeting.attendees)
                    ? meeting.attendees.join(', ')
                    : meeting.attendees}
                </div>
              </div>
            </div>
          )}

          {/* Location Section */}
          {meeting.location && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-1">Location</div>
                <div className="text-base text-gray-900">{meeting.location}</div>
              </div>
            </div>
          )}

          {/* Description Section */}
          {meeting.description && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
                <div className="text-base text-gray-900 whitespace-pre-wrap">
                  {stripHtml(meeting.description)}
                </div>
              </div>
            </div>
          )}

          {/* Google Calendar Link */}
          {meeting.google_calendar_event_id && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={openInGoogleCalendar}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm font-medium">View in Google Calendar</span>
              </button>
            </div>
          )}

          {/* Delete Confirmation Section */}
          {showDeleteConfirm && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-1">Are you sure?</p>
                <p className="text-sm text-red-700 mb-3">
                  This meeting will be permanently deleted from both your CRM and Google Calendar. This action cannot be undone.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between bg-gray-50 -mx-6 -mb-6 px-6 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleDeleteClick}
            disabled={isDeleting || showDeleteConfirm}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Meeting
          </Button>
          <Button
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="px-6"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingDetailModal;

