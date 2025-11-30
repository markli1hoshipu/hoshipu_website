/**
 * Analytics API Service
 * Connects to the User Settings backend service (which handles analytics)
 */

const ANALYTICS_API_URL = import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005';

class AnalyticsApiService {
  constructor() {
    this.baseUrl = ANALYTICS_API_URL;
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = null;
    this.moduleStartTimes = {};
    this.currentUser = null; // Store current user for analytics
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set current user for analytics tracking
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }

  /**
   * Get current user email from stored user or localStorage fallback
   */
  getUserEmail() {
    try {
      // Use stored current user first
      if (this.currentUser?.email) {
        return this.currentUser.email;
      }
      
      // Try to get from localStorage user object
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.email || user.user_email) {
        return user.email || user.user_email;
      }
      
      // Check for provider-specific user email in localStorage
      const providers = ['google', 'microsoft'];
      for (const provider of providers) {
        const providerEmail = localStorage.getItem(`${provider}_user_email`);
        if (providerEmail && providerEmail !== '') {
          return providerEmail;
        }
      }
      
      return 'anonymous@example.com';
    } catch {
      return 'anonymous@example.com';
    }
  }

  /**
   * Get browser and device information
   */
  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let deviceType = 'desktop';

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    return { browser, deviceType };
  }

  /**
   * Create or update user profile
   */
  async createOrUpdateUserProfile(email, name, company, role) {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || this.getUserEmail(),
          name,
          company,
          role,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      return null;
    }
  }

  /**
   * Track analytics event
   */
  async trackEvent(actionType, moduleName = null, data = {}) {
    try {
      const deviceInfo = this.getDeviceInfo();
      
      const response = await fetch(`${this.baseUrl}/api/analytics/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: this.getUserEmail(),
          session_id: this.sessionId,
          module_name: moduleName,
          action_type: actionType,
          data: {
            ...data,
            ...deviceInfo,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error tracking event:', error);
      return null;
    }
  }

  /**
   * Start session tracking
   */
  async startSession() {
    this.sessionStartTime = Date.now();
    return this.trackEvent('session_start');
  }

  /**
   * End session tracking
   */
  async endSession() {
    const duration = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
    return this.trackEvent('session_end', null, { duration_ms: duration });
  }

  /**
   * Track module visit
   */
  async trackModuleVisit(moduleName, featuresUsed = []) {
    // Track the event
    await this.trackEvent('module_visit', moduleName);

    // Start timing for this module
    this.moduleStartTimes[moduleName] = Date.now();

    // If we have time spent data, send it
    if (this.moduleStartTimes[moduleName]) {
      const timeSpent = Date.now() - this.moduleStartTimes[moduleName];
      
      await fetch(`${this.baseUrl}/api/analytics/module`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: this.getUserEmail(),
          session_id: this.sessionId,
          module_name: moduleName,
          time_spent_ms: timeSpent,
          features_used: featuresUsed,
        }),
      });
    }
  }

  /**
   * Track token usage
   */
  async trackTokenUsage(moduleName, tokens, costEstimate = 0) {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: this.getUserEmail(),
          session_id: this.sessionId,
          module_name: moduleName,
          tokens: tokens,
          cost_estimate: costEstimate,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error tracking token usage:', error);
      return null;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userEmail = null, days = 30) {
    try {
      const email = userEmail || this.getUserEmail();
      const response = await fetch(
        `${this.baseUrl}/api/analytics/stats/${email}?days=${days}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user stats:', error);
      // Return mock data for development
      const email = userEmail || this.getUserEmail();
      return {
        user_email: email,
        total_sessions: 0,
        total_time_spent_ms: 0,
        total_tokens_used: 0,
        most_used_module: null,
        module_breakdown: [],
        daily_summary: [],
      };
    }
  }

  /**
   * Get all users with analytics
   */
  async getAllUsersWithAnalytics() {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await response.json();
    } catch (error) {
      console.error('Error getting all users:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(userEmail = null, date = null) {
    try {
      const email = userEmail || this.getUserEmail();
      let url = `${this.baseUrl}/api/analytics/report/daily?user_email=${email}`;
      
      if (date) {
        url += `&date=${date}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await response.json();
    } catch (error) {
      console.error('Error generating daily report:', error);
      return null;
    }
  }

  /**
   * Update module time spent when leaving a module
   */
  async updateModuleTimeSpent(moduleName) {
    if (this.moduleStartTimes[moduleName]) {
      const timeSpent = Date.now() - this.moduleStartTimes[moduleName];
      
      try {
        await fetch(`${this.baseUrl}/api/analytics/module`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_email: this.getUserEmail(),
            session_id: this.sessionId,
            module_name: moduleName,
            time_spent_ms: timeSpent,
            features_used: [],
          }),
        });

        // Reset the start time
        delete this.moduleStartTimes[moduleName];
      } catch (error) {
        console.error('Error updating module time spent:', error);
      }
    }
  }

  /**
   * Track API call
   */
  async trackApiCall(method, url, duration = 0, success = true) {
    try {
      // Extract module name from URL path
      const urlPath = new URL(url, window.location.origin).pathname;
      let moduleName = 'Unknown';
      
      if (urlPath.includes('/crm/')) moduleName = 'CRM';
      else if (urlPath.includes('/employee/')) moduleName = 'Employee Management';
      else if (urlPath.includes('/lead/')) moduleName = 'Lead Generation';
      else if (urlPath.includes('/analytics/')) moduleName = 'Analytics';
      else if (urlPath.includes('/query/')) moduleName = 'NL2SQL';
      else if (urlPath.includes('/sales/')) moduleName = 'Sales Center';
      
      return this.trackEvent('api_call', moduleName, {
        method,
        url: urlPath,
        duration_ms: duration,
        success: success
      });
    } catch (error) {
      console.warn('Failed to track API call:', error);
    }
  }

  /**
   * Initialize analytics tracking for the application
   */
  initializeTracking() {
    // Start session when service is initialized
    this.startSession();

    // Track session end when user leaves
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, pause tracking
        this.trackEvent('session_pause');
      } else {
        // Page is visible again, resume tracking
        this.trackEvent('session_resume');
      }
    });

    // Set up global fetch interceptor for API call tracking
    this.setupApiTracking();
  }

  /**
   * Set up API call tracking by intercepting fetch requests
   */
  setupApiTracking() {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = async function(...args) {
      const startTime = Date.now();
      const [url, options = {}] = args;
      
      try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Only track API calls to our backend services (avoid tracking analytics calls to prevent loops)
        if (typeof url === 'string' && 
            (url.includes(':800') || url.includes(':700') || url.includes(':900')) &&
            !url.includes(':8005')) { // Don't track analytics service calls
          await self.trackApiCall(options.method || 'GET', url, duration, response.ok);
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Track failed API calls
        if (typeof url === 'string' && 
            (url.includes(':800') || url.includes(':700') || url.includes(':900')) &&
            !url.includes(':8005')) {
          await self.trackApiCall(options.method || 'GET', url, duration, false);
        }
        
        throw error;
      }
    };
  }
}

// Create and export a singleton instance
const analyticsApiService = new AnalyticsApiService();

// Initialize tracking when the service is loaded
// if (typeof window !== 'undefined') {
//   try {
//     analyticsApiService.initializeTracking();
//   } catch (error) {
//     console.warn('Analytics service initialization failed:', error);
//   }
// }

export default analyticsApiService;