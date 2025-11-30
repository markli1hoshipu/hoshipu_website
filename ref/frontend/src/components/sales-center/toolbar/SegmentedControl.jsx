import React from 'react';

/**
 * SegmentedControl - Modern radio button replacement
 */
const SegmentedControl = ({ options, value, onChange, className = '' }) => {
  return (
    <div className={`inline-flex bg-gray-100 rounded-lg p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-3 py-2 text-sm font-medium rounded transition-all
            ${value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
