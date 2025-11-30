import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAvailableTables, getPrecomputedTrends, getPrecomputedComparative, getPrecomputedOverall, getPrecomputedConcentration, getPreGeneratedInsights } from '../services/salesDataApi';
import { useAuth } from '../auth/hooks/useAuth';

const SalesCenterContext = createContext();

const useSalesCenter = () => {
  const context = useContext(SalesCenterContext);
  if (!context) {
    throw new Error('useSalesCenter must be used within a SalesCenterProvider');
  }
  return context;
};

// Export the hook
export { useSalesCenter };

const SalesCenterProvider = ({ children }) => {
  // Authentication state
  const { isAuthenticated, isLoading: authLoading, authFetch } = useAuth();

  // Cache duration (1 hour)
  const CACHE_DURATION = 60 * 60 * 1000;

  // Check if cache is valid
  const isCacheValid = (lastFetch) => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_DURATION;
  };

  // Table management state
  const [selectedTable, setSelectedTable] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  // Initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  // Comparative data (unified employee, location, products, customers)
  const [comparativeData, setComparativeData] = useState(null);
  const [comparativeLoading, setComparativeLoading] = useState(false);
  const [comparativeError, setComparativeError] = useState(null);
  const [comparativeUpdatedAt, setComparativeUpdatedAt] = useState(null);

  // Concentration data (customer and product revenue concentration)
  const [concentrationData, setConcentrationData] = useState(null);
  const [concentrationLoading, setConcentrationLoading] = useState(false);
  const [concentrationError, setConcentrationError] = useState(null);
  const [concentrationUpdatedAt, setConcentrationUpdatedAt] = useState(null);

  // Overall data
  const [overallData, setOverallData] = useState(null);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState(null);

  // Insights data - retrieval-based system (daily only)
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [insightsUpdatedAt, setInsightsUpdatedAt] = useState(null);
  const [insightMetadata, setInsightMetadata] = useState(null);

  // Trends data (simplified for precomputed metrics)
  const [trendsData, setTrendsData] = useState(null);
  const [trendsUpdatedAt, setTrendsUpdatedAt] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState(null);

  // Precomputed data timestamps for staleness indicators
  const [overallUpdatedAt, setOverallUpdatedAt] = useState(null);

  // Last fetch timestamps for cache validation
  const [comparativeLastFetch, setComparativeLastFetch] = useState(null);
  const [concentrationLastFetch, setConcentrationLastFetch] = useState(null);
  const [overallLastFetch, setOverallLastFetch] = useState(null);
  const [trendsLastFetch, setTrendsLastFetch] = useState(null);
  const [insightsLastFetch, setInsightsLastFetch] = useState(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Refs to prevent multiple simultaneous requests and access current values
  const tableLoadingRef = useRef(false);
  const comparativeDataRef = useRef(comparativeData);
  const comparativeLastFetchRef = useRef(comparativeLastFetch);
  const concentrationDataRef = useRef(concentrationData);
  const concentrationLastFetchRef = useRef(concentrationLastFetch);
  const overallDataRef = useRef(overallData);
  const overallLastFetchRef = useRef(overallLastFetch);
  const trendsDataRef = useRef(trendsData);
  const trendsLastFetchRef = useRef(trendsLastFetch);
  const insightsDataRef = useRef(insights);
  const insightsLastFetchRef = useRef(insightsLastFetch);

  // Update refs when state changes
  useEffect(() => {
    comparativeDataRef.current = comparativeData;
    comparativeLastFetchRef.current = comparativeLastFetch;
    concentrationDataRef.current = concentrationData;
    concentrationLastFetchRef.current = concentrationLastFetch;
    overallDataRef.current = overallData;
    overallLastFetchRef.current = overallLastFetch;
    trendsDataRef.current = trendsData;
    trendsLastFetchRef.current = trendsLastFetch;
    insightsDataRef.current = insights;
    insightsLastFetchRef.current = insightsLastFetch;
  }, [comparativeData, comparativeLastFetch, concentrationData, concentrationLastFetch, overallData, overallLastFetch, trendsData, trendsLastFetch, insights, insightsLastFetch]);

  // Load available tables function (extracted for reusability)
  const loadAvailableTables = useCallback(async (forceRefresh = false) => {
    // Debouncing: prevent multiple simultaneous calls using ref instead of state
    if (tableLoadingRef.current && !forceRefresh) {
      console.log('⏸️ Tables already loading (ref check), skipping duplicate request');
      return;
    }

    // Set both state and ref to prevent race conditions
    tableLoadingRef.current = true;
    setTablesLoading(true);
    try {
      console.log('🔄 Loading available tables', forceRefresh ? '(FORCE REFRESH)' : '');
      const tables = await getAvailableTables(authFetch);
      setAvailableTables(tables);
      // Auto-select newly uploaded table or set first available table as default
      if (tables.length > 0) {
        if (!selectedTable) {
          // No table selected, choose first available (prefer bendata if available)
          const bendataTable = tables.find(table => {
            const tableName = typeof table === 'string' ? table : table?.table_name || table?.name;
            return tableName === 'bendata';
          });
          const firstTable = bendataTable
            ? (typeof bendataTable === 'string' ? bendataTable : bendataTable?.table_name || bendataTable?.name)
            : (typeof tables[0] === 'string' ? tables[0] : tables[0]?.table_name || tables[0]?.name);

          if (firstTable !== selectedTable) {
            setSelectedTable(firstTable);
            console.log('📋 Auto-selected table:', firstTable);
          }
        } else {
          // Always check if current selected table still exists
          const tableExists = tables.some(table => {
            const tableName = typeof table === 'string' ? table : table?.table_name || table?.name;
            return tableName === selectedTable;
          });

          if (!tableExists) {
            // Current table doesn't exist anymore, select first available (prefer bendata)
            const bendataTable = tables.find(table => {
              const tableName = typeof table === 'string' ? table : table?.table_name || table?.name;
              return tableName === 'bendata';
            });
            const firstTable = bendataTable
              ? (typeof bendataTable === 'string' ? bendataTable : bendataTable?.table_name || bendataTable?.name)
              : (typeof tables[0] === 'string' ? tables[0] : tables[0]?.table_name || tables[0]?.name);

            if (firstTable !== selectedTable) {
              setSelectedTable(firstTable);
              console.log('📋 Previous table no longer exists, selected:', firstTable);
            }
          }
        }
      }
      console.log('✅ Available tables loaded:', tables.length, 'tables');
    } catch (error) {
      console.error('Failed to load tables:', error);
      setAvailableTables([]);
      if (!selectedTable) {
        setSelectedTable('');
      }
    } finally {
      // Reset both state and ref
      tableLoadingRef.current = false;
      setTablesLoading(false);
    }
  }, [selectedTable, authFetch]);

  // Reload available tables function for refresh operations
  const reloadAvailableTables = useCallback(async () => {
    return loadAvailableTables(true);
  }, [loadAvailableTables]);

  // Load available tables after authentication completes
  useEffect(() => {
    // Wait for authentication to complete before loading tables
    if (!isAuthenticated || authLoading) {
      return;
    }

    loadAvailableTables();
  }, [isAuthenticated, authLoading, loadAvailableTables]);

  // Load precomputed insights data - daily timeframe only
  const loadInsightsData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    // Guard 1: Already loading
    if (insightsLoading && !forceRefresh) {
      console.log('⏳ Already loading insights, skipping...');
      return;
    }

    // Guard 2: Cache valid - use refs to get current values
    const currentInsightsData = insightsDataRef.current;
    const currentLastFetch = insightsLastFetchRef.current;

    if (!forceRefresh && currentInsightsData && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached insights data');
      return;
    }

    // Guard 3: Recent error - prevent retry loops
    if (!forceRefresh && insightsError && insightsLastFetch && (Date.now() - insightsLastFetch < 5000)) {
      console.log('⏸️ Recent error loading insights, skipping retry...');
      return;
    }

    setInsightsLoading(true);
    setInsightsError(null);

    try {
      console.log('🔄 Loading precomputed insights data for table:', tableName);

      const result = await getPreGeneratedInsights(tableName, 'daily', null, authFetch);

      if (result?.success && result?.insights) {
        const { sections, summary, confidence_score, analysis_date, generated_at } = result.insights;

        // Convert sections array to object keyed by section names
        const part_2_actions = {};
        const sectionKeyMap = {
          "Today's Priorities": 'todays_priorities',
          "Customer Engagement": 'customer_engagement',
          "Revenue Opportunities": 'revenue_opportunities',
          "Business Risk Assessment": 'business_risk_assessment',
          "Performance Intelligence": 'performance_intelligence',
          "Strategic Initiatives": 'strategic_initiatives'
        };

        sections?.forEach(section => {
          const key = sectionKeyMap[section.name];
          if (key) {
            part_2_actions[key] = {
              situation: section.situation,
              actions: section.actions
            };
          }
        });

        setInsights({
          part_1_summary: summary,
          part_2_actions: part_2_actions
        });

        setInsightMetadata({
          confidence_score,
          analysis_date,
          created_at: generated_at
        });

        setInsightsUpdatedAt(generated_at);
        setInsightsLastFetch(Date.now());
        setInsightsError(null);
        console.log('✅ Precomputed insights data loaded successfully');
        console.log('📅 Data last updated:', generated_at);
      } else {
        throw new Error('No precomputed insights data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed insights data:', error);
      setInsights(null);
      setInsightsLastFetch(Date.now());
      setInsightsError(error.message || 'Failed to load insights data');
    } finally {
      setInsightsLoading(false);
    }
  }, [selectedTable, insightsLoading, insightsError, insightsLastFetch, authFetch]);

  // Load precomputed trends data - instant loading from cache
  const loadTrendsData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    // Guard 1: Already loading
    if (trendsLoading && !forceRefresh) {
      console.log('⏳ Already loading trends, skipping...');
      return;
    }

    // Guard 2: Cache valid - use refs to get current values
    const currentTrendsData = trendsDataRef.current;
    const currentLastFetch = trendsLastFetchRef.current;

    if (!forceRefresh && currentTrendsData && currentTrendsData.length > 0 && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached trends data');
      return;
    }

    // Guard 3: Recent error - prevent retry loops
    if (!forceRefresh && trendsError && trendsLastFetch && (Date.now() - trendsLastFetch < 5000)) {
      console.log('⏸️ Recent error loading trends, skipping retry...');
      return;
    }

    setTrendsLoading(true);
    setTrendsError(null);
    try {
      console.log('🔄 Loading precomputed trend data for table:', tableName);

      const result = await getPrecomputedTrends(tableName, false, authFetch);
      
      if (result.success && result.data) {
        // Transform object format to array format for TrendsGrid component
        // result.data now contains the metrics object from the API

        // Define priority order for charts
        const priorityOrder = ['revenue_trend', 'profit_trend', 'avg_order_trend', 'customers_trend'];

        // Sort entries by priority order
        const sortedEntries = Object.entries(result.data).sort(([aId], [bId]) => {
          const aIndex = priorityOrder.indexOf(aId);
          const bIndex = priorityOrder.indexOf(bId);
          const aPriority = aIndex === -1 ? 999 : aIndex;
          const bPriority = bIndex === -1 ? 999 : bIndex;
          return aPriority - bPriority;
        });

        const transformedData = sortedEntries.map(([metricId, metricData]) => {
          // Access metadata from the API response metadata object
          const metadata = result.metadata?.[metricId] || {};
          
          // Transform time_period to date for frontend compatibility
          const transformedDataPoints = (metricData.data || []).map(point => ({
            ...point,
            date: point.time_period || point.date, // Convert time_period to date
            value: point.value
          }));

          return {
            id: metricId,
            title: metadata.title || metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            data: transformedDataPoints,
            color: metadata.color || 'blue',
            format_type: metadata.format_type || 'number',
            icon: metadata.icon || 'TrendingUp',
            description: `${transformedDataPoints.length || 0} data points`,
            table_total: transformedDataPoints.reduce((sum, point) => sum + (parseFloat(point.value) || 0), 0) || 0
          };
        });
        
        // Remove duplicates based on id
        const uniqueData = transformedData.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        
        setTrendsData(uniqueData);
        setTrendsUpdatedAt(result.updatedAt);
        setTrendsLastFetch(Date.now());
        console.log('✅ Precomputed trend data loaded successfully');
        console.log('📅 Data last updated:', result.updatedAt);
        console.log('📊 Loaded', uniqueData.length, 'unique trend metrics (filtered from', transformedData.length, 'total)');
      } else {
        throw new Error('No precomputed trend data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed trend data:', error);
      setTrendsLastFetch(Date.now());
      setTrendsError(error.message || 'Failed to load trends data');
    } finally {
      setTrendsLoading(false);
    }
  }, [selectedTable, trendsLoading, trendsError, trendsLastFetch, authFetch]);

  // Load precomputed overall data - instant loading from cache
  const loadOverallData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    // Guard 1: Already loading
    if (overallLoading && !forceRefresh) {
      console.log('⏳ Already loading overall data, skipping...');
      return;
    }

    // Guard 2: Cache valid - use refs to get current values
    const currentOverallData = overallDataRef.current;
    const currentLastFetch = overallLastFetchRef.current;

    if (!forceRefresh && currentOverallData && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached overall data');
      return;
    }

    // Guard 3: Recent error - prevent retry loops
    if (!forceRefresh && overallError && overallLastFetch && (Date.now() - overallLastFetch < 5000)) {
      console.log('⏸️ Recent error loading overall data, skipping retry...');
      return;
    }

    setOverallLoading(true);
    setOverallError(null);
    try {
      console.log('🔄 Loading precomputed overall data for table:', tableName);

      const result = await getPrecomputedOverall(tableName, authFetch);

      if (result.success && result.data) {
        setOverallData(result.data);
        setOverallUpdatedAt(result.updatedAt);
        setOverallLastFetch(Date.now());
        setOverallError(null);
        console.log('✅ Precomputed overall data loaded successfully');
        console.log('📅 Data last updated:', result.updatedAt);
        console.log('📊 Overall metrics processed:', Object.keys(result.data).length);
      } else {
        throw new Error('No precomputed overall data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed overall data:', error);
      setOverallData(null);
      setOverallLastFetch(Date.now());
      setOverallError(error.message || 'Failed to load overall data');
    } finally {
      setOverallLoading(false);
    }
  }, [selectedTable, overallLoading, overallError, overallLastFetch, authFetch]);

  // Load precomputed comparative data - unified loading for all 4 categories
  const loadComparativeData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    // Guard 1: Already loading
    if (comparativeLoading && !forceRefresh) {
      console.log('⏳ Already loading comparative data, skipping...');
      return;
    }

    // Guard 2: Cache valid - use refs to get current values
    const currentComparativeData = comparativeDataRef.current;
    const currentLastFetch = comparativeLastFetchRef.current;

    if (!forceRefresh && currentComparativeData && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached comparative data');
      return;
    }

    // Guard 3: Recent error - prevent retry loops
    if (!forceRefresh && comparativeError && comparativeLastFetch && (Date.now() - comparativeLastFetch < 5000)) {
      console.log('⏸️ Recent error loading comparative data, skipping retry...');
      return;
    }

    setComparativeLoading(true);
    setComparativeError(null);
    try {
      console.log('🔄 Loading precomputed comparative data for table:', tableName);

      const result = await getPrecomputedComparative(tableName, authFetch);

      if (result.success && result.categories) {
        setComparativeData(result.categories);
        setComparativeUpdatedAt(result.updatedAt);
        setComparativeLastFetch(Date.now());
        setComparativeError(null);
        console.log('✅ Precomputed comparative data loaded successfully');
        console.log('📅 Data last updated:', result.updatedAt);
        console.log('📊 Categories processed:', Object.keys(result.categories).length);
      } else {
        throw new Error('No precomputed comparative data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed comparative data:', error);
      setComparativeData(null);
      setComparativeError(error.message || 'Failed to load comparative data');
      setComparativeLastFetch(Date.now());
    } finally {
      setComparativeLoading(false);
    }
  }, [selectedTable, comparativeLoading, comparativeError, comparativeLastFetch, authFetch]);

  // Load precomputed concentration data
  const loadConcentrationData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    if (concentrationLoading && !forceRefresh) {
      console.log('⏳ Already loading concentration data, skipping...');
      return;
    }

    const currentConcentrationData = concentrationDataRef.current;
    const currentLastFetch = concentrationLastFetchRef.current;

    if (!forceRefresh && currentConcentrationData && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached concentration data');
      return;
    }

    setConcentrationLoading(true);
    setConcentrationError(null);
    try {
      console.log('🔄 Loading precomputed concentration data for table:', tableName);

      const result = await getPrecomputedConcentration(tableName, authFetch);

      if (result.success && result.data) {
        setConcentrationData(result.data);
        setConcentrationUpdatedAt(result.updatedAt);
        setConcentrationLastFetch(Date.now());
        console.log('✅ Precomputed concentration data loaded successfully');
        console.log('📅 Data last updated:', result.updatedAt);
      } else {
        throw new Error('No precomputed concentration data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed concentration data:', error);
      setConcentrationData(null);
      setConcentrationError(error.message || 'Failed to load concentration data');
      setConcentrationLastFetch(Date.now());
    } finally {
      setConcentrationLoading(false);
    }
  }, [selectedTable, concentrationLoading, authFetch]);

  // Initialize sales center data on login - simplified like CRM
  useEffect(() => {
    if (isAuthenticated && !authLoading && selectedTable && !hasInitialLoad) {
      console.log('🚀 Sales Center: Loading initial data...');
      setIsInitialized(true);

      // Load all data in parallel for instant display
      Promise.all([
        loadComparativeData(selectedTable, false),
        loadConcentrationData(selectedTable, false),
        loadOverallData(selectedTable, false),
        loadInsightsData(selectedTable, false)
      ]).then(() => {
        setHasInitialLoad(true);
        console.log('✅ Sales center initial load completed');
      }).catch(err => {
        console.error('Error loading initial sales data:', err);
        setInitializationError(err);
        setHasInitialLoad(true); // Set anyway to prevent retry loops
      });
    }
  }, [isAuthenticated, authLoading, selectedTable, hasInitialLoad, loadComparativeData, loadConcentrationData, loadOverallData, loadInsightsData]);

  // Unified cache clearing function
  const clearAllSalesCenterCache = useCallback(() => {
    console.log('🗑️ Clearing all sales center caches...');

    // Clear context state
    setComparativeData(null);
    setConcentrationData(null);
    setOverallData(null);
    setInsights(null);
    setTrendsData(null);

    // Clear errors
    setInsightsError(null);
    setTrendsError(null);
    setConcentrationError(null);
    setOverallError(null);

    // Clear metadata
    setInsightMetadata(null);
    setTrendsUpdatedAt(null);
    setComparativeUpdatedAt(null);
    setConcentrationUpdatedAt(null);

    // Clear cache timestamps
    setComparativeLastFetch(null);
    setConcentrationLastFetch(null);
    setOverallLastFetch(null);
    setTrendsLastFetch(null);
    setInsightsLastFetch(null);

    // Reset initialization state to allow re-initialization
    setIsInitialized(false);
    setHasInitialLoad(false);

    console.log('✅ All sales center caches cleared');
  }, []);

  // Refresh functions - simplified to use load functions with forceRefresh
  const refreshOverallData = useCallback(async () => {
    await loadOverallData(selectedTable, true);
  }, [loadOverallData, selectedTable]);

  const refreshComparativeData = useCallback(async () => {
    await loadComparativeData(selectedTable, true);
  }, [loadComparativeData, selectedTable]);

  const refreshConcentrationData = useCallback(async () => {
    await loadConcentrationData(selectedTable, true);
  }, [loadConcentrationData, selectedTable]);

  const refreshInsightsData = useCallback(async () => {
    await loadInsightsData(selectedTable, true);
  }, [loadInsightsData, selectedTable]);

  const refreshAll = useCallback(async () => {
    console.log('🔄 Refreshing all sales center data...');
    await Promise.allSettled([
      loadAvailableTables(true),
      loadComparativeData(selectedTable, true),
      loadConcentrationData(selectedTable, true),
      loadOverallData(selectedTable, true),
      loadTrendsData(selectedTable, true),
      loadInsightsData(selectedTable, true)
    ]);
  }, [loadAvailableTables, loadComparativeData, loadConcentrationData, loadOverallData, loadTrendsData, loadInsightsData, selectedTable]);

  // Handle table change
  const handleTableChange = useCallback(async (newTable) => {
    console.log('🔄 Changing table from', selectedTable, 'to', newTable);

    // Don't change if it's the same table
    if (selectedTable === newTable) {
      console.log('⏸️ Same table selected, skipping change');
      return;
    }

    setSelectedTable(newTable);

    // Clear all caches using unified function
    clearAllSalesCenterCache();

    console.log('✅ Table change completed');
  }, [selectedTable, clearAllSalesCenterCache]);

  const value = {
    // Table management
    selectedTable,
    availableTables,
    setAvailableTables,
    tablesLoading,
    handleTableChange,
    loadAvailableTables,
    reloadAvailableTables,

    // Comparative data (unified employee, location, products, customers)
    comparativeData,
    comparativeLoading,
    comparativeError,
    comparativeUpdatedAt,
    loadComparativeData,

    // Concentration data (customer and product revenue concentration)
    concentrationData,
    concentrationLoading,
    concentrationError,
    concentrationUpdatedAt,
    loadConcentrationData,

    // Overall data
    overallData,
    overallLoading,
    overallError,
    loadOverallData,

    // Insights data (daily only)
    insights,
    insightsLoading,
    insightsError,
    insightsUpdatedAt,
    insightMetadata,
    loadInsightsData,

    // Trends data (precomputed)
    trendsData,
    trendsUpdatedAt,
    trendsLoading,
    trendsError,
    loadTrendsData,

    // Overall data timestamps for staleness
    overallUpdatedAt,

    // Refresh functions
    refreshComparativeData,
    refreshConcentrationData,
    refreshOverallData,
    refreshInsightsData,
    refreshAll,

    // Cache management
    clearAllSalesCenterCache,

    // Initialization state
    isInitialized,
    initializationError,
  };

  return (
    <SalesCenterContext.Provider value={value}>
      {children}
    </SalesCenterContext.Provider>
  );
};

// Add display name for better debugging and Fast Refresh compatibility
SalesCenterProvider.displayName = 'SalesCenterProvider';

// Export the provider component
export { SalesCenterProvider }; 
