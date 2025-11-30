/**
 * DropdownTrigger Component
 * Enhanced button component for triggering dropdown with visual indicators
 */
import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon, getOptionConfig, determineOptionType } from './icons';

const DropdownTrigger = forwardRef(({
  selectedValue,
  selectedOption,
  placeholder = 'Choose column...',
  isOpen = false,
  onClick,
  onKeyDown,
  disabled = false,
  className = '',
  llmRecommendation,
  confidence = 0,
  hasError = false,
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  
  // Determine display text and styling
  const getDisplayText = () => {
    if (!selectedValue || selectedValue === '') {
      return placeholder;
    }
    
    if (selectedOption) {
      return selectedOption.label;
    }
    
    return selectedValue;
  };

  const displayText = getDisplayText();
  const hasSelection = selectedValue && selectedValue !== '';
  
  // Determine option type for styling
  const optionType = selectedOption ? determineOptionType(selectedOption) : 'choose';
  const config = getOptionConfig(optionType);

  // LLM recommendation styling
  const getLlmStyling = () => {
    if (!llmRecommendation) return '';
    
    switch (llmRecommendation.severity) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
      default:
        return '';
    }
  };

  // Confidence color styling
  const getConfidenceColor = () => {
    if (!confidence || confidence === 0) return '';
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      className={`
        w-full flex items-center justify-between gap-2 px-3 py-2
        text-sm border rounded-md transition-all duration-150
        ${disabled 
          ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
          : hasError
            ? 'border-red-300 bg-red-50 hover:border-red-400'
            : llmRecommendation
              ? getLlmStyling()
              : isOpen
                ? 'border-prelude-500 bg-prelude-50 ring-1 ring-prelude-300'
                : hasSelection
                  ? 'border-gray-300 bg-white hover:border-prelude-400 focus:border-prelude-500 focus:ring-1 focus:ring-prelude-300'
                  : 'border-gray-300 bg-white hover:border-gray-400 focus:border-prelude-500 focus:ring-1 focus:ring-prelude-300'
        }
        focus:outline-none
        ${className}
      `}
      {...props}
    >
      {/* Left side content */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Option type icon */}
        {hasSelection && selectedOption && (
          <div className={`
            w-4 h-4 rounded flex items-center justify-center flex-shrink-0
            ${config.bgColor} ${config.iconColor}
          `}>
            <config.icon className="w-2.5 h-2.5" />
          </div>
        )}

        {/* Display text */}
        <span className={`
          truncate flex-1
          ${hasSelection 
            ? disabled 
              ? 'text-gray-500' 
              : 'text-gray-900 font-medium'
            : disabled
              ? 'text-gray-400'
              : 'text-gray-500'
          }
        `}>
          {displayText}
        </span>

        {/* Indicators */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Confidence indicator */}
          {confidence > 0 && hasSelection && (
            <span className={`
              text-xs px-1.5 py-0.5 rounded-full font-medium
              ${confidence >= 90 
                ? 'bg-green-100 text-green-800' 
                : confidence >= 70 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }
            `}>
              {Math.round(confidence)}%
            </span>
          )}

          {/* LLM support indicator */}
          {selectedOption?.hasLlmSupport && (
            <div className="flex items-center">
              <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-xs text-purple-600 ml-0.5 font-medium">
                AI
              </span>
            </div>
          )}

          {/* LLM recommendation indicator */}
          {llmRecommendation && (
            <div className={`
              w-2 h-2 rounded-full
              ${llmRecommendation.severity === 'high' 
                ? 'bg-red-500' 
                : llmRecommendation.severity === 'medium'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }
            `} />
          )}
        </div>
      </div>

      {/* Chevron indicator */}
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className={`
          flex-shrink-0 ml-1
          ${disabled ? 'text-gray-400' : 'text-gray-500'}
        `}
      >
        <ChevronDownIcon className="w-4 h-4" />
      </motion.div>
    </button>
  );
});

DropdownTrigger.displayName = 'DropdownTrigger';

export default DropdownTrigger;