/**
 * Utility functions for transforming trend chart data
 * Handles weekly to monthly aggregation and cumulative calculations
 */

/**
 * Fill missing weeks with zero values to ensure consistent data
 * @param {Array} data - Array of {date, value} objects
 * @returns {Array} Data with missing weeks filled with 0 values
 */
/**
 * Parse date string safely without timezone shifts
 * @param {string} dateStr - Date string (can be 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS')
 * @returns {string} Normalized date string 'YYYY-MM-DD'
 */
function normalizeDateString(dateStr) {
  if (!dateStr) return null;

  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If datetime format (YYYY-MM-DD HH:MM:SS), extract date part
  if (/^\d{4}-\d{2}-\d{2}\s/.test(dateStr)) {
    return dateStr.split(' ')[0];
  }

  // For any other format, parse and convert (this handles ISO strings)
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date string: ${dateStr}`);
    return null;
  }

  // Use UTC methods to avoid timezone shifts
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fillMissingWeeks(data) {
  if (!data || data.length === 0) return [];

  // Normalize all dates and sort
  const normalizedData = data.map(item => ({
    date: normalizeDateString(item.date),
    value: item.value
  })).filter(item => item.date !== null);

  if (normalizedData.length === 0) return [];

  const sorted = normalizedData.sort((a, b) => a.date.localeCompare(b.date));

  const filled = [];
  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;

  // Create a map for quick lookup using normalized dates
  const dataMap = new Map(sorted.map(item => [item.date, item.value]));

  // Iterate week by week using simple date arithmetic
  let current = new Date(startDate + 'T00:00:00Z'); // Force UTC
  const end = new Date(endDate + 'T00:00:00Z'); // Force UTC

  while (current <= end) {
    const dateStr = normalizeDateString(current.toISOString());
    filled.push({
      date: dateStr,
      value: dataMap.get(dateStr) || 0
    });

    // Move to next week (7 days)
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return filled;
}

/**
 * Aggregate weekly data into monthly data
 * @param {Array} weeklyData - Array of {date, value} objects
 * @returns {Array} Monthly aggregated data
 */
export function aggregateByMonth(weeklyData) {
  if (!weeklyData || weeklyData.length === 0) return [];

  const monthlyMap = new Map();

  weeklyData.forEach(item => {
    const normalizedDate = normalizeDateString(item.date);
    if (!normalizedDate) return;

    // Extract year and month from normalized date string (YYYY-MM-DD)
    const [year, month] = normalizedDate.split('-');
    const monthKey = `${year}-${month}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        date: `${monthKey}-01`,
        value: 0,
        count: 0
      });
    }

    const monthData = monthlyMap.get(monthKey);
    monthData.value += parseFloat(item.value) || 0;
    monthData.count += 1;
  });

  // Convert map to array and sort by date string
  return Array.from(monthlyMap.values())
    .map(item => ({
      date: item.date,
      value: item.value
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate percentage change from previous period
 * @param {Array} data - Array of {date, value} objects
 * @returns {Array} Data with percentage change values added
 */
function calculatePercentageChange(data) {
  if (!data || data.length === 0) return [];

  return data.map((item, index) => {
    let percentageChange = 0;

    if (index > 0) {
      const current = parseFloat(item.value) || 0;
      const previous = parseFloat(data[index - 1].value) || 0;

      if (previous !== 0) {
        percentageChange = ((current - previous) / previous) * 100;
        // Clamp between -100% and +150%
        percentageChange = Math.max(-100, Math.min(150, percentageChange));
      }
    }

    return {
      ...item,
      actualValue: item.value,
      cumulativeValue: percentageChange
    };
  });
}

/**
 * Transform trend data for combined chart display
 * @param {Array} rawData - Raw data from API
 * @param {string} viewMode - 'weekly' or 'monthly'
 * @returns {Array} Transformed data ready for ComposedChart
 */
export function transformTrendData(rawData, viewMode = 'weekly') {
  if (!rawData || rawData.length === 0) return [];

  // Fill missing weeks first
  const filledData = fillMissingWeeks(rawData);

  // Aggregate to monthly if needed
  const aggregatedData = viewMode === 'monthly'
    ? aggregateByMonth(filledData)
    : filledData;

  // Calculate percentage changes
  const dataWithCumulative = calculatePercentageChange(aggregatedData);

  // Format dates for display
  return dataWithCumulative.map(item => ({
    ...item,
    displayDate: formatDateForDisplay(item.date, viewMode)
  }));
}

/**
 * Format date for display based on view mode
 * @param {string} dateStr - Date string
 * @param {string} viewMode - 'weekly' or 'monthly'
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateStr, viewMode) {
  const date = new Date(dateStr);

  if (viewMode === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get appropriate Y-axis scale for dual axes
 * @param {Array} data - Data with actualValue and cumulativeValue
 * @returns {Object} Scale configuration for left and right Y-axes
 */
export function getYAxisScales(data) {
  if (!data || data.length === 0) {
    return {
      leftAxis: { domain: [0, 100] },
      rightAxis: { domain: [-100, 150] }
    };
  }

  const actualValues = data.map(d => d.actualValue || 0);
  const actualMax = Math.max(...actualValues);

  // Add some padding to the max values for left axis
  const actualDomain = [0, Math.ceil(actualMax * 1.1)];

  // Fixed domain for percentage change: -100% to +150%
  const percentageDomain = [-100, 150];

  return {
    leftAxis: { domain: actualDomain },
    rightAxis: { domain: percentageDomain }
  };
}