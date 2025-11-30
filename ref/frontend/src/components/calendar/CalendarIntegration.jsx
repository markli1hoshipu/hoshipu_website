import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, Plus, RefreshCw, Settings, CheckCircle, 
  List, Grid3X3, Brain, Download, Mail, Building2
} from 'lucide-react';
import { Button } from '../ui/primitives/button';
import CalendarAuth from './calendar-auth.jsx';
import CalendarViews from './calendar-views.jsx';
import EventDetailModal from './event-detail-modal.jsx';
import { 
  getDaysInMonth, getFirstDayOfMonth, getMonthEvents, getEventsForDay,
  getWeekDates, getWeekEvents, getEventsForDate
} from './calendar-helpers.jsx';
import { useGoogleApi } from '../../hooks/useGoogleApi.js';
import { useAuth } from '../../auth/hooks/useAuth';

const CalendarIntegration = () => {
  const { areScriptsLoaded: googleScriptsLoaded } = useGoogleApi();
  const { user, authProvider, isAuthenticated } = useAuth();
  
  // Provider state - gets calendar provider from app login
  const [selectedProvider, setSelectedProvider] = useState(null); // 'google' or 'outlook'
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  
  // Common state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [outlookEmail, setOutlookEmail] = useState('');
  
  // Token state - now sourced from app login
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [outlookAccessToken, setOutlookAccessToken] = useState(null);
  
  // View state
  const [viewMode, setViewMode] = useState('list');
  const [calendarViewMode, setCalendarViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPredictivePanel, setShowPredictivePanel] = useState(false);

  // API configuration - Google Calendar API still needed for calendar functionality
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const GOOGLE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

  // MSAL initialization removed - using app login tokens

  // Auth state now managed by app login

  // Restore auth states from app login
  useEffect(() => {
    console.log('Calendar: Checking app login tokens', { authProvider, isAuthenticated });
    
    if (isAuthenticated && authProvider) {
      // Use tokens from app login for calendar access
      if (authProvider === 'google') {
        const googleToken = localStorage.getItem('google_access_token');
        const googleEmailStored = localStorage.getItem('google_user_email');
        
        if (googleToken && googleToken !== 'undefined' && googleToken !== 'null') {
          setGoogleAccessToken(googleToken);
          setGoogleEmail(googleEmailStored || user?.email || '');
          setGoogleConnected(true);
          setSelectedProvider('google');
          setUserEmail(googleEmailStored || user?.email || '');
        }
      } else if (authProvider === 'microsoft') {
        const microsoftToken = localStorage.getItem('microsoft_access_token');
        const microsoftEmailStored = localStorage.getItem('microsoft_user_email');
        
        if (microsoftToken && microsoftToken !== 'undefined' && microsoftToken !== 'null') {
          setOutlookAccessToken(microsoftToken);
          setOutlookEmail(microsoftEmailStored || user?.email || '');
          setOutlookConnected(true);
          setSelectedProvider('outlook');
          setUserEmail(microsoftEmailStored || user?.email || '');
        }
      }
    }
    
    setIsInitializing(false);
  }, [authProvider, isAuthenticated, user]);

  // Initialize Google API
  const initializeGoogleApi = useCallback(async () => {
    if (!googleScriptsLoaded) return;
    
    try {
      if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID || 
          GOOGLE_API_KEY === 'YOUR_NEW_API_KEY_HERE' || 
          GOOGLE_CLIENT_ID === 'YOUR_NEW_CLIENT_ID_HERE.apps.googleusercontent.com') {
        throw new Error('Please update your .env file with Google API credentials.');
      }

      await new Promise((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: reject
        });
      });

      await window.gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: [GOOGLE_DISCOVERY_DOC]
      });

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: () => {} // We'll use OAuth2 flow instead
      });
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing Google API:', error);
      setInitError(error.message);
    }
  }, [googleScriptsLoaded, GOOGLE_API_KEY, GOOGLE_CLIENT_ID]);

  useEffect(() => {
    if (googleScriptsLoaded) {
      initializeGoogleApi();
    }
  }, [googleScriptsLoaded, initializeGoogleApi]);

  // Sign-in handlers removed - now handled by app login

  // Auth handlers removed - now using app login tokens

  // Fetch events based on provider
  const fetchEvents = useCallback(async () => {
    if (!selectedProvider) return;
    
    setLoading(true);
    try {
      if (selectedProvider === 'google' && googleAccessToken) {
        // Fetch Google Calendar events
        if (window.gapi?.client?.calendar) {
          window.gapi.client.setToken({ access_token: googleAccessToken });
          
          const response = await window.gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 10,
            orderBy: 'startTime',
          });

          setEvents(response.result.items || []);
        }
      } else if (selectedProvider === 'outlook' && outlookAccessToken) {
        // Fetch Outlook Calendar events
        const response = await fetch('https://graph.microsoft.com/v1.0/me/events?$top=10&$orderby=start/dateTime', {
          headers: {
            'Authorization': `Bearer ${outlookAccessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Transform Outlook events to match Google format
          const transformedEvents = data.value.map(event => ({
            id: event.id,
            summary: event.subject,
            start: { dateTime: event.start.dateTime, timeZone: event.start.timeZone },
            end: { dateTime: event.end.dateTime, timeZone: event.end.timeZone },
            location: event.location?.displayName,
            description: event.bodyPreview
          }));
          setEvents(transformedEvents);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setInitError('Failed to fetch calendar events. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, googleAccessToken, outlookAccessToken]);

  // Fetch events when provider or tokens change
  useEffect(() => {
    if ((selectedProvider === 'google' && googleAccessToken) || 
        (selectedProvider === 'outlook' && outlookAccessToken)) {
      fetchEvents();
    }
  }, [selectedProvider, googleAccessToken, outlookAccessToken, fetchEvents]);

  // Email sync removed - now handled by CRM section

  // Quick event creation
  const createQuickEvent = useCallback(async (eventText) => {
    if (!selectedProvider) return;
    
    try {
      if (selectedProvider === 'google' && googleAccessToken) {
        window.gapi.client.setToken({ access_token: googleAccessToken });
        
        const response = await window.gapi.client.calendar.events.quickAdd({
          calendarId: 'primary',
          text: eventText
        });
        
        fetchEvents();
        return response;
      } else if (selectedProvider === 'outlook' && outlookAccessToken) {
        // For Outlook, we need to parse the text and create a proper event
        // This is a simplified version
        const event = {
          subject: eventText,
          start: {
            dateTime: new Date().toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
            timeZone: 'UTC'
          }
        };
        
        const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${outlookAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });
        
        if (response.ok) {
          fetchEvents();
          return response.json();
        }
      }
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }, [selectedProvider, googleAccessToken, outlookAccessToken, fetchEvents]);

  // Navigation helpers
  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  }, []);

  const navigateWeek = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * 7));
      return newDate;
    });
  }, []);

  // Analytics data (mocked)
  const analytics = useMemo(() => ({
    healthScoreTrend: {
      data: Array.from({ length: 12 }, (_, i) => ({
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        avgScore: Math.max(0, Math.min(100, Math.floor(Math.random() * 20) + 70 + (i * 2))),
        totalCustomers: Math.floor(Math.random() * 50) + 200
      }))
    }
  }), []);

  const dashboardStats = useMemo(() => ({
    avgHealthScore: 85,
    healthScoreTrend: 2.5
  }), []);

  const isSignedIn = googleConnected || outlookConnected;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-prelude-900" />
            <h2 className="text-base font-display font-semibold text-prelude-900">
              Calendar & Email Integration
            </h2>
            {isInitialized && !initError && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Provider selector */}
            {isSignedIn && (googleConnected && outlookConnected) && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                <Button
                  variant={selectedProvider === 'google' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setSelectedProvider('google');
                    setUserEmail(googleEmail);
                  }}
                  className="px-2 py-1.5 h-7"
                  title="Switch to Google"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Google
                </Button>
                <Button
                  variant={selectedProvider === 'outlook' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setSelectedProvider('outlook');
                    setUserEmail(outlookEmail);
                  }}
                  className="px-2 py-1.5 h-7"
                  title="Switch to Outlook"
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Outlook
                </Button>
              </div>
            )}
            
            {isSignedIn && (
              <>
                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="px-2 py-1.5 h-7 min-w-[32px]"
                    title="List View"
                  >
                    <List className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className="px-2 py-1.5 h-7 min-w-[32px]"
                    title="Calendar View"
                  >
                    <Grid3X3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={viewMode === 'intelligence' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('intelligence')}
                    className="px-2 py-1.5 h-7 min-w-[32px]"
                    title="AI Intelligence View"
                  >
                    <Brain className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchEvents()}
                  disabled={loading}
                  className="p-2"
                  title="Refresh Calendar"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                
                {/* Email sync removed - now handled by CRM section */}
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* Settings modal */}}
              className="p-2"
              disabled={isInitializing}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Auth Section */}
        <CalendarAuth 
          isInitializing={isInitializing}
          isInitialized={isInitialized}
          initError={initError}
          authProvider={authProvider}
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          googleConnected={googleConnected}
          outlookConnected={outlookConnected}
          googleEmail={googleEmail}
          outlookEmail={outlookEmail}
          initializeGapi={initializeGoogleApi}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {isSignedIn && !initError && (
          <>
            {/* Header with view-specific title */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-medium text-prelude-900">
                {viewMode === 'list' ? 'Upcoming Events' : 
                 viewMode === 'intelligence' ? 'Meeting Intelligence & Predictions' :
                 calendarViewMode === 'week' ? 
                   `Week of ${getWeekDates(currentDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${getWeekDates(currentDate)[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` :
                   currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }
              </h3>
              <div className="flex items-center space-x-2">
                {viewMode === 'calendar' && (
                  <>
                    {/* Week/Month Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={calendarViewMode === 'week' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalendarViewMode('week')}
                        className="px-2 py-1 h-7 text-xs"
                      >
                        Week
                      </Button>
                      <Button
                        variant={calendarViewMode === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalendarViewMode('month')}
                        className="px-2 py-1 h-7 text-xs"
                      >
                        Month
                      </Button>
                    </div>
                    
                    {/* Navigation */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => calendarViewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
                        className="p-1"
                      >
                        ←
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                        className="px-2 py-1 text-xs"
                      >
                        Today
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => calendarViewMode === 'week' ? navigateWeek(1) : navigateMonth(1)}
                        className="p-1"
                      >
                        →
                      </Button>
                    </div>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const eventText = prompt('Enter event details (e.g., "Meeting tomorrow at 2pm"):');
                    if (eventText) {
                      createQuickEvent(eventText);
                    }
                  }}
                  className="text-xs"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Quick Add
                </Button>
              </div>
            </div>

            {/* Calendar Views */}
            <CalendarViews 
              viewMode={viewMode}
              events={events}
              loading={loading}
              setSelectedEvent={setSelectedEvent}
              calendarViewMode={calendarViewMode}
              currentDate={currentDate}
              getWeekDates={getWeekDates}
              getWeekEvents={getWeekEvents}
              getEventsForDate={getEventsForDate}
              getDaysInMonth={getDaysInMonth}
              getFirstDayOfMonth={getFirstDayOfMonth}
              getMonthEvents={getMonthEvents}
              getEventsForDay={getEventsForDay}
              analytics={analytics}
              dashboardStats={dashboardStats}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      {isSignedIn && !initError && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const eventText = prompt('Enter event details:');
                if (eventText) createQuickEvent(eventText);
              }}
              className="text-xs font-inter"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Event
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedProvider === 'google') {
                  window.open('https://calendar.google.com', '_blank');
                } else if (selectedProvider === 'outlook') {
                  window.open('https://outlook.live.com/calendar', '_blank');
                }
              }}
              className="text-xs font-inter"
            >
              Open Calendar
            </Button>
          </div>
        </div>
      )}
      
      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}

      {/* Floating Intelligence Toggle */}
      {isSignedIn && !initError && viewMode !== 'intelligence' && selectedEvent && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setShowPredictivePanel(!showPredictivePanel)}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg"
            title="Toggle Meeting Intelligence"
          >
            <Brain className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Floating Predictive Panel */}
      {showPredictivePanel && selectedEvent && viewMode !== 'intelligence' && (
        <div className="fixed bottom-20 right-6 z-40 w-80">
          <div className="bg-white rounded-lg shadow-2xl border p-1">
            <div className="flex items-center justify-between p-2 border-b">
              <span className="text-sm font-medium">Meeting Intelligence</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPredictivePanel(false)}
                className="p-1 h-6 w-6"
              >
                ×
              </Button>
            </div>
            <div className="p-2">
              <div className="space-y-2">
                <div className="text-center p-2 bg-green-50 rounded">
                  <p className="text-sm font-bold text-green-600">92% Success</p>
                </div>
                <div className="text-xs text-gray-600">
                  <p>• High engagement expected</p>
                  <p>• 3-4 action items likely</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CalendarIntegration;