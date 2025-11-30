/**
 * DropdownSearch Component
 * Search input component for filtering dropdown options
 */
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, XIcon } from './icons';

const DropdownSearch = ({
  searchTerm = '',
  onSearchChange,
  onClear,
  placeholder = 'Search columns...',
  autoFocus = false,
  disabled = false,
  className = '',
  resultCount = 0,
  totalCount = 0
}) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-focus when component mounts if specified
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      const timer = setTimeout(() => {
        inputRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  // Handle clear button click
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle key events
  const handleKeyDown = (e) => {
    // Prevent dropdown from closing when typing
    e.stopPropagation();
    
    // Handle escape to clear search
    if (e.key === 'Escape' && searchTerm) {
      e.preventDefault();
      handleClear();
    }
  };

  const hasSearch = searchTerm && searchTerm.length > 0;
  const showResults = hasSearch && totalCount > 0;

  return (
    <div className={`border-b border-gray-200 bg-white ${className}`}>
      {/* Search Input */}
      <div className="relative px-3 py-2">
        <div className={`
          relative flex items-center border rounded-md transition-colors duration-150
          ${isFocused ? 'border-prelude-300 ring-1 ring-prelude-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
        `}>
          {/* Search Icon */}
          <div className="pl-2 pr-1">
            <SearchIcon className={`
              w-4 h-4 transition-colors duration-150
              ${isFocused ? 'text-prelude-500' : 'text-gray-400'}
            `} />
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              flex-1 px-2 py-1.5 text-sm bg-transparent border-none outline-none
              placeholder-gray-400
              ${disabled ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}
            `}
            aria-label="Search dropdown options"
            role="searchbox"
            aria-expanded="true"
            autoComplete="off"
          />

          {/* Clear Button */}
          <AnimatePresence>
            {hasSearch && !disabled && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={handleClear}
                className={`
                  p-1 rounded transition-colors duration-150
                  hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                  text-gray-400 hover:text-gray-600
                `}
                aria-label="Clear search"
                type="button"
              >
                <XIcon className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Results Info */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="px-3 py-1.5 bg-gray-50 border-b border-gray-200"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {resultCount === 0 ? (
                  <span className="text-amber-600">No results found</span>
                ) : (
                  <>
                    <span className="font-medium text-prelude-600">{resultCount}</span>
                    <span className="text-gray-500"> of {totalCount} columns</span>
                  </>
                )}
              </span>

              {resultCount === 0 && (
                <button
                  onClick={handleClear}
                  className="text-prelude-600 hover:text-prelude-700 font-medium"
                  type="button"
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Search suggestions for no results */}
            {resultCount === 0 && searchTerm.length > 2 && (
              <div className="mt-1 text-xs text-gray-500">
                Try searching for column types like "name", "id", or "date"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropdownSearch;