import { useState, useCallback, useEffect } from 'react';
import { subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { getCookie, setCookie, removeCookie } from '../utils/cookieManager';

const COOKIE_KEY = 'prelude_filter_sales_date';

/**
 * Custom hook for managing date range filter with cookies
 * Persists filter across sessions and page refreshes
 */
export const useDateFilter = () => {
  // Initialize from cookies or default to null (All Time)
  const [dateFilter, setDateFilterState] = useState(() => {
    try {
      // Try cookies first
      const saved = getCookie(COOKIE_KEY);
      if (saved) {
        return {
          startDate: new Date(saved.startDate),
          endDate: new Date(saved.endDate),
          label: saved.label || 'Custom Range'
        };
      }
      
      // Fallback to sessionStorage for migration
      const sessionSaved = sessionStorage.getItem('sales_trends_date_filter');
      if (sessionSaved) {
        const parsed = JSON.parse(sessionSaved);
        const filter = {
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
          label: parsed.label || 'Custom Range'
        };
        // Migrate to cookies
        setCookie(COOKIE_KEY, {
          startDate: filter.startDate.toISOString(),
          endDate: filter.endDate.toISOString(),
          label: filter.label
        }, { expires: 30 });
        // Clear sessionStorage after migration
        sessionStorage.removeItem('sales_trends_date_filter');
        return filter;
      }
    } catch (error) {
      console.warn('Failed to restore date filter:', error);
    }
    return null; // Default to "All Time" (no filter)
  });

  // Update filter and save to cookies
  const setDateFilter = useCallback((filter) => {
    if (filter === null) {
      // Clear filter
      removeCookie(COOKIE_KEY);
      setDateFilterState(null);
    } else {
      // Save filter to cookies
      const filterToSave = {
        startDate: filter.startDate.toISOString(),
        endDate: filter.endDate.toISOString(),
        label: filter.label
      };
      setCookie(COOKIE_KEY, filterToSave, { expires: 30 }); // 30 days expiry
      setDateFilterState(filter);
    }
  }, []);

  // Clear filter (set to All Time)
  const clearFilter = useCallback(() => {
    setDateFilter(null);
  }, [setDateFilter]);

  // Set preset ranges
  const setPreset = useCallback((preset) => {
    const now = endOfDay(new Date());
    let start;
    let label;

    switch (preset) {
      case 'last_3_months':
        start = startOfDay(subMonths(now, 3));
        label = 'Last 3 Months';
        break;
      case 'last_6_months':
        start = startOfDay(subMonths(now, 6));
        label = 'Last 6 Months';
        break;
      case 'last_year':
        start = startOfDay(subYears(now, 1));
        label = 'Last Year';
        break;
      case 'all_time':
        clearFilter();
        return;
      default:
        return;
    }

    setDateFilter({
      startDate: start,
      endDate: now,
      label
    });
  }, [setDateFilter, clearFilter]);

  // Check if filter is active
  const isFilterActive = dateFilter !== null;

  // Get filter summary text
  const getFilterSummary = useCallback(() => {
    if (!dateFilter) return 'All Time';
    return dateFilter.label || 'Custom Range';
  }, [dateFilter]);

  return {
    dateFilter,
    setDateFilter,
    clearFilter,
    setPreset,
    isFilterActive,
    getFilterSummary
  };
};
