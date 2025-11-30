import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../../ui/primitives/input';
import { Checkbox } from '../../ui/primitives/checkbox';

const SearchBarWithColumns = ({ 
  value, 
  onChange, 
  onClear,
  searchColumns,
  onColumnChange,
  availableColumns,
  placeholder = "Search customers...",
  className = ""
}) => {
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Default available columns for searching (fallback)
  const defaultAvailableColumns = [
    { key: 'company', label: 'Company', icon: '🏢' },
    { key: 'primaryContact', label: 'Contact', icon: '👤' },
    { key: 'email', label: 'Email', icon: '✉️' },
    { key: 'phone', label: 'Phone', icon: '📞' },
    { key: 'industry', label: 'Industry', icon: '🏭' },
    { key: 'status', label: 'Status', icon: '📊' },
    { key: 'notes', label: 'Notes', icon: '📝' }
  ];

  const columns = availableColumns || defaultAvailableColumns;

  // Count active columns
  const activeColumnCount = Object.values(searchColumns || {}).filter(v => v).length;

  // Handle click outside to close column dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    onClear?.();
  };

  const handleColumnToggle = (columnKey) => {
    const newColumns = { ...searchColumns };
    newColumns[columnKey] = !newColumns[columnKey];
    onColumnChange?.(newColumns);
  };

  const handleSelectAll = () => {
    const newColumns = {};
    columns.forEach(col => {
      newColumns[col.key] = true;
    });
    onColumnChange?.(newColumns);
  };

  const handleSelectNone = () => {
    const newColumns = {};
    columns.forEach(col => {
      newColumns[col.key] = false;
    });
    onColumnChange?.(newColumns);
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Search bar with column selector - always expanded */}
      <div
        className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm"
        style={{ minWidth: '400px' }}
      >
        {/* Search Icon */}
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />

        {/* Search Input */}
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent"
        />

            {/* Column Selector Button */}
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="Select searchable columns"
              >
                <span className="font-medium">{activeColumnCount} columns</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showColumnDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Column Dropdown */}
              <AnimatePresence>
                {showColumnDropdown && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  >
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Search in columns:</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSelectAll}
                          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Select all
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={handleSelectNone}
                          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {columns.map((column) => (
                        <label
                          key={column.key}
                          className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={searchColumns?.[column.key] || false}
                            onCheckedChange={() => handleColumnToggle(column.key)}
                          />
                          <span className="flex items-center gap-2 flex-1">
                            <span className="text-base">
                              {typeof column.icon === 'string' ? (
                                column.icon
                              ) : column.icon ? (
                                <column.icon className="w-4 h-4" />
                              ) : null}
                            </span>
                            <span className="text-sm text-gray-700">{column.label}</span>
                          </span>
                          {searchColumns?.[column.key] && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </label>
                      ))}
                    </div>

                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => setShowColumnDropdown(false)}
                        className="w-full px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

        {/* Clear Button */}
        {value && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBarWithColumns;