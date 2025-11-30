import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  RefreshCw,
  Database,
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  Package,
  Calendar,
  Target,
  Activity,
  Loader
} from 'lucide-react';
import { Button } from '../ui/primitives/button';
import { Card } from '../ui/primitives/card';
import { querySalesDataWithInsights, streamQueryWithInsights } from '../../services/salesDataApi';

// Constants
const ICON_MAP = {
  DollarSign, Users, TrendingUp, TrendingDown, BarChart3,
  Package, Calendar, Target, Activity, Database
};

const MAX_DISPLAY_ROWS = 10;
const MAX_HISTORY_ITEMS = 5;
const MAX_HISTORY_STORAGE = 20;

// Utility functions
const formatCurrency = (value) => {
  if (typeof value !== 'number') return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatCellValue = (value) => {
  if (!value && value !== 0) return '';
  if (typeof value === 'number') return formatCurrency(value);
  const stringValue = String(value);
  return stringValue.length > 500 ? stringValue.substring(0, 500) + '...' : stringValue;
};

// Components
const QueryHistoryItem = React.memo(({ query, timestamp, onRerun }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-900 truncate">{query}</p>
      <p className="text-xs text-gray-500">{new Date(timestamp).toLocaleString()}</p>
    </div>
    <Button variant="outline" size="sm" onClick={() => onRerun(query)} className="ml-3 flex-shrink-0">
      <RefreshCw className="w-3 h-3" />
    </Button>
  </div>
));

const MetricCard = React.memo(({ metric }) => {
  const IconComponent = ICON_MAP[metric.icon] || Database;
  const isPositive = metric.positive !== false;
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
          <p className={`text-xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {metric.value}
          </p>
        </div>
        <IconComponent className={`w-8 h-8 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
      </div>
    </div>
  );
});

const InsightsPanel = React.memo(({ insights, loading }) => {
  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h4 className="text-lg font-semibold text-gray-900">Insights</h4>
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm">Generating insights...</span>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  // Handle new lightweight string format
  if (typeof insights === 'string') {
    return (
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900">Business Insights</h4>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 mt-2">
              <p className="text-gray-800 leading-relaxed">{insights}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle legacy object format for backward compatibility
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3 mb-4">
        <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Insights</h4>
          <p className="text-gray-700 mt-1">{insights.summary}</p>
        </div>
      </div>

      {Array.isArray(insights.keyMetrics) && insights.keyMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {insights.keyMetrics.map((metric, i) => <MetricCard key={i} metric={metric} />)}
        </div>
      )}

      {Array.isArray(insights.insights) && insights.insights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100">
          <ul className="space-y-2">
            {insights.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-800">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

const DataTable = React.memo(({ data, columns, totalRows }) => (
  <div className="overflow-x-auto border rounded-lg">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          {columns.map((col, i) => (
            <th key={i} className="text-left py-2 px-3 font-medium text-gray-700">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.slice(0, MAX_DISPLAY_ROWS).map((row, i) => (
          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
            {columns.map((col, j) => (
              <td key={j} className="py-2 px-3 text-gray-900">
                {formatCellValue(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {totalRows > MAX_DISPLAY_ROWS && (
      <div className="p-2 text-xs text-gray-500 text-center bg-gray-50">
        Showing first {MAX_DISPLAY_ROWS} of {totalRows} results
      </div>
    )}
  </div>
));

const ProgressIndicator = ({ message, progress }) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-300 mb-4 shadow-sm">
      <Loader className="w-6 h-6 text-blue-600 animate-spin" />
      <div className="flex-1">
        <p className="text-base font-medium text-blue-900">{message}</p>
        {progress !== undefined && (
          <div className="mt-2 w-full bg-blue-200 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="text-sm text-blue-700 mt-1">{progress}% complete</p>
      </div>
    </div>
  );
};

// Main Component
const NaturalLanguageQuery = ({ selectedTable }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamProgress, setStreamProgress] = useState(null);
  const [useStreaming, setUseStreaming] = useState(() => {
    // Load streaming preference from localStorage, defaulting to true
    try {
      const savedPreference = localStorage.getItem('sales_query_use_streaming');
      return savedPreference !== null ? JSON.parse(savedPreference) : true;
    } catch {
      return true;
    }
  });
  const [showDetails, setShowDetails] = useState({});
  
  const inputRef = useRef(null);
  const activeStreamRef = useRef(null);

  // Query history management
  const [queryHistory, setQueryHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('sales_query_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save streaming preference when changed
  const handleStreamingToggle = useCallback((enabled) => {
    setUseStreaming(enabled);
    try {
      localStorage.setItem('sales_query_use_streaming', JSON.stringify(enabled));
    } catch (error) {
      console.error('Failed to save streaming preference:', error);
    }
  }, []);

  const addToHistory = useCallback((queryText) => {
    const newHistory = [
      { query: queryText, timestamp: new Date().toISOString() },
      ...queryHistory.filter(h => h.query !== queryText)
    ].slice(0, MAX_HISTORY_STORAGE);
    
    setQueryHistory(newHistory);
    try {
      localStorage.setItem('sales_query_history', JSON.stringify(newHistory));
    } catch (err) {
      console.error('Failed to save query history:', err);
    }
  }, [queryHistory]);

  // Execute query
  const executeQuery = useCallback(async (queryText) => {
    if (!queryText.trim()) return;

    setLoading(true);
    setStreamProgress(null);

    try {
      if (useStreaming) {
        executeStreamingQuery(queryText);
      } else {
        const response = await querySalesDataWithInsights(queryText, selectedTable, true);

        setResults(prev => [{
          id: Date.now(),
          query: queryText,
          result: response.query_result || response,
          insights: response.insights,
          performance: response.performance,
          timestamp: new Date().toISOString(),
        }, ...prev]);

        addToHistory(queryText);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      
      setResults(prev => [{
        id: Date.now(),
        query: queryText,
        result: {
          is_error: true,
          message: error.message || 'Failed to execute query',
          data: [],
          columns: [],
          row_count: 0
        },
        insights: null,
        timestamp: new Date().toISOString(),
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, useStreaming, addToHistory]);

  // Execute streaming query
  const executeStreamingQuery = useCallback((queryText) => {
    if (activeStreamRef.current) {
      activeStreamRef.current();
      activeStreamRef.current = null;
    }

    const resultId = Date.now();
    
    setResults(prev => [{
      id: resultId,
      query: queryText,
      result: null,
      insights: null,
      timestamp: new Date().toISOString(),
      isStreaming: true
    }, ...prev]);

    const cleanup = streamQueryWithInsights(
      queryText,
      {
        tableName: selectedTable,
        includeInsights: true
      },
      (progress) => {
        setStreamProgress(progress);
      },
      (result) => {
        setResults(prev => prev.map(r =>
          r.id === resultId ? { ...r, result, isStreaming: true } : r
        ));
      },
      (insights) => {
        setResults(prev => prev.map(r =>
          r.id === resultId ? { ...r, insights, isStreaming: false } : r
        ));
        // Keep progress bar visible for a moment after completion
        setTimeout(() => setStreamProgress(null), 1000);
        setLoading(false);
        addToHistory(queryText);
      },
      (error) => {
        console.error('Streaming error:', error);
        setResults(prev => prev.map(r =>
          r.id === resultId ? {
            ...r,
            result: {
              is_error: true,
              message: error.message,
              data: [],
              columns: [],
              row_count: 0
            },
            isStreaming: false
          } : r
        ));
        // Keep progress bar visible briefly even on error
        setTimeout(() => setStreamProgress(null), 1000);
        setLoading(false);
      }
    );

    activeStreamRef.current = cleanup;
  }, [selectedTable, addToHistory]);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      executeQuery(query.trim());
      setQuery('');
    }
  }, [query, loading, executeQuery]);

  // Export to CSV
  const exportToCSV = useCallback((data, columns) => {
    const csvContent = [
      columns.join(','),
      ...data.map(row => 
        columns.map(col => {
          const value = row[col];
          if (value === null || value === undefined) return '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `query_results_${Date.now()}.csv`;
    link.click();
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text:', err);
      return false;
    }
  }, []);

  // Toggle details visibility
  const toggleDetails = useCallback((resultId) => {
    setShowDetails(prev => ({ ...prev, [resultId]: !prev[resultId] }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current();
      }
    };
  }, []);

  // Memoized values
  const recentHistory = useMemo(() => queryHistory.slice(0, MAX_HISTORY_ITEMS), [queryHistory]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Natural Language Query</h2>
        </div>
        <p className="text-gray-600">Ask questions about your sales data in plain English</p>
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-600">
          <Database className="w-4 h-4" />
          <span>Querying table: <span className="font-medium text-gray-900">{selectedTable}</span></span>
        </div>
      </div>

      {/* Query Input */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your sales data... (e.g., 'Who are my top performing salespeople this month?')"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={loading}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MessageSquare className="w-4 h-4" />
                <span>Powered by AI • Natural language to SQL</span>
              </div>
              
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Real-time processing</span>
              </span>
            </div>
            
            <Button type="submit" disabled={!query.trim() || loading} className="flex items-center gap-2">
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask Question
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Progress */}
      {streamProgress && <ProgressIndicator {...streamProgress} />}

      {/* Query History */}
      {recentHistory.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Queries
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {recentHistory.map((item, i) => (
              <QueryHistoryItem
                key={i}
                query={item.query}
                timestamp={item.timestamp}
                onRerun={(text) => { setQuery(text); inputRef.current?.focus(); }}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        {results.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-700">"{item.query}"</h4>
                {item.result && item.result.fuzzy_used && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full"
                    title={`Enhanced with fuzzy matching for better results`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Smart Match
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {item.performance && (
                  <>
                    {item.performance.cache_hit && '⚡ Cached'} 
                    {Math.round(item.performance.total_time_ms)}ms
                  </>
                )}
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>
            </div>
            
            {item.result && (
              <Card className="p-6">
                {item.result.is_error ? (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Query Failed</h4>
                      <p className="text-sm text-red-700 mt-1">{item.result.message}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <InsightsPanel insights={item.insights} loading={item.isStreaming} />

                    
                    <div className="border-t border-gray-200 pt-4">
                      <button
                        onClick={() => toggleDetails(item.id)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        {showDetails[item.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {showDetails[item.id] ? 'Hide' : 'Show'} Technical Details
                      </button>

                      {showDetails[item.id] && (
                        <div className="mt-4 space-y-4">
                          <div className="flex gap-2">
                            {item.result.sql_query && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(item.result.sql_query)}
                                className="flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                Copy SQL
                              </Button>
                            )}
                            {item.result.data?.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToCSV(item.result.data, item.result.columns)}
                                className="flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Export Data
                              </Button>
                            )}
                          </div>

                          {item.result.sql_query && (
                            <div className="space-y-3">
                              <div className="p-3 bg-gray-100 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Generated SQL:</p>
                                <code className="text-xs text-gray-800 font-mono block break-all">
                                  {item.result.sql_query}
                                </code>
                              </div>
                              
                              {item.result.fuzzy_used && item.result.exact_sql && (
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <p className="text-xs text-purple-600 mb-1 font-medium">Enhanced with Smart Matching:</p>
                                  <div className="mt-2 text-xs text-purple-600">
                                    <p>💡 This query was enhanced to find similar matches and provide better results</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {item.result.data?.length > 0 && (
                            <DataTable 
                              data={item.result.data} 
                              columns={item.result.columns} 
                              totalRows={item.result.row_count}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {results.length === 0 && !loading && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Answer Your Questions</h3>
          <p className="text-gray-600">Type a question about your sales data above to get started</p>
        </div>
      )}
    </div>
  );
};

export default NaturalLanguageQuery;