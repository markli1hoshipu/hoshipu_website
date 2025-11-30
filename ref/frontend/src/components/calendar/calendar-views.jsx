import React, { useMemo, memo } from 'react';
import { 
  Calendar, Clock, ExternalLink, Eye, Brain, Target, TrendingUp, 
  CheckCircle, Sparkles, Activity, Heart, Building, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { renderClickableContent, formatEventTime, formatEventDate } from './calendar-helpers.jsx';
import { motion as _motion } from 'framer-motion';

// Memoized Event Card Component
const EventCard = memo(({ event, index, setSelectedEvent }) => {
  const handleQuickAction = (e, type, link) => {
    e.stopPropagation();
    if (link) window.open(link, '_blank');
  };

  const meetingLinks = useMemo(() => {
    const locationAndDescription = (event.location || '') + ' ' + (event.description || '');
    return {
      zoom: locationAndDescription.match(/https?:\/\/[^\s]*zoom\.us[^\s]*/i)?.[0],
      meet: locationAndDescription.match(/https?:\/\/[^\s]*meet\.google\.com[^\s]*/i)?.[0],
      teams: locationAndDescription.match(/https?:\/\/[^\s]*teams\.microsoft\.com[^\s]*/i)?.[0]
    };
  }, [event.location, event.description]);

  return (
    <_motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <Card 
        className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedEvent(event)}
      >
        <CardContent className="p-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1 min-w-0">
              <h4 className="font-inter font-medium text-prelude-900 text-sm truncate">
                {event.summary || 'Untitled Event'}
              </h4>
              <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span className="font-inter">
                  {formatEventDate(event)} • {formatEventTime(event)}
                </span>
              </div>
              {event.location && (
                <div className="text-xs text-gray-500 font-inter mt-1">
                  📍 {renderClickableContent(event.location)}
                </div>
              )}
              {event.description && (
                <div className="text-xs text-gray-500 font-inter mt-1 line-clamp-2">
                  {renderClickableContent(event.description)}
                </div>
              )}
              
              {/* Quick action buttons */}
              <div className="flex space-x-2 mt-2">
                {meetingLinks.zoom && (
                  <button
                    onClick={(e) => handleQuickAction(e, 'zoom', meetingLinks.zoom)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors inline-flex items-center"
                  >
                    🎥 Join Zoom
                  </button>
                )}
                {meetingLinks.meet && (
                  <button
                    onClick={(e) => handleQuickAction(e, 'meet', meetingLinks.meet)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors inline-flex items-center"
                  >
                    📹 Join Meet
                  </button>
                )}
                {meetingLinks.teams && (
                  <button
                    onClick={(e) => handleQuickAction(e, 'teams', meetingLinks.teams)}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors inline-flex items-center"
                  >
                    💼 Join Teams
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </_motion.div>
  );
});

EventCard.displayName = 'EventCard';

// Memoized Calendar Day Component
const CalendarDay = memo(({ 
  date, 
  events, 
  isToday, 
  isCurrentMonth, 
  setSelectedEvent,
  isWeekView = false,
  dayNumber
}) => {
  const dayClasses = `
    p-2 ${isWeekView ? 'h-32' : 'h-20'} border border-gray-200 rounded cursor-pointer 
    hover:bg-gray-50 transition-colors
    ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}
    ${!isCurrentMonth && !isWeekView ? 'opacity-60' : ''}
  `;

  const meetingIcons = (event) => {
    const icons = [];
    const locationAndDesc = (event.location || '') + ' ' + (event.description || '');
    if (locationAndDesc.includes('zoom.us')) icons.push('🎥');
    if (locationAndDesc.includes('meet.google.com')) icons.push('📹');
    if (locationAndDesc.includes('teams.microsoft.com')) icons.push('💼');
    return icons;
  };

  return (
    <_motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: (dayNumber || 0) * 0.01, duration: 0.2 }}
      className={dayClasses}
    >
      <div className={`text-xs font-medium mb-${isWeekView ? '2' : '1'} ${isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-500'}`}>
        {isWeekView ? (
          <>
            {date.getDate()}
            <span className="text-xs ml-1 font-normal">
              {date.toLocaleDateString('en-US', { month: 'short' })}
            </span>
          </>
        ) : (
          dayNumber || date.getDate()
        )}
      </div>
      <div className={`space-y-1 ${isWeekView ? 'overflow-y-auto max-h-20' : ''}`}>
        {events.slice(0, isWeekView ? 4 : 2).map((event, idx) => (
          <div
            key={idx}
            className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200 transition-colors relative"
            title={`${event.summary} - ${formatEventTime(event)}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvent(event);
            }}
          >
            <div className="flex items-center justify-between">
              <span className="truncate flex-1">{event.summary || 'Event'}</span>
              <div className="flex space-x-0.5 ml-1">
                {meetingIcons(event).map((icon, i) => (
                  <span key={i} className="text-xs">{icon}</span>
                ))}
              </div>
            </div>
            {isWeekView && event.start?.dateTime && (
              <div className="text-xs text-blue-600 mt-0.5">
                {new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        ))}
        {events.length > (isWeekView ? 4 : 2) && (
          <div 
            className="text-xs text-gray-500 cursor-pointer hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              if (events[isWeekView ? 4 : 2]) setSelectedEvent(events[isWeekView ? 4 : 2]);
            }}
          >
            +{events.length - (isWeekView ? 4 : 2)} more
          </div>
        )}
      </div>
    </_motion.div>
  );
});

CalendarDay.displayName = 'CalendarDay';

const CalendarViews = ({ 
  viewMode, 
  events, 
  loading,
  setSelectedEvent,
  calendarViewMode,
  currentDate,
  getWeekDates,
  getWeekEvents,
  getEventsForDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  getMonthEvents,
  getEventsForDay,
  analytics,
  dashboardStats
}) => {
  // Memoize events processing to avoid recalculation
  const processedEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];
    return events.sort((a, b) => {
      const dateA = new Date(a.start?.dateTime || a.start?.date);
      const dateB = new Date(b.start?.dateTime || b.start?.date);
      return dateA - dateB;
    });
  }, [events]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <_motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-6 w-6 border-b-2 border-prelude-800 mx-auto mb-2"
        />
        <p className="text-sm text-gray-600 font-inter">Loading events...</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return <ListView events={processedEvents} setSelectedEvent={setSelectedEvent} />;
  }

  if (viewMode === 'calendar') {
    return (
      <CalendarGridView 
        events={processedEvents}
        calendarViewMode={calendarViewMode}
        currentDate={currentDate}
        setSelectedEvent={setSelectedEvent}
        getWeekDates={getWeekDates}
        getWeekEvents={getWeekEvents}
        getEventsForDate={getEventsForDate}
        getDaysInMonth={getDaysInMonth}
        getFirstDayOfMonth={getFirstDayOfMonth}
        getMonthEvents={getMonthEvents}
        getEventsForDay={getEventsForDay}
      />
    );
  }

  if (viewMode === 'intelligence') {
    return (
      <IntelligenceView 
        events={processedEvents}
        setSelectedEvent={setSelectedEvent}
        analytics={analytics}
        dashboardStats={dashboardStats}
      />
    );
  }

  return null;
};

// List View Component
const ListView = memo(({ events, setSelectedEvent }) => (
  <div className="space-y-3">
    {events.length > 0 ? (
      events.map((event, index) => (
        <EventCard 
          key={event.id || index}
          event={event}
          index={index}
          setSelectedEvent={setSelectedEvent}
        />
      ))
    ) : (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600 font-inter">
          No upcoming events in your calendar
        </p>
      </div>
    )}
  </div>
));

ListView.displayName = 'ListView';

// Calendar Grid View Component
const CalendarGridView = memo(({ 
  events, 
  calendarViewMode, 
  currentDate, 
  setSelectedEvent,
  getWeekDates,
  getWeekEvents,
  getEventsForDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  getMonthEvents,
  getEventsForDay
}) => {
  const dayHeaders = useMemo(() => 
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    []
  );

  const renderCalendarDays = useMemo(() => {
    try {
      if (calendarViewMode === 'week') {
        const weekDates = getWeekDates(currentDate);
        const weekEvents = getWeekEvents(events, currentDate);
        
        return weekDates.map((date, index) => {
          const dayEvents = getEventsForDate(weekEvents, date);
          const isToday = new Date().toDateString() === date.toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          
          return (
            <CalendarDay
              key={`week-${index}`}
              date={date}
              events={dayEvents}
              isToday={isToday}
              isCurrentMonth={isCurrentMonth}
              setSelectedEvent={setSelectedEvent}
              isWeekView={true}
              dayNumber={index}
            />
          );
        });
      } else {
        // Month View
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const monthEvents = getMonthEvents(events, currentDate);
        const days = [];
        
        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
          days.push(
            <div key={`empty-${i}`} className="p-2 h-20 bg-gray-50 rounded"></div>
          );
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const dayEvents = getEventsForDay(monthEvents, day, currentDate);
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
          
          days.push(
            <CalendarDay
              key={`day-${day}`}
              date={new Date(currentDate.getFullYear(), currentDate.getMonth(), day)}
              events={dayEvents}
              isToday={isToday}
              isCurrentMonth={true}
              setSelectedEvent={setSelectedEvent}
              isWeekView={false}
              dayNumber={day}
            />
          );
        }
        
        return days;
      }
    } catch (error) {
      console.error('Error rendering calendar days:', error);
      return null;
    }
  }, [calendarViewMode, currentDate, events, getWeekDates, getWeekEvents, getEventsForDate, getDaysInMonth, getFirstDayOfMonth, getMonthEvents, getEventsForDay, setSelectedEvent]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {dayHeaders.map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 rounded">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {renderCalendarDays}
      </div>
    </div>
  );
});

CalendarGridView.displayName = 'CalendarGridView';

// Intelligence View Component
const IntelligenceView = memo(({ events, setSelectedEvent, analytics, dashboardStats }) => (
  <div className="space-y-6">
    {/* Main Analytics Dashboard */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Meeting Intelligence Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-600">{events.length}</p>
            <p className="text-sm text-gray-600">Total Meetings</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-600">{dashboardStats?.avgHealthScore || 87}%</p>
            <p className="text-sm text-gray-600">Success Rate</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded">
            <p className="text-2xl font-bold text-purple-600">42m</p>
            <p className="text-sm text-gray-600">Avg Duration</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-600">2</p>
            <p className="text-sm text-gray-600">High Risk</p>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Event List with Intelligence Indicators */}
    {events.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select a Meeting for Detailed Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <div>
                  <h4 className="font-medium text-sm">{event.summary || 'Untitled Event'}</h4>
                  <p className="text-xs text-gray-600">
                    {formatEventDate(event)} • {formatEventTime(event)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    <Target className="w-3 h-3" />
                    {Math.floor(Math.random() * 30) + 70}%
                  </div>
                  <Brain className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
));

IntelligenceView.displayName = 'IntelligenceView';

export default memo(CalendarViews);