import React from 'react';
import { RefreshCw, Database } from 'lucide-react';

/**
 * Standalone dropdown for selecting data source table
 */
const TableFilterDropdown = ({
  availableTables,
  tablesLoading,
  selectedTable,
  onTableChange,
  onClose
}) => {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {tablesLoading ? (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">Loading tables...</span>
        </div>
      ) : availableTables.length === 0 ? (
        <div className="py-4 text-center">
          <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No tables available</p>
          <p className="text-xs text-gray-400 mt-1">Upload data to see available tables</p>
        </div>
      ) : (
        availableTables.map((table) => {
          const tableName = typeof table === 'string' ? table : table?.table_name || table?.name || 'Unknown';
          const rowCount = typeof table === 'object' ? table?.row_count : null;
          const isSelected = selectedTable === tableName;

          return (
            <button
              key={tableName}
              onClick={() => {
                onTableChange(tableName);
                onClose();
              }}
              className={`
                w-full text-left p-3 rounded-lg transition-all duration-200 group
                ${isSelected
                  ? 'bg-purple-50 border-2 border-purple-200 text-purple-800'
                  : 'hover:bg-gray-50 border-2 border-transparent text-gray-700'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-md transition-colors
                    ${isSelected
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                    }
                  `}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{tableName}</div>
                    {isSelected && (
                      <div className="text-xs text-purple-600 mt-0.5">Currently selected</div>
                    )}
                  </div>
                </div>

                {rowCount !== null && (
                  <div className="text-xs text-gray-500 font-medium">
                    {rowCount.toLocaleString()} rows
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};

export default TableFilterDropdown;
