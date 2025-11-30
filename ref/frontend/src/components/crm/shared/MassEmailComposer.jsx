/**
 * CRM Mass Email Composer
 * Uses shared architecture with Lead Gen
 * Template Mode: Select from saved templates
 * Personalized Mode: AI-generated unique emails per recipient
 */

import { useState, useEffect } from 'react';
import { useMassEmailComposer } from '../../../hooks/useMassEmailComposer';
import MassEmailComposerUI from '../../ui/massemail/MassEmailComposerUI';
import { useAuth } from '../../../auth/hooks/useAuth';
import toast from 'react-hot-toast';
import { useCRM } from '../../../contexts/CRMContext';
import { templateApi } from '../../../services/templateApi';

const MassEmailComposer = ({ selectedClientIds, onClose, onEmailsSent }) => {
  const { authFetch, user } = useAuth();
  const { customers } = useCRM();
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
      const templates = await templateApi.listTemplates(user.email, 'email', true, 'crm');
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Failed to load saved templates:', error);
    }
  };

  // Format customers as recipients
  const allRecipients = customers.map(customer => ({
    id: customer.id,
    name: customer.company || customer.client_name,
    email: customer.email || customer.client_email,
    company: customer.company || customer.client_name
  }));

  // CRM-specific column definitions
  const columns = [
    { id: 'name', label: 'Company Name', description: 'Customer company name' },
    { id: 'primary_contact', label: 'Primary Contact', description: 'Main contact person' },
    { id: 'industry', label: 'Industry', description: 'Customer industry' },
    { id: 'email', label: 'Email', description: 'Customer email address' },
    { id: 'phone', label: 'Phone', description: 'Customer phone number' }
  ];

  // CRM-specific email templates (for personalized mode)
  const templates = [
    { id: 'follow_up', name: 'Follow Up', description: 'Follow up on previous contact or conversation' },
    { id: 'meeting_request', name: 'Meeting Request', description: 'Request a meeting or schedule a demo' }
  ];

  // CRM-specific field mapping (backend returns client_name, client_email, etc.)
  const fieldMapping = {
    'name': 'client_name',
    'email': 'client_email'
    // primary_contact, industry, phone use same field names
  };

  // CRM-specific API handlers
  const apiHandlers = {
    generateTemplate: async ({ selectedIds, emailType, customMessage }) => {
      // Template mode no longer uses AI generation
      // This should not be called - templates are pre-selected
      throw new Error('Template generation not supported in CRM. Please use saved templates.');
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
      // Use selected template ID (accessible via closure)
      if (!selectedSavedTemplate?.id) {
        throw new Error('No template selected');
      }

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/send-mass-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_ids: selectedIds,
          template_id: selectedSavedTemplate.id,
          subject: subject,
          body: body,
          provider
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send mass email');
      }

      const result = await response.json();

      return result;
    },

    sendPersonalized: async ({ emails, provider, modifiedIndices }) => {
      // Filter to only send modified emails for writing style updates
      const modifiedEmails = modifiedIndices && modifiedIndices.length > 0
        ? emails.filter((_, index) => modifiedIndices.includes(index))
        : [];

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/send-personalized-mass-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          provider,
          modified_emails: modifiedEmails
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send personalized emails');
      }

      const result = await response.json();

      return result;
    },

    // Prepare personalized email for editing (CRM format)
    preparePersonalizedEmail: (email) => ({
      subject: email.subject,
      body: email.body,
      client_id: email.client_id,
      to_email: email.client_email
    })
  };

  // Use shared hook with CRM configuration
  const massEmailState = useMassEmailComposer({
    selectedIds: selectedClientIds,
    allRecipients,
    apiHandlers,
    defaultEmailType: 'follow_up',
    fieldMapping,
    entityType: 'client'
  });

  // CRM-specific helper functions
  const getCompanyName = (email) => email.client_name;
  const getCompanyEmail = (email) => email.client_email;

  // Render shared UI with CRM-specific configuration
  return (
    <MassEmailComposerUI
      title={`Mass Email - Sending to ${massEmailState.recipients.length} clients`}
      columns={columns}
      templates={templates}
      recipientLabel="clients"
      showStatusUpdate={false}
      getCompanyName={getCompanyName}
      getCompanyEmail={getCompanyEmail}
      allRecipients={allRecipients}
      emptyStateDescription="This will generate unique emails for each client using their past interaction history."
      onClose={onClose}
      onEmailsSent={onEmailsSent}
      // CRM-specific: Use saved templates instead of AI generation in Template Mode
      useSavedTemplates={true}
      savedTemplates={savedTemplates}
      selectedSavedTemplate={selectedSavedTemplate}
      onSavedTemplateSelect={setSelectedSavedTemplate}
      // Writing style tracking
      modifiedEmailIndices={massEmailState.modifiedEmailIndices}
      {...massEmailState}
    />
  );
};

export default MassEmailComposer;
