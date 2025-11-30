/**
 * CustomDropdown Component
 * Main dropdown component with MondayCRM-inspired design and full functionality
 */
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import DropdownTrigger from './DropdownTrigger';
import DropdownMenu from './DropdownMenu';
import { useDropdownContext } from '../../contexts/DropdownContext';

const CustomDropdown = ({
  value = '',
  options = [],
  onChange,
  placeholder = 'Choose column...',
  searchable = true,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  columnName,
  llmRecommendation,
  confidence = 0,
  hasError = false,
  maxHeight = 300,
  ...props
}) => {
  // Context-based dropdown state
  const { isDropdownOpen, toggleDropdown, closeDropdown } = useDropdownContext();
  const isOpen = isDropdownOpen(columnName);
  
  // Local state management
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [triggerPosition, setTriggerPosition] = useState({ top: 0, left: 0, width: 280, maxHeight: 300 });

  // Refs
  const triggerRef = useRef(null);

  // Find selected option
  const selectedOption = useMemo(() => {
    return options.find(option => option.value === value) || null;
  }, [options, value]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    
    const term = searchTerm.toLowerCase();
    return options.filter(option => {
      return (
        option.label.toLowerCase().includes(term) ||
        option.value.toLowerCase().includes(term) ||
        (option.description && option.description.toLowerCase().includes(term))
      );
    });
  }, [options, searchTerm]);

  // Calculate viewport-relative position for portal rendering
  const updateTriggerPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = maxHeight || 300;
      
      // Determine if dropdown should flip above trigger
      const shouldFlipUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Fix horizontal positioning - ensure dropdown stays within viewport
      const dropdownWidth = Math.max(280, Math.min(rect.width, 400)); // Min 280px, max 400px
      const viewportWidth = window.innerWidth;
      
      let leftPosition = rect.left;
      const rightEdge = leftPosition + dropdownWidth;
      
      // If dropdown would go off-screen to the right, adjust position
      if (rightEdge > viewportWidth - 16) {
        leftPosition = Math.max(8, viewportWidth - dropdownWidth - 16);
      }
      
      // Ensure dropdown doesn't go off-screen to the left
      leftPosition = Math.max(8, leftPosition);
      
      const newPosition = {
        top: shouldFlipUp ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
        left: leftPosition,
        width: dropdownWidth,
        maxHeight: shouldFlipUp ? Math.min(spaceAbove - 8, dropdownHeight) : Math.min(spaceBelow - 8, dropdownHeight)
      };
      
      setTriggerPosition(newPosition);
    }
  }, [maxHeight]);

  // Handle dropdown open/close
  const handleToggle = useCallback((e) => {
    if (disabled) return;
    
    // Prevent event from bubbling to avoid triggering click outside
    e.stopPropagation();

    if (!isOpen) {
      setFocusedIndex(-1);
      setSearchTerm('');
      // Update position immediately before opening
      updateTriggerPosition();
      toggleDropdown(columnName);
    } else {
      toggleDropdown(columnName);
      setSearchTerm('');
      setFocusedIndex(-1);
    }
  }, [isOpen, disabled, columnName, toggleDropdown, updateTriggerPosition]);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      updateTriggerPosition();
    }
  }, [isOpen, updateTriggerPosition]);

  // Handle option selection with improved focus management
  const handleOptionSelect = useCallback((optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    closeDropdown(columnName);
    setSearchTerm('');
    setFocusedIndex(-1);
    
    // Return focus to trigger with delay to ensure DOM updates
    setTimeout(() => {
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    }, 50);
  }, [onChange, columnName, closeDropdown]);

  // Handle search changes
  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
    setFocusedIndex(-1); // Reset focus when searching
  }, []);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setSearchTerm('');
    setFocusedIndex(-1);
  }, []);

  // Handle keyboard navigation on trigger
  const handleTriggerKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          handleToggle(e);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          closeDropdown(columnName);
        }
        break;
    }
  }, [isOpen, handleToggle, columnName, closeDropdown]);

  // Handle focused index changes
  const handleFocusedIndexChange = useCallback((index) => {
    setFocusedIndex(index);
  }, []);

  // Update position on scroll/resize with throttling
  useEffect(() => {
    if (isOpen) {
      let timeoutId = null;
      
      const handlePositionUpdate = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(updateTriggerPosition, 16); // ~60fps throttling
      };

      window.addEventListener('scroll', handlePositionUpdate, true);
      window.addEventListener('resize', handlePositionUpdate);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('scroll', handlePositionUpdate, true);
        window.removeEventListener('resize', handlePositionUpdate);
      };
    }
  }, [isOpen, updateTriggerPosition]);

  // Close dropdown when clicking outside - handled by DropdownMenu component
  // Removed duplicate click outside handler to prevent conflicts

  // Enhance options with ignore option if not already present
  const enhancedOptions = useMemo(() => {
    const hasIgnoreOption = options.some(opt => opt.value === 'ignore_column');
    if (hasIgnoreOption) {
      return options;
    }

    // Add ignore option to the end
    return [
      ...options,
      {
        value: 'ignore_column',
        label: 'Ignore column',
        type: 'ignore_column',
        isRecommended: false,
        hasLlmSupport: false,
        description: 'Exclude this column from import'
      }
    ];
  }, [options]);

  return (
    <div className={`relative ${className}`} {...props}>
      {/* Trigger Button */}
      <DropdownTrigger
        ref={triggerRef}
        selectedValue={value}
        selectedOption={selectedOption}
        placeholder={placeholder}
        isOpen={isOpen}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        llmRecommendation={llmRecommendation}
        confidence={confidence}
        hasError={hasError}
        aria-label={ariaLabel || `Select mapping for ${columnName || 'column'}`}
      />

      {/* Dropdown Menu */}
      <DropdownMenu
        isOpen={isOpen}
        options={searchable ? filteredOptions : enhancedOptions}
        selectedValue={value}
        onOptionSelect={handleOptionSelect}
        onClose={() => closeDropdown(columnName)}
        searchable={searchable}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        position={triggerPosition}
        focusedIndex={focusedIndex}
        onFocusedIndexChange={handleFocusedIndexChange}
      />
    </div>
  );
};

export default CustomDropdown;