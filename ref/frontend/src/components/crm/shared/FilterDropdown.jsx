import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, Plus, Trash2 } from 'lucide-react';

const FilterDropdown = ({
  columns,
  onApplyFilters,
  activeFilters = {},
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const [filterConditions, setFilterConditions] = useState(() => {
    // Convert existing activeFilters to internal format
    const conditions = [];

    Object.keys(activeFilters).forEach((columnId, index) => {
      if (activeFilters[columnId]?.condition) {
        // Old format: {column: {condition, value}}
        conditions.push({
          id: `filter-${index}`,
          column: columnId,
          condition: activeFilters[columnId].condition,
          value: activeFilters[columnId].value || ''
        });
      } else if (Array.isArray(activeFilters[columnId])) {
        // New format (from cookies): {column: [{condition, value}]}
        activeFilters[columnId].forEach((filterItem, idx) => {
          if (filterItem.condition) {
            conditions.push({
              id: `filter-${columnId}-${idx}`,
              column: columnId,
              condition: filterItem.condition,
              value: filterItem.value || ''
            });
          }
        });
      }
    });

    return conditions.length > 0 ? conditions : [{
      id: `filter-${Date.now()}`,
      column: '',
      condition: '',
      value: ''
    }];
  });
  const dropdownRef = useRef(null);

  // Update filterConditions when activeFilters prop changes (e.g., when filters are applied/cleared)
  // Note: Initial load from cookies is already handled by useState initializer
  useEffect(() => {
    const conditions = [];
    Object.keys(activeFilters).forEach((columnId, index) => {
      if (activeFilters[columnId]?.condition) {
        // Old format: {column: {condition, value}}
        conditions.push({
          id: `filter-${index}`,
          column: columnId,
          condition: activeFilters[columnId].condition,
          value: activeFilters[columnId].value || ''
        });
      } else if (Array.isArray(activeFilters[columnId])) {
        // Array format (from cookies): {column: [{condition, value}]}
        activeFilters[columnId].forEach((filterItem, idx) => {
          if (filterItem.condition) {
            conditions.push({
              id: `filter-${columnId}-${idx}`,
              column: columnId,
              condition: filterItem.condition,
              value: filterItem.value || ''
            });
          }
        });
      }
    });

    // Update filterConditions based on what we found
    if (conditions.length > 0) {
      setFilterConditions(conditions);
    } else if (Object.keys(activeFilters).length === 0) {
      // Reset to empty if activeFilters is explicitly empty (user cleared filters)
      setFilterConditions([{
        id: `filter-${Date.now()}`,
        column: '',
        condition: '',
        value: ''
      }]);
    }
    // Note: Don't reset if activeFilters has keys but no valid conditions
  }, [activeFilters]);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 720; // w-[720px]
      const dropdownHeight = 384; // max-h-96 (384px)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate horizontal position
      let left = rect.left;
      // If dropdown would go off right edge, align to right side of button
      if (left + dropdownWidth > viewportWidth) {
        left = Math.max(10, rect.right - dropdownWidth);
      }
      // Ensure it doesn't go off left edge
      left = Math.max(10, left);

      // Calculate vertical position
      let top = rect.bottom + 8; // 8px gap (mt-2)
      // If dropdown would go off bottom, show above the button
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
        // If still off screen, show at top of viewport
        if (top < 10) {
          top = 10;
        }
      }

      setDropdownPosition({ top, left });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen]);


  const addFilterCondition = () => {
    setFilterConditions(prev => [...prev, {
      id: `filter-${Date.now()}`,
      column: '',
      condition: '',
      value: ''
    }]);
  };

  const removeFilterCondition = (id) => {
    setFilterConditions(prev => {
      const newConditions = prev.filter(f => f.id !== id);
      // Always keep at least one filter row
      return newConditions.length > 0 ? newConditions : [{
        id: `filter-${Date.now()}`,
        column: '',
        condition: '',
        value: ''
      }];
    });
  };

  const updateFilterCondition = (id, field, value) => {
    setFilterConditions(prev => prev.map(filter => {
      if (filter.id === id) {
        const updated = { ...filter, [field]: value };
        // Reset value when condition changes to certain types
        if (field === 'condition' && ['is_empty', 'not_empty'].includes(value)) {
          updated.value = '';
        }
        // Reset condition and value when column changes
        if (field === 'column') {
          updated.condition = '';
          updated.value = '';
        }
        return updated;
      }
      return filter;
    }));
  };

  const handleApply = () => {
    // Convert filter conditions to the format expected by parent
    // Support multiple conditions per field by creating an array
    const filters = {};
    filterConditions.forEach(fc => {
      if (fc.column && fc.condition) {
        if (!filters[fc.column]) {
          filters[fc.column] = [];
        }
        filters[fc.column].push({
          condition: fc.condition,
          value: fc.value
        });
      }
    });
    onApplyFilters(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilterConditions([{
      id: `filter-${Date.now()}`,
      column: '',
      condition: '',
      value: ''
    }]);
    onApplyFilters({});
  };

  const activeFilterCount = filterConditions.filter(fc => fc.column && fc.condition).length;

  const getConditionOptions = (type) => {
    switch (type) {
      case 'text':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does not contain' },
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'email':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does not contain' },
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'tel':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does not contain' },
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'greater_equal', label: 'Greater or equal' },
          { value: 'less_equal', label: 'Less or equal' },
          { value: 'between', label: 'Between' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'currency':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'greater_equal', label: 'Greater or equal' },
          { value: 'less_equal', label: 'Less or equal' },
          { value: 'between', label: 'Between' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'date':
      case 'datetime':
        return [
          { value: 'equals', label: 'On' },
          { value: 'not_equals', label: 'Not on' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' },
          { value: 'last_days', label: 'In the last X days' },
          { value: 'next_days', label: 'In the next X days' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'select':
      case 'dropdown':
        return [
          { value: 'equals', label: 'Is' },
          { value: 'not_equals', label: 'Is not' },
          { value: 'in', label: 'Is one of' },
          { value: 'not_in', label: 'Is not one of' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'Is' },
          { value: 'not_equals', label: 'Is not' }
        ];
      case 'percentage':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'greater_equal', label: 'Greater or equal' },
          { value: 'less_equal', label: 'Less or equal' },
          { value: 'between', label: 'Between' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      default:
        // Default to text-like filters for unknown types
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
    }
  };

  const renderValueInput = (filter) => {
    const column = columns.find(c => c.id === filter.column);
    if (!column || !filter.condition) return null;

    const needsValue = !['is_empty', 'not_empty'].includes(filter.condition);
    if (!needsValue) return null;

    // Handle boolean type fields
    if (column.type === 'boolean') {
      return (
        <select
          value={filter.value || ''}
          onChange={(e) => updateFilterCondition(filter.id, 'value', e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (filter.condition === 'between') {
      const [minValue, maxValue] = (filter.value || '').split(',');
      
      // Determine input type and constraints for between inputs
      let inputType = 'text';
      let step = undefined;
      let min = undefined;
      let max = undefined;
      
      if (column.type === 'currency' || column.type === 'number' || column.type === 'percentage') {
        inputType = 'number';
        if (column.type === 'currency') {
          step = '0.01';
        } else if (column.type === 'percentage') {
          step = '1';
          min = '0';
          max = '100';
        }
      } else if (column.type === 'date' || column.type === 'datetime') {
        inputType = column.type === 'datetime' ? 'datetime-local' : 'date';
      }
      
      return (
        <div className="flex gap-2 flex-1">
          <input
            type={inputType}
            placeholder={column.type === 'percentage' ? 'Min %' : column.type === 'currency' ? 'Min $' : 'Min'}
            value={minValue || ''}
            onChange={(e) => {
              const newValue = `${e.target.value},${maxValue || ''}`;
              updateFilterCondition(filter.id, 'value', newValue);
            }}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            step={step}
            min={min}
            max={max}
          />
          <input
            type={inputType}
            placeholder={column.type === 'percentage' ? 'Max %' : column.type === 'currency' ? 'Max $' : 'Max'}
            value={maxValue || ''}
            onChange={(e) => {
              const newValue = `${minValue || ''},${e.target.value}`;
              updateFilterCondition(filter.id, 'value', newValue);
            }}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            step={step}
            min={min}
            max={max}
          />
        </div>
      );
    }

    if (column.type === 'select' && ['in', 'not_in'].includes(filter.condition)) {
      const selectedValues = (filter.value || '').split(',').filter(v => v);
      return (
        <div className="flex-1">
          <div className="relative">
            <select
              multiple
              value={selectedValues}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                updateFilterCondition(filter.id, 'value', values.join(','));
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              size="3"
            >
              {column.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white to-transparent h-4 pointer-events-none"></div>
          </div>
          {selectedValues.length > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              {selectedValues.length} selected
            </div>
          )}
        </div>
      );
    }

    if (column.type === 'select' && ['equals', 'not_equals'].includes(filter.condition)) {
      return (
        <select
          value={filter.value || ''}
          onChange={(e) => updateFilterCondition(filter.id, 'value', e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          {column.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (['last_days', 'next_days'].includes(filter.condition)) {
      return (
        <input
          type="number"
          placeholder="Number of days"
          value={filter.value || ''}
          onChange={(e) => updateFilterCondition(filter.id, 'value', e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
        />
      );
    }

    // Determine input type based on column type
    let inputType = 'text';
    let step = undefined;
    let placeholder = 'Enter value...';
    let min = undefined;
    let max = undefined;

    if (column.type === 'date' || column.type === 'datetime') {
      inputType = column.type === 'datetime' ? 'datetime-local' : 'date';
    } else if (column.type === 'currency' || column.type === 'number' || column.type === 'percentage') {
      inputType = 'number';
      if (column.type === 'currency') {
        step = '0.01';
        placeholder = 'Enter amount...';
      } else if (column.type === 'percentage') {
        step = '1';
        min = '0';
        max = '100';
        placeholder = 'Enter percentage (0-100)...';
      }
    } else if (column.type === 'email') {
      inputType = 'email';
      placeholder = 'Enter email...';
    } else if (column.type === 'tel') {
      inputType = 'tel';
      placeholder = 'Enter phone number...';
    }

    return (
      <input
        type={inputType}
        placeholder={placeholder}
        value={filter.value || ''}
        onChange={(e) => updateFilterCondition(filter.id, 'value', e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        step={step}
        min={min}
        max={max}
      />
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 hover:text-accent-foreground font-inter text-sm h-10 px-3 gap-2 rounded-lg transition-colors duration-200 border ${
          activeFilterCount > 0
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300 shadow-sm'
            : 'text-gray-700 hover:bg-gray-100 border-gray-300'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed w-[720px] max-w-[90vw] bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] max-h-96 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Filter Builder</h3>
                <p className="text-xs text-gray-500 mt-0.5">Add conditions to filter your data</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {filterConditions.map((filter, index) => {
                const column = columns.find(c => c.id === filter.column);
                return (
                  <div key={filter.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      {/* All fields in one row */}
                      <select
                        value={filter.column}
                        onChange={(e) => updateFilterCondition(filter.id, 'column', e.target.value)}
                        className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select column...</option>
                        {columns.map(col => (
                          <option key={col.id} value={col.id}>
                            {col.label}
                          </option>
                        ))}
                      </select>

                      {filter.column && (
                        <select
                          value={filter.condition}
                          onChange={(e) => updateFilterCondition(filter.id, 'condition', e.target.value)}
                          className="w-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Condition...</option>
                          {getConditionOptions(column?.type).map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {filter.column && filter.condition && !['is_empty', 'not_empty'].includes(filter.condition) && (
                        <div className="flex-1">
                          {renderValueInput(filter)}
                        </div>
                      )}

                      {/* Spacer to push delete button to the right */}
                      <div className="flex-1"></div>

                      {/* Delete Button */}
                      {filterConditions.length > 1 && (
                        <button
                          onClick={() => removeFilterCondition(filter.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove filter"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Filter Button */}
            <button
              onClick={addFilterCondition}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-300 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Filter Condition
            </button>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-lg">
            <button
              onClick={handleClear}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear all
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;