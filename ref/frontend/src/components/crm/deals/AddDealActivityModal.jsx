import React, { useState, useEffect } from 'react';
import {
  Calendar,
  FileText,
  PhoneCall,
  Star,
  Check,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/primitives/dialog';
import GoogleCalendarView from '../calendar/GoogleCalendarView';

const AddDealActivityModal = ({
  open,          // New prop name (preferred)
  isOpen,        // Legacy prop name
  onOpenChange,  // New callback (preferred)
  onClose,       // Legacy callback
  deal,
  onActivityAdded,
  authFetch,
  initialActivityType = 'note'
}) => {
  const MAX_TITLE_LENGTH = 200;
  const MAX_NOTE_LENGTH = 2000;
  const MAX_CALL_SUMMARY_LENGTH = 5000;
  const MAX_THEME_LENGTH = 50;
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

  // Meeting State - Separate date and time fields (matching CRM implementation)
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingStartTime, setMeetingStartTime] = useState('');
  const [meetingEndTime, setMeetingEndTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');

  // Calendar state for GoogleCalendarView
  const [allCalendarEvents, setAllCalendarEvents] = useState([]);
  const [filteredCalendarEvents, setFilteredCalendarEvents] = useState([]);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  // Get Google access token on mount
  useEffect(() => {
    const token = localStorage.getItem('google_calendar_access_token') ||
                  localStorage.getItem('google_access_token');
    setGoogleAccessToken(token);
  }, []);

  // Filter calendar events by client_id when allCalendarEvents or deal changes
  useEffect(() => {
    if (deal && allCalendarEvents.length > 0) {
      const filtered = allCalendarEvents.filter(event =>
        event.customer_id === deal.client_id
      );
      console.log(`[Add Activity Calendar] Filtered ${filtered.length} meetings for client ${deal.client_id}`);
      setFilteredCalendarEvents(filtered);
    } else {
      setFilteredCalendarEvents([]);
    }
  }, [allCalendarEvents, deal]);

  // Reset form when modal opens/closes or activity type changes
  useEffect(() => {
    if (!modalOpen) {
      setNoteTitle('');
      setNoteBody('');
      setNoteStar(false);
      setCallSummary('');
      setCallTheme('');
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingDate('');
      setMeetingStartTime('');
      setMeetingEndTime('');
      setMeetingLocation('');
      setError('');
      setSuccess('');
    } else {
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

  const handleSubmitNote = async () => {
    if (!noteBody.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/deals/${deal.deal_id}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteTitle.trim(),
            body: noteBody.trim(),
            star: noteStar ? 'important' : null
          })
        }
      );

      if (response.ok) {
        setSuccess('Note added successfully!');
        setTimeout(() => {
          handleOpenChange(false);
          if (onActivityAdded) onActivityAdded();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to add note');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCallSummary = async () => {
    if (!callSummary.trim()) {
      setError('Call summary cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/deals/${deal.deal_id}/call-summaries`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: callSummary.trim(),
            theme: callTheme.trim() || null
          })
        }
      );

      if (response.ok) {
        setSuccess('Call summary added successfully!');
        setTimeout(() => {
          handleOpenChange(false);
          if (onActivityAdded) onActivityAdded();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to add call summary');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate || !meetingStartTime || !meetingEndTime) {
      setError('Please fill in all required meeting fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Combine date and time and convert to ISO format in EST timezone
      const startDateTime = `${meetingDate}T${meetingStartTime}:00`;
      const endDateTime = `${meetingDate}T${meetingEndTime}:00`;

      // Convert EST datetime to ISO string
      const convertEstToIso = (estDateTimeLocal) => {
        const estDateString = estDateTimeLocal.replace('T', ' ') + ' EST';
        return new Date(estDateString).toISOString();
      };

      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/deals/${deal.deal_id}/meetings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: meetingTitle.trim(),
            description: meetingDescription.trim() || null,
            start_time: convertEstToIso(startDateTime),
            end_time: convertEstToIso(endDateTime),
            location: meetingLocation.trim() || null,
            attendees: [],
            timezone: 'America/New_York' // Always use EST timezone
          })
        }
      );

      if (response.ok) {
        setSuccess('Meeting added successfully!');
        setTimeout(() => {
          handleOpenChange(false);
          if (onActivityAdded) onActivityAdded();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to add meeting');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (activityType === 'note') {
      handleSubmitNote();
    } else if (activityType === 'callSummary') {
      handleSubmitCallSummary();
    } else if (activityType === 'meeting') {
      handleSubmitMeeting();
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
        className="max-w-full w-full h-[90vh] flex flex-col p-0"
        onClose={() => handleOpenChange(false)}
      >
        {/* Header */}
        <DialogHeader className="pt-5 pb-3 px-6 border-b border-gray-200 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-gray-900">Add Activity</DialogTitle>
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
                        ? 'border-indigo-600 text-indigo-600'
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
                      <label className="block text-sm font-medium text-gray-700">
                        Note Title <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Enter note title..."
                          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                      <label className="block text-sm font-medium text-gray-700">
                        Note Content <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={noteBody}
                          onChange={(e) => setNoteBody(e.target.value)}
                          placeholder="Add your note..."
                          className="w-full h-48 px-4 py-3 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          maxLength={MAX_NOTE_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {noteBody.length}/{MAX_NOTE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Star Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteStar(!noteStar)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          noteStar
                            ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                        disabled={isSubmitting}
                      >
                        <Star className={`w-4 h-4 ${noteStar ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        {noteStar ? 'Important' : 'Mark as Important'}
                      </button>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        onClick={() => handleOpenChange(false)}
                        variant="outline"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitNote}
                        disabled={isSubmitting || !noteBody.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Save Note
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Call Summary Form */}
              {activityType === 'callSummary' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    {/* Theme Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Call Theme <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={callTheme}
                          onChange={(e) => setCallTheme(e.target.value)}
                          placeholder="e.g., Product Demo, Follow-up, Negotiation..."
                          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          maxLength={MAX_THEME_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {callTheme.length}/{MAX_THEME_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Call Summary */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Call Summary <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={callSummary}
                          onChange={(e) => setCallSummary(e.target.value)}
                          placeholder="Summarize the call discussion, key points, and outcomes..."
                          className="w-full h-64 px-4 py-3 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          maxLength={MAX_CALL_SUMMARY_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {callSummary.length}/{MAX_CALL_SUMMARY_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        onClick={() => handleOpenChange(false)}
                        variant="outline"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitCallSummary}
                        disabled={isSubmitting || !callSummary.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Save Call Summary
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Meeting Form */}
              {activityType === 'meeting' && (
                <div className="flex h-full gap-4 bg-gray-50">
                  {/* Left Side: Meeting Form (30%) */}
                  <div className="w-[30%] bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
                    <div className="space-y-4">
                      {/* Meeting Title */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Meeting Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          placeholder="Enter meeting title..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          disabled={isSubmitting}
                        />
                      </div>

                    {/* Meeting Description */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description <span className="text-gray-400">(Optional)</span>
                      </label>
                      <textarea
                        value={meetingDescription}
                        onChange={(e) => setMeetingDescription(e.target.value)}
                        placeholder="Add meeting description..."
                        className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type="time"
                            value={meetingStartTime}
                            onChange={(e) => setMeetingStartTime(e.target.value)}
                            placeholder="HH:MM"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isSubmitting}
                            title="Enter time in HH:MM format or use picker"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          End Time <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type="time"
                            value={meetingEndTime}
                            onChange={(e) => setMeetingEndTime(e.target.value)}
                            placeholder="HH:MM"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isSubmitting}
                            title="Enter time in HH:MM format or use picker"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Location <span className="text-gray-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={meetingLocation}
                        onChange={(e) => setMeetingLocation(e.target.value)}
                        placeholder="e.g., Conference Room A, Zoom, Google Meet..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        onClick={() => handleOpenChange(false)}
                        variant="outline"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitMeeting}
                        disabled={isSubmitting || !meetingTitle.trim() || !meetingDate || !meetingStartTime || !meetingEndTime}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Schedule Meeting
                          </>
                        )}
                      </Button>
                    </div>
                    </div>
                  </div>

                  {/* Right Side: Google Calendar View (70%) */}
                  <div className="w-[70%] bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Meeting Calendar
                      {deal && (
                        <span className="text-xs text-gray-500 font-normal">
                          ({filteredCalendarEvents.length} {filteredCalendarEvents.length === 1 ? 'meeting' : 'meetings'})
                        </span>
                      )}
                    </h3>
                    <div className="flex-1 overflow-hidden">
                      <GoogleCalendarView
                        customer={deal ? {
                          customer_id: deal.client_id,
                          name: deal.client_name,
                          email: deal.client_email
                        } : null}
                        authFetch={authFetch}
                        googleAccessToken={googleAccessToken}
                        onDateSelect={(date) => {
                          // Auto-fill date when calendar date is selected
                          if (date) {
                            setMeetingDate(date); // date is already in YYYY-MM-DD format
                          }
                        }}
                        onTimeSlotSelect={(timeSlot) => {
                          // Auto-fill start and end time when time slot is selected
                          if (timeSlot?.start && timeSlot?.end) {
                            setMeetingStartTime(timeSlot.start); // Already in HH:MM format
                            setMeetingEndTime(timeSlot.end); // Already in HH:MM format
                          }
                        }}
                        refreshTrigger={calendarRefreshTrigger}
                        events={filteredCalendarEvents}
                        setEvents={setAllCalendarEvents}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddDealActivityModal;

