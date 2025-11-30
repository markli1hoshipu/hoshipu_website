/**
 * Virtual Column Grid Component
 * Renders only visible column rows for improved performance with large datasets
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ArrowRight } from 'lucide-react';
import CustomDropdown from './CustomDropdown';

const COLUMN_ROW_HEIGHT = 120; // Height of each column row in pixels
const MIN_GRID_HEIGHT = 240; // Minimum height to show at least 2 rows
const MAX_GRID_HEIGHT = 800; // Maximum height of the virtual grid to respect container bounds

// Reusable column section component
const ColumnSection = React.memo(({ 
  column, 
  generateOptionsForColumn, 
  handleMappingChange, 
  getLlmRecommendation, 
  effectiveMappings,
  isVisible 
}) => {
  if (!column) return null;

  const currentMapping = effectiveMappings.find(m => m.source_column === column.name);
  const llmRec = getLlmRecommendation(column.name);

  // Only generate options if this row is actually visible to optimize performance
  const options = isVisible ? generateOptionsForColumn(column.name) : [];


  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-4">
        {/* Source Column Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-gray-900 truncate">
              {column.display_name || column.name}
            </h4>
            {column.data_type && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                {column.data_type}
              </span>
            )}
          </div>
          
          {/* Sample Values */}
          {column.sample_values && column.sample_values.length > 0 && (
            <div className="text-sm text-gray-600 mb-2">
              <span className="text-xs text-gray-500">Sample: </span>
              {column.sample_values.slice(0, 3).map((value, i) => (
                <span key={i} className="inline-block mr-2 px-1.5 py-0.5 bg-gray-50 rounded text-xs">
                  {String(value).substring(0, 20)}{String(value).length > 20 ? '...' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Column Stats */}
          {column.stats && (
            <div className="text-xs text-gray-500">
              {column.stats.null_count > 0 && (
                <span className="mr-3">
                  {column.stats.null_count} nulls
                </span>
              )}
              {column.stats.unique_count && (
                <span className="mr-3">
                  {column.stats.unique_count} unique
                </span>
              )}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center flex-shrink-0">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>

        {/* Target Dropdown */}
        <div className="flex-1 min-w-0">
          <CustomDropdown
            value={currentMapping?.target_column || ''}
            options={options}
            onChange={(value) => handleMappingChange(column.name, value)}
            placeholder="Choose column..."
            columnName={column.name}
            llmRecommendation={llmRec}
            confidence={options.find(opt => opt.value === currentMapping?.target_column)?.confidence}
            searchable={true}
            aria-label={`Map ${column.display_name || column.name} to target column`}
            className="w-full"
          />
          {llmRec && llmRec.suggested_action && (
            <div className="text-xs text-purple-600 mt-1">
              AI suggests: {llmRec.suggested_action.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ColumnSection.displayName = 'ColumnSection';

const ColumnRow = React.memo(({ index, style, data }) => {
  const { 
    columns, 
    generateOptionsForColumn, 
    handleMappingChange, 
    getLlmRecommendation, 
    effectiveMappings,
    isVisible 
  } = data;
  
  // Calculate which columns to show in this row with alternating distribution
  const numRows = Math.ceil(columns.length / 2);
  const leftColumn = columns[index];
  const rightColumn = columns[index + numRows];

  return (
    <div style={style} className="px-2">
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <ColumnSection
          column={leftColumn}
          generateOptionsForColumn={generateOptionsForColumn}
          handleMappingChange={handleMappingChange}
          getLlmRecommendation={getLlmRecommendation}
          effectiveMappings={effectiveMappings}
          isVisible={isVisible}
        />
        
        {/* Right Column - only render if it exists */}
        {rightColumn ? (
          <ColumnSection
            column={rightColumn}
            generateOptionsForColumn={generateOptionsForColumn}
            handleMappingChange={handleMappingChange}
            getLlmRecommendation={getLlmRecommendation}
            effectiveMappings={effectiveMappings}
            isVisible={isVisible}
          />
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
});

ColumnRow.displayName = 'ColumnRow';

const VirtualColumnGrid = ({
  columns = [],
  generateOptionsForColumn,
  handleMappingChange,
  getLlmRecommendation,
  effectiveMappings = [],
  className = ""
}) => {
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(MIN_GRID_HEIGHT);

  // Calculate number of rows needed for dual-column layout
  const numRows = Math.ceil(columns.length / 2);

  // Removed unused getVisibleRange calculation

  // Monitor container size to calculate available height
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const parent = container.parentElement;
        if (parent) {
          // Get the available height from the parent container
          const parentHeight = parent.clientHeight;
          const parentPadding = parseInt(getComputedStyle(parent).paddingTop) +
                               parseInt(getComputedStyle(parent).paddingBottom);

          // Calculate available height, accounting for padding and ensuring minimum
          const availableHeight = Math.max(
            MIN_GRID_HEIGHT,
            Math.min(MAX_GRID_HEIGHT, parentHeight - parentPadding)
          );

          setContainerHeight(availableHeight);
        }
      }
    };

    // Initial calculation
    updateContainerHeight();

    // Update on window resize
    const resizeObserver = new ResizeObserver(updateContainerHeight);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Auto-scroll to top when columns change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [columns]);

  if (!columns.length) {
    return (
      <div className="text-center py-8 px-4">
        <div className="text-gray-400 mb-2">
          <div className="w-8 h-8 mx-auto mb-2 opacity-50">📊</div>
        </div>
        <p className="text-gray-500">No source columns found</p>
        <p className="text-sm text-gray-400">Please check your file format</p>
      </div>
    );
  }

  const itemData = {
    columns,
    generateOptionsForColumn,
    handleMappingChange,
    getLlmRecommendation,
    effectiveMappings,
    isVisible: true // For virtual rendering, we'll optimize this later
  };

  // Calculate the optimal height for the list
  const listHeight = useMemo(() => {
    if (!numRows) return MIN_GRID_HEIGHT;

    // Calculate ideal height based on content
    const idealHeight = numRows * COLUMN_ROW_HEIGHT;

    // Use container height if available, otherwise fall back to content-based calculation
    return Math.min(containerHeight, idealHeight);
  }, [numRows, containerHeight]);

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`} style={{ height: '100%' }}>
      <List
        ref={listRef}
        height={listHeight}
        itemCount={numRows}
        itemSize={COLUMN_ROW_HEIGHT}
        itemData={itemData}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        overscanCount={2} // Render 2 extra items above/below viewport for smooth scrolling
      >
        {ColumnRow}
      </List>

      {/* Scroll indicator for large lists */}
      {columns.length > 5 && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
          {columns.length} columns
        </div>
      )}
    </div>
  );
};

export default VirtualColumnGrid;