import React, { useState, useEffect } from 'react';
import MeetingForm from '../forms/MeetingForm';
import GoogleCalendarView from '../calendar/GoogleCalendarView';

const MeetingScheduler = ({ customer, onMeetingCreated, authFetch }) => {
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [events, setEvents] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Get Google access token from localStorage
    // Try both keys for compatibility
    const token = localStorage.getItem('google_calendar_access_token') ||
                  localStorage.getItem('google_access_token');
    setGoogleAccessToken(token);
  }, []);

  const handleMeetingCreated = async (meeting) => {
    // Trigger calendar refresh
    setRefreshTrigger(prev => prev + 1);

    // Call parent callback
    if (onMeetingCreated) {
      await onMeetingCreated(meeting);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  return (
    <div className="flex h-full gap-4 bg-gray-50">
      {/* Left Side: Meeting Form (30%) */}
      <div className="w-[30%] bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
        <MeetingForm
          customer={customer}
          onMeetingCreated={handleMeetingCreated}
          authFetch={authFetch}
          googleAccessToken={googleAccessToken}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
        />
      </div>

      {/* Right Side: Google Calendar View (70%) */}
      <div className="w-[70%] bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
        <GoogleCalendarView
          customer={customer}
          authFetch={authFetch}
          googleAccessToken={googleAccessToken}
          onDateSelect={handleDateSelect}
          onTimeSlotSelect={handleTimeSlotSelect}
          refreshTrigger={refreshTrigger}
          events={events}
          setEvents={setEvents}
        />
      </div>
    </div>
  );
};

export default MeetingScheduler;
