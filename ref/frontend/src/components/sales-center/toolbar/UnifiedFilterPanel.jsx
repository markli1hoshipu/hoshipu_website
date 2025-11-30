import React, { useState } from 'react';
import { Calendar, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import AccordionSection from './AccordionSection';
import SegmentedControl from './SegmentedControl';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * UnifiedFilterPanel - Consolidated filter panel for all Sales Center modes
 */
const UnifiedFilterPanel = ({
  mode = 'overview', // 'overview' or 'comparative'
  // Date filter props
  dateFilter,
  setDateFilter,
  clearFilter,
  setPreset,
  // Data limit props
  limitEnabled,
  setLimitEnabled,
  dataLimit,
  setDataLimit,
  // Comparative metrics props
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
  // Control
  onApply,
  onReset
}) => {
  const [startDate, setStartDate] = useState(dateFilter?.startDate || null);
  const [endDate, setEndDate] = useState(dateFilter?.endDate || null);

  const presetOptions = [
    { id: 'last_3_months', label: 'Last 3M' },
    { id: 'last_6_months', label: 'Last 6M' },
    { id: 'last_year', label: 'Last Year' },
    { id: 'all_time', label: 'All Time' }
  ];

  const handlePresetClick = (presetId) => {
    setPreset(presetId);
    onApply?.();
  };

  const handleDateApply = () => {
    if (startDate && endDate) {
      setDateFilter({ startDate, endDate, label: 'Custom Range' });
      onApply?.();
    }
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    clearFilter?.();
    setLimitEnabled?.(false);
    setShowUnknown?.(false);
    setShowBenchmark?.(false);
    setShowConcentration?.(false);
    onReset?.();
  };

  return (
    <div className="w-[380px]" style={{ maxHeight: '448px' }}>
      <div className="overflow-y-auto space-y-4 px-1" style={{ maxHeight: '360px' }}>

        {/* Date Section - Overview mode only */}
        {mode === 'overview' && (
          <AccordionSection title="Date" icon={Calendar} defaultOpen>
            <div className="space-y-3">
              {/* Presets */}
              <div className="grid grid-cols-2 gap-2">
                {presetOptions.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset.id)}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Range */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 block">Custom Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    maxDate={endDate || new Date()}
                    className="w-full px-2 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholderText="Start"
                    dateFormat="MMM d, yyyy"
                  />
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    maxDate={new Date()}
                    className="w-full px-2 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholderText="End"
                    dateFormat="MMM d, yyyy"
                  />
                </div>
              </div>
            </div>
          </AccordionSection>
        )}

        {/* Metrics Section - Comparative mode only */}
        {mode === 'comparative' && (
          <AccordionSection title="Metric" icon={TrendingUp} defaultOpen>
            <SegmentedControl
              options={[
                { value: 'revenue', label: 'Revenue' },
                { value: 'profit', label: 'Profit' },
                { value: 'volume', label: 'Volume' }
              ]}
              value={selectedMetric}
              onChange={setSelectedMetric}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">Compare entities by metric</p>
          </AccordionSection>
        )}

        {/* Limits Section - Overview mode */}
        {mode === 'overview' && (
          <AccordionSection title="Limits" icon={SlidersHorizontal} defaultOpen>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setLimitEnabled(!limitEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  limitEnabled ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    limitEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-700">Limit results</span>
            </div>
            {limitEnabled && (
              <SegmentedControl
                options={[
                  { value: 10, label: '10' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
                value={dataLimit}
                onChange={setDataLimit}
                className="w-full"
              />
            )}
          </AccordionSection>
        )}

        {/* Advanced Section - Comparative mode */}
        {mode === 'comparative' && (
          <AccordionSection title="Advanced" icon={SlidersHorizontal}>
            <div className="space-y-3">
              {/* Unknown Entities */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700">Unknown entities</p>
                  <p className="text-xs text-gray-500">Show unidentified records</p>
                </div>
                <button
                  onClick={() => setShowUnknown(!showUnknown)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showUnknown ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showUnknown ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Median Line */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700">Median line</p>
                  <p className="text-xs text-gray-500">50th percentile</p>
                </div>
                <button
                  onClick={() => setShowBenchmark(!showBenchmark)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showBenchmark ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showBenchmark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </AccordionSection>
        )}

        {/* Concentration Section - Comparative mode */}
        {mode === 'comparative' && (
          <AccordionSection title="Concentration" icon={TrendingUp}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConcentration(!showConcentration)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showConcentration ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showConcentration ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-700">Show revenue concentration</span>
              </div>
              {showConcentration && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Top N</label>
                  <SegmentedControl
                    options={[
                      { value: 3, label: '3' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' },
                      { value: 25, label: '25' }
                    ]}
                    value={topN}
                    onChange={setTopN}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </AccordionSection>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="border-t border-gray-200 p-3 flex items-center justify-between bg-white">
        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={mode === 'overview' ? handleDateApply : onApply}
          disabled={mode === 'overview' && (!startDate || !endDate)}
          className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default UnifiedFilterPanel;
