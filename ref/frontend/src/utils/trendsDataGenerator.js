/**
 * Utility functions for generating trend data for line charts
 */

/**
 * Generate time series data based on metric values and date range
 */
export const generateTimeSeriesData = (baseValue, trend = 0, days = 30, granularity = 'daily') => {
  const data = [];
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    // Calculate trend progression
    const trendFactor = (i / days) * (trend / 100);
    
    // Add realistic variation (±15% random variation)
    const variation = (Math.random() - 0.5) * 0.3;
    
    // Calculate value with trend and variation
    const value = Math.max(0, baseValue * (1 + trendFactor + variation));
    
    data.push({
      date: formatDateForChart(date, granularity),
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      formatted: formatValue(value)
    });
  }

  return data;
};

/**
 * Generate trend data from existing metrics
 */
export const generateTrendsFromMetrics = (adaptiveMetrics, metricsData) => {
  if (!adaptiveMetrics || !metricsData) {
    return getDefaultTrendMetrics();
  }

  // Select 8 most important metrics for trends
  const priorityMetrics = selectPriorityMetrics(adaptiveMetrics, metricsData);
  
  return priorityMetrics.map((metric, index) => {
    const baseValue = parseFloat(metricsData[metric.id]) || 1000;
    const trendPercentage = generateRealisticTrend(metric.format_type, index);
    
    return {
      id: metric.id,
      title: metric.title,
      data: generateTimeSeriesData(baseValue, trendPercentage, 30),
      color: metric.color || getDefaultColor(index),
      format_type: metric.format_type || 'number',
      icon: metric.icon || 'TrendingUp',
      description: `${metric.title} trend over time`
    };
  });
};

/**
 * Select 8 priority metrics from available metrics
 */
const selectPriorityMetrics = (adaptiveMetrics, _metricsData) => {
  // Priority order for business metrics
  const priorityOrder = [
    'total_sales', 'revenue_trend', 'total_revenue',
    'total_profit', 'profit_trend',
    'total_quantity', 'quantity_trend', 'quantity_sold',
    'customer_count', 'customers_trend', 'unique_interacted_customers',
    'avg_order_value', 'avg_order_trend',
    'total_orders', 'orders_trend',
    'profit_margin', 'margin_trend',
    'sales_efficiency', 'efficiency_trend'
  ];

  const sortedMetrics = [...adaptiveMetrics].sort((a, b) => {
    const aIndex = priorityOrder.findIndex(p => a.id.toLowerCase().includes(p.toLowerCase()));
    const bIndex = priorityOrder.findIndex(p => b.id.toLowerCase().includes(p.toLowerCase()));
    
    // If both found, use priority order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one found, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither found, maintain original order
    return 0;
  });

  return sortedMetrics.slice(0, 8);
};

/**
 * Generate realistic trend percentages based on metric type
 */
const generateRealisticTrend = (formatType, index) => {
  const trendRanges = {
    currency: [-10, 25], // Revenue/profit can vary significantly
    percentage: [-5, 15], // Efficiency metrics typically more stable
    number: [-8, 20]      // Count metrics moderate variation
  };
  
  const range = trendRanges[formatType] || trendRanges.number;
  const [min, max] = range;
  
  // Add some deterministic variation based on index
  const baseVariation = (index % 4 - 1.5) * 2; // -3, -1, 1, 3 pattern
  
  return Math.max(min, Math.min(max, 
    min + Math.random() * (max - min) + baseVariation
  ));
};

/**
 * Get default trend metrics if no adaptive metrics available
 */
const getDefaultTrendMetrics = () => {
  const defaultMetrics = [
    { id: 'revenue_trend', title: 'Revenue Trend', format_type: 'currency', color: 'blue', icon: 'TrendingUp' },
    { id: 'profit_trend', title: 'Profit Trend', format_type: 'currency', color: 'green', icon: 'DollarSign' },
    { id: 'quantity_trend', title: 'Quantity Trend', format_type: 'number', color: 'orange', icon: 'Package' },
    { id: 'orders_trend', title: 'Orders Trend', format_type: 'number', color: 'purple', icon: 'ShoppingCart' },
    { id: 'customers_trend', title: 'Unique Interacted Customers', format_type: 'number', color: 'indigo', icon: 'Users' },
    { id: 'avg_order_trend', title: 'Average Orders', format_type: 'currency', color: 'teal', icon: 'Target' },
    { id: 'margin_trend', title: 'Profit Margin', format_type: 'percentage', color: 'red', icon: 'BarChart' },
    { id: 'efficiency_trend', title: 'Sales Efficiency', format_type: 'currency', color: 'pink', icon: 'Activity' }
  ];

  const baseValues = [15000, 5000, 150, 45, 12, 335, 33.33, 125];
  
  return defaultMetrics.map((metric, index) => ({
    ...metric,
    data: generateTimeSeriesData(baseValues[index], generateRealisticTrend(metric.format_type, index)),
    description: `${metric.title} over time`
  }));
};

/**
 * Get default color for metric by index
 */
const getDefaultColor = (index) => {
  const colors = ['blue', 'green', 'orange', 'purple', 'indigo', 'teal', 'red', 'pink'];
  return colors[index % colors.length];
};

/**
 * Format date based on granularity
 */
const formatDateForChart = (date, granularity = 'daily') => {
  switch (granularity) {
    case 'weekly': {
      // Get start of week (Monday)
      const startOfWeek = new Date(date);
      const dayOfWeek = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      return startOfWeek.toISOString().split('T')[0];
    }
    
    case 'monthly':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    
    case 'daily':
    default:
      return date.toISOString().split('T')[0];
  }
};

/**
 * Format value for display
 */
const formatValue = (value) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Calculate time range from data
 */
export const calculateTimeRange = (data) => {
  if (!data || data.length === 0) return null;
  
  const dates = data.map(d => new Date(d.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  
  let granularity;
  if (diffDays <= 7) {
    granularity = 'daily';
  } else if (diffDays <= 90) {
    granularity = 'daily';
  } else if (diffDays <= 365) {
    granularity = 'weekly';
  } else {
    granularity = 'monthly';
  }
  
  return {
    minDate,
    maxDate,
    diffDays,
    granularity
  };
};

/**
 * Aggregate data by time period
 */
export const aggregateDataByPeriod = (data, granularity) => {
  const aggregated = {};
  
  data.forEach(item => {
    const key = formatDateForChart(new Date(item.date), granularity);
    if (!aggregated[key]) {
      aggregated[key] = { totalValue: 0, count: 0 };
    }
    aggregated[key].totalValue += item.value;
    aggregated[key].count += 1;
  });
  
  return Object.keys(aggregated)
    .sort()
    .map(date => ({
      date,
      value: aggregated[date].totalValue / aggregated[date].count
    }));
};