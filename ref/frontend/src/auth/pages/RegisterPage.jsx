// src/auth/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/primitives/card';
import { Button } from '../../components/ui/primitives/button';
import { Alert, AlertDescription } from '../../components/ui/primitives/alert';
import { Loader2, ArrowLeft, Check, X } from 'lucide-react';
import { storeTokens } from '../utils/tokenUtils';

const USER_SETTINGS_API = import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  const [includeEmail, setIncludeEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check username availability as user types
    if (name === 'username' && value.length >= 3) {
      checkUsernameDebounced(value);
    }
  };

  let usernameCheckTimeout;
  const checkUsernameDebounced = (username) => {
    clearTimeout(usernameCheckTimeout);
    setCheckingUsername(true);
    usernameCheckTimeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `${USER_SETTINGS_API}/api/auth/check-username?username=${encodeURIComponent(username)}`,
          {
            method: 'POST'
          }
        );
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  const validateForm = () => {
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    if (formData.username.includes('@')) {
      setError('Username cannot contain @ symbol');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (includeEmail && formData.email && !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (usernameAvailable === false) {
      setError('Username is already taken');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        username: formData.username.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword
      };

      // Only include email if checkbox is checked and email is provided
      if (includeEmail && formData.email) {
        requestBody.email = formData.email.trim();
      }

      const response = await fetch(`${USER_SETTINGS_API}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(data.detail || 'Username or email already exists');
        } else if (response.status === 422) {
          setError(data.detail?.[0]?.msg || 'Invalid input. Please check your data.');
        } else {
          setError(data.detail || 'Registration failed. Please try again.');
        }
        setLoading(false);
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
      console.error('Registration error:', error);
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  const passwordsMatch = formData.password && formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Join Prelude Platform
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to login
            </button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 pr-10"
                  placeholder="Choose a unique username"
                  autoComplete="username"
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
                {!checkingUsername && formData.username.length >= 3 && usernameAvailable === true && (
                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                )}
                {!checkingUsername && formData.username.length >= 3 && usernameAvailable === false && (
                  <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-600" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum 3 characters, no @ symbol allowed
              </p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 pr-10"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
                {formData.confirmPassword && passwordsMatch && (
                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                )}
                {formData.confirmPassword && !passwordsMatch && (
                  <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-600" />
                )}
              </div>
            </div>

            {/* Optional Email Checkbox */}
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-md border border-blue-200">
              <input
                type="checkbox"
                id="includeEmail"
                checked={includeEmail}
                onChange={(e) => setIncludeEmail(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="includeEmail" className="text-sm text-gray-700 flex-1 cursor-pointer">
                <span className="font-medium">I have an email address (optional)</span>
                <p className="text-xs text-gray-600 mt-1">
                  Add your email to enable notifications and account recovery
                </p>
              </label>
            </div>

            {/* Email Field (conditional) */}
            {includeEmail && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this for important notifications
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || usernameAvailable === false || !passwordsMatch}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:underline"
              >
                Sign in here
              </button>
            </p>
          </form>

          <p className="text-xs text-center text-muted-foreground pt-4 border-t mt-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
