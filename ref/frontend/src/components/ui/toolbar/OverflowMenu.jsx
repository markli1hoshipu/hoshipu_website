import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Download, Upload, Settings, Share2, Copy, Archive } from 'lucide-react';
import { Button } from '../primitives/button';

// Predefined action icons for common use cases
const actionIcons = {
  download: Download,
  upload: Upload,
  settings: Settings,
  share: Share2,
  copy: Copy,
  archive: Archive
};

/**
 * OverflowMenu Component
 * 
 * More actions menu with expandable dropdown.
 * Houses additional actions that don't fit in the main toolbar.
 * 
 * @param {Object} props
 * @param {Array} [props.actions] - Array of action objects {label, onClick, icon, disabled, divider}
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.disabled=false] - Whether the menu is disabled
 * @param {string} [props.buttonVariant='ghost'] - Button variant for the trigger
 */
const OverflowMenu = ({
  actions = [],
  className = '',
  disabled = false,
  buttonVariant = 'ghost',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleActionClick = (action) => {
    if (action.disabled) return;
    
    action.onClick?.();
    
    // Close menu unless specified otherwise
    if (action.keepMenuOpen !== true) {
      closeMenu();
    }
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`} {...props}>
      {/* Trigger Button */}
      <Button
        variant={buttonVariant}
        size="sm"
        onClick={handleToggle}
        disabled={disabled}
        className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        aria-label="More actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <MoreHorizontal className="h-5 w-5 text-gray-500" />
        </motion.div>
      </Button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-20"
              onClick={closeMenu}
              aria-hidden="true"
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30"
              role="menu"
              aria-orientation="vertical"
            >
              {actions.map((action, index) => {
                const IconComponent = actionIcons[action.icon] || action.iconComponent;
                const showDivider = action.divider && index < actions.length - 1;

                return (
                  <React.Fragment key={action.label || index}>
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.15 }}
                      onClick={() => handleActionClick(action)}
                      disabled={action.disabled}
                      className={`
                        w-full text-left px-4 py-2 text-sm
                        flex items-center gap-3
                        transition-colors duration-150
                        ${action.disabled 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                        ${action.destructive ? 'text-red-600 hover:bg-red-50' : ''}
                        first:rounded-t-lg last:rounded-b-lg
                      `}
                      role="menuitem"
                    >
                      {/* Icon */}
                      {IconComponent && (
                        <IconComponent className={`
                          w-4 h-4 flex-shrink-0
                          ${action.disabled ? 'text-gray-300' : ''}
                          ${action.destructive ? 'text-red-500' : 'text-gray-500'}
                        `} />
                      )}

                      {/* Label */}
                      <span className="flex-1">
                        {action.label}
                      </span>

                      {/* Keyboard Shortcut */}
                      {action.shortcut && (
                        <span className="text-xs text-gray-400 font-mono">
                          {action.shortcut}
                        </span>
                      )}

                      {/* Badge/Count */}
                      {action.badge && (
                        <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {action.badge}
                        </span>
                      )}
                    </motion.button>

                    {/* Divider */}
                    {showDivider && (
                      <div className="my-1 border-t border-gray-100" />
                    )}
                  </React.Fragment>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Export action icons for use in other components
export { actionIcons };
export default OverflowMenu;