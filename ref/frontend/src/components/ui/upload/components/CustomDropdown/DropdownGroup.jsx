/**
 * DropdownGroup Component
 * Grouped section for organizing dropdown options with visual separators
 */
import React from 'react';
import { motion } from 'framer-motion';
import { OPTION_GROUPS } from './icons';
import DropdownOption from './DropdownOption';

const DropdownGroup = ({
  groupKey,
  options = [],
  selectedValue,
  focusedIndex,
  onOptionClick,
  onOptionMouseEnter,
  className = '',
  showHeader = true,
  showCount = true
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  const groupConfig = OPTION_GROUPS[groupKey];
  const IconComponent = groupConfig?.icon;

  // Calculate the starting index for this group (for keyboard navigation)
  const getOptionIndex = (optionIndex) => {
    // This would need to be calculated by the parent component
    return optionIndex;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`${className}`}
    >
      {/* Group Header */}
      {showHeader && groupConfig && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {IconComponent && (
                <div className="w-4 h-4 text-gray-600">
                  <IconComponent className="w-4 h-4" />
                </div>
              )}
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {groupConfig.title}
              </span>
            </div>
            {showCount && (
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                {options.length}
              </span>
            )}
          </div>
          {groupConfig.description && (
            <div className="text-xs text-gray-500 mt-1">
              {groupConfig.description}
            </div>
          )}
        </div>
      )}

      {/* Group Options */}
      <div className="py-1">
        {options.map((option, index) => {
          const isSelected = selectedValue === option.value;
          const isFocused = focusedIndex === getOptionIndex(index);

          return (
            <DropdownOption
              key={`${groupKey}-${option.value}-${index}`}
              option={option}
              isSelected={isSelected}
              isFocused={isFocused}
              onClick={onOptionClick}
              onMouseEnter={() => onOptionMouseEnter && onOptionMouseEnter(getOptionIndex(index))}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

// Enhanced group component with additional features
export const DropdownGroupWithStats = ({
  groupKey,
  options = [],
  selectedValue,
  focusedIndex,
  onOptionClick,
  onOptionMouseEnter,
  className = '',
  showStats = false
}) => {
  const stats = {
    total: options.length,
    recommended: options.filter(opt => opt.isRecommended).length,
    highConfidence: options.filter(opt => opt.confidence >= 90).length,
    withLlm: options.filter(opt => opt.hasLlmSupport).length
  };

  return (
    <div className={className}>
      <DropdownGroup
        groupKey={groupKey}
        options={options}
        selectedValue={selectedValue}
        focusedIndex={focusedIndex}
        onOptionClick={onOptionClick}
        onOptionMouseEnter={onOptionMouseEnter}
      />
      
      {/* Optional stats footer */}
      {showStats && stats.total > 0 && (
        <div className="px-3 py-1 border-t border-gray-100 bg-gray-25">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {stats.recommended > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {stats.recommended} recommended
              </span>
            )}
            {stats.highConfidence > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {stats.highConfidence} high confidence
              </span>
            )}
            {stats.withLlm > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                {stats.withLlm} AI enhanced
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownGroup;