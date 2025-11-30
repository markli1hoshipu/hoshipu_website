import { useState, useEffect, useCallback, useRef } from 'react';
import { setCookie, getCookie, removeCookie } from '../utils/cookieManager';

/**
 * Custom hook for persisting state in cookies
 * Automatically syncs state with cookies and handles updates
 * 
 * @param {string} cookieKey - The key to store the cookie under
 * @param {any} defaultValue - Default value if cookie doesn't exist
 * @param {object} options - Additional options
 * @param {number} options.expires - Cookie expiration in days (default: 365)
 * @param {boolean} options.syncAcrossTabs - Whether to sync across browser tabs (default: true)
 * @returns {[any, function, function]} - [value, setValue, clearValue]
 */
export const usePersistedState = (cookieKey, defaultValue, options = {}) => {
  const { expires = 365, syncAcrossTabs = true } = options;
  
  // Initialize state from cookie or default value
  const [state, setState] = useState(() => {
    const cookieValue = getCookie(cookieKey);
    return cookieValue !== null ? cookieValue : defaultValue;
  });

  // Track if this is the first render
  const isFirstRender = useRef(true);
  const lastCookieValue = useRef(state);

  // Update cookie when state changes
  useEffect(() => {
    // Skip cookie update on first render (initial load from cookie)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only update cookie if value actually changed
    if (JSON.stringify(state) !== JSON.stringify(lastCookieValue.current)) {
      setCookie(cookieKey, state, { expires });
      lastCookieValue.current = state;
    }
  }, [state, cookieKey, expires]);

  // Sync across tabs if enabled
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const checkForCookieChange = () => {
      const currentCookieValue = getCookie(cookieKey);
      if (currentCookieValue !== null && 
          JSON.stringify(currentCookieValue) !== JSON.stringify(state)) {
        setState(currentCookieValue);
        lastCookieValue.current = currentCookieValue;
      }
    };

    // Check for changes when window regains focus
    const handleFocus = () => {
      checkForCookieChange();
    };

    // Also check periodically for changes (fallback for browsers that don't fire focus events reliably)
    const intervalId = setInterval(checkForCookieChange, 2000);

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [state, cookieKey, syncAcrossTabs]);

  // Enhanced setter that handles function updates
  const setValue = useCallback((newValue) => {
    setState(prevState => {
      const nextState = typeof newValue === 'function' ? newValue(prevState) : newValue;
      return nextState;
    });
  }, []);

  // Clear the persisted value
  const clearValue = useCallback(() => {
    removeCookie(cookieKey);
    setState(defaultValue);
    lastCookieValue.current = defaultValue;
  }, [cookieKey, defaultValue]);

  return [state, setValue, clearValue];
};

/**
 * Hook for persisting multiple related states (like filters)
 * Stores all values in a single cookie to reduce cookie count
 * 
 * @param {string} cookieKey - The key to store the cookie under
 * @param {object} defaultValues - Object with default values for each key
 * @param {object} options - Additional options
 */
export const usePersistedStates = (cookieKey, defaultValues, options = {}) => {
  const [states, setStates, clearStates] = usePersistedState(cookieKey, defaultValues, options);

  // Create individual setters for each key
  const setters = {};
  Object.keys(defaultValues).forEach(key => {
    setters[key] = (value) => {
      setStates(prev => ({
        ...prev,
        [key]: typeof value === 'function' ? value(prev[key]) : value
      }));
    };
  });

  // Reset specific key to default
  const resetKey = (key) => {
    if (key in defaultValues) {
      setStates(prev => ({
        ...prev,
        [key]: defaultValues[key]
      }));
    }
  };

  // Reset all to defaults
  const resetAll = () => {
    setStates(defaultValues);
  };

  return {
    values: states,
    setters,
    setMultiple: (updates) => setStates(prev => ({ ...prev, ...updates })),
    resetKey,
    resetAll,
    clearAll: clearStates,
  };
};

// Specialized hooks for common use cases

/**
 * Hook specifically for table column visibility
 */
export const usePersistedColumns = (moduleId, defaultColumns) => {
  const cookieKey = `prelude_column_${moduleId}`;
  return usePersistedState(cookieKey, defaultColumns, { expires: 365 });
};

/**
 * Hook specifically for filter states
 */
export const usePersistedFilters = (moduleId, defaultFilters) => {
  const cookieKey = `prelude_filter_${moduleId}`;
  return usePersistedState(cookieKey, defaultFilters, { expires: 365 });
};

/**
 * Hook for search preferences (search term, search columns)
 */
export const usePersistedSearch = (moduleId, defaultSearch = { term: '', columns: {} }) => {
  const cookieKey = `prelude_search_${moduleId}`;
  const [search, setSearch, clearSearch] = usePersistedState(cookieKey, defaultSearch, { expires: 30 });

  return {
    searchTerm: search.term,
    searchColumns: search.columns,
    setSearchTerm: (term) => setSearch(prev => ({ ...prev, term })),
    setSearchColumns: (columns) => setSearch(prev => ({ ...prev, columns })),
    clearSearch,
  };
};

/**
 * Hook for UI preferences (collapsed panels, view modes, etc.)
 */
export const usePersistedUIState = (componentId, defaultState) => {
  const cookieKey = `prelude_ui_${componentId}`;
  return usePersistedState(cookieKey, defaultState, { expires: 365 });
};

export default usePersistedState;