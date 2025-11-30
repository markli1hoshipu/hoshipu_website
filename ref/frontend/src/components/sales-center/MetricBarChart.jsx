import React, { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDisplayValue, truncateName } from '../../services/chartUtils';

/**
 * Custom Tooltip Component with flexible display options
 */
const CustomTooltip = ({ active, payload, label, formatType, dataType, isStacked }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{data.fullName || label}</p>
        {isStacked ? (
          payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-semibold">
              {entry.name}: ${entry.value?.toLocaleString() || 0}
            </p>
          ))
        ) : (
          <p className="text-sm text-indigo-600 font-semibold">
            {formatDisplayValue(data.displayValue, formatType)}
          </p>
        )}
        {/* Conditional additional info based on data type */}
        {dataType === 'location' && data.employeeCount > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Employees: {data.employeeCount}
          </p>
        )}
        {dataType === 'employee' && data.location && (
          <p className="text-xs text-gray-500 mt-1">
            Location: {data.location}
          </p>
        )}
      </div>
    );
  }
  return null;
};

/**
 * Unified Metric Bar Chart Component with Pagination
 * Supports both employee and location data with consistent design
 */
const MetricBarChart = memo(({
  data = [],
  title,
  color,
  formatType,
  height = 380,
  chartType,
  currentPage = 0,
  totalItems = 0,
  onPageChange,
  dataType = 'location', // 'location' or 'employee'
  showTooltip = true,
  isStacked = false,
  benchmark // optional benchmark value to display as a reference line
}) => {
  const itemsPerPage = isStacked ? 15 : 20;
  
  // Calculate pagination info
  const totalPages = Math.ceil((totalItems || data.length) / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Slice data for current page
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // Prepare chart data with truncated names for X-axis
  const chartData = paginatedData.map((item) => ({
    ...item,
    name: truncateName(item.name, 10), // Use truncated names for X-axis
    fullName: item.name // Keep full name for tooltip
  }));

  // Y-axis formatter for large numbers
  const formatYAxisValue = (value) => {
    if (formatType === 'currency') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value}`;
    } else {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return `${value}`;
    }
  };

  // Format median label
  const formatMedianLabel = (value) => {
    if (formatType === 'currency') {
      if (value >= 1000000) return `Median: $${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `Median: $${(value / 1000).toFixed(0)}K`;
      return `Median: $${value.toLocaleString()}`;
    } else {
      if (value >= 1000000) return `Median: ${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `Median: ${(value / 1000).toFixed(0)}K`;
      return `Median: ${value.toLocaleString()}`;
    }
  };

  // Handle page navigation
  const handlePrevPage = () => {
    if (currentPage > 0 && onPageChange) {
      onPageChange(chartType, currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1 && onPageChange) {
      onPageChange(chartType, currentPage + 1);
    }
  };

  // Get entity label based on data type
  const getEntityLabel = () => {
    switch (dataType) {
      case 'employee': return 'employees';
      case 'location': return 'locations';
      case 'product': return 'products';
      case 'customer': return 'customers';
      default: return 'items';
    }
  };

  const getNoDataMessage = () => {
    switch (dataType) {
      case 'employee': return 'No employee data available';
      case 'location': return 'No location data available';
      case 'product': return 'No product data available';
      case 'customer': return 'No customer data available';
      default: return 'No data available';
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>{getNoDataMessage()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Chart Header with Pagination */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`p-1 rounded ${
                currentPage === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm text-gray-600 px-2">
              {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className={`p-1 rounded ${
                currentPage >= totalPages - 1 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Show count when no pagination */}
        {totalPages <= 1 && (
          <span className="text-sm text-gray-500">
            ({data.length} {getEntityLabel()})
          </span>
        )}
      </div>

      {/* Chart Container */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
          >
            <defs>
              <linearGradient id={`gradient-${chartType}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={40}
              tick={{ fontSize: 9, fill: '#6B7280' }}
              interval={0}
            />
            
            <YAxis 
              tickFormatter={formatYAxisValue}
              tick={{ fontSize: 11, fill: '#4B5563' }}
            />
            
            {showTooltip && (
              <Tooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    formatType={formatType}
                    dataType={dataType}
                    isStacked={isStacked}
                  />
                )}
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
              />
            )}

            {isStacked ? (
              <>
                <Bar
                  dataKey="profit"
                  name="Profit"
                  fill="#10B981"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="additionalRevenue"
                  name="Additional Revenue"
                  fill="#3B82F6"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </>
            ) : (
              <Bar
                dataKey="value"
                fill={`url(#gradient-${chartType})`}
                radius={[4, 4, 0, 0]}
                stroke={color}
                strokeWidth={1}
              />
            )}

            {/* Median Reference Line */}
            {benchmark !== undefined && benchmark !== null && (
              <ReferenceLine
                y={benchmark}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{
                  value: formatMedianLabel(benchmark),
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
        <span>
          {totalPages > 1
            ? `Showing ${Math.min(itemsPerPage, paginatedData.length)} of ${totalItems || data.length} ${getEntityLabel()}`
            : `Ranked by highest ${dataType} performance • Hover for ${dataType} names`
          }
        </span>
        <span className="text-gray-500">
          {totalPages > 1
            ? `Page ${currentPage + 1} • Hover for ${dataType} details`
            : `Top ${Math.min(data.length, itemsPerPage)} shown`
          }
        </span>
      </div>
    </div>
  );
});

MetricBarChart.displayName = 'MetricBarChart';

export default MetricBarChart;