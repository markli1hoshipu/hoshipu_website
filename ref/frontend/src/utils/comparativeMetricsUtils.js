/**
 * Comparative Metrics Utilities
 *
 * Helper functions for filtering, aggregating, and calculating metrics
 * across different entities (employees, locations, products, customers)
 */

/**
 * Calculates benchmark (median) across all entities
 * Uses median instead of mean for more robust, outlier-resistant benchmark
 *
 * @param {Array} data - Aggregated data array with metric properties
 * @param {string} metric - Metric key to calculate benchmark for (e.g., 'revenue', 'profit', 'volume')
 * @returns {number} Benchmark value (median - 50th percentile)
 */
export const calculateBenchmark = (data, metric = 'value') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 0;
  }

  // Extract and sort values
  const values = data
    .map(item => parseFloat(item[metric]) || 0)
    .sort((a, b) => a - b);

  // Calculate median
  const midpoint = Math.floor(values.length / 2);

  if (values.length % 2 === 0) {
    // Even number of values: average the two middle values
    return (values[midpoint - 1] + values[midpoint]) / 2;
  } else {
    // Odd number of values: return middle value
    return values[midpoint];
  }
};

/**
 * Calculates concentration metrics for pie charts
 *
 * @param {Array} data - Aggregated data array sorted by value
 * @param {string} entityKey - Entity key for naming (used for "Others" label)
 * @param {number} topN - Number of top entities to show individually (default: 5)
 * @returns {Object} Object with pieData array and concentration metrics
 */
export const calculateConcentration = (data, entityKey, topN = 5) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      pieData: [],
      concentration: {
        topNPercentage: 0,
        totalEntities: 0,
        topNCount: 0
      }
    };
  }

  // Calculate total value
  const totalValue = data.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);

  // Get top N entities
  const topEntities = data.slice(0, topN);
  const otherEntities = data.slice(topN);

  // Create pie chart data
  const pieData = topEntities.map(item => ({
    name: item.name,
    value: parseFloat(item.value) || 0,
    percentage: totalValue > 0 ? ((parseFloat(item.value) || 0) / totalValue * 100).toFixed(1) : 0
  }));

  // Add "Others" category if there are remaining entities
  if (otherEntities.length > 0) {
    const othersTotal = otherEntities.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
    pieData.push({
      name: `Others (${otherEntities.length})`,
      value: othersTotal,
      percentage: totalValue > 0 ? (othersTotal / totalValue * 100).toFixed(1) : 0
    });
  }

  // Calculate concentration metrics
  const topNTotal = topEntities.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
  const topNPercentage = totalValue > 0 ? (topNTotal / totalValue * 100).toFixed(1) : 0;

  return {
    pieData,
    concentration: {
      topNPercentage: parseFloat(topNPercentage),
      totalEntities: data.length,
      topNCount: topEntities.length
    }
  };
};

/**
 * Formats currency values for display
 *
 * @param {number} value - Numeric value to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

