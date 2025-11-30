import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Link as LinkIcon,
  FileText,
  Loader2,
  Edit3,
  Check,
  Trash2
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import { getMeetingById, updateMeeting } from '../../../services/meetingApi';

const CRMMeetingDetailsModal = ({ isOpen, onClose, meetingId, authFetch, meeting, onUpdate, onDelete, googleAccessToken }) => {
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    attendees: [],
    timezone: ''
  });

  const fetchMeetingDetails = useCallback(async () => {
    if (!meetingId || !authFetch) {
      setError('Missing meeting ID or authentication');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching CRM meeting details for interaction ID:', meetingId);
      const data = await getMeetingById(meetingId, authFetch);

      console.log('✅ Meeting data received:', data);
      setMeetingDetails(data);
    } catch (err) {
      console.error('❌ Error fetching meeting details:', err);
      setError(err.message || 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  }, [meetingId, authFetch]);

  useEffect(() => {
    if (isOpen) {
      // If meeting data is already provided, use it immediately
      if (meeting) {
        console.log('✅ Using pre-loaded meeting data:', meeting);
        setMeetingDetails(meeting);
        setLoading(false);
        setError(null);
        initializeFormData(meeting);
      } else if (meetingId) {
        // Otherwise, fetch from API
        fetchMeetingDetails();
      }
    } else {
      // Reset state when modal closes
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setError(null);
    }
  }, [isOpen, meetingId, meeting, fetchMeetingDetails]);

  // Initialize form data when meeting details are loaded
  const initializeFormData = (details) => {
    if (!details) return;

    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:MM) in EST timezone
    const formatForInput = (isoString) => {
      if (!isoString) return '';
      try {
        const date = new Date(isoString);
        // Convert to EST timezone string
        const estString = date.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        // Parse the EST string (format: "MM/DD/YYYY, HH:MM")
        const [datePart, timePart] = estString.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch {
        return '';
      }
    };

    setFormData({
      title: details.title || '',
      description: details.description || '',
      start_time: formatForInput(details.start_time),
      end_time: formatForInput(details.end_time),
      location: details.location || '',
      attendees: Array.isArray(details.attendees) ? details.attendees : [],
      timezone: 'America/New_York' // Always use EST timezone
    });
  };

  // Update form data initialization when meeting details change
  useEffect(() => {
    if (meetingDetails) {
      initializeFormData(meetingDetails);
    }
  }, [meetingDetails]);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not specified';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      });
    } catch {
      return dateTimeString;
    }
  };

  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return 'Not specified';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York'
      });
    } catch {
      return dateTimeString;
    }
  };

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not specified';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      });
    } catch {
      return dateTimeString;
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'Unknown';
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end - start;
      const durationMinutes = Math.floor(durationMs / 60000);

      if (durationMinutes < 60) {
        return `${durationMinutes} minutes`;
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
      }
    } catch {
      return 'Unknown';
    }
  };

  // Handle edit mode toggle
  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    // Reset form data to original values
    initializeFormData(meetingDetails);
  };

  // Handle form field changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAttendeesChange = (value) => {
    // Split by comma and trim whitespace
    const attendeesList = value.split(',').map(email => email.trim()).filter(email => email);
    setFormData(prev => ({
      ...prev,
      attendees: attendeesList
    }));
  };

  // Handle save meeting
  const handleSaveMeeting = async () => {
    if (!formData.title.trim()) {
      setError('Meeting title is required');
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      setError('Start time and end time are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

      // Convert datetime-local format (in EST) to ISO string
      // The datetime-local input gives us a string like "2024-11-07T14:30"
      // We need to interpret this as EST time and convert to UTC ISO string
      const convertEstToIso = (estDateTimeLocal) => {
        // Parse the datetime-local string and append EST timezone indicator
        const estDateString = estDateTimeLocal.replace('T', ' ') + ' EST';
        return new Date(estDateString).toISOString();
      };

      const meetingData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_time: convertEstToIso(formData.start_time),
        end_time: convertEstToIso(formData.end_time),
        location: formData.location.trim(),
        attendees: formData.attendees,
        timezone: formData.timezone
      };

      // Use auto-refresh method - backend will use stored tokens
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/meetings/${meetingId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meetingData)
        }
      );

      if (response.ok) {
        const updatedMeeting = await response.json();
        setMeetingDetails(updatedMeeting);
        setIsEditing(false);

        // Notify parent component
        if (onUpdate) {
          onUpdate(updatedMeeting);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update meeting');
      }
    } catch (err) {
      console.error('Error updating meeting:', err);
      setError(err.message || 'Failed to update meeting');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete meeting
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/meetings/${meetingId}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok) {
        // Notify parent component
        if (onDelete) {
          onDelete();
        }
        onClose();
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.detail || 'Failed to delete meeting';

        if (errorMsg.includes('No valid Google access token') || errorMsg.includes('reconnect')) {
          setError('Please reconnect Google Calendar. Go to Calendar page and sign in again.');
        } else if (errorMsg.includes('permission') || errorMsg.includes('ownership')) {
          setError('You do not have permission to delete this meeting.');
        } else {
          setError(`Failed to delete meeting: ${errorMsg}`);
        }
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError(`Error deleting meeting: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {loading ? 'Loading...' : meetingDetails?.title || 'Meeting Details'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {isEditing ? 'Edit Meeting' : 'Meeting Details'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && !loading && meetingDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditClick}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isSaving || isDeleting}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Loading meeting details...</span>
                </div>
              ) : error ? (
                <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : null}

              {!loading && meetingDetails && isEditing ? (
                /* Edit Mode */
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meeting Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter meeting title"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Start and End Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => handleFormChange('start_time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => handleFormChange('end_time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleFormChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter location or meeting link"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Attendees */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attendees (comma-separated emails)
                    </label>
                    <input
                      type="text"
                      value={formData.attendees.join(', ')}
                      onChange={(e) => handleAttendeesChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="email1@example.com, email2@example.com"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter meeting description"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveMeeting}
                      disabled={isSaving || !formData.title.trim() || !formData.start_time || !formData.end_time}
                      className="bg-pink-600 hover:bg-pink-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : !loading && meetingDetails ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* Meeting Title */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{meetingDetails.title}</h3>
                  </div>

                  {/* Meeting Information Grid */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Meeting Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Date */}
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="text-base text-gray-900 mt-1">{formatDate(meetingDetails.start_time)}</p>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-green-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Time</p>
                          <p className="text-base text-gray-900 mt-1">
                            {formatTime(meetingDetails.start_time)} - {formatTime(meetingDetails.end_time)}
                          </p>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-orange-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Duration</p>
                          <p className="text-base text-gray-900 mt-1">
                            {calculateDuration(meetingDetails.start_time, meetingDetails.end_time)}
                          </p>
                        </div>
                      </div>

                      {/* Timezone */}
                      {meetingDetails.timezone && (
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-purple-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Timezone</p>
                            <p className="text-base text-gray-900 mt-1">{meetingDetails.timezone}</p>
                          </div>
                        </div>
                      )}

                      {/* Location */}
                      {meetingDetails.location && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-red-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Location</p>
                            <p className="text-base text-gray-900 mt-1">{meetingDetails.location}</p>
                          </div>
                        </div>
                      )}

                      {/* Meeting Link */}
                      {meetingDetails.meeting_link && (
                        <div className="flex items-start gap-3">
                          <LinkIcon className="w-5 h-5 text-indigo-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Meeting Link</p>
                            <a
                              href={meetingDetails.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base text-blue-600 hover:text-blue-800 underline mt-1 break-all"
                            >
                              Join Meeting
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {meetingDetails.description && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Description
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {meetingDetails.description}
                      </p>
                    </div>
                  )}

                  {/* Attendees */}
                  {meetingDetails.attendees && meetingDetails.attendees.length > 0 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Attendees ({meetingDetails.attendees.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {meetingDetails.attendees.map((attendee, index) => (
                          <div key={index} className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{attendee}</span>
                          </div>
                        ))}
                      </div>
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
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
              ) : null}
            </div>

            {/* Footer Actions */}
            {!loading && meetingDetails && !isEditing && (
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
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
                  onClick={onClose}
                  disabled={isDeleting}
                  className="px-6"
                >
                  Close
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CRMMeetingDetailsModal;
