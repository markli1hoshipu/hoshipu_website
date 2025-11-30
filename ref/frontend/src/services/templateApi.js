/**
 * Template API Service
 * Handles communication with User Settings service for email template management
 */

const API_BASE = import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005';

/**
 * Make API request to User Settings service
 */
async function request(url, options = {}) {
  const idToken = localStorage.getItem('id_token');
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': idToken ? `Bearer ${idToken}` : '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Template API methods
 */
export const templateApi = {
  /**
   * List all templates
   * @param {string} userEmail - User's email address
   * @param {string} channel - Channel type (default: 'email')
   * @param {boolean} isActive - Filter by active status (default: true)
   * @param {string} templateType - Template type filter ('crm' or 'leadgen')
   * @returns {Promise<Array>} List of templates
   */
  listTemplates: (userEmail, channel = 'email', isActive = true, templateType = null) => {
    let url = `/api/templates?user_email=${encodeURIComponent(userEmail)}&channel=${channel}&is_active=${isActive}`;
    if (templateType) {
      url += `&template_type=${templateType}`;
    }
    return request(url);
  },

  /**
   * Get single template by ID
   * @param {string} id - Template UUID
   * @param {string} userEmail - User's email address
   * @returns {Promise<Object>} Template details
   */
  getTemplate: (id, userEmail) =>
    request(`/api/templates/${id}?user_email=${encodeURIComponent(userEmail)}`),

  /**
   * Create new template
   * @param {Object} data - Template data
   * @param {string} data.name - Template name
   * @param {string} data.subject - Email subject with [tokens]
   * @param {string} data.body - Email body with [tokens]
   * @param {string} [data.description] - Optional description
   * @param {string} [data.channel] - Channel (default: 'email')
   * @param {string} [data.template_type] - Template type ('crm' or 'leadgen')
   * @param {string} userEmail - User's email address
   * @returns {Promise<Object>} Created template
   */
  createTemplate: (data, userEmail) =>
    request(`/api/templates?user_email=${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  /**
   * Update existing template
   * @param {string} id - Template UUID
   * @param {Object} data - Fields to update
   * @param {string} userEmail - User's email address
   * @returns {Promise<Object>} Updated template
   */
  updateTemplate: (id, data, userEmail) =>
    request(`/api/templates/${id}?user_email=${encodeURIComponent(userEmail)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  /**
   * Delete template (soft delete)
   * @param {string} id - Template UUID
   * @param {string} userEmail - User's email address
   * @returns {Promise<Object>} Success response
   */
  deleteTemplate: (id, userEmail) =>
    request(`/api/templates/${id}?user_email=${encodeURIComponent(userEmail)}`, { method: 'DELETE' }),

  /**
   * Preview template with actual client data
   * @param {string} id - Template UUID
   * @param {number} clientId - Client ID for preview
   * @param {string} userEmail - User's email address
   * @returns {Promise<Object>} Rendered subject and body
   */
  previewTemplate: (id, clientId, userEmail) =>
    request(`/api/templates/${id}/preview?user_email=${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId })
    }),

  /**
   * Track template send stats
   * @param {string} id - Template UUID
   * @param {Object} stats - Send statistics
   * @param {number} stats.total_sends - Total emails sent
   * @param {number} stats.successful_sends - Successful sends
   * @param {number} stats.failed_sends - Failed sends
   * @param {string} userEmail - User's email address
   * @returns {Promise<Object>} Success response
   */
  trackSend: (id, stats, userEmail) =>
    request(`/api/templates/${id}/track-send?user_email=${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      body: JSON.stringify(stats)
    }),

  /**
   * Generate email template using AI
   * @param {string} prompt - User's instructions for template generation
   * @param {string} userEmail - User's email address
   * @param {string} templateType - Template type ('crm' or 'leadgen')
   * @returns {Promise<Object>} Generated template with subject, body, and tokens
   */
  generateTemplate: (prompt, userEmail, templateType = 'crm') =>
    request(`/api/templates/generate?user_email=${encodeURIComponent(userEmail)}&template_type=${templateType}`, {
      method: 'POST',
      body: JSON.stringify({ prompt })
    }),

  /**
   * Get writing style for current user
   * @returns {Promise<Object>} Writing style data
   */
  getWritingStyle: () =>
    request('/api/user-settings/writing-style', {
      method: 'GET'
    }),

  /**
   * Initialize writing style from email samples
   * @param {Array} emailSamples - Array of email objects with subject and body
   * @returns {Promise<Object>} Success response with writing style
   */
  initializeWritingStyle: (emailSamples) =>
    request('/api/user-settings/writing-style/initialize', {
      method: 'POST',
      body: JSON.stringify({ email_samples: emailSamples })
    }),
};

export default templateApi;
