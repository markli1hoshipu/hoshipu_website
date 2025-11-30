/**
 * Sales Data API Service for NL2SQL Integration
 * Provides methods to interact with the sales analytics backend
 */

const SALES_API_BASE_URL = import.meta.env.VITE_SALESCENTER_API_URL || 'http://localhost:8002';
const ULTRATHINK_API_BASE_URL = import.meta.env.VITE_SALESCENTER_API_URL || 'http://localhost:8002';

// Query cache for performance optimization
const queryCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - unified cache duration
const INSIGHTS_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours - for pre-computed insights

/**
 * Get authentication headers with JWT token
 * @returns {Object} Headers object with Authorization if token exists
 */
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Get JWT token from localStorage (matches Lead Gen pattern)
  const token = localStorage.getItem('id_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make authenticated fetch request with automatic retry on 401
 * @param {Function|null} authFetch - Optional authFetch from useAuth hook
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function makeAuthenticatedFetch(authFetch, url, options = {}) {
  if (authFetch) {
    // Use authFetch from context (has token refresh logic)
    return authFetch(url, options);
  }

  // Fallback to manual fetch with token check
  const token = localStorage.getItem('id_token');
  if (!token) {
    throw new SalesDataApiError('Not authenticated. Please log in.', 401);
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

class SalesDataApiError extends Error {
  constructor(message, status = null, data = null) {
    super(message);
    this.name = 'SalesDataApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Generate cache key for queries
 * @param {string} query - Query string
 * @param {Object} timeConfig - Time configuration object
 * @returns {string} Cache key
 */
function generateCacheKey(query, timeConfig = {}) {
  const key = `${query}_${JSON.stringify(timeConfig)}`;
  return btoa(key).replace(/[^a-zA-Z0-9]/g, ''); // Base64 encode and clean
}

/**
 * Get cached query result if available and not expired
 * @param {string} cacheKey - Cache key
 * @param {boolean} isInsights - Whether this is an insights cache (uses longer duration)
 * @returns {Object|null} Cached result or null
 */
function getCachedResult(cacheKey, isInsights = false) {
  const cached = queryCache.get(cacheKey);
  const duration = isInsights ? INSIGHTS_CACHE_DURATION : CACHE_DURATION;
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data;
  }
  if (cached) {
    queryCache.delete(cacheKey); // Remove expired cache
  }
  return null;
}

/**
 * Set cache for query result
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Data to cache
 */
function setCachedResult(cacheKey, data) {
  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries (keep max 50 entries)
  if (queryCache.size > 50) {
    const oldestKey = queryCache.keys().next().value;
    queryCache.delete(oldestKey);
  }
}

/**
 * Handle API responses and errors consistently with timeout
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Parsed response data
 */
async function handleApiResponse(response) {
  const contentType = response.headers.get('content-type');
  let data;
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  if (!response.ok) {
    throw new SalesDataApiError(
      data.detail || data.message || `HTTP ${response.status}`,
      response.status,
      data
    );
  }
  
  return data;
}

/**
 * Execute fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {  // Increased default timeout for slower connections
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new SalesDataApiError('Query timeout - request took too long', 408);
    }
    throw error;
  }
}

/**
 * Query sales data with AI insights (non-streaming)
 * @param {string} query - Natural language query about sales data
 * @param {string} tableName - Optional table name to query
 * @param {boolean} useCache - Whether to use cached insights
 * @returns {Promise<Object>} Query results with AI insights
 */
export async function querySalesDataWithInsights(query, tableName = 'realsales', useCache = true) {
  try {
    const url = new URL(`${SALES_API_BASE_URL}/api/sales/query/${tableName}`);
    url.searchParams.append('include_insights', 'true');
    url.searchParams.append('use_cache', useCache);

    const timeout = 150000; // 2.5 minutes for insights

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: getAuthHeaders(), // ✅ Now includes JWT token
      body: JSON.stringify({ user_query: query }),
    }, timeout);

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Query with insights failed:', error);
    throw error;
  }
}

/**
 * Enhanced streaming client for robust SSE handling
 */
class RobustSSEClient {
  constructor(url, options, callbacks) {
    this.url = url;
    this.options = options;
    this.callbacks = callbacks;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.abortController = null;
  }

  async connect() {
    while (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        this.abortController = new AbortController();

        const response = await fetch(this.url, {
          ...this.options,
          signal: this.abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        await this.processStream(response);
        break; // Success - exit retry loop

      } catch (error) {
        this.reconnectAttempts++;

        if (error.name === 'AbortError' || !this.shouldReconnect) {
          break;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.callbacks.onError?.(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error.message}`));
          break;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));
      }
    }
  }

  async processStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let hasCompleted = false;
    let currentEventType = null;

    try {
      while (this.shouldReconnect && !hasCompleted) {
        const { done, value } = await reader.read();

        if (done) {
          hasCompleted = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            // Parse event type from SSE event line
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Add the event type to the data object for compatibility
              if (currentEventType) {
                data.type = currentEventType;
              }

              this.handleSSEData(data);

              if (currentEventType === 'complete') {
                hasCompleted = true;
                break;
              }

              // Reset event type after processing
              currentEventType = null;
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }
    } finally {
      reader.cancel();
    }
  }

  handleSSEData(data) {
    console.log('SSE Data received:', data); // Debug log
    switch (data.type) {
      case 'progress':
        console.log('Progress event:', data); // Debug log
        this.callbacks.onProgress?.(data);
        break;
      case 'query_result':
        // Normalize response format - remove type and flatten
        const { type, ...queryResult } = data;
        this.callbacks.onQueryResult?.(queryResult);
        break;
      case 'insights':
        // Extract insights from data - backend sends {insights: "string"}
        const insightsData = data.insights || data;
        this.callbacks.onInsights?.(insightsData);
        break;
      case 'error':
        this.callbacks.onError?.(new Error(data.error || data.message || 'Unknown error'));
        break;
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

/**
 * Stream query results with progressive insights using robust SSE client
 * @param {string} query - Natural language query
 * @param {Object} options - Streaming options
 * @param {string} options.tableName - Table name to query
 * @param {function} onProgress - Callback for progress updates
 * @param {function} onQueryResult - Callback when query results are ready
 * @param {function} onInsights - Callback when insights are ready
 * @param {function} onError - Callback for errors
 * @returns {function} Cleanup function to close the connection
 */
export function streamQueryWithInsights(
  query,
  options,
  onProgress,
  onQueryResult,
  onInsights,
  onError
) {
  const {
    tableName = 'realsales'
  } = options || {};

  // Create URL for the streaming endpoint (always includes insights)
  const url = new URL(`${SALES_API_BASE_URL}/api/sales/query/${tableName}`);
  url.searchParams.append('include_insights', 'true');

  // Create robust SSE client
  const authHeaders = getAuthHeaders();
  const client = new RobustSSEClient(
    url,
    {
      method: 'POST',
      headers: {
        ...authHeaders, // ✅ Now includes JWT token
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ user_query: query })
    },
    { onProgress, onQueryResult, onInsights, onError }
  );

  // Start connection
  client.connect();

  // Return cleanup function
  return () => {
    client.disconnect();
  };
}

/**
 * Get list of available tables in the database with metadata
 * @returns {Promise<Array>} List of table objects with metadata
 */
export async function getAvailableTables(authFetch = null) {
  const response = await makeAuthenticatedFetch(authFetch, `${SALES_API_BASE_URL}/api/data/tables`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  const result = await handleApiResponse(response);
  return result.tables || [];
}

/**
 * Get precomputed trend metrics (replaces real-time trend discovery + execution)
 * @param {string} tableName - Table name to get metrics for
 * @param {boolean} cumulative - Whether to get cumulative or weekly metrics
 * @returns {Promise<Object>} Precomputed trend data with updated_at timestamp
 */
export async function getPrecomputedTrends(tableName, cumulative = false, authFetch = null) {
  try {
    console.log('⚡ Getting precomputed trend metrics for:', tableName, 'cumulative:', cumulative);

    const response = await makeAuthenticatedFetch(authFetch, `${SALES_API_BASE_URL}/api/data/precomputed-trends/${tableName}?cumulative=${cumulative}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await handleApiResponse(response);
    
    if (!result.success) {
      throw new SalesDataApiError(result.error || 'Failed to get precomputed trend metrics');
    }

    return {
      data: result.metrics,
      metadata: result.metadata,
      updatedAt: result.updated_at,
      success: true
    };
  } catch (error) {
    console.error('❌ Precomputed trend metrics failed:', error);
    throw error;
  }
}

/**
 * Get precomputed comparative metrics for all 4 categories: Employee, Location, Products, Customers
 * @param {string} tableName - Table name to get metrics for
 * @returns {Promise<Object>} Precomputed comparative data with revenue+profit for each category
 */
export async function getPrecomputedComparative(tableName, authFetch = null) {
  try {
    console.log('⚡ Getting precomputed comparative metrics for:', tableName);

    const response = await makeAuthenticatedFetch(authFetch, `${SALES_API_BASE_URL}/api/data/precomputed-comparative/${tableName}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await handleApiResponse(response);

    if (!result.success) {
      throw new SalesDataApiError(result.error || 'Failed to get precomputed comparative metrics');
    }

    return {
      categories: result.categories,
      metadata: result.metadata,
      updatedAt: result.updated_at,
      success: true
    };
  } catch (error) {
    console.error('❌ Precomputed comparative metrics failed:', error);
    throw error;
  }
}


/**
 * Get precomputed overall metrics (replaces real-time overall discovery + execution)
 * @param {string} tableName - Table name to get metrics for
 * @returns {Promise<Object>} Precomputed overall data with updated_at timestamp
 */
export async function getPrecomputedOverall(tableName, authFetch = null) {
  try {
    console.log('⚡ Getting precomputed overall metrics for:', tableName);

    const response = await makeAuthenticatedFetch(authFetch, `${SALES_API_BASE_URL}/api/data/precomputed-overall/${tableName}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await handleApiResponse(response);

    if (!result.success) {
      throw new SalesDataApiError(result.error || 'Failed to get precomputed overall metrics');
    }

    return {
      data: result.metrics,
      updatedAt: result.updated_at,
      success: true
    };
  } catch (error) {
    console.error('❌ Precomputed overall metrics failed:', error);
    throw error;
  }
}

/**
 * Get precomputed concentration metrics (customer and product revenue concentration)
 * @param {string} tableName - Table name to get metrics for
 * @returns {Promise<Object>} Precomputed concentration data
 */
export async function getPrecomputedConcentration(tableName, authFetch = null) {
  try {
    console.log('⚡ Getting precomputed concentration metrics for:', tableName);

    const response = await makeAuthenticatedFetch(authFetch, `${SALES_API_BASE_URL}/api/data/precomputed/${tableName}/concentration`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await handleApiResponse(response);

    if (!result.success) {
      throw new SalesDataApiError(result.error || 'Failed to get concentration metrics');
    }

    return {
      data: result.data,
      updatedAt: result.updatedAt,
      success: true
    };
  } catch (error) {
    console.error('❌ Precomputed concentration metrics failed:', error);
    throw error;
  }
}

// === ULTRATHINK RETRIEVAL API FUNCTIONS ===

/**
 * Get available insights tables and dates from UltraThink
 * @returns {Promise<Object>} Available insights metadata
 */
export async function getAvailableInsights(authFetch = null) {
  try {
    const cacheKey = 'available_insights';
    const cachedResult = getCachedResult(cacheKey, true);
    if (cachedResult) {
      return cachedResult;
    }

    const response = await makeAuthenticatedFetch(authFetch, `${ULTRATHINK_API_BASE_URL}/api/insights/tables`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await handleApiResponse(response);

    // Cache successful results with insights cache duration
    if (result && result.success) {
      setCachedResult(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error('Failed to get available insights:', error);
    throw new SalesDataApiError('Failed to fetch available insights', error.status || 500);
  }
}

/**
 * Get pre-generated insights from UltraThink
 * @param {string} table - Table name to get insights for
 * @param {string} timeframe - Timeframe for insights (e.g., 'weekly', 'monthly')
 * @param {string} date - Optional specific date (YYYY-MM-DD format)
 * @returns {Promise<Object>} Pre-generated insights data
 */
export async function getPreGeneratedInsights(table, timeframe, date = null, authFetch = null) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey(`ultrathink_insights_${table}_${timeframe}`, { date });
    const cachedResult = getCachedResult(cacheKey, true);
    if (cachedResult) {
      return cachedResult;
    }

    // Build URL - only daily timeframe supported currently
    // Format: /api/insights/daily/{table_name}
    const url = `${ULTRATHINK_API_BASE_URL}/api/insights/daily/${table}`;

    const response = await makeAuthenticatedFetch(authFetch, url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await handleApiResponse(response);

    // Cache successful results with insights cache duration
    if (result && result.success) {
      setCachedResult(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error(`Failed to get pre-generated insights for ${table}/${timeframe}:`, error);

    // Enhanced error handling for UltraThink responses
    if (error.status === 404) {
      throw new SalesDataApiError(`No insights found for ${table} with timeframe ${timeframe}`, 404);
    } else if (error.status === 408) {
      throw new SalesDataApiError('Request timeout while fetching insights', 408);
    } else if (error.status >= 500) {
      throw new SalesDataApiError('UltraThink service error. Please try again.', error.status);
    }
    throw error;
  }
}

// getPreGeneratedInsightsForDate function removed - now handled by optional date parameter in getPreGeneratedInsights

export { SalesDataApiError }; 