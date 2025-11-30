import React, { useMemo } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import MetricBarChart from './MetricBarChart';
import { Card } from '../ui/primitives/card';
import { calculateBenchmark } from '../../utils/comparativeMetricsUtils';
import { useDateFilter } from '../../hooks/useDateFilter';
import { useSalesCenter } from '../../contexts/SalesCenterContext';
import ConcentrationPieCharts from './ConcentrationPieCharts';
import { filterUnknownEntities } from '../../services/outlierDetection';

/**
 * ComparativeMetrics Component
 *
 * Displays 4 side-by-side bar charts comparing revenue and profit across:
 * - Employee Performance
 * - Location Performance
 * - Product Performance
 * - Customer Performance
 */
const ComparativeMetrics = ({ tableName, selectedMetric, showBenchmark, showConcentration, showUnknown, topN, dataLimit, limitEnabled }) => {
  const { dateFilter } = useDateFilter();
  const { comparativeData, comparativeLoading, comparativeError } = useSalesCenter();
  const [pagination, setPagination] = React.useState({
    employee: 0,
    location: 0,
    product: 0,
    customer: 0
  });

  // Transform backend data into MetricBarChart format
  const transformDataForChart = (combinedData, categoryKey, dateFilter, selectedMetric, showUnknown, dataLimit, limitEnabled) => {
    if (!combinedData || !Array.isArray(combinedData)) {
      return { data: [], hiddenCount: 0, hiddenTotal: 0 };
    }

    // Step 1: Filter by date range if dateFilter exists
    let filteredData = combinedData;
    if (dateFilter) {
      filteredData = combinedData.filter(item => {
        const itemDate = new Date(item.date || item.week_start || item.period || item.timestamp);
        return !isNaN(itemDate) &&
               itemDate >= dateFilter.startDate &&
               itemDate <= dateFilter.endDate;
      });
    }

    // Step 2: Aggregate by entity
    const aggregated = {};
    filteredData.forEach(item => {
      const entity = item[categoryKey] || 'Unknown';
      if (!aggregated[entity]) {
        aggregated[entity] = {
          revenue: 0,
          profit: 0,
          volume: 0
        };
      }
      aggregated[entity].revenue += item.total_revenue || item.revenue || 0;
      aggregated[entity].profit += item.total_profit || item.profit || 0;
      aggregated[entity].volume += item.unique_transactions || 0;
    });

    // Convert to array and format for selected metric
    let data = Object.entries(aggregated).map(([name, metrics]) => ({
      name,
      fullName: name,
      value: metrics[selectedMetric] || 0,
      displayValue: metrics[selectedMetric] || 0,
      revenue: metrics.revenue,
      profit: metrics.profit,
      volume: metrics.volume
    }));

    // Step 3: Sort by the selected metric
    data.sort((a, b) => b[selectedMetric] - a[selectedMetric]);

    // Step 4: Filter Unknown entities if showUnknown is false
    let hiddenCount = 0;
    let hiddenTotal = 0;
    if (!showUnknown) {
      const { cleanData, unknownEntities, stats } = filterUnknownEntities(data);
      hiddenCount = stats.unknownCount;
      hiddenTotal = unknownEntities.reduce((sum, item) => sum + (item[selectedMetric] || 0), 0);
      data = cleanData;
    }

    // Step 5: Limit to top N if limitEnabled
    if (limitEnabled && dataLimit && dataLimit < data.length) {
      data = data.slice(0, dataLimit);
    }

    // Step 6: Return data with metadata
    return { data, hiddenCount, hiddenTotal };
  };

  // Handle page changes for charts
  const handlePageChange = (chartType, newPage) => {
    setPagination(prev => ({
      ...prev,
      [chartType]: newPage
    }));
  };

  // Transform data using useMemo (recomputes only when dependencies change)
  const data = useMemo(() => {
    if (!comparativeData) return null;

    return {
      Employee: transformDataForChart(comparativeData.Employee, 'employee', dateFilter, selectedMetric, showUnknown, dataLimit, limitEnabled),
      Location: transformDataForChart(comparativeData.Location, 'location', dateFilter, selectedMetric, showUnknown, dataLimit, limitEnabled),
      Products: transformDataForChart(comparativeData.Products, 'product', dateFilter, selectedMetric, showUnknown, dataLimit, limitEnabled),
      Customers: transformDataForChart(comparativeData.Customers, 'customer', dateFilter, selectedMetric, showUnknown, dataLimit, limitEnabled)
    };
  }, [comparativeData, dateFilter, selectedMetric, showUnknown, dataLimit, limitEnabled]);


  if (comparativeLoading) {
    return (
      <div className="space-y-6">
        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['Employee Performance', 'Location Performance', 'Product Performance', 'Customer Performance'].map((title, index) => (
            <Card key={index} className="p-6" style={{ height: '300px' }}>
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="mt-6 h-32 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (comparativeError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{comparativeError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No comparative metrics available</p>
      </div>
    );
  }

  // Calculate total hidden count for indicator
  const totalHiddenCount = !showUnknown ? (
    (data.Employee?.hiddenCount || 0) +
    (data.Location?.hiddenCount || 0) +
    (data.Products?.hiddenCount || 0) +
    (data.Customers?.hiddenCount || 0)
  ) : 0;

  return (
    <div className="space-y-6">
      {/* Visual Indicator for Hidden Unknown Entities */}
      {!showUnknown && totalHiddenCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-800">
            Hiding {totalHiddenCount} unknown {totalHiddenCount === 1 ? 'entity' : 'entities'}.
          </span>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricBarChart
          data={data.Employee?.data || []}
          title="Employee Performance"
          color="#3B82F6"
          formatType={selectedMetric === 'volume' ? 'number' : 'currency'}
          height={300}
          chartType="employee"
          currentPage={pagination.employee}
          totalItems={data.Employee?.data?.length || 0}
          onPageChange={handlePageChange}
          dataType="employee"
          showTooltip={true}
          isStacked={false}
          benchmark={showBenchmark ? calculateBenchmark(data.Employee?.data || [], selectedMetric) : undefined}
        />

        <MetricBarChart
          data={data.Location?.data || []}
          title="Location Performance"
          color="#3B82F6"
          formatType={selectedMetric === 'volume' ? 'number' : 'currency'}
          height={300}
          chartType="location"
          currentPage={pagination.location}
          totalItems={data.Location?.data?.length || 0}
          onPageChange={handlePageChange}
          dataType="location"
          showTooltip={true}
          isStacked={false}
          benchmark={showBenchmark ? calculateBenchmark(data.Location?.data || [], selectedMetric) : undefined}
        />

        <MetricBarChart
          data={data.Products?.data || []}
          title="Product Performance"
          color="#3B82F6"
          formatType={selectedMetric === 'volume' ? 'number' : 'currency'}
          height={300}
          chartType="product"
          currentPage={pagination.product}
          totalItems={data.Products?.data?.length || 0}
          onPageChange={handlePageChange}
          dataType="product"
          showTooltip={true}
          isStacked={false}
          benchmark={showBenchmark ? calculateBenchmark(data.Products?.data || [], selectedMetric) : undefined}
        />

        <MetricBarChart
          data={data.Customers?.data || []}
          title="Customer Performance"
          color="#3B82F6"
          formatType={selectedMetric === 'volume' ? 'number' : 'currency'}
          height={300}
          chartType="customer"
          currentPage={pagination.customer}
          totalItems={data.Customers?.data?.length || 0}
          onPageChange={handlePageChange}
          dataType="customer"
          showTooltip={true}
          isStacked={false}
          benchmark={showBenchmark ? calculateBenchmark(data.Customers?.data || [], selectedMetric) : undefined}
        />
      </div>

      {/* Concentration Pie Charts - conditionally rendered */}
      {showConcentration && (
        <ConcentrationPieCharts topN={topN} />
      )}
    </div>
  );
};

export default ComparativeMetrics;