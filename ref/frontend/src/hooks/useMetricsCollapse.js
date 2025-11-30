import { useState } from 'react';

/**
 * Custom hook for managing collapsible metrics sections with localStorage persistence
 * @param {string} pageKey - Unique identifier for the page (e.g., 'leads', 'crm', 'employees')
 * @returns {object} - { isCollapsed, toggleCollapsed }
 */
export const useMetricsCollapse = (pageKey) => {
  const storageKey = `metrics_collapsed_${pageKey}`;
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      // Default to collapsed (true) for space optimization
      return stored === null ? true : stored === 'true';
    } catch (error) {
      console.warn('Failed to read metrics collapse state from localStorage:', error);
      return true; // Default to collapsed
    }
  });

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    
    try {
      localStorage.setItem(storageKey, newState.toString());
    } catch (error) {
      console.warn('Failed to save metrics collapse state to localStorage:', error);
    }
  };

  return {
    isCollapsed,
    toggleCollapsed
  };
}; 