const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

/**
 * Create a new meeting for a customer
 */
export const createMeeting = async (customerId, meetingData, googleAccessToken, authFetch) => {
  const response = await authFetch(
    `${CRM_API_BASE_URL}/api/crm/customers/${customerId}/meetings?google_access_token=${googleAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meetingData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create meeting');
  }

  return response.json();
};

/**
 * Update an existing meeting
 */
export const updateMeeting = async (interactionId, meetingData, googleAccessToken, authFetch) => {
  const response = await authFetch(
    `${CRM_API_BASE_URL}/api/crm/meetings/${interactionId}?google_access_token=${googleAccessToken}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meetingData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update meeting');
  }

  return response.json();
};

/**
 * Delete a meeting (hard delete from both Google Calendar and CRM)
 */
export const deleteMeeting = async (interactionId, googleAccessToken, authFetch) => {
  const response = await authFetch(
    `${CRM_API_BASE_URL}/api/crm/meetings/${interactionId}?google_access_token=${googleAccessToken}`,
    {
      method: 'DELETE'
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete meeting');
  }

  return response.json();
};

/**
 * Get all meetings for a specific customer
 */
export const getCustomerMeetings = async (customerId, authFetch) => {
  const response = await authFetch(
    `${CRM_API_BASE_URL}/api/crm/customers/${customerId}/meetings`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch meetings');
  }

  return response.json();
};

/**
 * Get a single meeting by interaction ID
 */
export const getMeetingById = async (interactionId, authFetch) => {
  const response = await authFetch(
    `${CRM_API_BASE_URL}/api/crm/meetings/${interactionId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch meeting');
  }

  return response.json();
};

/**
 * Sync meetings from Google Calendar to CRM for a specific customer
 */
export const syncGoogleCalendar = async (customerId, googleAccessToken, authFetch, syncRequest = {}) => {
  const response = await authFetch(
    `${CRM_API_BASE_URL}/api/crm/customers/${customerId}/sync-google-calendar?google_access_token=${googleAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncRequest)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to sync calendar');
  }

  return response.json();
};

/**
 * Sync all Google Calendar events across all customers
 */
export const syncAllGoogleCalendar = async (googleAccessToken, authFetch, syncRequest = {}) => {
  const response = await authFetch(
    `${CRM_API_BASE_URL}/api/crm/sync-all-google-calendar?google_access_token=${googleAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncRequest)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to sync all calendars');
  }

  return response.json();
};
