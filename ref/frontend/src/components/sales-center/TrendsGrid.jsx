import React from 'react';
import TrendChart from './TrendChart';

const TrendsGrid = ({
  trendsData = [],
  loading = false,
  error = null,
  dataLimit,
  limitEnabled
}) => {
  // Loading state - show 4 skeleton charts
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, index) => (
          <TrendChart
            key={`loading-${index}`}
            title="Loading..."
            loading={true}
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(8)].map((_, index) => (
          <TrendChart
            key={`error-${index}`}
            title={`Chart ${index + 1}`}
            error="Failed to load trend data"
          />
        ))}
      </div>
    );
  }

  // No data state
  if (!trendsData || trendsData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">No Trend Data Available</p>
          <p className="text-gray-400 text-sm">Upload data to see trend charts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {trendsData.map((chart, index) => (
        <TrendChart
          key={chart.id || `chart-${index}`}
          title={chart.title}
          data={chart.data}
          color={chart.color}
          formatType={chart.format_type}
          icon={chart.icon}
          description={chart.description}
          loading={false}
          error={chart.error}
          height={200}
          table_total={chart.table_total}
          dataLimit={dataLimit}
          limitEnabled={limitEnabled}
        />
      ))}
    </div>
  );
};

export default TrendsGrid;