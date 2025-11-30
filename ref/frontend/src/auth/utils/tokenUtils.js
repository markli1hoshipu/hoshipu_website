// src/auth/utils/tokenUtils.js
import { jwtDecode } from 'jwt-decode';

/**
 * Decode and validate a JWT token
 * @param {string} token - JWT token to decode and validate
 * @returns {Object} Decoded token payload or null if invalid
 */
export function decodeToken(token) {
  if (!token) return null;
  
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 * @param {string} token - JWT token to check
 * @param {number} bufferSeconds - Seconds before actual expiration to consider token expired
 * @returns {boolean} True if expired, false otherwise
 */
export function isTokenExpired(token, bufferSeconds = 0) {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) return true;
  
  // Convert expiration to milliseconds and subtract buffer
  const expirationTime = decoded.exp * 1000 - (bufferSeconds * 1000);
  return Date.now() >= expirationTime;
}

/**
 * Calculate time until token expiration
 * @param {string} token - JWT token
 * @returns {number} Milliseconds until expiration (0 if expired or invalid)
 */
export function getTimeUntilExpiration(token) {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) return 0;
  
  const expirationTime = decoded.exp * 1000;
  const timeUntilExpiration = expirationTime - Date.now();
  
  return Math.max(0, timeUntilExpiration);
}

/**
 * Extract user information from token
 * @param {string} token - JWT token
 * @returns {Object} User information object or null if invalid
 */
export function extractUserFromToken(token) {
  const decoded = decodeToken(token);
  
  if (!decoded) return null;
  
  // Standardize user object structure
  return {
    id: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    picture: decoded.picture,
    // Add other fields as needed
  };
}

/**
 * Store authentication tokens securely
 * @param {Object} tokens - Token object with id_token and refresh_token
 */
export function storeTokens(tokens) {
  if (tokens.id_token) {
    localStorage.setItem('id_token', tokens.id_token);
  }
  
  if (tokens.refresh_token) {
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }
}

/**
 * Remove stored tokens
 */
export function clearTokens() {
  localStorage.removeItem('id_token');
  localStorage.removeItem('refresh_token');
}

/**
 * Retrieve stored tokens
 * @returns {Object} Object containing id_token and refresh_token
 */
export function getStoredTokens() {
  return {
    id_token: localStorage.getItem('id_token'),
    refresh_token: localStorage.getItem('refresh_token')
  };
}

/**
 * Create Authorization header with token
 * @param {string} token - JWT token
 * @returns {Object} Headers object with Authorization
 */
export function createAuthHeader(token) {
  return {
    'Authorization': `Bearer ${token}`
  };
}