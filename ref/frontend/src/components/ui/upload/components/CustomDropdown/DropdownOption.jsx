/**
 * DropdownOption Component
 * Individual option item for CustomDropdown with MondayCRM-inspired styling
 */
import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { getOptionConfig, determineOptionType } from './icons';

const DropdownOption = forwardRef(({
  option,
  isSelected = false,
  isFocused = false,
  onClick,
  onMouseEnter,
  className = '',
  ...props
}, ref) => {
  const optionType = determineOptionType(option);
  const config = getOptionConfig(optionType);
  const IconComponent = config.icon;

  // Handle click event
  const handleClick = () => {
    if (onClick) {
      onClick(option.value);
    }
  };

  // Format confidence display
  const formatConfidence = (confidence) => {
    if (!confidence || confidence === 0) return null;
    return `${Math.round(confidence)}%`;
  };

  // Get confidence color class
  const getConfidenceColorClass = (confidence) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ duration: 0.1 }}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      className={`
        flex items-center gap-3 px-3 py-2.5 cursor-pointer
        transition-all duration-150 ease-in-out
        ${isFocused ? 'bg-prelude-50' : 'hover:bg-gray-50'}
        ${isSelected ? 'bg-prelude-100 border-l-2 border-prelude-500' : ''}
        ${className}
      `}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      {...props}
    >
      {/* Icon with colored background */}
      <div className={`
        w-5 h-5 rounded flex items-center justify-center flex-shrink-0
        ${config.bgColor} ${config.iconColor}
        shadow-sm
      `}>
        <IconComponent className="w-3 h-3" />
      </div>

      {/* Option content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Main label */}
          <span className={`
            text-sm font-medium truncate
            ${isSelected ? 'text-prelude-800' : 'text-gray-900'}
          `}>
            {option.label}
          </span>

          {/* Confidence badge */}
          {option.confidence > 0 && (
            <span className={`
              text-xs px-1.5 py-0.5 rounded-full font-medium
              ${getConfidenceColorClass(option.confidence)}
            `}>
              {formatConfidence(option.confidence)}
            </span>
          )}

          {/* LLM Support indicator */}
          {option.hasLlmSupport && (
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-xs text-purple-600 ml-1 font-medium">
                AI+
              </span>
            </div>
          )}

          {/* Recommended badge */}
          {option.isRecommended && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">
              Recommended
            </span>
          )}
        </div>

        {/* Optional description for special options */}
        {option.description && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            {option.description}
          </div>
        )}
      </div>

      {/* Right indicators */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 bg-prelude-500 rounded-full"
          />
        )}
      </div>
    </motion.div>
  );
});

DropdownOption.displayName = 'DropdownOption';

export default DropdownOption;