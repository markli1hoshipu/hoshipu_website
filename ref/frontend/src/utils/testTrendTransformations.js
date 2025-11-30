/**
 * Test script for trend data transformations
 */

import { transformTrendData, fillMissingWeeks, aggregateByMonth, calculateCumulative, getYAxisScales } from './trendDataTransformations.js';

// Sample test data (similar to actual API response)
const sampleWeeklyData = [
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-08', value: 150 },
  { date: '2024-01-15', value: 120 },
  { date: '2024-01-22', value: 180 },
  { date: '2024-01-29', value: 200 },
  { date: '2024-02-05', value: 110 },
  { date: '2024-02-12', value: 130 },
  { date: '2024-02-19', value: 170 },
  { date: '2024-02-26', value: 160 },
  { date: '2024-03-04', value: 190 },
  { date: '2024-03-11', value: 140 },
  { date: '2024-03-18', value: 155 },
  { date: '2024-03-25', value: 175 },
];

// Test sparse data (with gaps)
const sparseData = [
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-15', value: 120 }, // Missing Jan 8
  { date: '2024-02-05', value: 110 }, // Missing Jan 22, 29
  { date: '2024-02-26', value: 160 }, // Missing Feb 12, 19
];

function runTests() {
  console.log('=== Testing Trend Data Transformations ===\n');

  // Test 1: Fill Missing Weeks
  console.log('Test 1: Fill Missing Weeks');
  const filled = fillMissingWeeks(sparseData);
  console.log('Original sparse data:', sparseData.length, 'points');
  console.log('Filled data:', filled.length, 'points');
  console.log('Sample filled data:', filled.slice(0, 5));
  console.log('');

  // Test 2: Monthly Aggregation
  console.log('Test 2: Monthly Aggregation');
  const monthly = aggregateByMonth(sampleWeeklyData);
  console.log('Weekly data:', sampleWeeklyData.length, 'points');
  console.log('Monthly data:', monthly.length, 'points');
  console.log('Monthly aggregated values:', monthly);
  console.log('');

  // Test 3: Cumulative Calculation
  console.log('Test 3: Cumulative Calculation');
  const cumulative = calculateCumulative(sampleWeeklyData);
  console.log('First 3 data points with cumulative:');
  cumulative.slice(0, 3).forEach(item => {
    console.log(`  Date: ${item.date}, Actual: ${item.actualValue}, Cumulative: ${item.cumulativeValue}`);
  });
  console.log('Last data point:', cumulative[cumulative.length - 1]);
  console.log('');

  // Test 4: Transform for Weekly View
  console.log('Test 4: Transform for Weekly View');
  const weeklyTransformed = transformTrendData(sampleWeeklyData, 'weekly');
  console.log('Transformed weekly data points:', weeklyTransformed.length);
  console.log('Sample:', weeklyTransformed[0]);
  console.log('');

  // Test 5: Transform for Monthly View
  console.log('Test 5: Transform for Monthly View');
  const monthlyTransformed = transformTrendData(sampleWeeklyData, 'monthly');
  console.log('Transformed monthly data points:', monthlyTransformed.length);
  console.log('Sample:', monthlyTransformed[0]);
  console.log('');

  // Test 6: Y-Axis Scales
  console.log('Test 6: Y-Axis Scales');
  const scales = getYAxisScales(weeklyTransformed);
  console.log('Left axis (actual values):', scales.leftAxis);
  console.log('Right axis (cumulative values):', scales.rightAxis);
  console.log('');

  console.log('=== All Tests Completed Successfully ===');
}

// Run tests if executed directly
if (typeof window !== 'undefined') {
  window.runTrendTests = runTests;
  console.log('Tests loaded. Run window.runTrendTests() in console to execute.');
} else {
  runTests();
}

export { runTests };