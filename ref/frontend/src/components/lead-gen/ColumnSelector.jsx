import React, { useState, useRef, useEffect } from 'react';
import { Columns, ChevronDown, Check, X } from 'lucide-react';

const ColumnSelector = ({ 
  columns = [], 
  visibleColumns = {}, 
  onColumnToggle,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleColumn = (columnId) => {
    // Check if column is disabled
    const column = columns.find(col => col.id === columnId);
    if (column?.disabled) return;
    
    onColumnToggle(columnId, !visibleColumns[columnId]);
  };

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalCount = columns.length;

  const selectAll = () => {
    columns.forEach(column => {
      if (!column.disabled && !visibleColumns[column.id]) {
        onColumnToggle(column.id, true);
      }
    });
  };

  const deselectAll = () => {
    columns.forEach(column => {
      if (!column.disabled && visibleColumns[column.id]) {
        onColumnToggle(column.id, false);
      }
    });
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 hover:text-accent-foreground font-inter text-sm h-10 px-3 gap-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-300"
        aria-label="Select columns"
        tabIndex="0"
      >
        <Columns className="h-4 w-4 text-gray-500" />
        <span className="text-gray-700">Columns ({visibleCount}/{totalCount})</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Select Columns</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={deselectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Column List */}
          <div className="p-2">
            {columns.map((column) => (
              <label
                key={column.id}
                className={`flex items-center gap-3 p-2 rounded transition-colors ${
                  column.disabled 
                    ? 'cursor-not-allowed opacity-60' 
                    : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id] || false}
                    onChange={() => handleToggleColumn(column.id)}
                    disabled={column.disabled}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                    visibleColumns[column.id] 
                      ? column.disabled
                        ? 'bg-gray-400 border-gray-400'
                        : 'bg-blue-600 border-blue-600'
                      : column.disabled
                        ? 'border-gray-200'
                        : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    {visibleColumns[column.id] && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {column.icon && <column.icon className={`w-4 h-4 ${column.disabled ? 'text-gray-400' : 'text-gray-500'}`} />}
                  <span className={`text-sm ${column.disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                    {column.label}
                    {column.disabled && <span className="ml-1 text-xs">(Required)</span>}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              {visibleCount} of {totalCount} columns selected
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;