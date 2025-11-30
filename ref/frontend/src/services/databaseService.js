/**
 * Database Service
 * Handles dynamic database connection based on user profile from team invitations API
 */

import { invitationsApi } from './invitationsApi';

class DatabaseService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get user's database name from team invitations API
   * @param {string} userEmail - The user's email address
   * @returns {Promise<string>} The database name for the user
   */
  async getUserDatabase(userEmail) {
    if (!userEmail) {
      console.error('mark-hoshipu: No user email provided for database lookup');
      return 'postgres'; // fallback to default
    }

    // Check cache first
    const cacheKey = `db_${userEmail}`;
    const now = Date.now();

    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > now) {
      const cachedDbName = this.cache.get(cacheKey);
      console.log(`mark-hoshipu: Using cached database for ${userEmail}: ${cachedDbName}`);
      return cachedDbName;
    }

    try {
      console.log(`mark-hoshipu: Fetching database name for user: ${userEmail}`);

      // Fetch user profile from team invitations API
      const userData = await invitationsApi.getUserInvitations(userEmail);

      if (userData && userData.user && userData.user.database_name) {
        const dbName = userData.user.database_name;

        // Cache the result
        this.cache.set(cacheKey, dbName);
        this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

        console.log(`mark-hoshipu: Found database for ${userEmail}: ${dbName}`);
        return dbName;
      } else {
        console.warn(`mark-hoshipu: No database found for user ${userEmail}, using default postgres`);
        return 'postgres'; // fallback to default
      }
    } catch (error) {
      console.error(`mark-hoshipu: Error fetching database for user ${userEmail}:`, error);
      return 'postgres'; // fallback to default
    }
  }

  /**
   * Create API URL with database parameter
   * @param {string} baseUrl - The base API URL
   * @param {string} endpoint - The API endpoint
   * @param {string} userEmail - The user's email address
   * @returns {Promise<string>} Complete API URL with database parameter
   */
  async createApiUrl(baseUrl, endpoint, userEmail) {
    const dbName = await this.getUserDatabase(userEmail);
    const separator = endpoint.includes('?') ? '&' : '?';
    const fullUrl = `${baseUrl}${endpoint}${separator}db_name=${encodeURIComponent(dbName)}`;
    
    console.log(`mark-hoshipu: the current user email is ${userEmail}, the current database trying to connect is ${dbName}`);
    console.log(`mark-hoshipu: API URL: ${fullUrl}`);
    
    return fullUrl;
  }

  /**
   * Make API request with dynamic database selection using authFetch
   * @param {string} baseUrl - The base API URL
   * @param {string} endpoint - The API endpoint
   * @param {string} userEmail - The user's email address
   * @param {function} authFetch - Authenticated fetch function
   * @returns {Promise<Response>} Fetch response
   */
  async makeAuthenticatedApiRequest(baseUrl, endpoint, userEmail, authFetch) {
    const url = await this.createApiUrl(baseUrl, endpoint, userEmail);
    return authFetch(url);
  }

  /**
   * Make API request with dynamic database selection
   * @param {string} baseUrl - The base API URL
   * @param {string} endpoint - The API endpoint
   * @param {string} userEmail - The user's email address
   * @param {object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async makeApiRequest(baseUrl, endpoint, userEmail, options = {}) {
    const url = await this.createApiUrl(baseUrl, endpoint, userEmail);
    return fetch(url, options);
  }

  /**
   * Clear cache for a specific user or all users
   * @param {string} userEmail - Optional: specific user email to clear cache for
   */
  clearCache(userEmail = null) {
    if (userEmail) {
      const cacheKey = `db_${userEmail}`;
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      console.log(`mark-hoshipu: Cleared database cache for ${userEmail}`);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
      console.log('mark-hoshipu: Cleared all database cache');
    }
  }
}

// Create singleton instance
export const databaseService = new DatabaseService();

// Export the class as well for potential direct instantiation
export default DatabaseService;