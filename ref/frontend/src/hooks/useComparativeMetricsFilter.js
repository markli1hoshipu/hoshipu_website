import { useState, useCallback } from 'react';

const STORAGE_PREFIX = 'comparative_metrics_';

/**
 * Custom hook for managing comparative metrics filter preferences with session storage
 * Persists user selections for metric type, benchmark visibility, and concentration settings
 */
export const useComparativeMetricsFilter = () => {
  // Initialize from sessionStorage or defaults
  const [selectedMetric, setSelectedMetricState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}metric`);
      return saved || 'revenue';
    } catch (error) {
      console.warn('Failed to restore metric selection:', error);
      return 'revenue';
    }
  });

  const [showBenchmark, setShowBenchmarkState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}benchmark`);
      return saved === 'true';
    } catch (error) {
      console.warn('Failed to restore benchmark setting:', error);
      return true;
    }
  });

  const [showConcentration, setShowConcentrationState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}concentration`);
      return saved !== 'false'; // Default true
    } catch (error) {
      console.warn('Failed to restore concentration setting:', error);
      return true;
    }
  });

  const [topN, setTopNState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}topN`);
      return saved ? parseInt(saved) : 5;
    } catch (error) {
      console.warn('Failed to restore top N setting:', error);
      return 5;
    }
  });

  // Update metric and save to sessionStorage
  const setSelectedMetric = useCallback((metric) => {
    sessionStorage.setItem(`${STORAGE_PREFIX}metric`, metric);
    setSelectedMetricState(metric);
  }, []);

  // Update benchmark and save to sessionStorage
  const setShowBenchmark = useCallback((show) => {
    sessionStorage.setItem(`${STORAGE_PREFIX}benchmark`, String(show));
    setShowBenchmarkState(show);
  }, []);

  // Update concentration and save to sessionStorage
  const setShowConcentration = useCallback((show) => {
    sessionStorage.setItem(`${STORAGE_PREFIX}concentration`, String(show));
    setShowConcentrationState(show);
  }, []);

  // Update top N and save to sessionStorage
  const setTopN = useCallback((n) => {
    sessionStorage.setItem(`${STORAGE_PREFIX}topN`, String(n));
    setTopNState(n);
  }, []);

  // Get metric label for toolbar
  const getMetricLabel = useCallback(() => {
    return selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
  }, [selectedMetric]);

  // Get benchmark label for toolbar
  const getBenchmarkLabel = useCallback(() => {
    return showBenchmark ? 'Median' : 'Median Off';
  }, [showBenchmark]);

  // Get concentration label for toolbar
  const getConcentrationLabel = useCallback(() => {
    return showConcentration ? `Top ${topN}` : 'Concentration Off';
  }, [showConcentration, topN]);

  return {
    selectedMetric,
    setSelectedMetric,
    showBenchmark,
    setShowBenchmark,
    showConcentration,
    setShowConcentration,
    topN,
    setTopN,
    getMetricLabel,
    getBenchmarkLabel,
    getConcentrationLabel,
  };
};
