import React from 'react';
import ToolbarContainer from './ToolbarContainer';
import PrimaryActionGroup from './PrimaryActionGroup';
import SearchGroup from './SearchGroup';
import FilterGroup from './FilterGroup';
import OverflowMenu from './OverflowMenu';

/**
 * Converts simple filter configuration to FilterGroup format
 */
const convertFiltersToFilterGroupFormat = (filters = []) => {
  return filters.map((filter, index) => {
    if (filter.id) {
      // Already in FilterGroup format
      return filter;
    }
    
    // Convert from simple format to FilterGroup format
    return {
      id: filter.key || `filter-${index}`,
      icon: 'filter',
      label: filter.label,
      title: filter.label,
      hasActiveFilters: filter.value && filter.value !== 'all' && filter.value !== '',
      content: ({ onClose }) => {
        if (filter.type === 'select') {
          return (
            <div className="space-y-2">
              {filter.options?.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={filter.key}
                    value={option.value}
                    checked={filter.value === option.value}
                    onChange={() => {
                      filter.onChange?.(option.value);
                      onClose();
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          );
        }
        return <div>Filter content</div>;
      }
    };
  });
};

/**
 * UnifiedToolbar Component
 * 
 * Complete toolbar implementation that combines all toolbar components
 * into a single, configurable interface following Monday.com design patterns.
 * 
 * @param {Object} props
 * @param {Object} [props.config] - Complete toolbar configuration object
 * @param {Object} [props.primaryAction] - Primary action configuration (includes actionIcons)
 * @param {Object} [props.search] - Search configuration
 * @param {Array} [props.filters] - Filter configurations
 * @param {Array} [props.overflowActions] - Overflow menu actions
 * @param {string} [props.themeColor='blue'] - Theme color
 * @param {boolean} [props.showSearch=true] - Whether to show search
 * @param {boolean} [props.showFilters=true] - Whether to show filters
 * @param {boolean} [props.showOverflow=true] - Whether to show overflow menu
 * @param {string} [props.className] - Additional CSS classes
 */
const UnifiedToolbar = ({
  config,
  primaryAction,
  search,
  filters = [],
  overflowActions = [],
  themeColor = 'blue',
  showSearch = true,
  showFilters = true,
  showOverflow = true,
  className = '',
  ...props
}) => {
  // Use config object if provided, otherwise use individual props
  const toolbarConfig = config || {
    primaryAction,
    search,
    filters,
    overflowActions,
    themeColor
  };

  const {
    primaryAction: primaryConfig,
    search: searchConfig,
    filters: filterConfigs = [],
    overflowActions: overflowConfigs = [],
    themeColor: configThemeColor = themeColor
  } = toolbarConfig;

  // Convert filters to FilterGroup format
  const convertedFilters = convertFiltersToFilterGroupFormat(filterConfigs);

  return (
    <ToolbarContainer
      themeColor={configThemeColor}
      className={className}
      leftSection={
        primaryConfig && (
          <PrimaryActionGroup
            primaryLabel={primaryConfig.primaryLabel}
            onPrimaryAction={primaryConfig.onPrimaryAction}
            dropdownActions={primaryConfig.dropdownActions}
            actionIcons={primaryConfig.actionIcons}
            themeColor={configThemeColor}
            disabled={primaryConfig.disabled}
            loading={primaryConfig.loading}
          />
        )
      }
      centerSection={
        showSearch && searchConfig && (
          <SearchGroup
            placeholder={searchConfig.placeholder}
            value={searchConfig.value}
            onChange={searchConfig.onChange}
            onSearch={searchConfig.onSearch}
            onClear={searchConfig.onClear}
            autoFocus={searchConfig.autoFocus}
            disabled={searchConfig.disabled}
          />
        )
      }
      rightSection={
        <div className="flex items-center gap-2">
          {/* Filter Group */}
          {showFilters && convertedFilters.length > 0 && (
            <FilterGroup filters={convertedFilters} />
          )}
          
          {/* Overflow Menu */}
          {showOverflow && overflowConfigs.length > 0 && (
            <OverflowMenu actions={overflowConfigs} />
          )}
        </div>
      }
      {...props}
    />
  );
};

export default UnifiedToolbar;