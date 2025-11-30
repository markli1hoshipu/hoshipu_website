import React, { useMemo } from 'react';
import SalesCenterToolbarContainer from './SalesCenterToolbarContainer';
import SalesCenterPrimaryButton from './SalesCenterPrimaryButton';
import SalesCenterFilterGroup from './SalesCenterFilterGroup';
import UnifiedFilterPanel from './UnifiedFilterPanel';
import TableSelector from './TableSelector';

/**
 * SalesCenterToolbar - Unified filter toolbar with badge count
 */
const SalesCenterToolbar = ({
  primaryAction,
  mode = 'overview',
  selectedTable,
  availableTables,
  tablesLoading,
  onTableChange,
  dateFilter,
  setDateFilter,
  clearDateFilter,
  setDatePreset,
  limitEnabled,
  setLimitEnabled,
  dataLimit,
  setDataLimit,
  selectedMetric,
  setSelectedMetric,
  showUnknown,
  setShowUnknown,
  showBenchmark,
  setShowBenchmark,
  showConcentration,
  setShowConcentration,
  topN,
  setTopN,
  themeColor = 'purple',
  className = '',
  ...props
}) => {
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (mode === 'overview') {
      if (dateFilter) count++;
      if (limitEnabled) count++;
    } else {
      if (selectedMetric && selectedMetric !== 'revenue') count++;
      if (showConcentration) count++;
      if (showBenchmark) count++;
      if (showUnknown) count++;
    }
    return count;
  }, [mode, dateFilter, limitEnabled, selectedMetric, showConcentration, showBenchmark, showUnknown]);

  return (
    <SalesCenterToolbarContainer
        className={className}
        leftSection={
          <>
            {primaryAction && (
              <SalesCenterPrimaryButton
                label={primaryAction.label || 'New Item'}
                onClick={primaryAction.onClick}
                themeColor={themeColor}
                disabled={primaryAction.disabled}
                loading={primaryAction.loading}
              />
            )}
            {mode === 'overview' && onTableChange && (
              <TableSelector
                selectedTable={selectedTable}
                availableTables={availableTables}
                tablesLoading={tablesLoading}
                onTableChange={onTableChange}
              />
            )}
          </>
        }
        rightSection={
          <SalesCenterFilterGroup
            filters={[
              {
                id: 'unified-filter',
                label: 'Filters',
                title: 'Filters',
                hasActiveFilters: activeFilterCount > 0,
                badge: activeFilterCount > 0 ? activeFilterCount : null,
                content: ({ onClose }) => (
                  <UnifiedFilterPanel
                    mode={mode}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    clearFilter={clearDateFilter}
                    setPreset={setDatePreset}
                    limitEnabled={limitEnabled}
                    setLimitEnabled={setLimitEnabled}
                    dataLimit={dataLimit}
                    setDataLimit={setDataLimit}
                    selectedMetric={selectedMetric}
                    setSelectedMetric={setSelectedMetric}
                    showUnknown={showUnknown}
                    setShowUnknown={setShowUnknown}
                    showBenchmark={showBenchmark}
                    setShowBenchmark={setShowBenchmark}
                    showConcentration={showConcentration}
                    setShowConcentration={setShowConcentration}
                    topN={topN}
                    setTopN={setTopN}
                    onApply={onClose}
                    onReset={onClose}
                  />
                )
              }
            ]}
          />
        }
        {...props}
      />
  );
};

export default SalesCenterToolbar;
