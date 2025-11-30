import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import MeetingDetailModal from '../interactions/DeleteMeetingModal';

const GoogleCalendarView = ({
  customer,
  authFetch,
  googleAccessToken,
  onDateSelect,
  onTimeSlotSelect,
  refreshTrigger,
  events,
  setEvents
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [calendarProvider, setCalendarProvider] = useState('google'); // 'google' or 'microsoft'

  // Fetch meetings from CRM
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ALL meetings for the current user (across all customers)
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/meetings`
      );

      if (response.ok) {
        const meetings = await response.json();
        setEvents(meetings);

        // Detect calendar provider from meetings if available
        if (meetings.length > 0 && meetings[0].content) {
          try {
            const content = typeof meetings[0].content === 'string'
              ? JSON.parse(meetings[0].content)
              : meetings[0].content;
            if (content.calendar_provider) {
              setCalendarProvider(content.calendar_provider);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, setEvents, CRM_API_BASE_URL]);

  // Fetch meetings on mount and when refreshTrigger changes
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings, refreshTrigger]);

  // Sync from Google Calendar
  const handleSyncFromGoogle = async () => {
    setSyncing(true);
    try {
      // NEW: Use auto-refresh method - no need to pass token!
      // Backend will use stored tokens with auto-refresh
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/sync-all-google-calendar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }
      );

      if (response.ok) {
        const result = await response.json();
        const providerName = calendarProvider === 'google' ? 'Google Calendar' : 'Outlook Calendar';
        alert(`✅ Synced ${result.new_meetings} new meetings from ${providerName}`);
        fetchMeetings(); // Refresh list
      } else {
        const error = await response.json();
        const errorMsg = error.detail || 'Unknown error';
        const providerName = calendarProvider === 'google' ? 'Google Calendar' : 'Outlook Calendar';

        // Check if user needs to connect calendar
        if (errorMsg.includes('No valid') || errorMsg.includes('reconnect') || errorMsg.includes('No calendar provider')) {
          alert(`❌ Please reconnect ${providerName}. Go to Calendar page and sign in again.`);
        } else {
          alert('Sync failed: ' + errorMsg);
        }
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Calendar navigation
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const handleNavigate = (direction) => {
    if (viewMode === 'month') navigateMonth(direction);
    else if (viewMode === 'week') navigateWeek(direction);
    else navigateDay(direction);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (onDateSelect) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onDateSelect(`${year}-${month}-${day}`);
    }
  };

  // Handle time slot click
  const handleTimeSlotClick = (hour) => {
    if (onTimeSlotSelect) {
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
      onTimeSlotSelect({ start: startTime, end: endTime });
    }
  };

  // Handle event click for deletion
  const handleEventClick = (event, e) => {
    e.stopPropagation(); // Prevent date/time selection
    setSelectedMeeting(event);
    setShowDeleteModal(true);
  };

  // Handle successful deletion
  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedMeeting(null);
    fetchMeetings(); // Refresh calendar
  };

  // Render month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build calendar grid
    const days = [];

    // Previous month days
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-200"></div>);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      // Find events for this day
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start_time).toISOString().split('T')[0];
        return eventDate === dateStr;
      });

      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(date)}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday ? 'bg-pink-50 border-pink-300' : ''
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-pink-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.interaction_id}
                onClick={(e) => handleEventClick(event, e)}
                className="text-xs bg-pink-100 text-pink-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-pink-200 transition-colors"
                title={event.title}
              >
                {new Date(event.start_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })} {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 text-center py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
            {day}
          </div>
        ))}
        {/* Calendar days */}
        {days}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Week header */}
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="bg-gray-100 p-2 text-xs font-medium text-gray-500">Time</div>
          {weekDays.map((day, i) => {
            const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
            return (
              <div
                key={i}
                className={`bg-gray-100 p-2 text-center ${isToday ? 'bg-pink-50' : ''}`}
              >
                <div className={`text-xs font-medium ${isToday ? 'text-pink-600' : 'text-gray-700'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="max-h-96 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="p-2 text-xs text-gray-500 bg-gray-50">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDays.map((day, i) => {
                const dateStr = day.toISOString().split('T')[0];
                const hourEvents = events.filter(event => {
                  const eventDate = new Date(event.start_time);
                  const eventDateStr = eventDate.toISOString().split('T')[0];
                  const eventHour = eventDate.getHours();
                  return eventDateStr === dateStr && eventHour === hour;
                });

                return (
                  <div
                    key={i}
                    onClick={() => {
                      handleDateClick(day);
                      handleTimeSlotClick(hour);
                    }}
                    className="p-1 border-l border-gray-100 min-h-[3rem] cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {hourEvents.map(event => (
                      <div
                        key={event.interaction_id}
                        onClick={(e) => handleEventClick(event, e)}
                        className="text-xs bg-pink-100 text-pink-800 px-1 py-0.5 rounded mb-1 truncate cursor-pointer hover:bg-pink-200 transition-colors"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Day header */}
        <div className="bg-gray-100 p-4 border-b border-gray-200">
          <div className="text-sm text-gray-600">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Time slots */}
        <div className="max-h-[500px] overflow-y-auto">
          {hours.map(hour => {
            const hourEvents = events.filter(event => {
              const eventDate = new Date(event.start_time);
              const eventDateStr = eventDate.toISOString().split('T')[0];
              const eventHour = eventDate.getHours();
              return eventDateStr === dateStr && eventHour === hour;
            });

            return (
              <div
                key={hour}
                onClick={() => handleTimeSlotClick(hour)}
                className="flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-20 p-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 p-2 min-h-[3rem]">
                  {hourEvents.map(event => (
                    <div
                      key={event.interaction_id}
                      onClick={(e) => handleEventClick(event, e)}
                      className="bg-pink-100 text-pink-800 px-3 py-2 rounded mb-2 cursor-pointer hover:bg-pink-200 transition-colors"
                    >
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs mt-1">
                        {new Date(event.start_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })} - {new Date(event.end_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="text-xs mt-1 text-pink-700">
                          {event.attendees.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {viewMode === 'week' && `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
          </div>

          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigate(-1)}
            className="p-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="px-2 text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigate(1)}
            className="p-1"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Sync button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncFromGoogle}
            disabled={syncing}
            className="text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-pink-100 rounded"></div>
          <span>Customer Meetings</span>
        </div>
        <div className="text-gray-500">
          Click on a date or time slot to auto-fill the form • Click on a meeting to view details
        </div>
      </div>

      {/* Meeting Detail Modal */}
      {showDeleteModal && selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedMeeting(null);
          }}
          onDelete={handleDeleteSuccess}
          authFetch={authFetch}
          googleAccessToken={googleAccessToken}
        />
      )}
    </div>
  );
};

export default GoogleCalendarView;
