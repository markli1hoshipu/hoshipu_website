import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, FileText, RefreshCw, Plus } from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Textarea } from '../../ui/primitives/textarea';
import { Label } from '../../ui/primitives/label';

const MeetingForm = ({
  customer,
  onMeetingCreated,
  authFetch,
  googleAccessToken,
  selectedDate,
  selectedTimeSlot
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [location, setLocation] = useState('Google Meet');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Always use EST timezone
  const userTimezone = 'America/New_York';

  // Pre-fill customer email as attendee
  useEffect(() => {
    if (customer?.email && !attendees.includes(customer.email)) {
      setAttendees([customer.email]);
    }
  }, [customer]);

  // Auto-fill date/time when user clicks on calendar
  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTimeSlot) {
      setStartTime(selectedTimeSlot.start);
      setEndTime(selectedTimeSlot.end);
    }
  }, [selectedTimeSlot]);

  const handleAddAttendee = (e) => {
    e.preventDefault();
    const email = attendeeInput.trim();

    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!attendees.includes(email)) {
      setAttendees([...attendees, email]);
      setAttendeeInput('');
      setError('');
    }
  };

  const handleRemoveAttendee = (emailToRemove) => {
    setAttendees(attendees.filter(email => email !== emailToRemove));
  };

  const validateForm = () => {
    if (!title.trim()) return 'Meeting title is required';
    if (!date) return 'Meeting date is required';
    if (!startTime) return 'Start time is required';
    if (!endTime) return 'End time is required';

    // Validate end time is after start time
    if (endTime <= startTime) {
      return 'End time must be after start time';
    }

    if (attendees.length === 0) {
      return 'At least one attendee is required';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Combine date and time and convert to ISO format in EST timezone
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;

      // Convert EST datetime to ISO string
      const convertEstToIso = (estDateTimeLocal) => {
        const estDateString = estDateTimeLocal.replace('T', ' ') + ' EST';
        return new Date(estDateString).toISOString();
      };

      const meetingData = {
        title: title.trim(),
        description: description.trim(),
        start_time: convertEstToIso(startDateTime),
        end_time: convertEstToIso(endDateTime),
        attendees: attendees,
        location: location.trim(),
        timezone: userTimezone
      };

      // NEW: Use auto-refresh method - no need to pass token!
      // Backend will use stored tokens with auto-refresh
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/meetings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meetingData)
        }
      );

      if (response.ok) {
        const meeting = await response.json();

        // Reset form
        setTitle('');
        setDescription('');
        setDate('');
        setStartTime('');
        setEndTime('');
        setAttendees([customer.email]);
        setLocation('Google Meet');

        // Clear any errors
        setError('');
        setSuccess('');

        // Callback to parent (parent will show success message)
        if (onMeetingCreated) {
          await onMeetingCreated(meeting);
        }
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.detail || 'Failed to create meeting';

        // Check for specific error types
        if (errorMsg.includes('No valid Google access token') || errorMsg.includes('reconnect')) {
          setError('❌ Please reconnect Google Calendar. Go to Calendar page and sign in again.');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.error('Error creating meeting:', err);
      setError(err.message || 'Error creating meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Meeting</h3>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <Label htmlFor="meeting-title">
            Meeting Title <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quarterly Business Review"
              className="pl-10"
              maxLength={200}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="meeting-date">
            Date <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="meeting-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="meeting-start-time">
              Start Time <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="meeting-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="HH:MM"
                className="pl-10"
                disabled={isSubmitting}
                title="Enter time in HH:MM format or use picker"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="meeting-end-time">
              End Time <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="meeting-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="HH:MM"
                className="pl-10"
                disabled={isSubmitting}
                title="Enter time in HH:MM format or use picker"
              />
            </div>
          </div>
        </div>

        {/* Attendees */}
        <div>
          <Label htmlFor="meeting-attendee">
            Attendees <span className="text-red-500">*</span>
          </Label>

          {/* Attendee chips */}
          <div className="flex flex-wrap gap-2 mb-2">
            {attendees.map((email) => (
              <div
                key={email}
                className="flex items-center gap-1 bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs"
              >
                <Users className="h-3 w-3" />
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttendee(email)}
                  className="ml-1 hover:text-pink-900"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add attendee input */}
          <div className="flex gap-2">
            <Input
              id="meeting-attendee"
              type="email"
              value={attendeeInput}
              onChange={(e) => setAttendeeInput(e.target.value)}
              placeholder="Enter email address"
              className="flex-1"
              disabled={isSubmitting}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddAttendee(e);
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAddAttendee}
              variant="outline"
              size="sm"
              disabled={isSubmitting}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="meeting-description">
            Description <span className="text-gray-400">(Optional)</span>
          </Label>
          <Textarea
            id="meeting-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add meeting agenda, notes, or context..."
            className="resize-none"
            rows={4}
            maxLength={2000}
            disabled={isSubmitting}
          />
          <div className="text-xs text-gray-400 text-right mt-1">
            {description.length}/2000
          </div>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="meeting-location">
            Location <span className="text-gray-400">(Optional)</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="meeting-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Google Meet (auto-generated)"
              className="pl-10"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-auto pt-4">
          <Button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating Meeting...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Meeting
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MeetingForm;
