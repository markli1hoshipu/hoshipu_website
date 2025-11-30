import React from 'react';
import { Calendar, CheckCircle, AlertCircle, User, Settings, Mail, Building2 } from 'lucide-react';
import { Button } from '../ui/primitives/button';
import { motion as _motion } from 'framer-motion';

const CalendarAuth = ({ 
  isInitializing,
  isInitialized,
  initError,
  authProvider,
  isAuthenticated,
  userEmail,
  googleConnected,
  outlookConnected,
  googleEmail,
  outlookEmail,
  initializeGapi
}) => {
  return (
    <>
      {/* Connection Status - Read Only */}
      {isAuthenticated && authProvider && (googleConnected || outlookConnected) && (
        <div className="mb-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              {authProvider === 'google' ? (
                <Mail className="h-4 w-4 text-green-600" />
              ) : (
                <Building2 className="h-4 w-4 text-blue-600" />
              )}
              <div>
                <span className="text-sm text-green-800 font-medium">
                  Connected via App Login
                </span>
                <div className="text-xs text-green-600">
                  {authProvider === 'google' ? 'Gmail' : 'Outlook'}: {userEmail}
                </div>
              </div>
              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Initialization Status */}
      {isInitializing && (
        <_motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <_motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"
            />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Setting Up Calendar</h4>
              <p className="text-sm text-blue-700">Connecting to your personal Google Calendar...</p>
            </div>
          </div>
        </_motion.div>
      )}

      {/* Error Display */}
      {initError && (
        <_motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-900">Setup Required</h4>
              <p className="text-sm text-red-700 mt-1">{initError}</p>
              {initError.includes('update your .env file') && (
                <div className="mt-2 text-xs text-red-600">
                  <p className="font-medium">Quick Setup Steps:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                    <li>Create a new project</li>
                    <li>Enable Google Calendar API</li>
                    <li>Create API Key and OAuth Client ID</li>
                    <li>Update your .env file with the credentials</li>
                  </ol>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={initializeGapi}
                className="mt-2 text-xs"
              >
                Retry Setup
              </Button>
            </div>
          </div>
        </_motion.div>
      )}

      {/* Auth Status - Show login prompt if not authenticated */}
      {!isAuthenticated && (
        <_motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4"
        >
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-display font-medium text-prelude-900 mb-2 text-center">
            Calendar & Email Access
          </h3>
          <p className="text-sm text-gray-600 font-inter mb-4 text-center">
            Please log in to the app to access your calendar and email
          </p>
          <div className="text-center">
            <Button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Login
            </Button>
          </div>
        </_motion.div>
      )}
    </>
  );
};

export default CalendarAuth;