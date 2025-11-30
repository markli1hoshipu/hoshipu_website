/**
 * Context for managing dropdown state across column mapping components
 * Eliminates prop drilling and optimizes re-renders
 */
import React, { createContext, useContext, useCallback, useState } from 'react';

const DropdownContext = createContext();

export const useDropdownContext = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdownContext must be used within a DropdownProvider');
  }
  return context;
};

export const DropdownProvider = ({ children }) => {
  const [openDropdowns, setOpenDropdowns] = useState(new Set());

  const toggleDropdown = useCallback((columnName) => {
    setOpenDropdowns(prev => {
      if (prev.has(columnName)) {
        // Close the dropdown if it's currently open
        return new Set();
      } else {
        // Close all others and open this one
        return new Set([columnName]);
      }
    });
  }, []);

  const closeDropdown = useCallback((columnName) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(columnName);
      return newSet;
    });
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns(new Set());
  }, []);

  const isDropdownOpen = useCallback((columnName) => {
    return openDropdowns.has(columnName);
  }, [openDropdowns]);

  const value = {
    toggleDropdown,
    closeDropdown,
    closeAllDropdowns,
    isDropdownOpen
  };

  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
};

export default DropdownContext;