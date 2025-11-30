import { useState, useCallback } from 'react';

const STORAGE_PREFIX = 'sales_center_data_limit_';

/**
 * Custom hook for managing data limit filter with session storage
 * Default: Limit enabled with 50 items
 */
export const useDataLimitFilter = () => {
  // Initialize dataLimit from sessionStorage or default to 50
  const [dataLimit, setDataLimitState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}limit`);
      return saved ? parseInt(saved) : 50;
    } catch (error) {
      console.warn('Failed to restore data limit setting:', error);
      return 50;
    }
  });

  // Initialize limitEnabled from sessionStorage or default to true
  const [limitEnabled, setLimitEnabledState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}enabled`);
      return saved !== 'false'; // Default true
    } catch (error) {
      console.warn('Failed to restore limit enabled setting:', error);
      return true;
    }
  });

  // Update dataLimit and save to sessionStorage
  const setDataLimit = useCallback((limit) => {
    sessionStorage.setItem(`${STORAGE_PREFIX}limit`, String(limit));
    setDataLimitState(limit);
  }, []);

  // Update limitEnabled and save to sessionStorage
  const setLimitEnabled = useCallback((enabled) => {
    sessionStorage.setItem(`${STORAGE_PREFIX}enabled`, String(enabled));
    setLimitEnabledState(enabled);
  }, []);

  // Get label for toolbar
  const getLimitLabel = useCallback(() => {
    if (!limitEnabled) return 'Show All';
    if (dataLimit >= 999999) return 'Show All';
    return `Top ${dataLimit}`;
  }, [limitEnabled, dataLimit]);

  return {
    dataLimit,
    setDataLimit,
    limitEnabled,
    setLimitEnabled,
    getLimitLabel,
  };
};
