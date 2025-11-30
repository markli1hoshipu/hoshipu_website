// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/primitives/card';
import { Button } from '../../components/ui/primitives/button';
import { Alert, AlertDescription } from '../../components/ui/primitives/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import googleLogo from '../assets/google_logo.svg';
import microsoftLogo from '../assets/microsoft_logo.svg';
import { storeTokens, extractUserFromToken } from '../utils/tokenUtils';

const USER_SETTINGS_API = import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005';

function LoginPage() {
  const { loginWith, authError, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  const handleGoogleLogin = () => {
    setLoadingProvider('google');
    loginWith('google');
  };

  const handleMicrosoftLogin = () => {
    setLoadingProvider('microsoft');
    loginWith('microsoft');
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoadingProvider('password');

    try {
      const response = await fetch(`${USER_SETTINGS_API}/api/auth/login-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error messages from backend
        if (response.status === 404) {
          setLoginError('Username does not exist');
        } else if (response.status === 401) {
          setLoginError('Incorrect password');
        } else if (response.status === 400) {
          setLoginError(data.detail || 'This account uses OAuth login');
        } else {
          setLoginError(data.detail || 'Login failed. Please try again.');
        }
        setLoadingProvider(null);
        return;
      }

      // Store tokens
      storeTokens({
        id_token: data.id_token,
        refresh_token: data.refresh_token
      });

      // Store auth provider type
      localStorage.setItem('auth_provider', 'password');
      localStorage.setItem('auth_service_name', 'password');

      // Navigate to dashboard - AuthProvider will pick up the tokens
      window.location.href = '/dashboard';

    } catch (error) {
      console.error('Password login error:', error);
      setLoginError('Network error. Please check your connection.');
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Prelude</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your preferred sign-in method
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {(authError || loginError) && (
            <Alert variant="destructive">
              <AlertDescription>{loginError || authError}</AlertDescription>
            </Alert>
          )}

          {!showPasswordLogin ? (
            <>
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading && loadingProvider === 'google' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <img
                    src={googleLogo}
                    alt="Google"
                    className="mr-2 h-4 w-4"
                  />
                )}
                {isLoading && loadingProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
              </Button>

              <Button
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading && loadingProvider === 'microsoft' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <img
                    src={microsoftLogo}
                    alt="Microsoft"
                    className="mr-2 h-4 w-4"
                  />
                )}
                {isLoading && loadingProvider === 'microsoft' ? 'Signing in...' : 'Continue with Microsoft'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setShowPasswordLogin(true)}
                variant="link"
                className="w-full"
              >
                Sign in with username and password
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Don't have an account? <button onClick={() => navigate('/register')} className="text-blue-600 hover:underline">Register here</button>
              </p>
            </>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => { setShowPasswordLogin(false); setLoginError(null); }}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to OAuth login
              </button>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loadingProvider === 'password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loadingProvider === 'password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loadingProvider === 'password'}
                className="w-full"
              >
                {loadingProvider === 'password' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Don't have an account? <button type="button" onClick={() => navigate('/register')} className="text-blue-600 hover:underline">Register here</button>
              </p>
            </form>
          )}

          <p className="text-xs text-center text-muted-foreground pt-4 border-t">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;