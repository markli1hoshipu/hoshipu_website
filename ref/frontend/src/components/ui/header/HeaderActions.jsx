import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../primitives/button';
import { MoreHorizontal, Loader2 } from 'lucide-react';

// Theme color configurations for action buttons
const themeColors = {
  blue: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200',
    gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500'
  },
  purple: {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200',
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-500'
  },
  pink: {
    primary: 'bg-pink-600 hover:bg-pink-700 text-white',
    secondary: 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200',
    gradient: 'bg-gradient-to-r from-pink-500 to-rose-500'
  },
  green: {
    primary: 'bg-green-600 hover:bg-green-700 text-white',
    secondary: 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200',
    gradient: 'bg-gradient-to-r from-green-500 to-emerald-500'
  },
  orange: {
    primary: 'bg-orange-600 hover:bg-orange-700 text-white',
    secondary: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200',
    gradient: 'bg-gradient-to-r from-orange-500 to-red-500'
  },
  indigo: {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200',
    gradient: 'bg-gradient-to-r from-indigo-500 to-blue-500'
  }
};

/**
 * HeaderActions Component
 * 
 * Renders a standardized set of action buttons for headers.
 * Supports primary, secondary, and icon-only button types.
 * 
 * @param {Object} props
 * @param {Array} props.actions - Array of action configurations
 * @param {string} [props.themeColor='blue'] - Theme color for styling
 * @param {string} [props.className] - Additional CSS classes
 * 
 * Action Configuration:
 * {
 *   id: 'unique-id',
 *   label: 'Button Text',
 *   icon: IconComponent, // Lucide React icon
 *   variant: 'primary' | 'secondary' | 'ghost' | 'icon', // Button style
 *   onClick: () => {}, // Click handler
 *   disabled?: boolean,
 *   loading?: boolean,
 *   tooltip?: string,
 *   hidden?: boolean // For responsive hiding
 * }
 */
const HeaderActions = ({
  actions = [],
  themeColor = 'blue',
  className = '',
  ...props
}) => {
  const theme = themeColors[themeColor] || themeColors.blue;

  // Filter out hidden actions
  const visibleActions = actions.filter(action => !action.hidden);
  
  if (visibleActions.length === 0) {
    return null;
  }

  // Separate actions into primary/secondary and overflow
  const primaryActions = visibleActions.filter(action => 
    action.variant === 'primary' || action.variant === 'secondary'
  );
  const iconActions = visibleActions.filter(action => 
    action.variant === 'icon' || action.variant === 'ghost'
  );

  const getButtonVariant = (action) => {
    switch (action.variant) {
      case 'primary':
        return 'default';
      case 'secondary':
        return 'outline';
      case 'icon':
        return 'ghost';
      case 'ghost':
      default:
        return 'ghost';
    }
  };

  const getButtonClasses = (action) => {
    const baseClasses = 'transition-all duration-200';
    
    // If action has custom className, use that instead of theme classes
    if (action.className) {
      return `${baseClasses} ${action.className}`;
    }
    
    switch (action.variant) {
      case 'primary':
        return `${baseClasses} ${theme.primary} shadow-sm hover:shadow-md`;
      case 'secondary':
        return `${baseClasses} ${theme.secondary} shadow-sm hover:shadow-md`;
      case 'icon':
        return `${baseClasses} h-9 w-9 p-0`;
      case 'ghost':
      default:
        return `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
    }
  };

  const renderAction = (action, index) => {
    const Icon = action.icon;
    const isIconOnly = action.variant === 'icon';
    const isLoading = action.loading;

    return (
      <motion.div
        key={action.id || index}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1, duration: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant={getButtonVariant(action)}
          size={action.size || (isIconOnly ? 'icon' : 'sm')}
          onClick={action.onClick}
          disabled={action.disabled || isLoading}
          className={getButtonClasses(action)}
          title={action.tooltip || action.label}
          aria-label={isIconOnly ? action.label : undefined}
          {...(action.ariaExpanded !== undefined && { 'aria-expanded': action.ariaExpanded })}
        >
          {isLoading ? (
            <>
              <Loader2 className={`w-4 h-4 animate-spin ${!isIconOnly && action.label ? 'mr-2' : ''}`} />
              {!isIconOnly && action.label}
            </>
          ) : (
            <>
              {Icon && (
                <Icon className={`w-4 h-4 ${!isIconOnly && action.label ? 'mr-2' : ''}`} />
              )}
              {!isIconOnly && action.label}
            </>
          )}
        </Button>
      </motion.div>
    );
  };

  return (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      {/* Primary and Secondary Actions */}
      {primaryActions.length > 0 && (
        <div className="flex items-center gap-2">
          {primaryActions.map((action, index) => renderAction(action, index))}
        </div>
      )}

      {/* Icon Actions */}
      {iconActions.length > 0 && (
        <div className="flex items-center gap-1">
          {iconActions.map((action, index) => renderAction(action, primaryActions.length + index))}
        </div>
      )}
    </div>
  );
};

export default HeaderActions;