import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '../primitives/button';
import ActionIconGroup from './ActionIconGroup';

// Theme color configurations for consistent styling
const themeColors = {
  blue: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    dropdown: 'hover:bg-blue-50'
  },
  purple: {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    dropdown: 'hover:bg-purple-50'
  },
  pink: {
    primary: 'bg-pink-600 hover:bg-pink-700 text-white',
    dropdown: 'hover:bg-pink-50'
  },
  green: {
    primary: 'bg-green-600 hover:bg-green-700 text-white',
    dropdown: 'hover:bg-green-50'
  },
  orange: {
    primary: 'bg-orange-600 hover:bg-orange-700 text-white',
    dropdown: 'hover:bg-orange-50'
  },
  indigo: {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    dropdown: 'hover:bg-indigo-50'
  }
};

/**
 * PrimaryActionGroup Component
 * 
 * Left-aligned primary action button with optional dropdown menu and secondary action icons.
 * Follows Monday.com design patterns for primary actions with improved layout.
 * 
 * @param {Object} props
 * @param {string} props.primaryLabel - Label for the main action button
 * @param {Function} [props.onPrimaryAction] - Handler for primary button click
 * @param {Array} [props.dropdownActions] - Array of dropdown action objects {label, onClick, icon}
 * @param {Array} [props.actionIcons] - Array of secondary action icons {icon, label, onClick, disabled, loading, tooltip}
 * @param {string} [props.themeColor='blue'] - Theme color
 * @param {boolean} [props.disabled=false] - Whether the actions are disabled
 * @param {boolean} [props.loading=false] - Loading state
 */
const PrimaryActionGroup = ({
  primaryLabel = 'New Item',
  onPrimaryAction,
  dropdownActions = [],
  actionIcons = [],
  themeColor = 'blue',
  disabled = false,
  loading = false,
  ...props
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const theme = themeColors[themeColor] || themeColors.blue;

  const handlePrimaryClick = () => {
    if (disabled || loading) return;
    
    if (dropdownActions.length === 0) {
      // If no dropdown actions, execute primary action directly
      onPrimaryAction?.();
    } else {
      // If dropdown actions exist, use first one as primary
      const primaryAction = dropdownActions[0];
      primaryAction?.onClick?.();
    }
  };

  const handleDropdownToggle = () => {
    if (disabled || loading) return;
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownAction = (action) => {
    action.onClick?.();
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex items-center" {...props}>
      {/* Primary Action Container */}
      <div className="relative flex items-center">
      {/* Primary Action Button */}
      <Button
        onClick={handlePrimaryClick}
        disabled={disabled || loading}
        className={`
          ${theme.primary}
          px-4 py-2 text-sm font-medium
          ${dropdownActions.length > 0 ? 'rounded-r-none border-r-0' : 'rounded-lg'}
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={primaryLabel}
      >
        <Plus className="w-4 h-4 mr-2" />
        {loading ? 'Loading...' : primaryLabel}
      </Button>

      {/* Dropdown Toggle Button */}
      {dropdownActions.length > 0 && (
        <Button
          onClick={handleDropdownToggle}
          disabled={disabled || loading}
          className={`
            ${theme.primary}
            px-2 py-2 rounded-l-none border-l border-white/20
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label="More actions"
          aria-expanded={isDropdownOpen}
          aria-haspopup="menu"
        >
          <motion.div
            animate={{ rotate: isDropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </Button>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isDropdownOpen && dropdownActions.length > 0 && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
              aria-hidden="true"
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
              role="menu"
              aria-orientation="vertical"
            >
              {dropdownActions.map((action, index) => (
                <motion.button
                  key={action.label || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.15 }}
                  onClick={() => handleDropdownAction(action)}
                  className={`
                    w-full text-left px-4 py-2 text-sm text-gray-700
                    ${theme.dropdown}
                    transition-colors duration-150
                    flex items-center gap-3
                    first:rounded-t-lg last:rounded-b-lg
                  `}
                  role="menuitem"
                  disabled={action.disabled}
                >
                  {action.icon && (
                    <action.icon className="w-4 h-4 text-gray-500" />
                  )}
                  <span className={action.disabled ? 'text-gray-400' : ''}>
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
      
      {/* Secondary Action Icons */}
      {actionIcons && actionIcons.length > 0 && (
        <ActionIconGroup
          actions={actionIcons}
          themeColor={themeColor}
        />
      )}
    </div>
  );
};

export default PrimaryActionGroup;