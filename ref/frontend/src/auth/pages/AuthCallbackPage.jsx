// src/pages/AuthCallbackPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/primitives/card';
import { Button } from '../../components/ui/primitives/button';
import { Alert, AlertDescription } from '../../components/ui/primitives/alert';
import { Skeleton } from '../../components/ui/primitives/skeleton';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { extractServiceFromState } from '../utils/stateUtils';

const STATUS_TYPES = {
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error'
};

function AuthCallbackPage() {
  const { handleAuthCode, isAuthenticated, isLoading, authError } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing login...');
  const [statusType, setStatusType] = useState(STATUS_TYPES.PROCESSING);
  const [localError, setLocalError] = useState(null);
  const processingStartedRef = useRef(false);
  const processedCodeRef = useRef(null); // Track which code we've processed

  useEffect(() => {
    console.log('AuthCallbackPage: Component Mounted.');
    return () => console.log('AuthCallbackPage: Component Unmounted.');
  }, []);

  useEffect(() => {
    console.log(`AuthCallbackPage useEffect: Running. processingStarted: ${processingStartedRef.current}, isAuthenticated: ${isAuthenticated}, isLoading: ${isLoading}`);

    if (isAuthenticated && !isLoading) {
      console.log('AuthCallbackPage: User authenticated, redirecting...');
      navigate('/dashboard');
      return;
    }

    if (processingStartedRef.current) {
      console.log('AuthCallbackPage: Processing already started, skipping...');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const errorParam = urlParams.get('error');
    const state = urlParams.get('state');

    if (errorParam) {
      const errorDescription = urlParams.get('error_description') || 'An error occurred during login.';
      console.error('AuthCallbackPage: OAuth Error:', errorParam, errorDescription);
      setStatus('Login failed');
      setStatusType(STATUS_TYPES.ERROR);
      setLocalError(`Error: ${errorParam}. ${errorDescription.split('.')[0]}.`);
      processingStartedRef.current = true;
      return;
    }

    if (code && state) {
      console.log('AuthCallbackPage: Found code and state in URL.');
      
      // Check if we've already processed this exact code
      if (processedCodeRef.current === code) {
        console.log('AuthCallbackPage: Already processed this code, skipping...');
        return;
      }
      
      const serviceName = extractServiceFromState(state);

      if (!serviceName) {
        console.error('AuthCallbackPage: Could not extract service name from state.');
        setStatus('Login failed');
        setStatusType(STATUS_TYPES.ERROR);
        setLocalError('Invalid state parameter received.');
        processingStartedRef.current = true;
        return;
      }

      console.log(`AuthCallbackPage: Extracted service: ${serviceName}`);
      console.log(`AuthCallbackPage: Current time: ${new Date().toISOString()}`);
      console.log(`AuthCallbackPage: Code (first 20 chars): ${code.substring(0, 20)}...`);
      
      // Set flags BEFORE async operation to prevent double execution
      processingStartedRef.current = true;
      processedCodeRef.current = code; // Mark this code as being processed

      const processAuthCode = async () => {
        console.log('AuthCallbackPage: Initiating token exchange...');
        console.log(`AuthCallbackPage: Time at exchange: ${new Date().toISOString()}`);
        setStatus(`Exchanging authorization code for ${serviceName}...`);
        
        try {
          const success = await handleAuthCode(code, state);

          if (success) {
            console.log('AuthCallbackPage: handleAuthCode success.');
            setStatus('Login successful!');
            setStatusType(STATUS_TYPES.SUCCESS);
            setTimeout(() => navigate('/dashboard'), 1000);
          } else {
            console.warn('AuthCallbackPage: handleAuthCode failed.');
            setStatus('Login failed');
            setStatusType(STATUS_TYPES.ERROR);
          }
        } catch (err) {
          console.error('AuthCallbackPage: Error during code exchange:', err);
          setStatus('Login failed');
          setStatusType(STATUS_TYPES.ERROR);
          setLocalError(`An unexpected error occurred: ${err.message}`);
        }
      };

      processAuthCode();
    } else {
      console.error('AuthCallbackPage: Missing code or state parameter.');
      setStatus('Login failed');
      setStatusType(STATUS_TYPES.ERROR);
      setLocalError('Invalid callback URL or missing parameters.');
      processingStartedRef.current = true;
    }
  }, [handleAuthCode, navigate, isAuthenticated, isLoading]);

  const displayError = localError || authError;
  const isError = statusType === STATUS_TYPES.ERROR;
  const isSuccess = statusType === STATUS_TYPES.SUCCESS;
  const isProcessing = statusType === STATUS_TYPES.PROCESSING;

  const getStatusIcon = () => {
    if (isSuccess) return <CheckCircle className="h-8 w-8 text-green-500" />;
    if (isError) return <XCircle className="h-8 w-8 text-red-500" />;
    return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Authentication Status</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}
            
            <div className="text-center space-y-2">
              <p className={`text-lg font-medium ${
                isSuccess ? 'text-green-700' : 
                isError ? 'text-red-700' : 
                'text-blue-700'
              }`}>
                {status}
              </p>
              
              {isProcessing && !displayError && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                </div>
              )}
            </div>
          </div>

          {displayError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          {isError && (
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
              variant="outline"
            >
              Back to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthCallbackPage;