import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../primitives/button';

/**
 * ActionIconGroup Component
 * 
 * Renders a group of secondary action icons beside the primary Add button.
 * Each icon has consistent styling with tooltips and proper accessibility.
 * 
 * @param {Object} props
 * @param {Array} props.actions - Array of action objects {icon, label, onClick, disabled, loading, tooltip}
 * @param {string} [props.themeColor='blue'] - Theme color for active/hover states
 * @param {string} [props.className] - Additional CSS classes
 */
const ActionIconGroup = ({
  actions = [],
  themeColor = 'blue',
  className = '',
  ...props
}) => {
  // Theme color configurations for consistent styling
  const themeColors = {
    blue: 'hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100',
    purple: 'hover:bg-purple-50 hover:text-purple-600 active:bg-purple-100',
    pink: 'hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100',
    green: 'hover:bg-green-50 hover:text-green-600 active:bg-green-100',
    orange: 'hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100',
    indigo: 'hover:bg-indigo-50 hover:text-indigo-600 active:bg-indigo-100'
  };

  const theme = themeColors[themeColor] || themeColors.blue;

  if (!actions || actions.length === 0) {
    return null;
  }

  const handleActionClick = (action, event) => {
    if (action.disabled || action.loading) {
      event.preventDefault();
      return;
    }
    action.onClick?.(event);
  };

  return (
    <div className={`flex items-center gap-2 ml-2 ${className}`} {...props}>
      {actions.map((action, index) => {
        const IconComponent = action.icon;
        
        if (!IconComponent) {
          console.warn(`ActionIconGroup: Action at index ${index} is missing an icon component`);
          return null;
        }

        return (
          <motion.div
            key={action.label || index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.15 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => handleActionClick(action, event)}
              disabled={action.disabled || action.loading}
              className={`
                h-8 w-8 p-0 rounded-lg transition-all duration-200
                text-gray-500 ${theme}
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:bg-transparent disabled:hover:text-gray-500
              `}
              title={action.tooltip || action.label}
              aria-label={action.label}
            >
              {action.loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5"
                >
                  <IconComponent className="w-5 h-5" />
                </motion.div>
              ) : (
                <IconComponent className="w-5 h-5" />
              )}
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ActionIconGroup;