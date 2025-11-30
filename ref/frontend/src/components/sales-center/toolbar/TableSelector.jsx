import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ChevronDown } from 'lucide-react';
import TableFilterDropdown from '../../ui/filters/TableFilterDropdown';

/**
 * Table Selector Component - Compact dropdown for selecting active data table
 */
const TableSelector = ({
  selectedTable,
  availableTables = [],
  tablesLoading = false,
  onTableChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const displayText = tablesLoading
    ? 'Loading...'
    : selectedTable || 'No Table Selected';

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors border border-gray-300 hover:bg-gray-50"
        aria-label="Select data table"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Database className="w-4 h-4 text-gray-600" />
        <span className="text-gray-700">Table:</span>
        <span className="text-gray-900 font-semibold">{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 z-30 w-80"
              role="dialog"
              aria-label="Select data table"
            >
              <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900">Select Data Table</h3>
                </div>

                {/* Content - Reuse TableFilterDropdown */}
                <div className="p-4">
                  <TableFilterDropdown
                    availableTables={availableTables}
                    tablesLoading={tablesLoading}
                    selectedTable={selectedTable}
                    onTableChange={onTableChange}
                    onClose={() => setIsOpen(false)}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TableSelector;
