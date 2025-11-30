import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, Plus, RefreshCw, Settings, CheckCircle, 
  List, Grid3X3, Brain, Download
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

const GoogleCalendar = ({ _wsConnection }) => {
  const { areScriptsLoaded, error: _scriptError } = useGoogleApi();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [accessToken, setAccessToken] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [calendarViewMode, setCalendarViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPredictivePanel, setShowPredictivePanel] = useState(false);
  const [_hasRestoredAuth, _setHasRestoredAuth] = useState(false);

  // Google Calendar API configuration
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly';

  // Auth state persistence helpers
  const saveAuthState = useCallback((token, email, signedIn) => {
    try {
      localStorage.setItem('google_calendar_access_token', token || '');
      localStorage.setItem('google_calendar_user_email', email || '');
      localStorage.setItem('google_calendar_signed_in', signedIn ? 'true' : 'false');
      localStorage.setItem('google_calendar_auth_time', Date.now().toString());
    } catch (error) {
      console.warn('Failed to save auth state to localStorage:', error);
    }
  }, []);

  const clearAuthState = useCallback(() => {
    try {
      localStorage.removeItem('google_calendar_access_token');
      localStorage.removeItem('google_calendar_user_email');
      localStorage.removeItem('google_calendar_signed_in');
      localStorage.removeItem('google_calendar_auth_time');
    } catch (error) {
      console.warn('Failed to clear auth state from localStorage:', error);
    }
  }, []);

  const checkAuthExpiry = useCallback(() => {
    try {
      const authTime = localStorage.getItem('google_calendar_auth_time');
      if (!authTime) return false;
      
      const elapsed = (Date.now() - parseInt(authTime)) / 1000;
      return elapsed < 3000; // Less than 50 minutes
    } catch {
      return false;
    }
  }, []);

  // Restore auth state from localStorage
  const restoreAuthState = useCallback(() => {
    try {
      const storedToken = localStorage.getItem('google_calendar_access_token');
      const storedEmail = localStorage.getItem('google_calendar_user_email');
      const storedSignedIn = localStorage.getItem('google_calendar_signed_in') === 'true';
      
      if (storedToken && storedSignedIn && checkAuthExpiry()) {
        setAccessToken(storedToken);
        setUserEmail(storedEmail || '');
        setIsSignedIn(true);
        return { token: storedToken, isValid: true };
      }
      return { token: null, isValid: false };
    } catch (error) {
      console.error('Error restoring auth state:', error);
      return { token: null, isValid: false };
    }
  }, [checkAuthExpiry]);

  const fetchEvents = useCallback(async (token = accessToken) => {
    if (!token || !window.gapi?.client?.calendar) {
      console.warn('Cannot fetch events: missing token or calendar API');
      return;
    }
    
    setLoading(true);
    try {
      // Set the access token for the API client
      window.gapi.client.setToken({ access_token: token });
      
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime',
      });

      const events = response.result.items || [];
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error.status === 401) {
        // Token expired, clear auth state
        handleSignoutClick();
      } else {
        setInitError('Failed to fetch calendar events. Please check your calendar permissions.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]); // Remove handleSignoutClick to avoid circular dependency

  const fetchGmailEmails = useCallback(async (token = accessToken) => {
    if (!token) {
      console.warn('Cannot fetch Gmail emails: missing token');
      return;
    }
    
    try {
              const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
        const response = await fetch(`${CRM_API_BASE_URL}/api/crm/read-gmail-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: token,
          max_results: 100
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Gmail emails fetched successfully:', result);
      
      // Show success message to user
      if (result.emails_processed > 0) {
        alert(`Successfully processed ${result.emails_processed} emails and saved to ${result.csv_file}`);
      } else {
        alert('No emails found to process');
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching Gmail emails:', error);
      alert('Failed to fetch Gmail emails. Please try again.');
      throw error;
    }
  }, [accessToken]);

  const handleSignoutClick = useCallback(async () => {
    if (!isSignedIn) return;
    
    try {
      if (accessToken) {
        // Revoke the access token
        window.google?.accounts?.oauth2?.revoke(accessToken);
      }
      setAccessToken(null);
      setIsSignedIn(false);
      setEvents([]);
      setUserEmail('');
      
      // Clear stored auth state
      clearAuthState();
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear auth state even if revocation fails
      clearAuthState();
    }
  }, [isSignedIn, accessToken, clearAuthState]);

  const handleCredentialResponse = useCallback((_response) => {
    // For calendar access, we need to use OAuth2 flow, not just ID token
    console.log('Credential response received');
  }, []);

  const initializeGapi = useCallback(async () => {
    setIsInitializing(true);
    setInitError(null);
    
    try {
      // Check if environment variables are set
      if (!API_KEY || !CLIENT_ID || API_KEY === 'YOUR_NEW_API_KEY_HERE' || CLIENT_ID === 'YOUR_NEW_CLIENT_ID_HERE.apps.googleusercontent.com') {
        throw new Error('Please update your .env file with your Google Calendar API credentials. See setup instructions below.');
      }

      // Check if Google API is loaded
      if (typeof window.gapi === 'undefined') {
        throw new Error('Google API script not loaded. Please refresh the page and check your internet connection.');
      }

      // Check if Google Identity Services is loaded
      if (typeof window.google === 'undefined') {
        throw new Error('Google Identity Services not loaded. Please refresh the page.');
      }

      // Load the required API modules
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout loading Google API modules (10 seconds)'));
        }, 10000);

        window.gapi.load('client', {
          callback: () => {
            clearTimeout(timeout);
            resolve();
          },
          onerror: () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load Google API client module'));
          }
        });
      });

      // Initialize the Google API client
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC]
      });

      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse
      });
      
      setIsInitialized(true);
      
      // Now try to restore auth state after initialization is complete
      const authState = restoreAuthState();
      if (authState.isValid && authState.token) {
        _setHasRestoredAuth(true);
        // Fetch events with restored token
        await fetchEvents(authState.token);
      }
    } catch (error) {
      console.error('Error setting up calendar:', error);
      setInitError(error.message);
    } finally {
      setIsInitializing(false);
    }
  }, [API_KEY, CLIENT_ID, handleCredentialResponse, restoreAuthState, fetchEvents]);

  // Initialize on mount
  useEffect(() => {
    if (areScriptsLoaded) {
      initializeGapi();
    }
  }, [areScriptsLoaded, initializeGapi]);

  const handleAuthClick = useCallback(async () => {
    if (!isInitialized) {
      return;
    }
    
    try {
      // Use Google Identity Services OAuth2 flow
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            setIsSignedIn(true);
            
            // Get user info
            fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`)
              .then(res => res.json())
              .then(userInfo => {
                setUserEmail(userInfo.email);
                // Save auth state to localStorage
                saveAuthState(response.access_token, userInfo.email, true);
                fetchEvents(response.access_token);
                // Automatically fetch Gmail emails after successful authentication
                fetchGmailEmails(response.access_token);
              })
              .catch(error => {
                console.error('Error getting user info:', error);
                // Save auth state even if we couldn't get user info
                saveAuthState(response.access_token, '', true);
                fetchEvents(response.access_token);
                // Automatically fetch Gmail emails after successful authentication
                fetchGmailEmails(response.access_token);
              });
          } else {
            console.error('No access token received');
            setInitError('Failed to get access token. Please try again.');
          }
        },
        error_callback: (error) => {
          console.error('OAuth2 error:', error);
          setInitError('Failed to sign in. Please allow popups and try again.');
        }
      });
      
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Error starting sign-in:', error);
      setInitError('Failed to start sign-in process. Please try again.');
    }
  }, [isInitialized, CLIENT_ID, SCOPES, saveAuthState, fetchEvents]);

  const createQuickEvent = useCallback(async (eventText) => {
    if (!accessToken) return;
    
    try {
      // Set the access token for the API client
      window.gapi.client.setToken({ access_token: accessToken });
      
      const response = await window.gapi.client.calendar.events.quickAdd({
        calendarId: 'primary',
        text: eventText
      });
      
      fetchEvents(); // Refresh events
      return response;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }, [accessToken, fetchEvents]);

  const _handleEventCreated = useCallback(async () => {
    // Refresh calendar events when the scheduling agent creates an event
    if (accessToken) {
      await fetchEvents();
    }
  }, [accessToken, fetchEvents]);

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

  // Memoized analytics data
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-prelude-900" />
            <h2 className="text-base font-display font-semibold text-prelude-900">
              My Calendar
            </h2>
            {isInitialized && !initError && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchGmailEmails()}
                  disabled={loading}
                  className="p-2"
                  title="Read Gmail Emails"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={isSignedIn ? handleSignoutClick : handleAuthClick}
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
          isSignedIn={isSignedIn}
          userEmail={userEmail}
          handleAuthClick={handleAuthClick}
          handleSignoutClick={handleSignoutClick}
          initializeGapi={initializeGapi}
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
              onClick={() => window.open('https://calendar.google.com', '_blank')}
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

export default GoogleCalendar;