// Lead Workflow API Service
const API_BASE_URL = import.meta.env.VITE_BACKEND_LEAD_API_URL || 'http://localhost:9000';

class LeadWorkflowApiService {
  constructor() {
    // authFetch will be injected by the context/component using this service
    this.authFetch = null;
  }

  // Set the authFetch function (from AuthContext)
  setAuthFetch(authFetch) {
    this.authFetch = authFetch;
  }

  // Get authentication headers - uses OAuth token from localStorage
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Use OAuth token from localStorage
    const token = localStorage.getItem('id_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // ===== WORKFLOW EXECUTION ENDPOINTS =====

  // Execute integrated scraping workflow (Yellow Pages → LinkedIn)
  async executeWorkflow(params) {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/workflow/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          workflow_name: params.workflowName || 'yellowpages_linkedin',
          location: params.location,
          industry: params.industry,
          keywords: params.keywords || [],
          max_results: params.maxResults || 50,
          session_name: params.sessionName,
          user_id: params.userId || 'frontend_user'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  }

  // Get available workflows
  async getAvailableWorkflows() {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/workflow/available`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting available workflows:', error);
      throw error;
    }
  }

  // Get workflow information
  async getWorkflowInfo(workflowName) {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/workflow/${workflowName}/info`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting workflow info:', error);
      throw error;
    }
  }

  // ===== SESSION MONITORING ENDPOINTS =====

  // Get session status with real-time progress
  async getSessionStatus(sessionId) {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/session/${sessionId}/status`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }

  // Get session results
  async getSessionResults(sessionId) {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/session/${sessionId}/results`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting session results:', error);
      throw error;
    }
  }

  // Cancel running session
  async cancelSession(sessionId) {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/session/${sessionId}/cancel`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  }

  // ===== SCRAPER INFORMATION ENDPOINTS =====

  // Get scraper information and capabilities
  async getScraperInfo() {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/scrapers/info`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting scraper info:', error);
      throw error;
    }
  }

  // Get workflow history for user
  async getWorkflowHistory(userId = 'frontend_user', limit = 10) {
    try {

      const params = new URLSearchParams({
        user_id: userId,
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/workflow/history?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting workflow history:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  // Poll session status until completion
  async pollSessionStatus(sessionId, onUpdate = null, pollInterval = 2000) {
    const poll = async () => {
      try {
        const status = await this.getSessionStatus(sessionId);
        
        if (onUpdate) {
          onUpdate(status);
        }

        // Continue polling if session is still running
        if (status.status === 'running' || status.status === 'pending') {
          setTimeout(poll, pollInterval);
        }

        return status;
      } catch (error) {
        console.error('Error polling session status:', error);
        throw error;
      }
    };

    return poll();
  }

  // Format workflow parameters for API
  formatWorkflowParams(formData) {
    return {
      workflowName: 'yellowpages_linkedin',
      location: formData.location?.trim(),
      industry: formData.industry?.trim(),
      keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [],
      maxResults: parseInt(formData.maxResults) || 50,
      sessionName: formData.sessionName?.trim() || `Workflow ${new Date().toLocaleString()}`,
      userId: 'frontend_user'
    };
  }

  // Validate workflow parameters
  validateWorkflowParams(params) {
    const errors = [];

    if (!params.location || params.location.trim().length === 0) {
      errors.push('Location is required');
    }

    if (params.maxResults && (params.maxResults < 1 || params.maxResults > 100)) {
      errors.push('Max results must be between 1 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const leadWorkflowApiService = new LeadWorkflowApiService();

export default leadWorkflowApiService; 