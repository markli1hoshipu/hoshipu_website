import { useState, useEffect } from 'react';
import { useMassEmailComposer } from '../../hooks/useMassEmailComposer';
import MassEmailComposerUI from '../ui/massemail/MassEmailComposerUI';
import leadsApiService from '../../services/leadsApi';
import { useAuth } from '../../auth/hooks/useAuth';

const MassEmailComposer = ({ selectedLeadIds, allLeads = [], onClose, onEmailsSent }) => {
  const { user } = useAuth();

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
      const templates = await leadsApiService.getEmailTemplates(user.email, 'email', true, 'leadgen');
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Failed to load saved templates:', error);
    }
  };

  // Format leads as recipients (use lead_id for leads compatibility)
  const allRecipients = allLeads.map(lead => ({
    id: lead.lead_id || lead.id,
    name: lead.company,
    email: lead.email,
    company: lead.company
  }));

  // Lead Gen-specific column definitions
  const columns = [
    { id: 'company', label: 'Company', description: 'Company name' },
    { id: 'location', label: 'Location', description: 'Company location' },
    { id: 'industry', label: 'Industry', description: 'Business industry' },
    { id: 'website', label: 'Website', description: 'Company website URL' },
    { id: 'phone', label: 'Phone', description: 'Contact phone number' }
  ];

  // Lead Gen-specific email templates (for AI generation mode)
  const templates = [
    { id: 'cold_outreach', name: 'Cold Outreach', description: 'First-time introduction' },
    { id: 'follow_up', name: 'Follow Up', description: 'Follow up message' },
    { id: 'meeting_request', name: 'Meeting Request', description: 'Request a meeting' }
  ];

  // Lead Gen-specific API handlers
  const apiHandlers = {
    generateTemplate: async ({ selectedIds, emailType, customMessage }) => {
      // Template generation removed - templates should be created in User Settings
      throw new Error('Template generation not supported. Please use saved templates from User Settings.');
    },

    generatePersonalized: async ({ selectedIds, emailType, customMessage }) => {
      return await leadsApiService.generatePersonalizedMassEmails(
        selectedIds,
        emailType,
        customMessage
      );
    },

    sendTemplate: async ({ selectedIds, subject, body, provider }) => {
      // Send template_id along with edited subject/body (backend uses edits if provided)
      if (selectedSavedTemplate?.id) {
        return await leadsApiService.sendMassEmail(
          selectedIds,
          subject,  // Include edited subject
          body,     // Include edited body
          provider,
          selectedSavedTemplate.id // template_id
        );
      } else {
        // AI-generated mode - send subject and body
        return await leadsApiService.sendMassEmail(
          selectedIds,
          subject,
          body,
          provider
        );
      }
    },

    sendPersonalized: async ({ emails, provider, modifiedIndices }) => {
      // Filter to only send modified emails for writing style updates
      const modifiedEmails = modifiedIndices && modifiedIndices.length > 0
        ? emails.filter((_, index) => modifiedIndices.includes(index))
        : [];

      return await leadsApiService.sendPersonalizedMassEmails(
        emails,
        provider,
        modifiedEmails
      );
    },

    // Prepare personalized email for editing (Lead Gen format)
    preparePersonalizedEmail: (email) => ({
      subject: email.subject,
      body: email.body,
      lead_id: email.lead_id,
      to_email: email.lead_email
    })
  };

  // Use shared hook with Lead Gen configuration
  const massEmailState = useMassEmailComposer({
    selectedIds: selectedLeadIds,
    allRecipients,
    apiHandlers,
    defaultEmailType: 'cold_outreach',
    fieldMapping: {},
    entityType: 'lead'
  });

  // Lead Gen-specific helper functions
  const getCompanyName = (email) => email.lead_company;
  const getCompanyEmail = (email) => email.lead_email;

  // Render shared UI with Lead Gen-specific configuration
  return (
    <MassEmailComposerUI
      title={`Mass Email - Sending to ${massEmailState.recipients.length} leads`}
      columns={columns}
      templates={templates}
      recipientLabel="leads"
      showStatusUpdate={true}
      getCompanyName={getCompanyName}
      getCompanyEmail={getCompanyEmail}
      allRecipients={allRecipients}
      emptyStateDescription="This will generate unique emails for each lead using their past email history."
      onClose={onClose}
      onEmailsSent={onEmailsSent}
      // Saved templates support
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
