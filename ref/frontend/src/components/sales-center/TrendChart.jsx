import React, { useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Target,
  ShoppingCart,
  BarChart,
  Activity,
  MapPin,
  Calendar,
  CalendarDays
} from 'lucide-react';
import { transformTrendData, getYAxisScales } from '../../utils/trendDataTransformations';

const TrendChart = ({
  title,
  data = [],
  color = 'blue',
  formatType = 'number',
  icon: IconProp,
  loading = false,
  error = null,
  height = 200,
  description = '',
  table_total = null,
  dataLimit,
  limitEnabled
}) => {
  const [viewMode, setViewMode] = useState('monthly');

  // Icon mapping
  const iconMap = {
    TrendingUp,
    DollarSign,
    Package,
    Users,
    Target,
    ShoppingCart,
    BarChart,
    Activity,
    MapPin,
    Calendar,
    CalendarDays
  };

  const IconComponent = typeof IconProp === 'string' ? iconMap[IconProp] : IconProp || TrendingUp;

  // Unified Prelude Brand Color - All charts use consistent branding
  const PRELUDE_BRAND_COLOR = {
    primary: '#031D4A',
    light: '#f0f4ff'
  };

  const scheme = PRELUDE_BRAND_COLOR;

  // Format value for display
  const formatValue = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0';
    
    switch(formatType) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numValue);
      case 'percentage':
        return `${numValue.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: numValue % 1 !== 0 ? 1 : 0,
        }).format(numValue);
    }
  };

  // Transform data for chart display
  let transformedData = transformTrendData(data, viewMode);

  // Apply data limiting if enabled (most recent N data points per chart)
  if (limitEnabled && dataLimit && transformedData.length > dataLimit) {
    transformedData = transformedData.slice(-dataLimit);
  }

  const yAxisScales = getYAxisScales(transformedData);

  // Use table_total if available, otherwise fall back to latest value
  const currentValue = table_total !== null && table_total !== undefined ? table_total : (transformedData.length > 0 ? transformedData[transformedData.length - 1]?.actualValue || 0 : 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const actualData = payload.find(p => p.dataKey === 'actualValue');
      const cumulativeData = payload.find(p => p.dataKey === 'cumulativeValue');

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm text-gray-600">{`Date: ${label}`}</p>
          {actualData && (
            <p className="text-sm font-semibold" style={{ color: PRELUDE_BRAND_COLOR.primary }}>
              {`Actual: ${formatValue(actualData.value)}`}
            </p>
          )}
          {cumulativeData && (
            <p className="text-sm font-semibold text-gray-600">
              {`Change: ${cumulativeData.value.toFixed(1)}%`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-40 bg-gray-100 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <IconComponent className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex items-center justify-center h-40 bg-red-50 rounded">
          <p className="text-red-600 text-sm">Error loading chart data</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!transformedData || transformedData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <IconComponent className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex items-center justify-center h-40 bg-gray-50 rounded">
          <p className="text-gray-500 text-sm">No trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
              {description && (
                <p className="text-xs text-gray-500">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1 ${
                    viewMode === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarDays className="w-3 h-3" />
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1 ${
                    viewMode === 'weekly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Weekly
                </button>
              </div>
              <div className="w-10 h-10 rounded-full bg-prelude-50 flex items-center justify-center">
                <IconComponent className="w-5 h-5" style={{ color: scheme.primary }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={transformedData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={formatValue}
              domain={yAxisScales.leftAxis.domain}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={(value) => `${value}%`}
              domain={yAxisScales.rightAxis.domain}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              yAxisId="left"
              dataKey="actualValue"
              fill={scheme.primary}
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativeValue"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 2, fill: "#059669" }}
              activeDot={{ r: 4, fill: "#059669" }}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default TrendChart;