/**
 * Lead Workflow Integration Service
 * 
 * Coordinates workflow execution with lead data retrieval and formatting.
 * Bridges the gap between raw workflow results and frontend lead display.
 */

import leadWorkflowApiService from './leadWorkflowApi';
import leadsApiService from './leadsApi';

class LeadWorkflowIntegrationService {
  constructor() {
    this.activeWorkflows = new Map();
    this.pollInterval = 2000; // 2 seconds
    this.maxPollAttempts = 150; // 5 minutes total
  }

  /**
   * Execute a lead generation workflow and return formatted lead data
   * @param {Object} params - Workflow parameters
   * @param {string} params.location - Location to search
   * @param {string} params.industry - Industry to search
   * @param {number} params.max_results - Maximum results to return
   * @param {Array} params.keywords - Search keywords
   * @param {string} params.user_id - User ID
   * @returns {Promise<Object>} Formatted lead data with companies and personnel
   */
  async executeWorkflowAndGetLeads(params) {
    try {
      console.log('🚀 Starting workflow execution:', params);
      
      // Start the workflow
      const workflowResponse = await leadWorkflowApiService.executeWorkflow({
        workflow_name: 'yellowpages_linkedin',
        ...params
      });
      
      if (!workflowResponse.session_id) {
        throw new Error('Failed to start workflow: No session ID returned');
      }
      
      const sessionId = workflowResponse.session_id;
      console.log('📝 Workflow started, session ID:', sessionId);
      
      // Track this workflow
      this.activeWorkflows.set(sessionId, {
        startTime: Date.now(),
        params,
        status: 'running'
      });
      
      // Poll for completion and get results
      const workflowResults = await this.pollForWorkflowCompletion(sessionId);
      
      // Process and format the results
      const formattedResults = await this.processWorkflowResults(sessionId, workflowResults);
      
      // Clean up tracking
      this.activeWorkflows.delete(sessionId);
      
      return formattedResults;
      
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Poll for workflow completion and return results
   * @param {string} sessionId - Session ID to poll
   * @returns {Promise<Object>} Workflow results
   */
  async pollForWorkflowCompletion(sessionId) {
    let attempts = 0;
    
    while (attempts < this.maxPollAttempts) {
      try {
        const status = await leadWorkflowApiService.getSessionStatus(sessionId);
        
        if (!status) {
          throw new Error('Failed to get session status');
        }
        
        console.log(`📊 Polling attempt ${attempts + 1}: ${status.status}`);
        
        // Update tracking
        if (this.activeWorkflows.has(sessionId)) {
          this.activeWorkflows.get(sessionId).status = status.status;
        }
        
        if (status.status === 'completed') {
          console.log('✅ Workflow completed successfully');
          
          // Get the full results
          const results = await leadWorkflowApiService.getSessionResults(sessionId);
          
          if (!results) {
            throw new Error('Failed to get session results');
          }
          
          return results;
        }
        
        if (status.status === 'failed') {
          throw new Error(`Workflow failed: ${status.error_message || 'Unknown error'}`);
        }
        
        if (status.status === 'cancelled') {
          throw new Error('Workflow was cancelled');
        }
        
        // Wait before next poll
        await this.sleep(this.pollInterval);
        attempts++;
        
      } catch (error) {
        console.error(`❌ Error polling session ${sessionId}:`, error);
        
        if (attempts >= this.maxPollAttempts - 1) {
          throw new Error(`Workflow polling timed out after ${this.maxPollAttempts} attempts`);
        }
        
        await this.sleep(this.pollInterval);
        attempts++;
      }
    }
    
    throw new Error('Workflow polling timed out');
  }

  /**
   * Process raw workflow results and format them for frontend consumption
   * @param {string} sessionId - Session ID
   * @param {Object} workflowResults - Raw workflow results
   * @returns {Promise<Object>} Formatted lead data
   */
  async processWorkflowResults(sessionId, workflowResults) {
    try {
      console.log('🔄 Processing workflow results:', workflowResults);
      
      // Extract companies and personnel from workflow results
      const companies = workflowResults.results?.companies || [];
      const personnel = workflowResults.results?.personnel || [];
      
      console.log(`📊 Found ${companies.length} companies and ${personnel.personnel || 0} personnel`);
      
      // Wait for backend to process workflow results into leads
      await this.sleep(3000); // Give backend time to process
      
      // Trigger backend processing if needed
      await this.triggerBackendProcessing(sessionId);
      
      // Get the processed leads from the backend
      const leadsData = await this.getProcessedLeads(sessionId);
      
      // Format the data for frontend consumption
      const formattedData = {
        session_id: sessionId,
        workflow_name: workflowResults.workflow_name,
        status: workflowResults.status,
        companies: this.formatCompaniesForDisplay(leadsData.leads || []),
        personnel: this.aggregatePersonnelData(leadsData.leads || []),
        summary: {
          total_companies: leadsData.leads?.length || 0,
          total_personnel: leadsData.total_personnel || 0,
          companies_with_personnel: leadsData.leads?.filter(lead => lead.personnel?.length > 0).length || 0,
          avg_personnel_per_company: leadsData.leads?.length > 0 
            ? (leadsData.total_personnel / leadsData.leads.length).toFixed(1)
            : 0
        },
        performance: workflowResults.performance || {},
        errors: workflowResults.errors || []
      };
      
      console.log('✅ Processed workflow results:', formattedData);
      return formattedData;
      
    } catch (error) {
      console.error('❌ Error processing workflow results:', error);
      throw error;
    }
  }

  /**
   * Trigger backend processing of workflow results
   * @param {string} sessionId - Session ID
   */
  async triggerBackendProcessing(sessionId) {
    try {
      // The backend should automatically process completed workflows
      // This is a placeholder for any additional processing triggers
      console.log('🔄 Triggering backend processing for session:', sessionId);
      
      // Wait a bit more for processing
      await this.sleep(2000);
      
    } catch (error) {
      console.warn('⚠️ Backend processing trigger failed:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get processed leads from the backend
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Processed leads data
   */
  async getProcessedLeads(_sessionId) {
    try {
      // Try to get leads with personnel data
                  const leadsData = await leadsApiService.getLeadsWithPersonnel({
        per_page: 100,
        include_recent: true
      });
      
      return leadsData;
      
    } catch (error) {
      console.error('❌ Error getting processed leads:', error);
      
      // Fallback to regular leads API
      try {
                  const fallbackData = await leadsApiService.getLeads({
          per_page: 100
        });
        
        return {
          leads: fallbackData.leads || [],
          total_personnel: 0
        };
        
      } catch (fallbackError) {
        console.error('❌ Fallback leads API also failed:', fallbackError);
        
        return {
          leads: [],
          total_personnel: 0
        };
      }
    }
  }

  /**
   * Format companies for display in the frontend
   * @param {Array} leads - Array of lead objects with personnel
   * @returns {Array} Formatted companies
   */
  formatCompaniesForDisplay(leads) {
    return leads.map(lead => ({
      id: lead.id,
      name: lead.company,
      location: lead.location,
      industry: lead.industry,
      company_size: lead.company_size,
      revenue: lead.revenue,
      rating: lead.rating,
      employees_count: lead.employees_count,
      contact_info: {
        phone: lead.contact_info?.phone,
        website: lead.contact_info?.website,
        email: lead.contact_info?.email,
        linkedin: lead.contact_info?.linkedin
      },
      products_services: lead.products_services || [],
      personnel: lead.personnel || [],
      personnel_count: lead.personnel?.length || 0,
      status: lead.status,
      score: lead.score,
      source: lead.source,
      tags: lead.tags || [],
      notes: lead.notes,
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }));
  }

  /**
   * Aggregate personnel data from all leads
   * @param {Array} leads - Array of lead objects
   * @returns {Array} Aggregated personnel data
   */
  aggregatePersonnelData(leads) {
    const allPersonnel = [];
    
    leads.forEach(lead => {
      if (lead.personnel && lead.personnel.length > 0) {
        lead.personnel.forEach(person => {
          allPersonnel.push({
            ...person,
            company: lead.company,
            lead_id: lead.id
          });
        });
      }
    });
    
    return allPersonnel;
  }

  /**
   * Get active workflow status
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Workflow status
   */
  getActiveWorkflowStatus(sessionId) {
    return this.activeWorkflows.get(sessionId) || null;
  }

  /**
   * Cancel an active workflow
   * @param {string} sessionId - Session ID to cancel
   * @returns {Promise<boolean>} Success status
   */
  async cancelWorkflow(sessionId) {
    try {
      const success = await leadWorkflowApiService.cancelSession(sessionId);
      
      if (success) {
        // Update tracking
        if (this.activeWorkflows.has(sessionId)) {
          this.activeWorkflows.get(sessionId).status = 'cancelled';
        }
        
        console.log('🚫 Workflow cancelled:', sessionId);
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Error cancelling workflow:', error);
      return false;
    }
  }

  /**
   * Get all active workflows
   * @returns {Array} Active workflows
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.entries()).map(([sessionId, data]) => ({
      session_id: sessionId,
      ...data
    }));
  }

  /**
   * Sleep utility function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get workflow results for a completed session
   * @param {string} sessionId - Session ID to get results for
   * @returns {Promise<Object>} Formatted workflow results
   */
  async getWorkflowResults(sessionId) {
    try {
      console.log('🔍 Getting workflow results for session:', sessionId);
      
      // First try to get session status to see if it's completed
      const status = await leadWorkflowApiService.getSessionStatus(sessionId);
      
      if (!status) {
        throw new Error('Session not found');
      }
      
      if (status.status !== 'completed') {
        throw new Error(`Session is not completed yet (status: ${status.status})`);
      }
      
      // Get the raw workflow results
      const workflowResults = await leadWorkflowApiService.getSessionResults(sessionId);
      
      if (!workflowResults) {
        throw new Error('Failed to get session results');
      }
      
      // Process and format the results the same way as executeWorkflowAndGetLeads
      const formattedResults = await this.processWorkflowResults(sessionId, workflowResults);
      
      console.log('✅ Successfully retrieved workflow results:', formattedResults);
      return formattedResults;
      
    } catch (error) {
      console.error('❌ Error getting workflow results:', error);
      
      // Fallback: try to get leads directly from the database
      try {
        console.log('🔄 Falling back to database leads for session:', sessionId);
        
        const leadsData = await this.getProcessedLeads(sessionId);
        
        if (leadsData.leads && leadsData.leads.length > 0) {
          const fallbackResults = {
            session_id: sessionId,
            workflow_name: 'yellowpages_linkedin',
            status: 'completed',
            companies: this.formatCompaniesForDisplay(leadsData.leads),
            personnel: this.aggregatePersonnelData(leadsData.leads),
            summary: {
              total_companies: leadsData.leads.length,
              total_personnel: leadsData.total_personnel || 0,
              companies_with_personnel: leadsData.leads.filter(lead => lead.personnel?.length > 0).length,
              avg_personnel_per_company: leadsData.leads.length > 0 
                ? (leadsData.total_personnel / leadsData.leads.length).toFixed(1)
                : 0
            },
            performance: {},
            errors: []
          };
          
          console.log('✅ Fallback results retrieved:', fallbackResults);
          return fallbackResults;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
      
      // If all else fails, return empty results
      return {
        session_id: sessionId,
        workflow_name: 'yellowpages_linkedin',
        status: 'completed',
        companies: [],
        personnel: [],
        summary: {
          total_companies: 0,
          total_personnel: 0,
          companies_with_personnel: 0,
          avg_personnel_per_company: 0
        },
        performance: {},
        errors: [error.message]
      };
    }
  }
}

// Export singleton instance
export const leadWorkflowIntegration = new LeadWorkflowIntegrationService();
export default leadWorkflowIntegration; 