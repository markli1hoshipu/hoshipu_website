/**
 * Unified Workflow API Service
 * 
 * Service for interacting with the unified lead generation workflow endpoints
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_LEAD_API_URL || 'http://localhost:9000';

class UnifiedWorkflowApiService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/leads/unified`;
  }

  /**
   * Get authentication headers - uses OAuth token from localStorage
   */
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

  /**
   * Execute unified workflow
   */
  async executeWorkflow(params) {
    const queryParams = new URLSearchParams(params);
    
    const response = await fetch(`${this.baseUrl}/execute?${queryParams}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Handle validation errors
          const validationErrors = errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(sessionId) {
    const response = await fetch(`${this.baseUrl}/status/${sessionId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Handle validation errors
          const validationErrors = errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(sessionId) {
    const response = await fetch(`${this.baseUrl}/cancel/${sessionId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Handle validation errors
          const validationErrors = errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get workflow information and capabilities
   */
  async getWorkflowInfo() {
    const response = await fetch(`${this.baseUrl}/workflows`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Handle validation errors
          const validationErrors = errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(period = '30d') {
    const response = await fetch(`${this.baseUrl}/statistics?period=${period}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Handle validation errors
          const validationErrors = errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Test unified workflow connectivity
   */
  async testConnection() {
    try {
      const info = await this.getWorkflowInfo();
      return {
        connected: true,
        service: 'Unified Workflow',
        status: 'operational',
        workflows: Object.keys(info).length
      };
    } catch (error) {
      return {
        connected: false,
        service: 'Unified Workflow',
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Parse workflow results to extract lead data
   */
  parseWorkflowResults(results) {
    try {
      // Extract leads from different result formats
      let leads = [];
      
      if (results.final_leads) {
        leads = results.final_leads;
      } else if (results.stages?.qualification?.leads) {
        leads = results.stages.qualification.leads;
      } else if (results.stages?.fusion?.leads) {
        leads = results.stages.fusion.leads;
      } else if (results.leads) {
        leads = results.leads;
      }

      // Normalize lead data format
      return leads.map(lead => ({
        id: lead.id || `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        company: lead.company_name || lead.company || 'Unknown Company',
        name: lead.primary_contact || lead.name || lead.company_name || 'Unknown Contact',
        position: lead.position || 'Contact',
        location: lead.location || 'Unknown Location',
        industry: lead.industry || 'Unknown Industry',
        
        // Contact information
        email: Array.isArray(lead.emails) ? lead.emails[0] : lead.email || null,
        phone: Array.isArray(lead.phones) ? lead.phones[0] : lead.phone || null,
        website: Array.isArray(lead.websites) ? lead.websites[0] : lead.website || null,
        
        // Company details
        company_size: lead.company_size || null,
        revenue: lead.revenue || null,
        employees_count: lead.employees_count || null,
        
        // Scoring and status
        score: lead.final_score || lead.score || 0,
        rating: lead.rating || null,
        status: 'new_lead',  // Default status for unified workflow leads
        
        // Metadata
        source: 'unified_workflow',
        created_at: new Date().toISOString(),
        
        // Additional unified workflow specific data
        client_type: lead.client_type || null,
        preferred_language: lead.preferred_language || 'en',
        completeness_score: lead.completeness_score || 0,
        reliability_score: lead.reliability_score || 0,
        personnel_count: lead.personnel_count || 0,
        
        // Raw data for debugging
        _raw: lead
      }));
    } catch (error) {
      console.error('Error parsing workflow results:', error);
      return [];
    }
  }

  /**
   * Map lead score to status
   */
  mapScoreToStatus(score) {
    if (score >= 81) return 'qualified';
    if (score >= 61) return 'hot';
    if (score >= 31) return 'warm';
    return 'cold';
  }

  /**
   * Format workflow statistics for display
   */
  formatStatistics(stats) {
    return {
      totalWorkflows: stats.total_workflows_executed || 0,
      successRate: stats.success_rate || 0,
      averageExecutionTime: stats.average_execution_time_minutes || 0,
      totalLeadsGenerated: stats.total_leads_generated || 0,
      averageLeadsPerWorkflow: stats.average_leads_per_workflow || 0,
      leadQualityDistribution: stats.lead_quality_distribution || {},
      sourceEffectiveness: stats.source_effectiveness || {},
      averageCompletenessScore: stats.average_completeness_score || 0,
      crmConversionRate: stats.crm_conversion_rate || 0
    };
  }
}

// Create singleton instance
const unifiedWorkflowApiService = new UnifiedWorkflowApiService();

export default unifiedWorkflowApiService;