import { useState, useEffect } from 'react';
import { useMassEmailComposer } from '../../../hooks/useMassEmailComposer';
import MassEmailComposerUI from '../../ui/massemail/MassEmailComposerUI';
import { useAuth } from '../../../auth/hooks/useAuth';
import { useCRM } from '../../../contexts/CRMContext';
import { templateApi } from '../../../services/templateApi';
import toast from 'react-hot-toast';

const DealMassEmailComposer = ({ selectedDealIds, onClose, onEmailsSent }) => {
  const { authFetch, user } = useAuth();
  const { deals } = useCRM();
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Saved templates state
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedSavedTemplate, setSelectedSavedTemplate] = useState(null);

  // Load saved templates on mount
  useEffect(() => {
    if (user?.email) {
      loadSavedTemplates();
    }
  }, [user?.email]);

  const loadSavedTemplates = async () => {
    try {
      const templates = await templateApi.listTemplates(user.email, 'email', true);
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Failed to load saved templates:', error);
    }
  };

  // Format deals as recipients (use client_id since backend expects customer IDs)
  // Filter to only selected deals first, then use their client_ids
  const selectedDeals = deals.filter(deal => selectedDealIds.has(deal.deal_id));

  const allRecipients = deals.map(deal => ({
    id: deal.client_id,  // Use client_id for API calls
    deal_id: deal.deal_id,  // Keep deal_id for reference
    name: deal.deal_name,
    email: deal.client_email,
    company: deal.client_name
  }));

  // Create a Set of client_ids from selected deals for hook initialization
  const selectedClientIds = new Set(selectedDeals.map(deal => deal.client_id));

  // Deal-specific column definitions
  const columns = [
    { id: 'deal_name', label: 'Deal Name', description: 'Name of the deal' },
    { id: 'client_name', label: 'Client', description: 'Client company name' },
    { id: 'value_usd', label: 'Value', description: 'Deal value in USD' },
    { id: 'stage', label: 'Stage', description: 'Current deal stage' },
    { id: 'client_email', label: 'Email', description: 'Client email address' }
  ];

  // Deal email templates (same as customer)
  const templates = [
    { id: 'follow_up', name: 'Follow Up', description: 'Follow up on previous contact or conversation' },
    { id: 'meeting_request', name: 'Meeting Request', description: 'Request a meeting or schedule a demo' }
  ];

  // Deal-specific field mapping
  const fieldMapping = {
    'name': 'deal_name',
    'email': 'client_email',
    'company': 'client_name'
  };

  // Helper to get deal_id from client_id
  const getDealIdForClientId = (clientId) => {
    const recipient = allRecipients.find(r => r.id === clientId);
    return recipient?.deal_id || null;
  };

  // API handlers (using same CRM endpoints with deal_id support)
  const apiHandlers = {
    generateTemplate: async ({ selectedIds, emailType, customMessage }) => {
      // Template generation removed - templates should be created in User Settings
      throw new Error('Template generation not supported. Please use saved templates from User Settings.');
    },

    generatePersonalized: async ({ selectedIds, emailType, customMessage }) => {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/generate-personalized-mass-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_ids: selectedIds,
          email_type: emailType,
          custom_prompt: customMessage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate personalized emails');
      }

      return await response.json();
    },

    sendTemplate: async ({ selectedIds, subject, body, provider }) => {
      // Use selected template ID (same as Customer mass email)
      if (!selectedSavedTemplate?.id) {
        throw new Error('No template selected');
      }

      // Create deal mappings for deal-specific email tracking
      const dealMappings = selectedIds.map(clientId => ({
        client_id: clientId,
        deal_id: getDealIdForClientId(clientId)
      })).filter(m => m.deal_id !== null);

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/send-mass-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_ids: selectedIds,
          template_id: selectedSavedTemplate.id,  // Use template_id from User Settings
          deal_mappings: dealMappings,  // Include deal mappings for isolation
          provider
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send mass email');
      }

      const result = await response.json();

      return result;
    },

    sendPersonalized: async ({ emails, provider }) => {
      // Add deal_id to each email for deal-specific tracking
      const emailsWithDealId = emails.map(email => ({
        ...email,
        deal_id: getDealIdForClientId(email.client_id)
      }));

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/send-personalized-mass-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: emailsWithDealId,  // Include deal_id in each email
          provider
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send personalized emails');
      }

      const result = await response.json();

      return result;
    },

    // Prepare personalized email for editing (Deal format with deal_id)
    preparePersonalizedEmail: (email) => ({
      subject: email.subject,
      body: email.body,
      client_id: email.client_id,
      deal_id: email.deal_id,  // Include deal_id for isolation
      to_email: email.client_email
    })
  };

  // Use shared hook with Deal configuration
  // Pass client_ids since backend expects customer IDs
  const massEmailState = useMassEmailComposer({
    selectedIds: selectedClientIds,  // Use client_ids, not deal_ids
    allRecipients,
    apiHandlers,
    defaultEmailType: 'follow_up',
    fieldMapping,
    entityType: 'deal'
  });

  // Deal-specific helper functions
  const getCompanyName = (email) => email.deal_name || email.client_name;
  const getCompanyEmail = (email) => email.client_email;

  // Render shared UI with Deal-specific configuration
  return (
    <MassEmailComposerUI
      title={`Mass Email - Sending to ${massEmailState.recipients.length} deals`}
      columns={columns}
      templates={templates}
      recipientLabel="deals"
      showStatusUpdate={false}
      getCompanyName={getCompanyName}
      getCompanyEmail={getCompanyEmail}
      allRecipients={allRecipients}
      emptyStateDescription="This will generate unique emails for each deal using their past interaction history."
      onClose={onClose}
      onEmailsSent={onEmailsSent}
      // Saved templates support (same as Customer mass email)
      useSavedTemplates={true}
      savedTemplates={savedTemplates}
      selectedSavedTemplate={selectedSavedTemplate}
      onSavedTemplateSelect={setSelectedSavedTemplate}
      {...massEmailState}
    />
  );
};

export default DealMassEmailComposer;
