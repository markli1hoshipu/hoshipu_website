/**
 * DropdownMenu Component
 * Main popup container for dropdown options with accessibility and keyboard navigation
 */
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import DropdownSearch from './DropdownSearch';
import DropdownGroup from './DropdownGroup';
import { groupOptions } from './icons';

const DropdownMenu = ({
  isOpen = false,
  options = [],
  selectedValue,
  onOptionSelect,
  onClose,
  searchable = true,
  searchTerm = '',
  onSearchChange,
  onSearchClear,
  position = { top: 0, left: 0, width: 0, maxHeight: 300 },
  focusedIndex = -1,
  onFocusedIndexChange,
  className = ''
}) => {
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  // Handle click outside to close - enhanced for portal rendering
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      // Check if click is on the menu itself
      if (menuRef.current && menuRef.current.contains(event.target)) {
        return;
      }
      
      // Check if click is on any trigger button (to avoid interfering with toggle)
      const clickedElement = event.target;
      const isClickOnTrigger = clickedElement.closest('[role="button"][aria-haspopup="listbox"]');
      if (isClickOnTrigger) {
        return;
      }
      
      // Close the dropdown for any other click
      onClose?.();
    };

    // Use setTimeout to avoid capturing the same click that opened the dropdown
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, false);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, false);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      const totalOptions = options.length;
      if (totalOptions === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          onFocusedIndexChange?.(
            focusedIndex < totalOptions - 1 ? focusedIndex + 1 : 0
          );
          break;
        
        case 'ArrowUp':
          event.preventDefault();
          onFocusedIndexChange?.(
            focusedIndex > 0 ? focusedIndex - 1 : totalOptions - 1
          );
          break;
        
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < totalOptions) {
            const focusedOption = options[focusedIndex];
            onOptionSelect?.(focusedOption.value);
          }
          break;
        
        case 'Escape':
          event.preventDefault();
          if (searchTerm) {
            onSearchClear?.();
          } else {
            onClose?.();
          }
          break;

        case 'Tab':
          onClose?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, options, onFocusedIndexChange, onOptionSelect, onClose, searchTerm, onSearchClear]);

  // Auto-focus search when menu opens with better cleanup
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      const timer = setTimeout(() => {
        if (searchRef.current && isOpen) {
          searchRef.current?.focus?.();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  // Group options for display
  const groupedOptions = groupOptions(options);
  const hasOptions = options.length > 0;
  const hasSearchResults = searchTerm ? options.length > 0 : true;

  // Handle option mouse enter for keyboard navigation
  const handleOptionMouseEnter = (index) => {
    onFocusedIndexChange?.(index);
  };

  // Calculate total filtered count
  const totalFilteredCount = Object.values(groupedOptions).reduce(
    (count, group) => count + group.length, 0
  );

  // Ensure we have valid position values, with fallbacks
  const safePosition = {
    top: typeof position.top === 'number' && position.top >= 0 ? position.top : 100,
    left: typeof position.left === 'number' && position.left >= 0 ? position.left : 100,
    width: typeof position.width === 'number' && position.width > 0 ? position.width : 280,
    maxHeight: typeof position.maxHeight === 'number' && position.maxHeight > 0 ? position.maxHeight : 300
  };

  // Always render if open and we have options - position will be handled with fallbacks
  const hasValidPosition = isOpen && hasOptions;

  
  const menuContent = (
    <AnimatePresence>
      {isOpen && hasValidPosition && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`
            bg-white border-2 border-gray-300 rounded-lg shadow-2xl overflow-hidden
            ${className}
          `}
          style={{
            position: 'fixed',
            top: safePosition.top,
            left: safePosition.left,
            width: safePosition.width,
            maxHeight: safePosition.maxHeight,
            zIndex: 10000,
            minWidth: '280px'
          }}
          role="listbox"
          aria-multiselectable="false"
          aria-label="Column mapping options"
        >
          {/* Search Section */}
          {searchable && (
            <DropdownSearch
              ref={searchRef}
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              onClear={onSearchClear}
              resultCount={totalFilteredCount}
              totalCount={options.length}
              autoFocus={true}
            />
          )}

          {/* Options Container */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: searchable ? safePosition.maxHeight - 60 : safePosition.maxHeight }}
          >
            {hasOptions && hasSearchResults ? (
              <div>
                {/* AI Recommendations Group */}
                {groupedOptions.ai_recommendations.length > 0 && (
                  <DropdownGroup
                    groupKey="ai_recommendations"
                    options={groupedOptions.ai_recommendations}
                    selectedValue={selectedValue}
                    focusedIndex={focusedIndex}
                    onOptionClick={onOptionSelect}
                    onOptionMouseEnter={handleOptionMouseEnter}
                  />
                )}

                {/* Database Columns Group */}
                {groupedOptions.database_columns.length > 0 && (
                  <DropdownGroup
                    groupKey="database_columns"
                    options={groupedOptions.database_columns}
                    selectedValue={selectedValue}
                    focusedIndex={focusedIndex}
                    onOptionClick={onOptionSelect}
                    onOptionMouseEnter={handleOptionMouseEnter}
                  />
                )}

                {/* Import Options Group */}
                {groupedOptions.import_options.length > 0 && (
                  <DropdownGroup
                    groupKey="import_options"
                    options={groupedOptions.import_options}
                    selectedValue={selectedValue}
                    focusedIndex={focusedIndex}
                    onOptionClick={onOptionSelect}
                    onOptionMouseEnter={handleOptionMouseEnter}
                  />
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="px-4 py-8 text-center">
                <div className="text-gray-400 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-sm text-gray-500">
                  {searchTerm ? 'No matching columns found' : 'No options available'}
                </div>
                {searchTerm && (
                  <button
                    onClick={onSearchClear}
                    className="text-sm text-prelude-600 hover:text-prelude-700 mt-2 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Always render in portal for proper z-index management
  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return menuContent;
};

DropdownMenu.displayName = 'DropdownMenu';

export default DropdownMenu;