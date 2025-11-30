import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input';

/**
 * SearchGroup Component
 * 
 * Center-positioned expandable search component with Monday.com styling.
 * Starts as a search icon and expands to full search input when clicked.
 * 
 * @param {Object} props
 * @param {string} [props.placeholder='Search...'] - Input placeholder text
 * @param {string} [props.value] - Controlled input value
 * @param {Function} [props.onChange] - Input change handler
 * @param {Function} [props.onSearch] - Search submit handler
 * @param {Function} [props.onClear] - Clear input handler
 * @param {boolean} [props.autoFocus=false] - Auto focus when expanded
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Additional CSS classes
 */
const SearchGroup = ({
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  onClear,
  autoFocus = false,
  disabled = false,
  className = '',
  // new optional props to manage search columns from parent
  searchColumns,
  onToggleSearchColumn,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef(null);
  
  // Use controlled or internal state
  const searchValue = value !== undefined ? value : internalValue;
  const isControlled = value !== undefined;

  const handleExpand = () => {
    if (disabled) return;
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    if (searchValue.trim()) return; // Don't collapse if there's content
    setIsExpanded(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    
    if (isControlled) {
      // For controlled components, call onChange with the new value
      onChange?.(newValue);
    } else {
      setInternalValue(newValue);
      onChange?.(newValue);
    }
  };

  const handleClear = () => {
    if (isControlled) {
      onClear?.();
    } else {
      setInternalValue('');
    }
    
    // Don't collapse immediately, let user continue typing
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch?.(searchValue);
    } else if (e.key === 'Escape') {
      if (searchValue) {
        handleClear();
      } else {
        handleCollapse();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(searchValue);
  };

  // Auto focus when expanded
  useEffect(() => {
    if (isExpanded && autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded, autoFocus]);

  // Keep expanded if there's content
  useEffect(() => {
    if (searchValue && !isExpanded) {
      setIsExpanded(true);
    }
  }, [searchValue, isExpanded]);

  return (
    <div className={`flex items-center justify-center ${className}`} {...props}>
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed State - Search Icon
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              disabled={disabled}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              aria-label="Expand search"
            >
              <Search className="h-5 w-5 text-gray-500" />
            </Button>
          </motion.div>
        ) : (
          // Expanded State - Full Search Input
          <motion.form
            key="expanded"
            initial={{ opacity: 0, width: 32 }}
            animate={{ opacity: 1, width: 320 }}
            exit={{ opacity: 0, width: 32 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onSubmit={handleSubmit}
            className="relative flex items-center"
          >
            {/* Search Icon */}
            <div className="absolute left-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>

            {/* Search Input */}
            <Input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleCollapse}
              placeholder={placeholder}
              disabled={disabled}
              className="
                pl-10 pr-8 h-8 text-sm
                border-gray-300 rounded-lg
                focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                placeholder:text-gray-400
                transition-all duration-200
              "
              aria-label="Search input"
            />

            {/* Clear Button */}
            {searchValue && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-5 w-5 p-0 hover:bg-gray-100 rounded"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </Button>
              </motion.div>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchGroup;