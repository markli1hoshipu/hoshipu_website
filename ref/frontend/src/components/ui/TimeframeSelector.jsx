import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './primitives/select';

const TimeframeSelector = ({
  value,
  onChange,
  options = ['daily', 'weekly', 'monthly'],
  placeholder = "Select timeframe",
  className = "",
  size = "default",
  disabled = false
}) => {
  // Format option labels for display
  const getOptionLabel = (option) => {
    return `${option.charAt(0).toUpperCase() + option.slice(1)} Insights`;
  };

  return (
    <Select
      value={value}
      onValueChange={onChange}
      className={className}
      size={size}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {getOptionLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TimeframeSelector;