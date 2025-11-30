// Use user settings API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005';

export const invitationsApi = {
  /**
   * Get invitations for a specific user email
   * @param {string} email - The email address to search for
   * @returns {Promise<Object>} Object containing user data and invitations array: {user: {...}, invitations: [...]}
   */
  async getUserInvitations(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/user/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('id_token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { user: null, invitations: [] }; // User not found, return empty response
        }
        throw new Error(`Failed to fetch invitations: ${response.status}`);
      }

      const data = await response.json();
      // Return the full response including user data (needed for database service)
      return data;
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      throw error;
    }
  },

  /**
   * Get all invitations for a company
   * @param {string} company - The company name
   * @returns {Promise<Array>} Array of invitation objects
   */
  async getCompanyInvitations(company) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/company/${encodeURIComponent(company)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('id_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch company invitations: ${response.status}`);
      }

      const data = await response.json();
      return data.invitations || [];
    } catch (error) {
      console.error('Error fetching company invitations:', error);
      throw error;
    }
  },

  /**
   * Create a new invitation
   * @param {Object} invitationData - The invitation data
   * @param {string} invitationData.email - Email address
   * @param {string} invitationData.company - Company name
   * @param {string} invitationData.role - User role
   * @param {string} invitationData.database_name - Database name
   * @returns {Promise<Object>} Created invitation object
   */
  async createInvitation(invitationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('id_token')}`
        },
        body: JSON.stringify(invitationData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for specific error messages
        if (response.status === 409) {
          throw new Error(data.detail || 'User already exists');
        }
        throw new Error(data.detail || `Failed to create invitation: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  },

  /**
   * Update an existing invitation
   * @param {string} email - The email address of the invitation to update
   * @param {Object} updateData - The fields to update
   * @returns {Promise<Object>} Updated invitation object
   */
  async updateInvitation(email, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('id_token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update invitation: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating invitation:', error);
      throw error;
    }
  },

  /**
   * Delete an invitation
   * @param {string} email - The email address of the invitation to delete
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteInvitation(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('id_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete invitation: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting invitation:', error);
      throw error;
    }
  },

  /**
   * Check if a user exists in the database
   * @param {string} email - The email address to check
   * @returns {Promise<boolean>} True if user exists, false otherwise
   */
  async checkUserExists(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/check/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('id_token')}`
        }
      });

      if (response.status === 404) {
        return false;
      }

      if (!response.ok) {
        throw new Error(`Failed to check user: ${response.status}`);
      }

      const data = await response.json();
      return data.exists || false;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  },

  /**
   * Get database table checklist for personal onboarding
   * @param {Object} options - Options for the request
   * @param {string} options.userEmail - User email for database routing
   * @param {string} options.databaseName - Specific database name to check
   * @returns {Promise<Object>} Object containing table checklist with status
   */
  async getTableChecklist(options = {}) {
    try {
      // For now, use development endpoint to avoid authentication issues
      // When authentication is properly configured, this can be switched back
      const { userEmail, databaseName } = options;
      
      const params = new URLSearchParams();
      if (userEmail) params.append('user_email', userEmail);
      if (databaseName) params.append('database', databaseName);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/onboarding/table-checklist-dev${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching table checklist from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch table checklist: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching table checklist:', error);
      throw error;
    }
  },

  /**
   * Get database status including connection and table counts
   * @param {Object} options - Options for the request
   * @param {string} options.userEmail - User email for database routing
   * @param {string} options.databaseName - Specific database name to check
   * @returns {Promise<Object>} Database status information
   */
  async getDatabaseStatus(options = {}) {
    try {
      // For now, use development endpoint to avoid authentication issues
      const { userEmail, databaseName } = options;

      const params = new URLSearchParams();
      if (userEmail) params.append('user_email', userEmail);
      if (databaseName) params.append('database', databaseName);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/onboarding/database-status-dev${queryString ? `?${queryString}` : ''}`;

      console.log('Fetching database status from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch database status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching database status:', error);
      throw error;
    }
  },

  /**
   * Create a missing table by copying schema from postgres database
   * @param {Object} options - Options for the request
   * @param {string} options.tableName - Name of the table to create
   * @param {string} options.userEmail - User email for database routing
   * @param {string} options.databaseName - Specific database name to use (overrides user routing)
   * @returns {Promise<Object>} Creation result
   */
  async createTable(options = {}) {
    try {
      const { tableName, userEmail, databaseName } = options;

      if (!tableName) {
        throw new Error('Table name is required');
      }

      const params = new URLSearchParams();
      params.append('table_name', tableName);
      if (userEmail) params.append('user_email', userEmail);
      if (databaseName) params.append('database', databaseName);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/onboarding/create-table-dev?${queryString}`;

      console.log('Creating table via:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create table: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  },

  /**
   * Create all missing tables at once with automatic dependency handling
   * @param {Object} options - Options for the request
   * @param {string} options.userEmail - User email for database routing
   * @param {string} options.databaseName - Specific database name to use (overrides user routing)
   * @returns {Promise<Object>} Bulk creation result with details
   */
  async createAllTables(options = {}) {
    try {
      const { userEmail, databaseName } = options;

      const params = new URLSearchParams();
      if (userEmail) params.append('user_email', userEmail);
      if (databaseName) params.append('database', databaseName);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/onboarding/create-all-tables-dev${queryString ? `?${queryString}` : ''}`;

      console.log('Creating all tables via:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create tables: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating all tables:', error);
      throw error;
    }
  },

  /**
   * Get table content (rows and columns)
   * @param {Object} options - Options for the request
   * @param {string} options.tableName - Name of the table to query
   * @param {string} options.userEmail - User email for database routing
   * @param {string} options.databaseName - Specific database name to use
   * @param {number} options.limit - Maximum number of rows to return (default: 100)
   * @returns {Promise<Object>} Table content with rows, columns, and metadata
   */
  async getTableContent(options = {}) {
    try {
      const { tableName, userEmail, databaseName, limit = 100 } = options;

      if (!tableName) {
        throw new Error('Table name is required');
      }

      const params = new URLSearchParams();
      params.append('table_name', tableName);
      if (userEmail) params.append('user_email', userEmail);
      if (databaseName) params.append('database', databaseName);
      if (limit) params.append('limit', limit.toString());

      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/onboarding/table-content-dev?${queryString}`;

      console.log('Fetching table content from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch table content: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching table content:', error);
      throw error;
    }
  }
};