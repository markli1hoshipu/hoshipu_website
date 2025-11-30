import { useState, useCallback } from 'react';
import { getCookie, setCookie } from '../utils/cookieManager';

const COOKIE_KEY = 'prelude_filter_unknown';
const OLD_STORAGE_KEY = 'sales_center_show_unknown'; // For migration

/**
 * Custom hook for managing unknown entity filter with cookies
 * Default: Hide unknown entities (showUnknown: false)
 */
export const useUnknownFilter = () => {
  // Initialize from cookies with sessionStorage fallback for migration
  const [showUnknown, setShowUnknownState] = useState(() => {
    try {
      // Try cookies first
      const saved = getCookie(COOKIE_KEY);
      if (saved !== null) {
        return saved;
      }
      
      // Fallback to sessionStorage for migration
      const sessionSaved = sessionStorage.getItem(OLD_STORAGE_KEY);
      if (sessionSaved !== null) {
        const value = sessionSaved === 'true';
        // Migrate to cookies
        setCookie(COOKIE_KEY, value, { expires: 365 });
        // Clear sessionStorage after migration
        sessionStorage.removeItem(OLD_STORAGE_KEY);
        return value;
      }
    } catch (error) {
      console.warn('Failed to restore unknown filter setting:', error);
    }
    return false; // Default to hiding unknown
  });

  // Update state and save to cookies
  const setShowUnknown = useCallback((show) => {
    setCookie(COOKIE_KEY, show, { expires: 365 });
    setShowUnknownState(show);
  }, []);

  // Get label for toolbar
  const getFilterLabel = useCallback(() => {
    return showUnknown ? 'Unknown: Shown' : 'Unknown: Hidden';
  }, [showUnknown]);

  return {
    showUnknown,
    setShowUnknown,
    getFilterLabel,
  };
};
