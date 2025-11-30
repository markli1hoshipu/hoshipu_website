import React from 'react';
import { motion } from 'framer-motion';

/**
 * ToolbarContainer Component
 * 
 * Main container for the unified toolbar with left/center/right layout
 * following Monday.com-inspired design principles.
 * 
 * @param {Object} props
 * @param {React.ReactNode} [props.leftSection] - Primary action group
 * @param {React.ReactNode} [props.centerSection] - Search group
 * @param {React.ReactNode} [props.rightSection] - Filter and menu groups
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.themeColor='blue'] - Theme color for consistent styling
 */
const ToolbarContainer = ({
  leftSection,
  centerSection,
  rightSection,
  className = '',
  themeColor = 'blue',
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`px-6 py-3 bg-white ${className}`}
      role="toolbar"
      aria-label="Page actions and filters"
      {...props}
    >
      <div className={`flex items-center ${centerSection ? 'gap-6' : 'gap-4'}`}>
        {/* Left Section - Primary Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {leftSection}
        </div>

        {/* Center Section - Search */}
        {centerSection && (
          <div className="flex items-center gap-3">
            {centerSection}
          </div>
        )}

        {/* Right Section - Filters and More */}
        <div className="flex items-center gap-2">
          {rightSection}
        </div>
      </div>
    </motion.div>
  );
};

export default ToolbarContainer;