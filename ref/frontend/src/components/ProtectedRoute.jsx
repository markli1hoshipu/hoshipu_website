// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/hooks/useAuth'; // Import your useAuth hook

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('ProtectedRoute: Auth state check - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

  // If the auth state is still loading, show nothing or a loading indicator
  if (isLoading) {
    console.log('ProtectedRoute: Still loading auth state, showing loading indicator');
    // You could render a full-page spinner component here
    // For now, returning null means nothing is rendered during the loading phase
    return null; // Or <div className="spinner" style={{ margin: '100px auto' }}></div>;
  }

  // If not authenticated, redirect to the login page
  if (!isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the protected content
  console.log('ProtectedRoute: User authenticated, rendering protected content');
  return children;
}

export default ProtectedRoute;