// src/components/ui/tooltip.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Info } from 'lucide-react';

const Tooltip = ({ 
  children, 
  content, 
  position = "top", // top, bottom, left, right
  type = "info", // info, help
  maxWidth = "250px",
  showIcon = true,
  iconSize = "w-4 h-4"
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default: // top
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-gray-800';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-gray-800';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-gray-800';
      default: // top
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-gray-800';
    }
  };

  const IconComponent = type === 'help' ? HelpCircle : Info;

  return (
    <div className="relative inline-flex items-center">
      <div
        className="flex items-center gap-1 cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
      >
        {children}
        {showIcon && (
          <IconComponent 
            className={`${iconSize} text-gray-400 hover:text-gray-600 transition-colors`}
          />
        )}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${getPositionClasses()}`}
            style={{ maxWidth }}
          >
            {/* Tooltip Content */}
            <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
              {content}
            </div>
            
            {/* Tooltip Arrow */}
            <div 
              className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Specialized component for technical term explanations
export const TechTermTooltip = ({ 
  term, 
  explanation, 
  example = null,
  position = "top" 
}) => {
  const content = (
    <div>
      <div className="font-medium mb-1">{term}</div>
      <div className="text-gray-200 mb-2">{explanation}</div>
      {example && (
        <div className="text-xs text-gray-300 border-t border-gray-600 pt-2">
          <strong>Example:</strong> {example}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip 
      content={content} 
      position={position}
      type="help"
      maxWidth="300px"
    >
      <span className="border-b border-dashed border-gray-400 cursor-help">
        {term}
      </span>
    </Tooltip>
  );
};

// Legacy exports for backward compatibility
export const TooltipProvider = ({ children }) => children;
export const TooltipTrigger = ({ children, ...props }) => (
  <span {...props}>{children}</span>
);
export const TooltipContent = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);

export { Tooltip };
export default Tooltip;