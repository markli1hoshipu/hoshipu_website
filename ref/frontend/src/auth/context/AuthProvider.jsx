
// src/auth/context/AuthProvider.jsx
import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
// Assuming tokenUtils are located at this path
// Make sure these functions are correctly exported from tokenUtils.js
import { decodeToken, isTokenExpired, getTimeUntilExpiration, storeTokens, clearTokens, extractUserFromToken } from '../utils/tokenUtils';
import { clearAllAppCookies } from '../../utils/cookieManager';

// --- Import State utility for frontend ---
// This utility is still needed on the frontend to extract info from the state parameter.
import { extractServiceFromState } from '../utils/stateUtils'; // Assuming stateUtils.js

// --- REMOVED PKCE utilities import ---
// import { generateCodeVerifier, PKCE_CODE_VERIFIER_STORAGE_KEY } from '../utils/pkceUtils'; // REMOVED


// Define your backend API base URL
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001';

// Create context
export const AuthContext = createContext(null);

// Define a buffer time before token expiration to trigger refresh (in seconds)
const REFRESH_TOKEN_BUFFER_SECONDS = 5 * 60; // 5 minutes

export function AuthProvider({ children }) {
  // State for authentication
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // State to hold authentication errors
  const [authProvider, setAuthProvider] = useState(null); // Track which provider (google/microsoft)

  // Refs for token refresh timer
  const refreshTimerRef = useRef(null);

  // --- Temporary: Clear invalid tokens on app start ---
  useEffect(() => {
    const storedIdToken = localStorage.getItem('id_token');
    if (storedIdToken && isTokenExpired(storedIdToken)) {
      console.log('Clearing expired tokens on app start');
      clearTokens();
      setAuthError('Session expired. Please log in again.');
    }
  }, []);

  // --- Function Declarations (Moved to the top) ---
  // These functions are declared first so they can be referenced by effects and other functions below

  // Clear auth data on logout
  const logout = useCallback(() => {
    console.log('Logging out...');
    clearTokens(); // Use tokenUtils to clear tokens from storage
    setIdToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null); // Clear any errors on logout
    setAuthProvider(null); // Clear provider info
    
    // Clear provider info from localStorage
    localStorage.removeItem('auth_service_name');
    localStorage.removeItem('auth_provider');
    
    // Clear OAuth tokens for both providers
    ['google', 'microsoft'].forEach(provider => {
      localStorage.removeItem(`${provider}_access_token`);
      localStorage.removeItem(`${provider}_user_email`);
      localStorage.removeItem(`${provider}_connected`);
      localStorage.removeItem(`${provider}_auth_time`);
      localStorage.removeItem(`${provider}_refresh_token`);
    });

    // Clear lead gen cache from sessionStorage
    sessionStorage.removeItem('lead_gen_workflow_results');
    sessionStorage.removeItem('lead_gen_preview_results');
    sessionStorage.removeItem('lead_gen_active_view');
    sessionStorage.removeItem('lead_gen_prompt_input');
    sessionStorage.removeItem('lead_gen_max_results');
    // Clear workflow wizard cache
    sessionStorage.removeItem('leadgen_workflow_cache');
    sessionStorage.removeItem('leadgen_workflow_step');
    sessionStorage.removeItem('leadgen_history_refresh');
    sessionStorage.removeItem('leadgen_history_last_check');
    sessionStorage.removeItem('leadgen_history_cache');
    console.log('🗑️ Cleared lead gen cache on logout');
    
    // Clear all app cookies (filters, columns, UI preferences)
    clearAllAppCookies();
    console.log('🍪 Cleared all app cookies on logout');

    // Clear the refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Optionally redirect to the login page after logout
    // You would need to import { useNavigate } from 'react-router-dom'; and get the navigate function
    // const navigate = useNavigate();
    // navigate('/login');
  }, []); // No dependencies needed for logout logic


  // Refresh tokens using refresh token
  // This function now calls YOUR backend /api/auth/token endpoint
  const refreshTokens = useCallback(async (refreshTokenStr) => {
    console.log('Attempting to refresh tokens...');
    setAuthError(null); // Clear any previous errors
    setIsLoading(true); // Indicate loading state during refresh

    try {
      // Get the provider from localStorage
      const provider = localStorage.getItem('auth_provider') || 'google';
      
      // --- Make POST request to YOUR backend's /api/auth/token endpoint ---
      // This endpoint handles refresh token logic
      const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: refreshTokenStr,
          provider: provider  // Include provider for backend to handle correctly
          // grant_type: 'refresh_token' // Add if your backend expects this
        })
      });

      if (!response.ok) {
        // Attempt to parse error response from backend
        const errorData = await response.json().catch(() => ({ detail: 'Failed to refresh token' }));
        console.error('Backend token refresh failed:', response.status, errorData);
        // Use 'detail' from backend's HTTPException response or fallback
        throw new Error(errorData.detail || `Failed to refresh token: ${response.status}`);
      }

      const tokens = await response.json(); // Expecting { id_token, refresh_token, expires_in, ... } from YOUR backend

      // --- Store and set the new tokens ---
      storeTokens(tokens); // Use tokenUtils to store new tokens
      setIdToken(tokens.id_token);
      // Update refresh token state ONLY if the backend returned a new one
      if (tokens.refresh_token) {
        setRefreshToken(tokens.refresh_token);
        // Also update the stored service name if you are storing it separately
        // localStorage.setItem('auth_service_name', tokens.service_name); // <<< If backend returns service name
      }
      
      // --- Update OAuth tokens if returned (for email API access) ---
      if (tokens.oauth_access_token) {
        localStorage.setItem(`${provider}_access_token`, tokens.oauth_access_token);
        localStorage.setItem(`${provider}_user_email`, tokens.user_info?.email || '');
        localStorage.setItem(`${provider}_connected`, 'true');
        localStorage.setItem(`${provider}_auth_time`, Date.now().toString());
        
        if (tokens.oauth_refresh_token) {
          localStorage.setItem(`${provider}_refresh_token`, tokens.oauth_refresh_token);
        }
      }


      // --- Decode the new ID token and update user info ---
      const decoded = decodeToken(tokens.id_token); // Use tokenUtils to decode
      if (decoded) {
         setUser(extractUserFromToken(tokens.id_token)); // Use tokenUtils to extract user
         setIsAuthenticated(true); // Confirm authenticated state

         // --- Schedule next refresh based on the new token's expiration ---
         // Use expires_in from the response or exp claim from the decoded token
         const expiresAtSeconds = tokens.expires_in ? (Date.now() / 1000) + tokens.expires_in : decoded.exp;
         const timeUntilRefresh = (expiresAtSeconds * 1000) - Date.now() - (REFRESH_TOKEN_BUFFER_SECONDS * 1000);

         // Schedule refresh directly here to avoid circular dependency
         if (timeUntilRefresh > 0) {
           if (refreshTimerRef.current) {
             clearTimeout(refreshTimerRef.current);
           }
           console.log(`Scheduling token refresh in ${timeUntilRefresh / 1000} seconds.`);
           refreshTimerRef.current = setTimeout(async () => {
             console.log('Attempting scheduled token refresh...');
             try {
               await refreshTokens(localStorage.getItem('refresh_token'));
             } catch {
               console.warn('Scheduled refresh triggered but no refresh token available.');
             }
           }, timeUntilRefresh);
         }

         console.log('Tokens refreshed successfully.');
         return true; // Indicate success
      } else {
          // Failed to decode the new token received from the backend - something is wrong
          console.error('Failed to decode new ID token after refresh.');
          logout(); // Log out if the new token is invalid
          setAuthError('Failed to process new token after refresh.');
          return false; // Indicate failure
      }


    } catch (error) {
      console.error('Error refreshing token:', error);
      logout(); // Log out on refresh failure
      setAuthError(error.message || 'An error occurred during token refresh.');
      return false; // Indicate failure
    } finally {
      setIsLoading(false); // Clear loading state
    }
  }, [logout]); // Dependencies: logout only


  // Schedule token refresh before expiration
  const scheduleTokenRefresh = useCallback((timeUntilRefresh) => {
    if (timeUntilRefresh <= 0) {
      console.log('Token expiration within buffer, not scheduling future refresh.');
      return;
    }

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    console.log(`Scheduling token refresh in ${timeUntilRefresh / 1000} seconds.`);
    refreshTimerRef.current = setTimeout(async () => {
      console.log('Attempting scheduled token refresh...');
      try {
        const storedRefreshToken = localStorage.getItem('refresh_token');
        if (storedRefreshToken) {
          await refreshTokens(storedRefreshToken);
        }
      } catch {
        console.warn('Scheduled refresh triggered but no refresh token available.');
      }
    }, timeUntilRefresh);
  }, [refreshTokens]);


  // --- Handle Authorization Code Callback ---
  // This function is called by AuthCallbackPage.jsx with code and state from the URL
  const handleAuthCode = useCallback(async (code, state) => { // <-- state parameter is now expected
    console.log(`Handling auth code. State: ${state}`);
    setAuthError(null); // Clear any previous errors
    setIsLoading(true); // Indicate loading state

    try {
      // --- Extract service name from the state parameter ---
      // Assuming your stateUtils.js has a function to parse the state string
      const serviceName = extractServiceFromState(state); // <<< Assuming stateUtils.js utility
      if (!serviceName) {
          console.error('Could not extract service name from state parameter.');
          throw new Error('Invalid state parameter.');
      }
      console.log(`Extracted service name from state: ${serviceName}`);


      // --- REMOVED PKCE code verifier retrieval from sessionStorage ---
      // const codeVerifier = sessionStorage.getItem(PKCE_CODE_VERIFIER_STORAGE_KEY); // REMOVED
      // sessionStorage.removeItem(PKCE_CODE_VERIFIER_STORAGE_KEY); // REMOVED

      // --- REMOVED check for codeVerifier ---
      // if (!codeVerifier) { ... } // REMOVED


      console.log('PKCE code verifier is handled by the backend.');


      // --- Make POST request to YOUR backend's /api/auth/token endpoint ---
      // This endpoint exchanges the authorization code for tokens
      // Include provider info in the request
      console.log(`Sending token exchange request - provider: ${serviceName}, code: ${code.substring(0, 20)}...`);
      const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: code,
          provider: serviceName  // Pass the provider to backend
        })
      });

      if (!response.ok) {
        // Attempt to parse error response from backend
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error during code exchange' }));
        console.error('Backend token exchange failed:', response.status, errorData);
        // Use 'detail' from backend's HTTPException response or fallback
        throw new Error(errorData.detail || `Token exchange failed with status: ${response.status}`);
      }

      const tokens = await response.json(); // Expecting { id_token, refresh_token, expires_in, ... } from YOUR backend

      // --- Store the received tokens and the service name ---
      storeTokens(tokens); // Use tokenUtils to store tokens (id_token, refresh_token)
      // Store the service name/provider alongside the refresh token for refreshTokens function
      localStorage.setItem('auth_service_name', serviceName); // <<< Store service name
      localStorage.setItem('auth_provider', serviceName); // Also store as provider for clarity
      
      // --- Store OAuth tokens for email API access ---
      if (tokens.oauth_access_token) {
        localStorage.setItem(`${serviceName}_access_token`, tokens.oauth_access_token);
        localStorage.setItem(`${serviceName}_user_email`, tokens.user_info?.email || '');
        localStorage.setItem(`${serviceName}_connected`, 'true');
        localStorage.setItem(`${serviceName}_auth_time`, Date.now().toString());

        if (tokens.oauth_refresh_token) {
          localStorage.setItem(`${serviceName}_refresh_token`, tokens.oauth_refresh_token);
        }

        // --- Save OAuth tokens to backend databases for auto-refresh ---
        // Save to both CRM service AND lead_gen service
        const savePromises = [];

        // Save to CRM service (existing)
        const CRM_API_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
        savePromises.push(
          fetch(`${CRM_API_URL}/api/crm/oauth/save-tokens`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.id_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              provider: serviceName,  // 'google' or 'microsoft'
              access_token: tokens.oauth_access_token,
              refresh_token: tokens.oauth_refresh_token,
              expires_in: tokens.expires_in || 3600,
              scope: tokens.scope
            })
          })
        );

        // Save to lead_gen service (NEW)
        const LEAD_GEN_API_URL = import.meta.env.VITE_BACKEND_LEAD_API_URL || 'http://localhost:9000';
        savePromises.push(
          fetch(`${LEAD_GEN_API_URL}/api/leads/oauth/save-tokens`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.id_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              provider: serviceName,  // 'google' or 'microsoft'
              access_token: tokens.oauth_access_token,
              refresh_token: tokens.oauth_refresh_token,
              expires_in: tokens.expires_in || 3600,
              scope: tokens.scope
            })
          })
        );

        // Save to both services in parallel
        try {
          const results = await Promise.allSettled(savePromises);

          if (results[0].status === 'fulfilled' && results[0].value.ok) {
            console.log(`✅ Saved ${serviceName} OAuth tokens to CRM service`);
          } else {
            console.error(`⚠️ Failed to save ${serviceName} tokens to CRM service:`, results[0].reason || results[0].value?.statusText);
          }

          if (results[1].status === 'fulfilled' && results[1].value.ok) {
            console.log(`✅ Saved ${serviceName} OAuth tokens to lead_gen service`);
          } else {
            console.error(`⚠️ Failed to save ${serviceName} tokens to lead_gen service:`, results[1].reason || results[1].value?.statusText);
          }
        } catch (error) {
          console.error(`❌ Error saving ${serviceName} tokens to backends:`, error);
          // Don't fail login if this fails - tokens are still in localStorage
        }
      }


      // --- Update AuthProvider state ---
      setIdToken(tokens.id_token);
      if (tokens.refresh_token) {
        setRefreshToken(tokens.refresh_token);
      }

      // --- Decode the ID token and set user info ---
      const decoded = decodeToken(tokens.id_token); // Use tokenUtils to decode
      if (decoded) {
         setUser(extractUserFromToken(tokens.id_token)); // Use tokenUtils to extract user from ID token string
         setIsAuthenticated(true); // User is now authenticated
         setAuthProvider(serviceName); // Set the provider state

         // --- Schedule the next token refresh ---
         // Calculate time until refresh based on expires_in from response or exp claim from decoded token
         // Use expires_in if available, otherwise fallback to exp claim
         const expiresAtSeconds = tokens.expires_in ? (Date.now() / 1000) + tokens.expires_in : decoded.exp;
         const timeUntilRefresh = (expiresAtSeconds * 1000) - Date.now() - (REFRESH_TOKEN_BUFFER_SECONDS * 1000);

         // Schedule refresh directly here to avoid circular dependency
         if (timeUntilRefresh > 0) {
           if (refreshTimerRef.current) {
             clearTimeout(refreshTimerRef.current);
           }
           console.log(`Scheduling token refresh in ${timeUntilRefresh / 1000} seconds.`);
           refreshTimerRef.current = setTimeout(async () => {
             console.log('Attempting scheduled token refresh...');
             try {
               await refreshTokens(localStorage.getItem('refresh_token'));
             } catch {
               console.warn('Scheduled refresh triggered but no refresh token available.');
             }
           }, timeUntilRefresh);
         }

         console.log('Auth code exchange successful.');
         return true; // Indicate success
      } else {
          // Failed to decode the received ID token from the backend response
          console.error('Received invalid ID token during code exchange.');
          logout(); // Log out if the token is invalid
          setAuthError('Failed to process received token.');
          return false; // Indicate failure
      }


    } catch (error) {
      console.error('Error handling auth code:', error);
      // Clear any potentially stored partial state or tokens from this attempt
      clearTokens(); // Ensure no bad tokens are left in storage
      setIdToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsAuthenticated(false);
      // The PKCE verifier was already handled by the backend in this flow.
      setAuthError(error.message || 'Login failed. Please try again.');
      return false; // Indicate failure
    } finally {
      setIsLoading(false); // Clear loading state
    }
  }, [logout]); // Dependencies: logout only


  // --- Initiate Login Redirect ---
  // This function is called by components like LoginPage.jsx
  // It now calls YOUR backend /api/auth/login endpoint
  const loginWith = useCallback(async (serviceName) => {
    console.log(`Initiating login with service: ${serviceName}`);
    console.log(`API_BASE_URL: ${API_BASE_URL}`);
    console.log(`Full URL will be: ${API_BASE_URL}/api/auth/login`);
    setAuthError(null); // Clear any previous errors
    setIsLoading(true); // Indicate loading state

    try {
      // --- REMOVED Frontend PKCE code verifier generation and storage ---
      // const codeVerifier = generateCodeVerifier(); // REMOVED
      // sessionStorage.setItem(PKCE_CODE_VERIFIER_STORAGE_KEY, codeVerifier); // REMOVED
      console.log('PKCE code verifier generation handled by the backend.');

      // --- Call YOUR backend's /api/auth/login endpoint ---
      // Send only the serviceName to the backend.
      // The backend will generate the code_verifier, code_challenge, and state,
      // store the verifier, and build the full auth URL.
      console.log('About to make fetch request...');
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST', // Use POST to send data in the body
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: serviceName, // The service name requested by the frontend
          // --- REMOVED code_verifier from the request body ---
          // code_verifier: codeVerifier // REMOVED
          // You might still send the frontend's redirect_uri here if your backend needs it
          // to build the auth URL, although the backend likely has a configured redirect_uri.
          // redirect_uri: window.location.origin + '/auth/callback', // Example
        })
      });
      console.log('Fetch request completed, response:', response);


      if (!response.ok) {
        // Attempt to parse error response from backend
        const errorData = await response.json().catch(() => ({ detail: 'Failed to get authorization URL' }));
        console.error('Backend login initiation failed:', response.status, errorData);
        // Use 'detail' from backend's HTTPException response or fallback
        throw new Error(errorData.detail || `Failed to start login flow: ${response.status}`);
      }

      const data = await response.json(); // Expecting { authorization_url: "..." }

      const authorizationUrl = data.authorization_url;
      if (!authorizationUrl) {
          console.error('Backend response missing authorization_url.');
          throw new Error('Backend did not provide authorization URL.');
      }

      console.log(`Received authorization URL from backend. Redirecting to: ${authorizationUrl}`);

      // --- Redirect the user's browser to the authorization URL ---
      window.location.assign(authorizationUrl);

      // Note: The browser will redirect away from this page,
      // so the code below this line might not execute immediately or at all
      // before the component unmounts.
    } catch (error) {
      console.error(`Error initiating login for service "${serviceName}":`, error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      // If the redirect fails before leaving the page (e.g., backend error),
      // clear the loading state and potentially show an error message in the UI.
      setIsLoading(false);
      setAuthError(error.message ? `Failed to fetch: ${error.message}` : 'Failed to start login flow.');
      // --- REMOVED verifier cleanup on failure ---
      // sessionStorage.removeItem(PKCE_CODE_VERIFIER_STORAGE_KEY); // REMOVED
    }
  }, []); // No dependencies needed for loginWith logic itself


  // --- Authenticated Fetch Wrapper ---
  // Helper function to make authenticated API requests
  // This function depends on idToken and refreshToken state, and refreshTokens/logout functions
  const authFetch = useCallback(async (url, options = {}) => {
    // Ensure we have an ID token before attempting to fetch
    if (!idToken) {
      console.warn('Attempted authFetch without ID token. User not authenticated.');
      // Optionally trigger logout or redirect to login if this happens unexpectedly
      // logout(); // Uncomment if you want to force logout on any authFetch without token
      throw new Error('Not authenticated');
    }

    // Add the Authorization header with the Bearer token
    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${idToken}`
      }
    };

    try {
      const response = await fetch(url, authOptions);

      // Handle 401 Unauthorized errors - attempt token refresh
      if (response.status === 401) {
        console.log('authFetch received 401. Attempting token refresh...');
        // Only attempt refresh if a refresh token is available
        if (refreshToken) {
            // Call the refreshTokens function (which now talks to your backend)
            const refreshSuccess = await refreshTokens(refreshToken);

            if (refreshSuccess) {
              console.log('Token refreshed successfully. Retrying original request...');
              // Retry the original fetch request with the new ID token
              // Need to get the updated idToken from state or storage after refreshTokens completes
              const newIdToken = localStorage.getItem('id_token'); // Get the latest token from storage
              if (newIdToken) {
                  const retryOptions = {
                      ...options,
                      headers: {
                          ...options.headers,
                          'Authorization': `Bearer ${newIdToken}` // Use the new token for the retry
                      }
                  };
                  // Clone the response body if it was consumed by the first fetch
                  // This is a more advanced scenario, for simple cases retrying the fetch is often enough
                  return fetch(url, retryOptions);
              } else {
                  console.error('Token refresh succeeded but could not retrieve new ID token from storage.');
                  logout(); // Logout if we can't get the new token
                  throw new Error('Failed to retrieve new token after refresh.');
              }
            } else {
                console.error('Token refresh failed.');
                 // refreshTokens already called logout on failure and set error state
                throw new Error(authError || 'Token refresh failed, user logged out.'); // Throw the error message set by refreshTokens
            }
        } else {
            console.warn('authFetch received 401 but no refresh token available. Logging out.');
            logout(); // Log out if no refresh token to attempt refresh
            throw new Error('Not authenticated, no refresh token available.');
        }
      }

      // Return the original response if not 401 or if refresh succeeded and retry happened
      return response;
    } catch (error) {
      console.error('Authenticated fetch request failed:', error);
      // Rethrow the error so the component calling authFetch can handle it
      throw error;
    }
  }, [idToken, refreshToken, refreshTokens, logout, authError]); // Dependencies: idToken, refreshToken, refreshTokens, logout, authError


  // --- Initialization Effect ---
  // Check for existing tokens in localStorage on mount
  // This effect runs ONCE when the component mounts
  useEffect(() => {
    console.log('AuthProvider mount: Checking for existing tokens...');
    const storedIdToken = localStorage.getItem('id_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');
    const storedServiceName = localStorage.getItem('auth_service_name'); // <<< Retrieve stored service name

    if (storedIdToken) {
      console.log('Stored ID token found.');
      // isTokenExpired now accepts buffer time
      const expired = isTokenExpired(storedIdToken, REFRESH_TOKEN_BUFFER_SECONDS);

      if (expired && storedRefreshToken && storedServiceName) { // Need service name for refresh
        // Token expired but we have a refresh token and service name, attempt refresh
        console.log('ID token expired, attempting to refresh...');
        // Call refreshTokens - this is safe because refreshTokens is declared above
        // The refreshTokens function now gets the service name from localStorage itself
        refreshTokens(storedRefreshToken);
      } else if (expired) {
        // Token expired with no refresh token or no service name, clear everything
        console.log('ID token expired and no refresh token/service name available. Logging out.');
        // Call logout - this is safe because logout is declared above
        logout();
      } else {
        // Valid token, set state and schedule next refresh
        console.log('Valid ID token found in storage. Setting state.');
        setIdToken(storedIdToken);
        setRefreshToken(storedRefreshToken);
        setUser(extractUserFromToken(storedIdToken)); // Use tokenUtils to extract user
        setIsAuthenticated(true);
        
        // Set provider from localStorage or token
        const storedProvider = localStorage.getItem('auth_provider') || 'google';
        setAuthProvider(storedProvider);

        // Schedule the next token refresh
        // getTimeUntilExpiration now accepts buffer time
        const timeUntilRefresh = getTimeUntilExpiration(storedIdToken, REFRESH_TOKEN_BUFFER_SECONDS);
        // Call scheduleTokenRefresh - this is safe because scheduleTokenRefresh is declared above
        scheduleTokenRefresh(timeUntilRefresh);
      }
    } else {
        // No ID token found, ensure state is not authenticated
        console.log('No ID token found in storage. User is not authenticated.');
        setIsAuthenticated(false);
        setUser(null);
        setIdToken(null);
        setRefreshToken(null);
        // Clear stored service name if no ID token is found
        localStorage.removeItem('auth_service_name');
    }

    // Set loading to false after initial check
    setIsLoading(false);

    // The cleanup function for the timer is handled by a separate effect below
    // This effect's cleanup is just for anything specific to the initial mount check if needed
    // return () => { ... };
  }, [logout, refreshTokens, scheduleTokenRefresh]); // Dependencies: logout, refreshTokens, scheduleTokenRefresh


  // --- Cleanup Effect ---
  // Clean up the refresh timer when the component unmounts
  // This effect runs ONCE when the component mounts and its cleanup runs ONCE on unmount
  useEffect(() => {
    console.log('AuthProvider mount: Setting up timer cleanup.');
    return () => {
      console.log('AuthProvider unmount: Clearing refresh timer.');
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []); // Empty dependency array means this runs once on mount and cleanup on unmount


  // --- Context Value ---
  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = React.useMemo(() => ({
    user,
    idToken,
    isAuthenticated,
    isLoading,
    authError, // Expose authError state
    authProvider, // Expose which provider is being used
    loginWith,
    handleAuthCode,
    logout,
    authFetch,
    // refreshTokens // Not typically exposed via context, but can be if needed
  }), [user, idToken, isAuthenticated, isLoading, authError, authProvider, loginWith, handleAuthCode, logout, authFetch]);


  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
