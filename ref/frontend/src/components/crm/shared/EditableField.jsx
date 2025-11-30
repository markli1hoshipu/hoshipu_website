import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Input } from '../../ui/primitives/input';
import { Select, SelectItem } from '../../ui/primitives/select';

/**
 * Reusable editable field component for CRM
 * Now using shadcn Input and Select primitives
 * Supports both text inputs and select dropdowns
 * Handles inline editing with save/cancel functionality
 */
const EditableField = ({
  fieldName,
  displayValue,
  actualValue = null,
  placeholder = '',
  isEditing,
  editingValue,
  isSaving,
  isSelect = false,
  options = [],
  onStartEdit,
  onValueChange,
  onSave,
  onCancel,
  disabled = false
}) => {
  // Use actualValue for editing (e.g., employee ID), displayValue for display (e.g., employee name)
  const valueForEditing = actualValue !== null ? actualValue : displayValue;

  if (isEditing) {
    return (
      <div>
        <div className="relative">
          {isSelect ? (
            <Select
              value={editingValue}
              onValueChange={onValueChange}
              onBlur={() => !isSaving && onSave()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSave();
                } else if (e.key === 'Escape') {
                  onCancel();
                }
              }}
              className="border-blue-500 focus:ring-blue-500"
              size="sm"
              autoFocus
              disabled={isSaving || disabled}
            >
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          ) : (
            <Input
              type="text"
              value={editingValue}
              onChange={(e) => onValueChange(e.target.value)}
              onBlur={() => !isSaving && onCancel()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSave();
                } else if (e.key === 'Escape') {
                  onCancel();
                }
              }}
              className="border-blue-500 focus:ring-blue-500 h-8 px-2 py-1 text-sm"
              autoFocus
              disabled={isSaving || disabled}
            />
          )}
          {isSaving && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Press Enter to save, Esc to cancel
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && onStartEdit(fieldName, valueForEditing)}
      className={`cursor-pointer hover:bg-blue-50 py-1 rounded transition-colors ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
      title={disabled ? '' : 'Click to edit'}
    >
      <p className="text-gray-900">
        <span className={displayValue ? '' : 'text-gray-400 italic'}>
          {displayValue || placeholder}
        </span>
      </p>
    </div>
  );
};

export default EditableField;

