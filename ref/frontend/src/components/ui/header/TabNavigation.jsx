import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../primitives/button';

// Theme color configurations for tabs
const themeColors = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/25',
    hoverShadow: 'hover:shadow-blue-500/40',
    activeBg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    activeText: 'text-white'
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    shadow: 'shadow-purple-500/25',
    hoverShadow: 'hover:shadow-purple-500/40',
    activeBg: 'bg-gradient-to-r from-purple-500 to-pink-500',
    activeText: 'text-white'
  },
  pink: {
    gradient: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-500/25',
    hoverShadow: 'hover:shadow-pink-500/40',
    activeBg: 'bg-gradient-to-r from-pink-500 to-rose-500',
    activeText: 'text-white'
  },
  green: {
    gradient: 'from-green-500 to-emerald-500',
    shadow: 'shadow-green-500/25',
    hoverShadow: 'hover:shadow-green-500/40',
    activeBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    activeText: 'text-white'
  },
  orange: {
    gradient: 'from-orange-500 to-red-500',
    shadow: 'shadow-orange-500/25',
    hoverShadow: 'hover:shadow-orange-500/40',
    activeBg: 'bg-gradient-to-r from-orange-500 to-red-500',
    activeText: 'text-white'
  },
  indigo: {
    gradient: 'from-indigo-500 to-blue-500',
    shadow: 'shadow-indigo-500/25',
    hoverShadow: 'hover:shadow-indigo-500/40',
    activeBg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    activeText: 'text-white'
  }
};

/**
 * TabNavigation Component
 * 
 * Renders inline tab navigation with smooth animations and theme support.
 * 
 * @param {Object} props
 * @param {Array} props.tabs - Array of tab configurations
 * @param {string} [props.activeTab] - Currently active tab ID
 * @param {Function} [props.onTabChange] - Tab change handler
 * @param {string} [props.themeColor='blue'] - Theme color for styling
 * @param {boolean} [props.mobile=false] - Whether this is mobile layout
 * @param {string} [props.className] - Additional CSS classes
 * 
 * Tab Configuration:
 * {
 *   id: 'unique-id',
 *   label: 'Tab Label',
 *   icon?: IconComponent, // Lucide React icon
 *   description?: 'Tab description for tooltips',
 *   disabled?: boolean,
 *   badge?: string | number, // Optional badge content
 *   hidden?: boolean // For responsive hiding
 * }
 */
const TabNavigation = ({
  tabs = [],
  activeTab,
  onTabChange,
  themeColor = 'blue',
  mobile = false,
  className = '',
  ...props
}) => {
  const theme = themeColors[themeColor] || themeColors.blue;

  // Filter out hidden tabs
  const visibleTabs = tabs.filter(tab => !tab.hidden);
  
  if (visibleTabs.length === 0) {
    return null;
  }

  // Determine active tab - use first tab if none specified
  const currentActiveTab = activeTab || visibleTabs[0]?.id;

  const handleTabClick = (tab) => {
    if (tab.onClick) {
      // Use individual tab onClick if available (for tabs passed from UnifiedHeader)
      tab.onClick();
    } else if (onTabChange) {
      // Use global onTabChange if available
      onTabChange(tab.id);
    }
  };

  const renderTab = (tab, index) => {
    const Icon = tab.icon;
    const isActive = tab.isActive !== undefined ? tab.isActive : currentActiveTab === tab.id;

    return (
      <motion.div
        key={tab.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        <Button
          variant="ghost"
          size={mobile ? 'default' : 'default'}
          onClick={() => handleTabClick(tab)}
          disabled={tab.disabled}
          className={`
            relative ${mobile ? 'h-12 px-5 py-3' : 'h-10 px-4 py-2'} rounded-lg border-0 
            transition-all duration-300 group overflow-hidden font-medium
            ${mobile ? 'text-base' : 'text-sm'}
            ${isActive ? 
              `${theme.activeText} shadow-md ${theme.shadow} transform` : 
              'bg-white/70 backdrop-blur-sm text-gray-600 hover:bg-white/90 hover:text-gray-800 hover:shadow-sm border border-gray-200/50'
            }
            ${isActive ? theme.hoverShadow : 'hover:shadow-gray-300/30'}
          `}
          title={tab.description || tab.label}
          aria-selected={isActive}
          role="tab"
        >
          {/* Background gradient effect for active state */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 ${theme.activeBg} rounded-lg`}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>

          {/* Tab Content */}
          <div className="relative z-10 flex items-center gap-1.5">
            {Icon && (
              <Icon className={`${mobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
            )}
            
            <span className={`font-medium ${mobile ? '' : 'inline'}`}>
              {tab.label}
            </span>
            
            {/* Badge */}
            {tab.badge && (
              <span
                className={`
                  inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold
                  rounded-full min-w-[1.25rem] h-5
                  ${isActive ? 
                    'bg-white/20 text-white' : 
                    'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {tab.badge}
              </span>
            )}
          </div>
        </Button>
      </motion.div>
    );
  };

  return (
    <div 
      className={`flex items-center ${mobile ? 'w-full' : ''} ${className}`} 
      role="tablist"
      {...props}
    >
      <div className={`
        ${mobile ? 
          'flex flex-wrap gap-1 w-full' : 
          'flex items-center bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-gray-200/50'
        }
      `}>
        <div className={`flex items-center ${mobile ? 'flex-wrap gap-1 w-full' : 'gap-0.5 sm:gap-1'}`}>
          {visibleTabs.map((tab, index) => renderTab(tab, index))}
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;