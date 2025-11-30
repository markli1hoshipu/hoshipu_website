// Perplexity AI API Service
const API_BASE_URL = import.meta.env.VITE_BACKEND_LEAD_API_URL || 'http://localhost:9000';

class PerplexityApiService {
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

  // Test connection to Perplexity API
  async testConnection() {
    try {

      console.log('🔍 Testing Perplexity connection...');
      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/test`, {
        method: 'GET',
        headers: this.getHeaders(),
        timeout: 10000
      });

      console.log(`📡 Connection test response: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Connection test failed: ${response.status} - ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Connection test result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error testing Perplexity connection:', error);
      return {
        connected: false,
        service: "Perplexity AI",
        status: "error",
        message: error.message
      };
    }
  }

  // Search for companies using Perplexity AI
  async searchCompanies(searchParams) {
    try {

      const {
        region,
        industry,
        num_companies = 10,
        include_details = ['contact', 'size', 'revenue', 'description', 'website'],
        model = 'sonar-pro'
      } = searchParams;

      const requestBody = {
        region,
        industry,
        num_companies,
        include_details,
        model
      };

      console.log('🤖 Sending Perplexity search request:', requestBody);

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(50000) // 50 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Perplexity search response:', result);
      
      return result;
    } catch (error) {
      console.error('Error searching companies with Perplexity:', error);
      throw error;
    }
  }

  // Get detailed information about a specific company
  async getCompanyDetails(companyName, location) {
    try {

      const params = new URLSearchParams({
        location
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/company/${encodeURIComponent(companyName)}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting company details:', error);
      throw error;
    }
  }

  // Find contacts at a specific company
  async findCompanyContacts(companyName, location, roles = []) {
    try {

      const params = new URLSearchParams({
        location
      });

      if (roles.length > 0) {
        roles.forEach(role => params.append('roles', role));
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/company/${encodeURIComponent(companyName)}/contacts?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error finding company contacts:', error);
      throw error;
    }
  }

  // Analyze market conditions
  async analyzeMarket(industry, region, analysisDepth = 'standard') {
    try {

      const requestBody = {
        industry,
        region,
        analysis_depth: analysisDepth
      };

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/market-analysis`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing market:', error);
      throw error;
    }
  }

  // Verify company information
  async verifyCompanyInfo(companyName, location, infoToVerify) {
    try {

      const requestBody = {
        company_name: companyName,
        location,
        info_to_verify: infoToVerify
      };

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/verify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error verifying company info:', error);
      throw error;
    }
  }

  // Batch search for multiple regions/industries
  async batchSearchCompanies(searches, concurrentLimit = 3) {
    try {

      const requestBody = {
        searches,
        concurrent_limit: concurrentLimit
      };

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/batch-search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in batch search:', error);
      throw error;
    }
  }

  // Stream search results (for real-time updates)
  async streamSearchResults(region, industry, numCompanies = 10) {
    try {

      const params = new URLSearchParams({
        region,
        industry,
        num_companies: numCompanies.toString()
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/search/stream?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response; // Return response for streaming
    } catch (error) {
      console.error('Error streaming search results:', error);
      throw error;
    }
  }

  // Convert Perplexity results to lead format
  async convertToLeads(searchResponse, autoCreate = false) {
    try {

      const params = new URLSearchParams({
        auto_create: autoCreate.toString()
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/convert-to-leads?${params}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(searchResponse)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error converting to leads:', error);
      throw error;
    }
  }

  // Get available Perplexity models
  async getAvailableModels() {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/models`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting available models:', error);
      throw error;
    }
  }

  // Get service statistics
  async getServiceStats() {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/stats`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting service stats:', error);
      throw error;
    }
  }

  // Clear service cache
  async clearCache() {
    try {

      const response = await fetch(`${API_BASE_URL}/api/leads/perplexity/clear-cache`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  // Helper method to format search parameters
  formatSearchParams(region, industry, numCompanies, options = {}) {
    return {
      region,
      industry,
      num_companies: numCompanies,
      include_details: options.includeDetails || ['contact', 'size', 'revenue', 'description', 'website'],
      model: options.model || 'sonar-pro'
    };
  }

  // Helper method to extract company information for lead conversion
  extractLeadInfo(company) {
    return {
      name: company.name,
      company: company.name,
      location: company.location,
      industry: company.industry,
      contact_info: {
        email: company.contact_info?.email,
        phone: company.contact_info?.phone,
        website: company.contact_info?.website,
        linkedin: company.social_profiles?.linkedin
      },
      company_size: company.company_size?.size_category || company.company_size?.employees,
      employees_count: company.company_size?.employee_count,
      revenue: company.revenue,
      products_services: company.products_services || [],
      source: 'perplexity',
      notes: company.description,
      score: Math.round((company.confidence_score || 0) * 100),
      leadership: company.leadership || [],
      founded_year: company.founded_year,
      certifications: company.certifications || [],
      source_citations: company.source_citations || []
    };
  }
}

// Create singleton instance
const perplexityApiService = new PerplexityApiService();

export default perplexityApiService;