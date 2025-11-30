// src/App.jsx
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Initialize theme system
import { initializeTheme } from './styles/colorTemplates';

// Import your Auth Provider context
import { AuthProvider } from './auth/context/AuthProvider';
import { NotificationProvider } from './contexts/NotificationContext';
import { WorkflowProvider } from './contexts/WorkflowContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { UsageAnalyticsProvider } from './contexts/UsageAnalyticsContext';
import { SalesCenterProvider } from './contexts/SalesCenterContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { LeadProvider } from './contexts/LeadContext';
import { CRMProvider } from './contexts/CRMContext';
import { EmailSyncProvider } from './contexts/EmailSyncContext';
import { DashboardStateProvider } from './contexts/DashboardStateContext';

// Import your useAuth hook - THIS WAS MISSING FOR HomeRedirect
import { useAuth } from './auth/hooks/useAuth';

// Import initialization service
import appInitializationService from './services/appInitializationService';

// Import page tracking hook for activity logging
import usePageTracking from './hooks/usePageTracking';

// Import analytics service for session tracking
// import analyticsApiService from './services/analyticsApiService';

// Import your themed pages
import LoginPage from './auth/pages/LoginPage';
import RegisterPage from './auth/pages/RegisterPage';
import AuthCallbackPage from './auth/pages/AuthCallbackPage';

// Import your ProtectedRoute component
import ProtectedRoute from './components/ProtectedRoute';

// Import a placeholder or your actual Dashboard/main application page
// Create this file if it doesn't exist
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserOnboardingPage = lazy(() => import('./components/invitations/UserOnboardingPage'));
// (Example: src/pages/DashboardPage.jsx - could be a simple component for now)
/*
  // src/pages/DashboardPage.jsx
  import React from 'react';
  import Layout from '../components/Layout';
  import Card from '../components/Card';
  import Button from '../components/Button';
  import { useAuth } from '../auth/hooks/useAuth';

  function DashboardPage() {
    const { user, logout } = useAuth();

    return (
      <Layout>
        <Card>
          <h2>Welcome, {user?.name || 'User'}!</h2>
          <p>You are logged in.</p>
          <Button onClick={logout}>Logout</Button>
        </Card>
      </Layout>
    );
  }
  export default DashboardPage;
*/


// App component to handle initial setup
function AppContent() {
  const { user, isAuthenticated } = useAuth();

  // Generate or retrieve session ID (persists across page reloads)
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('app_session_id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem('app_session_id', sessionId);
    }
    return sessionId;
  };

  // Enable page tracking for authenticated users
  usePageTracking(
    user?.email || 'anonymous',
    getSessionId()
  );

  // Initialize background services and theme system when app loads
  useEffect(() => {
    appInitializationService.initialize();
    initializeTheme(); // Initialize theme system with saved or default theme

    // Initialize analytics session tracking
    // analyticsApiService.startSession();

    // Track session end on page unload
    // const handleBeforeUnload = () => {
    //   analyticsApiService.endSession();
    // };

    // window.addEventListener('beforeunload', handleBeforeUnload);

    // return () => {
    //   window.removeEventListener('beforeunload', handleBeforeUnload);
    //   analyticsApiService.endSession();
    // };
  }, []);

  // Update analytics service with current user when auth state changes
  // useEffect(() => {
  //   if (isAuthenticated && user) {
  //     analyticsApiService.setCurrentUser(user);
  //   } else {
  //     analyticsApiService.setCurrentUser(null);
  //   }
  // }, [user, isAuthenticated]);

  return (
    <NotificationProvider>
      <EmailSyncProvider>
        <SalesCenterProvider>
          <SettingsProvider>
            <WorkflowProvider>
              <LeadProvider>
                <CRMProvider>
                  <UsageAnalyticsProvider>
                    <TutorialProvider>
                      <DashboardStateProvider>
                        <Suspense fallback={<div>Loading...</div>}>
                          <Routes>
                          {/* Route for the Login Page */}
                          <Route path="/login" element={<LoginPage />} />

                          {/* Route for the Registration Page */}
                          <Route path="/register" element={<RegisterPage />} />

                          {/* Route for the Auth Callback Page */}
                          <Route path="/auth/callback" element={<AuthCallbackPage />} />

                          {/* Protected Routes */}
                          <Route
                            path="/dashboard"
                            element={
                              <ProtectedRoute>
                                <DashboardPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/settings"
                            element={
                              <ProtectedRoute>
                                <SettingsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/user-onboarding"
                            element={
                              <ProtectedRoute>
                                <UserOnboardingPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Root route - Redirects to /dashboard if authenticated, otherwise to /login */}
                          <Route
                            path="/"
                            element={<HomeRedirect />}
                          />
                          </Routes>
                        </Suspense>
                      </DashboardStateProvider>
                    </TutorialProvider>
                  </UsageAnalyticsProvider>
                </CRMProvider>
              </LeadProvider>
            </WorkflowProvider>
          </SettingsProvider>
        </SalesCenterProvider>
      </EmailSyncProvider>
    </NotificationProvider>
  );
}

function App() {

  return (
    // Use BrowserRouter for routing
    <Router>
      {/* Wrap your entire application (or the parts that need auth) with AuthProvider */}
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

// Helper component for the root redirect
function HomeRedirect() {
    const { isAuthenticated, isLoading } = useAuth();

    // Wait until loading is complete to make a decision
    if (isLoading) {
        return null; // Or a full-page spinner
    }

    // Redirect based on auth status
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}


export default App;