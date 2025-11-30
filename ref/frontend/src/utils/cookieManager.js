import Cookies from 'js-cookie';

/**
 * Cookie Manager - Centralized cookie management for the application
 * Handles all cookie operations with proper configuration and error handling
 */

// Cookie configuration
const COOKIE_CONFIG = {
  expires: 365, // 1 year expiration for user preferences
  sameSite: 'lax', // Prevents CSRF while allowing normal navigation
  secure: window.location.protocol === 'https:', // Only use secure in production
};

// Cookie name prefixes for organization
const COOKIE_PREFIXES = {
  filter: 'prelude_filter_',
  column: 'prelude_column_',
  ui: 'prelude_ui_',
  preference: 'prelude_pref_',
};

/**
 * Set a cookie with proper error handling and JSON serialization
 * @param {string} key - Cookie name
 * @param {any} value - Value to store (will be JSON stringified)
 * @param {object} options - Additional cookie options
 */
export const setCookie = (key, value, options = {}) => {
  try {
    const serializedValue = JSON.stringify(value);
    // Check size limit (4KB)
    if (serializedValue.length > 4000) {
      console.warn(`Cookie ${key} exceeds 4KB limit, consider reducing data size`);
    }
    Cookies.set(key, serializedValue, { ...COOKIE_CONFIG, ...options });
    return true;
  } catch (error) {
    console.error(`Failed to set cookie ${key}:`, error);
    return false;
  }
};

/**
 * Get a cookie value with JSON parsing and error handling
 * @param {string} key - Cookie name
 * @param {any} defaultValue - Default value if cookie doesn't exist or parsing fails
 */
export const getCookie = (key, defaultValue = null) => {
  try {
    const value = Cookies.get(key);
    if (value === undefined) return defaultValue;
    return JSON.parse(value);
  } catch (error) {
    console.error(`Failed to get/parse cookie ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Remove a cookie
 * @param {string} key - Cookie name
 */
export const removeCookie = (key) => {
  try {
    Cookies.remove(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove cookie ${key}:`, error);
    return false;
  }
};

/**
 * Clear all cookies with a specific prefix
 * @param {string} prefix - Cookie prefix to clear
 */
export const clearCookiesByPrefix = (prefix) => {
  const allCookies = Cookies.get();
  Object.keys(allCookies).forEach(key => {
    if (key.startsWith(prefix)) {
      Cookies.remove(key);
    }
  });
};

/**
 * Get all cookies with a specific prefix
 * @param {string} prefix - Cookie prefix to search for
 */
export const getCookiesByPrefix = (prefix) => {
  const allCookies = Cookies.get();
  const result = {};
  Object.keys(allCookies).forEach(key => {
    if (key.startsWith(prefix)) {
      try {
        result[key] = JSON.parse(allCookies[key]);
      } catch {
        result[key] = allCookies[key];
      }
    }
  });
  return result;
};

// Module-specific cookie helpers
export const filterCookies = {
  set: (module, filters) => setCookie(`${COOKIE_PREFIXES.filter}${module}`, filters),
  get: (module, defaultValue = {}) => getCookie(`${COOKIE_PREFIXES.filter}${module}`, defaultValue),
  remove: (module) => removeCookie(`${COOKIE_PREFIXES.filter}${module}`),
};

export const columnCookies = {
  set: (module, columns) => setCookie(`${COOKIE_PREFIXES.column}${module}`, columns),
  get: (module, defaultValue = {}) => getCookie(`${COOKIE_PREFIXES.column}${module}`, defaultValue),
  remove: (module) => removeCookie(`${COOKIE_PREFIXES.column}${module}`),
};

export const uiCookies = {
  set: (key, value) => setCookie(`${COOKIE_PREFIXES.ui}${key}`, value),
  get: (key, defaultValue = null) => getCookie(`${COOKIE_PREFIXES.ui}${key}`, defaultValue),
  remove: (key) => removeCookie(`${COOKIE_PREFIXES.ui}${key}`),
};

export const preferenceCookies = {
  set: (key, value) => setCookie(`${COOKIE_PREFIXES.preference}${key}`, value),
  get: (key, defaultValue = null) => getCookie(`${COOKIE_PREFIXES.preference}${key}`, defaultValue),
  remove: (key) => removeCookie(`${COOKIE_PREFIXES.preference}${key}`),
};

// Clear all application cookies (useful for logout)
export const clearAllAppCookies = () => {
  Object.values(COOKIE_PREFIXES).forEach(prefix => {
    clearCookiesByPrefix(prefix);
  });
};

export default {
  setCookie,
  getCookie,
  removeCookie,
  clearCookiesByPrefix,
  getCookiesByPrefix,
  filterCookies,
  columnCookies,
  uiCookies,
  preferenceCookies,
  clearAllAppCookies,
};