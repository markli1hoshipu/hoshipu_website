import React, { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';

// Import the sales center context
import { useSalesCenter } from '../../contexts/SalesCenterContext';
import TrendsGrid from './TrendsGrid';
import MetricCard from './MetricCard';


const MainDashboard = ({ selectedTable, dateFilter, dataLimit, limitEnabled }) => {
    // Get trends and data from context
    const {
      // Trends data
      trendsData,
      trendsLoading,
      loadTrendsData,
      // Overall data
      overallData,
      overallLoading,
      loadOverallData
    } = useSalesCenter();

    // Load trends data when table is selected
    useEffect(() => {
      if (selectedTable && trendsData === null && !trendsLoading) {
        loadTrendsData(selectedTable);
      }
      // Note: loadTrendsData is intentionally omitted from deps to prevent infinite loops
      // It's a stable function from context and only needs to run when table/data state changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTable, trendsData, trendsLoading]);

    // Load overall data when table is selected
    useEffect(() => {
      if (selectedTable && overallData === null && !overallLoading) {
        loadOverallData(selectedTable);
      }
      // Note: loadOverallData is intentionally omitted from deps to prevent infinite loops
      // It's a stable function from context and only needs to run when table/data state changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTable, overallData, overallLoading]);

    // Filter trends data by date range (client-side filtering)
    const filteredTrendsData = useMemo(() => {
      if (!trendsData || !dateFilter) {
        return trendsData; // No filter applied, return all data
      }

      // Filter each chart's data points by date range
      return trendsData.map(chart => {
        const filteredDataPoints = chart.data.filter(point => {
          const pointDate = new Date(point.time_period || point.date);
          return pointDate >= dateFilter.startDate && pointDate <= dateFilter.endDate;
        });

        return {
          ...chart,
          data: filteredDataPoints,
          filteredCount: filteredDataPoints.length,
          totalCount: chart.data.length
        };
      });
    }, [trendsData, dateFilter]);

    // Check if filter resulted in no data
    const hasFilteredData = useMemo(() => {
      if (!filteredTrendsData || !dateFilter) return true;
      return filteredTrendsData.some(chart => chart.data.length > 0);
    }, [filteredTrendsData, dateFilter]);

    // Extract metric values from overall data
    const getMetricValue = (metricType) => {
      if (!overallData || !overallData[metricType] || !overallData[metricType].data || overallData[metricType].data.length === 0) {
        return null;
      }
      return overallData[metricType].data[0] || null;
    };

    const totalRevenue = getMetricValue('total_revenue')?.total_revenue;
    const totalProfit = getMetricValue('total_profit')?.total_profit;
    const totalCustomers = getMetricValue('total_customers')?.total_customers;
    const profitMarginData = getMetricValue('profit_margin')?.profit_margin_percentage;
    const profitMargin = profitMarginData || ((totalRevenue && totalProfit) ? ((totalProfit / totalRevenue) * 100) : null);

    // Show unified loading skeleton if either overall or trends data is loading
    if (overallLoading || trendsLoading) {
      return (
        <div className="space-y-8">
          {/* 4 Metric Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard title="Total Revenue" icon="DollarSign" color="green" loading={true} />
            <MetricCard title="Total Profit" icon="TrendingUp" color="blue" loading={true} />
            <MetricCard title="Total Customers" icon="Users" color="purple" loading={true} />
            <MetricCard title="Profit Margin" icon="Target" color="orange" loading={true} />
          </div>
          {/* Trend Charts Skeleton */}
          <TrendsGrid loading={true} />
        </div>
      );
    }

    // Render metric cards
    const renderMetricCards = () => {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={totalRevenue}
            icon="DollarSign"
            color="green"
            formatType="currency"
            loading={overallLoading}
            error={overallData === null && !overallLoading ? "Failed to load" : null}
          />
          <MetricCard
            title="Total Profit"
            value={totalProfit}
            icon="TrendingUp"
            color="blue"
            formatType="currency"
            loading={overallLoading}
            error={overallData === null && !overallLoading ? "Failed to load" : null}
          />
          <MetricCard
            title="Total Customers"
            value={totalCustomers}
            icon="Users"
            color="purple"
            formatType="number"
            loading={overallLoading}
            error={overallData === null && !overallLoading ? "Failed to load" : null}
          />
          <MetricCard
            title="Profit Margin"
            value={profitMargin}
            icon="Target"
            color="orange"
            formatType="percentage"
            loading={overallLoading}
            error={overallData === null && !overallLoading ? "Failed to load" : null}
          />
        </div>
      );
    };

    // Render trends layout with metric cards and line charts
    const renderTrendsLayout = () => {
      return (
        <div className="space-y-8">
          {/* 4 Metric Cards in a Row */}
          {renderMetricCards()}

          {/* Date Filter Info Message */}
          {dateFilter && !hasFilteredData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-900">No data in selected date range</h4>
                <p className="text-sm text-amber-700 mt-1">
                  No trend data available for {format(dateFilter.startDate, 'MMM d, yyyy')} - {format(dateFilter.endDate, 'MMM d, yyyy')}.
                  Try adjusting your date range or select "All Time" to view all available data.
                </p>
              </div>
            </div>
          )}

          {/* Trend Charts - use filtered data */}
          <TrendsGrid
            trendsData={filteredTrendsData}
            loading={trendsLoading}
            error={null}
            dataLimit={dataLimit}
            limitEnabled={limitEnabled}
          />
        </div>
      );
    };
  
    // Use trends layout if available
    if (trendsData && trendsData.length > 0) {
      return renderTrendsLayout();
    }
  
    // FALLBACK: Use default trends if no adaptive metrics available
    return renderTrendsLayout();
  };

  export default React.memo(MainDashboard);