/**
 * Activity Logging Service
 * Handles communication with the user settings service for activity logging
 */

const USER_SETTINGS_API = `${import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005'}/api/activity`;

class ActivityService {
  /**
   * Log a page view
   */
  async logPageView(userEmail, pageUrl, sessionId, durationMs, referrer = null) {
    try {
      const response = await fetch(`${USER_SETTINGS_API}/page-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: userEmail,
          page_url: pageUrl,
          session_id: sessionId,
          duration_ms: durationMs,
          referrer,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to log page view:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Log a generic activity
   */
  async logActivity(data) {
    try {
      const response = await fetch(`${USER_SETTINGS_API}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to log activity:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(userEmail = null, actionType = null, limit = 50, days = 7) {
    try {
      const params = new URLSearchParams();
      if (userEmail) params.append('user_email', userEmail);
      if (actionType) params.append('action_type', actionType);
      params.append('limit', limit);
      params.append('days', days);

      const response = await fetch(`${USER_SETTINGS_API}/recent?${params.toString()}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      return { success: false, activities: [] };
    }
  }

  /**
   * Get activity summary statistics
   */
  async getActivitySummary(userEmail = null, days = 7) {
    try {
      const params = new URLSearchParams();
      if (userEmail) params.append('user_email', userEmail);
      params.append('days', days);

      const response = await fetch(`${USER_SETTINGS_API}/summary?${params.toString()}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch activity summary:', error);
      return { success: false, by_type: [], top_pages: [] };
    }
  }
}

export const activityService = new ActivityService();
export default activityService;
