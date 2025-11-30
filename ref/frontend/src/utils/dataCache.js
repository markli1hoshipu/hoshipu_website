/**
 * Data Cache Manager
 * Provides localStorage-based caching for API data with TTL support
 */

const CACHE_PREFIX = 'prelude_data_cache_';
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached data from localStorage
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in milliseconds (default: 30 minutes)
 * @param {string} userEmail - Optional user email for user-specific caching
 * @returns {Object|null} Cached data or null if expired/not found
 */
export const getCachedData = (key, ttl = DEFAULT_TTL, userEmail = null) => {
  try {
    const cacheKey = userEmail ? `${CACHE_PREFIX}${key}_${userEmail}` : `${CACHE_PREFIX}${key}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > ttl) {
      console.log(`[Cache] Expired: ${key}`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`[Cache] Hit: ${key} (age: ${Math.round((now - timestamp) / 1000)}s)`);
    return data;
  } catch (error) {
    console.error(`[Cache] Error reading ${key}:`, error);
    return null;
  }
};

/**
 * Set cached data in localStorage
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {string} userEmail - Optional user email for user-specific caching
 */
export const setCachedData = (key, data, userEmail = null) => {
  try {
    const cacheKey = userEmail ? `${CACHE_PREFIX}${key}_${userEmail}` : `${CACHE_PREFIX}${key}`;
    const cacheEntry = {
      data,
      timestamp: Date.now()
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    console.log(`[Cache] Set: ${key}${userEmail ? ` (user: ${userEmail})` : ''} (size: ${JSON.stringify(data).length} bytes)`);
  } catch (error) {
    console.error(`[Cache] Error writing ${key}:`, error);
    // If localStorage is full, clear old cache entries
    if (error.name === 'QuotaExceededError') {
      clearOldCache();
      // Try again
      try {
        const cacheKey = userEmail ? `${CACHE_PREFIX}${key}_${userEmail}` : `${CACHE_PREFIX}${key}`;
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (retryError) {
        console.error(`[Cache] Failed to write even after clearing:`, retryError);
      }
    }
  }
};

/**
 * Clear cache for a specific key
 * @param {string} key - Cache key
 * @param {string} userEmail - Optional user email for user-specific caching
 */
export const clearCachedData = (key, userEmail = null) => {
  try {
    const cacheKey = userEmail ? `${CACHE_PREFIX}${key}_${userEmail}` : `${CACHE_PREFIX}${key}`;
    localStorage.removeItem(cacheKey);
    console.log(`[Cache] Cleared: ${key}${userEmail ? ` (user: ${userEmail})` : ''}`);
  } catch (error) {
    console.error(`[Cache] Error clearing ${key}:`, error);
  }
};

/**
 * Clear all cache entries
 */
export const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Cache] Cleared all cache entries');
  } catch (error) {
    console.error('[Cache] Error clearing all cache:', error);
  }
};

/**
 * Clear cache entries older than specified age
 * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
 */
export const clearOldCache = (maxAge = 24 * 60 * 60 * 1000) => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let clearedCount = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          const { timestamp } = JSON.parse(cached);

          if (now - timestamp > maxAge) {
            localStorage.removeItem(key);
            clearedCount++;
          }
        } catch (error) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
          clearedCount++;
        }
      }
    });

    if (clearedCount > 0) {
      console.log(`[Cache] Cleared ${clearedCount} old cache entries`);
    }
  } catch (error) {
    console.error('[Cache] Error clearing old cache:', error);
  }
};

/**
 * Get cache info (size, count, etc.)
 */
export const getCacheInfo = () => {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

    let totalSize = 0;
    const entries = [];

    cacheKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;
        totalSize += size;

        const { timestamp } = JSON.parse(value);
        const age = Date.now() - timestamp;

        entries.push({
          key: key.replace(CACHE_PREFIX, ''),
          size,
          age: Math.round(age / 1000), // in seconds
          timestamp
        });
      } catch (error) {
        // Ignore invalid entries
      }
    });

    return {
      count: entries.length,
      totalSize,
      entries: entries.sort((a, b) => b.size - a.size) // Sort by size descending
    };
  } catch (error) {
    console.error('[Cache] Error getting cache info:', error);
    return { count: 0, totalSize: 0, entries: [] };
  }
};

// Clear old cache on module load
clearOldCache();

export default {
  get: getCachedData,
  set: setCachedData,
  clear: clearCachedData,
  clearAll: clearAllCache,
  clearOld: clearOldCache,
  info: getCacheInfo
};
