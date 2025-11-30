import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Plus, Edit3, Trash2, Save, X, Users, MapPin, 
  Video, ExternalLink, Check, AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { motion as _motion, AnimatePresence } from 'framer-motion';
import UnifiedHeader from '../ui/header/UnifiedHeader';

const CalendarEditor = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [_selectedEvent, _setSelectedEvent] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    start: '',
    end: '',
    location: '',
    attendees: []
  });
  const [viewMode, setViewMode] = useState('week'); // week, month, day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [currentDate, viewMode]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate();
      const endDate = getEndDate();
      
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_API_URL}/api/calendar/events?start_date=${startDate}&end_date=${endDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        showNotification('Failed to load events', 'error');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      showNotification('Error loading events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().split('T')[0];
      }
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      default:
        return date.toISOString().split('T')[0];
    }
  };

  const getEndDate = () => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'day': {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        return nextDay.toISOString().split('T')[0];
      }
      case 'week': {
        const endOfWeek = new Date(date);
        endOfWeek.setDate(date.getDate() - date.getDay() + 7);
        return endOfWeek.toISOString().split('T')[0];
      }
      case 'month':
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      default: {
        const nextDay2 = new Date(date);
        nextDay2.setDate(date.getDate() + 1);
        return nextDay2.toISOString().split('T')[0];
      }
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateEvent = async () => {
    try {
      const eventData = {
        summary: formData.summary,
        description: formData.description,
        start: {
          dateTime: new Date(formData.start).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: new Date(formData.end).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        location: formData.location,
        attendees: formData.attendees.map(email => ({ email }))
      };

      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        const _result = await response.json();
        showNotification('Event created successfully!');
        setShowEventForm(false);
        resetForm();
        loadEvents();
      } else {
        showNotification('Failed to create event', 'error');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      showNotification('Error creating event', 'error');
    }
  };

  const handleUpdateEvent = async () => {
    try {
      const updateData = {
        summary: formData.summary,
        description: formData.description,
        start: {
          dateTime: new Date(formData.start).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: new Date(formData.end).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        location: formData.location,
        attendees: formData.attendees.map(email => ({ email }))
      };

      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/calendar/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        showNotification('Event updated successfully!');
        setEditingEvent(null);
        setShowEventForm(false);
        resetForm();
        loadEvents();
      } else {
        showNotification('Failed to update event', 'error');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      showNotification('Error updating event', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/calendar/events/${eventId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('Event deleted successfully!');
        _setSelectedEvent(null);
        loadEvents();
      } else {
        showNotification('Failed to delete event', 'error');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      showNotification('Error deleting event', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      summary: '',
      description: '',
      start: '',
      end: '',
      location: '',
      attendees: []
    });
  };

  const openEditForm = (event) => {
    setEditingEvent(event);
    setFormData({
      summary: event.summary || '',
      description: event.description || '',
      start: event.start?.dateTime ? new Date(event.start.dateTime).toISOString().slice(0, 16) : '',
      end: event.end?.dateTime ? new Date(event.end.dateTime).toISOString().slice(0, 16) : '',
      location: event.location || '',
      attendees: event.attendees?.map(a => a.email) || []
    });
    setShowEventForm(true);
  };

  const openCreateForm = () => {
    setEditingEvent(null);
    resetForm();
    // Set default start time to next hour
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const endTime = new Date(now);
    endTime.setHours(endTime.getHours() + 1);
    
    setFormData({
      ...formData,
      start: now.toISOString().slice(0, 16),
      end: endTime.toISOString().slice(0, 16)
    });
    setShowEventForm(true);
  };

  const formatEventTime = (event) => {
    if (!event.start?.dateTime) return 'All day';
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end?.dateTime);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <_motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
              notification.type === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
              <span>{notification.message}</span>
            </div>
          </_motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <UnifiedHeader
        title="Calendar Editor"
        description="Manage your calendar events and schedule meetings"
        icon={Calendar}
        themeColor="orange"
        actions={[
          {
            label: "New Event",
            icon: Plus,
            onClick: openCreateForm,
            className: "bg-blue-600 hover:bg-blue-700 text-white"
          }
        ]}
      />

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigateDate(-1)}
                variant="outline"
                size="sm"
              >
                ←
              </Button>
              <h2 className="text-lg font-semibold">
                {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric',
                  ...(viewMode === 'day' && { day: 'numeric' })
                })}
              </h2>
              <Button
                onClick={() => navigateDate(1)}
                variant="outline"
                size="sm"
              >
                →
              </Button>
            </div>
            
            <div className="flex space-x-2">
              {['day', 'week', 'month'].map((mode) => (
                <Button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  variant={viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  className={`capitalize ${
                    viewMode === mode 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : ''
                  }`}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events found for this period
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <_motion.div
                  key={event.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{event.summary || 'Untitled Event'}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatEventTime(event)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{event.attendees.length} attendees</span>
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        onClick={() => openEditForm(event)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteEvent(event.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </_motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Form Modal */}
      <AnimatePresence>
        {showEventForm && (
          <_motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowEventForm(false)}
          >
            <_motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h3>
                <Button
                  onClick={() => setShowEventForm(false)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Event description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start}
                      onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end}
                      onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Meeting location or video link"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!formData.summary || !formData.start || !formData.end}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingEvent ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    onClick={() => setShowEventForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </_motion.div>
          </_motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarEditor; 