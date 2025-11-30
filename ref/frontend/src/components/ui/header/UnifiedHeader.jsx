import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { Button } from '../primitives/button';
import HeaderActions from './HeaderActions';
import TabNavigation from './TabNavigation';
import UnifiedToolbar from '../toolbar/UnifiedToolbar';

// Theme color configurations matching existing design system
const themeColors = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-600',
    background: 'bg-blue-50',
    border: 'border-blue-200'
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-600',
    background: 'bg-purple-50',
    border: 'border-purple-200'
  },
  pink: {
    gradient: 'from-pink-500 to-rose-500',
    iconColor: 'text-pink-600',
    background: 'bg-pink-50',
    border: 'border-pink-200'
  },
  green: {
    gradient: 'from-green-500 to-emerald-500',
    iconColor: 'text-green-600',
    background: 'bg-green-50',
    border: 'border-green-200'
  },
  orange: {
    gradient: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-600',
    background: 'bg-orange-50',
    border: 'border-orange-200'
  },
  indigo: {
    gradient: 'from-indigo-500 to-blue-500',
    iconColor: 'text-indigo-600',
    background: 'bg-indigo-50',
    border: 'border-indigo-200'
  }
};

/**
 * UnifiedHeader Component
 * 
 * A reusable header component that standardizes layout and functionality
 * across all sections of the application.
 * 
 * @param {Object} props
 * @param {string} props.title - Main title text
 * @param {string} [props.description] - Optional description text below title
 * @param {React.ComponentType} [props.icon] - Lucide React icon component
 * @param {string} [props.themeColor='blue'] - Theme color (blue, purple, pink, green, orange, indigo)
 * @param {Array} [props.actions] - Array of action button configurations
 * @param {Array} [props.tabs] - Array of tab configurations for navigation
 * @param {Object} [props.toolbar] - Toolbar configuration object
 * @param {boolean} [props.showToolbar=true] - Whether to show the toolbar
 * @param {string} [props.className] - Additional CSS classes
 */
const UnifiedHeader = ({
  title,
  description,
  icon: Icon,
  themeColor = 'blue',
  actions = [],
  tabs = [],
  toolbar = null,
  showToolbar = true,
  className = '',
  ...props
}) => {
  const theme = themeColors[themeColor] || themeColors.blue;

  return (
    <div className={className}>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="px-6 py-3 bg-white"
        role="banner"
        {...props}
      >
      <div className="flex items-center justify-between gap-3">
        {/* Left Section: Title and Description */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          {Icon && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex-shrink-0"
            >
              <div className={`w-8 h-8 ${theme.background} rounded-lg flex items-center justify-center ${theme.border} border`}>
                <Icon className={`w-5 h-5 ${theme.iconColor}`} aria-hidden="true" />
              </div>
            </motion.div>
          )}

          {/* Title and Description */}
          <div className="min-w-0 flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-2xl font-bold text-gray-900 truncate"
              id="page-title"
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-sm text-gray-500 mt-1 truncate"
                aria-describedby="page-title"
              >
                {description}
              </motion.p>
            )}
          </div>
        </div>

        {/* Center Section: Tabs (when provided) */}
        {tabs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="hidden md:flex flex-shrink-0"
          >
            <TabNavigation tabs={tabs} themeColor={themeColor} />
          </motion.div>
        )}

        {/* Right Section: Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Actions */}
          {actions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <HeaderActions actions={actions} themeColor={themeColor} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile Tabs (shown below main header on mobile) */}
      {tabs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="md:hidden mt-4 pt-4"
        >
          <TabNavigation tabs={tabs} themeColor={themeColor} mobile />
        </motion.div>
      )}
      </motion.header>

      {/* Unified Toolbar */}
      {showToolbar && toolbar && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
        >
          <UnifiedToolbar 
            config={toolbar} 
            themeColor={themeColor}
          />
        </motion.div>
      )}
    </div>
  );
};

export default UnifiedHeader;