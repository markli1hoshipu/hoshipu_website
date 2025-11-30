import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Shared hook for mass email composer logic (CRM & Lead Gen)
 * Manages state, generation, sending, and column insertion
 */
export const useMassEmailComposer = ({
  selectedIds,
  allRecipients = [],
  apiHandlers,
  defaultEmailType,
  fieldMapping = {},
  entityType = 'recipient'
}) => {
  // Recipient management
  const [recipients, setRecipients] = useState(allRecipients.filter(r => selectedIds.has(r.id)));

  // Mode selection: 'template' or 'personalized'
  const [emailMode, setEmailMode] = useState(recipients.length <= 50 ? 'personalized' : 'template');

  // Common state
  const [emailType, setEmailType] = useState(defaultEmailType);
  const [customMessage, setCustomMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Template mode state
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [insertTarget, setInsertTarget] = useState('body');

  // Personalized mode state
  const [personalizedEmails, setPersonalizedEmails] = useState([]);
  const [activeEmailIndex, setActiveEmailIndex] = useState(0);
  const [editedEmails, setEditedEmails] = useState({});
  const [modifiedEmailIndices, setModifiedEmailIndices] = useState(new Set());
  const [generationProgress, setGenerationProgress] = useState('');

  const bodyTextareaRef = useRef(null);
  const subjectInputRef = useRef(null);

  // Check if personalized mode is available
  const canUsePersonalized = recipients.length <= 50;

  // Auto-switch to template if user can't use personalized
  useEffect(() => {
    if (!canUsePersonalized && emailMode === 'personalized') {
      setEmailMode('template');
    }
  }, [canUsePersonalized, emailMode]);

  // Recipient management handlers
  const handleRemoveRecipient = (recipientId) => {
    setRecipients(prev => prev.filter(r => r.id !== recipientId));
    // Reset generated content when recipients change
    setGeneratedEmail(null);
    setPersonalizedEmails([]);
  };

  const handleAddRecipient = (recipient) => {
    if (!recipients.find(r => r.id === recipient.id)) {
      setRecipients(prev => [...prev, recipient]);
      // Reset generated content when recipients change
      setGeneratedEmail(null);
      setPersonalizedEmails([]);
    }
  };

  // Generate email handler (template mode)
  const handleGenerateTemplateEmail = async () => {
    try {
      setIsGenerating(true);
      setError('');

      const data = await apiHandlers.generateTemplate({
        selectedIds: recipients.map(r => r.id),
        emailType,
        customMessage
      });

      setGeneratedEmail(data.email_data);
      setEditedSubject(data.email_data.subject);
      setEditedBody(data.email_data.body);
    } catch (err) {
      setError(err.message || 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate personalized emails (personalized mode)
  const handleGeneratePersonalizedEmails = async () => {
    try {
      setIsGenerating(true);
      setError('');
      setGenerationProgress('Starting sequential generation...');

      const data = await apiHandlers.generatePersonalized({
        selectedIds: recipients.map(r => r.id),
        emailType,
        customMessage
      });

      const processingTime = data.processing_time_seconds || data.processing_time_seconds === 0
        ? data.processing_time_seconds.toFixed ? data.processing_time_seconds.toFixed(1) : data.processing_time_seconds
        : '0';

      setGenerationProgress(`Generated ${data.total} emails in ${processingTime}s`);
      setPersonalizedEmails(data.emails);

      // Initialize edited copies
      const edited = {};
      data.emails.forEach((email, idx) => {
        edited[idx] = apiHandlers.preparePersonalizedEmail(email);
      });
      setEditedEmails(edited);

      setTimeout(() => setGenerationProgress(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to generate personalized emails');
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle generate button click
  const handleGenerateEmail = () => {
    if (emailMode === 'template') {
      handleGenerateTemplateEmail();
    } else {
      handleGeneratePersonalizedEmails();
    }
  };

  // Insert column placeholder (template mode) or actual value (personalized mode)
  const handleInsertColumn = (columnId) => {
    let valueToInsert;

    if (emailMode === 'personalized' && personalizedEmails.length > 0) {
      // Personalized mode: insert actual value
      const currentEmail = personalizedEmails[activeEmailIndex];
      const actualFieldName = fieldMapping[columnId] || columnId;

      // Get the actual value from email data
      if (actualFieldName in currentEmail) {
        valueToInsert = currentEmail[actualFieldName] === null ? '' : String(currentEmail[actualFieldName] || '');
      } else {
        valueToInsert = `{${columnId}}`;
      }
    } else {
      // Template mode: insert placeholder
      valueToInsert = `{${columnId}}`;
    }

    // Insert into contentEditable div
    const targetRef = insertTarget === 'subject' ? subjectInputRef : bodyTextareaRef;
    const element = targetRef.current;

    if (!element) return;

    element.focus();

    // Use Selection API for contentEditable
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const textNode = document.createTextNode(valueToInsert);
      range.insertNode(textNode);

      // Move cursor after inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append to end
      const textNode = document.createTextNode(valueToInsert);
      element.appendChild(textNode);
    }

    // Trigger input event to update state
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
  };

  // Send template mass email
  const handleSendTemplateEmail = async () => {
    if (!editedSubject.trim() || !editedBody.trim()) {
      setError('Subject and body cannot be empty');
      return;
    }

    try {
      setIsSending(true);
      setError('');

      const authProvider = localStorage.getItem('auth_provider');
      const provider = authProvider === 'google' ? 'gmail' : authProvider === 'microsoft' ? 'outlook' : null;

      const result = await apiHandlers.sendTemplate({
        selectedIds: recipients.map(r => r.id),
        subject: editedSubject,
        body: editedBody,
        provider
      });

      // Handle background job response (new format)
      if (result.status === 'queued') {
        setSuccess(`Mass email queued! Job ID: ${result.job_id}`);
      } else {
        // Fallback for old format (shouldn't happen with new backend)
        setSuccess(`Successfully sent ${result.sent} emails! ${result.failed > 0 ? `${result.failed} failed.` : ''}`);
      }

      return result;
    } catch (err) {
      setError(err.message || 'Failed to send emails');
      toast.error(err.message || 'Failed to send emails');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  // Send personalized mass emails
  const handleSendPersonalizedEmails = async () => {
    // Validate all emails have content
    const emailsToSend = Object.values(editedEmails);
    const hasEmpty = emailsToSend.some(email => !email.subject?.trim() || !email.body?.trim());

    if (hasEmpty) {
      setError('All emails must have subject and body');
      return;
    }

    try {
      setIsSending(true);
      setError('');

      const authProvider = localStorage.getItem('auth_provider');
      const provider = authProvider === 'google' ? 'gmail' : authProvider === 'microsoft' ? 'outlook' : null;

      const result = await apiHandlers.sendPersonalized({
        emails: emailsToSend,
        provider,
        modifiedIndices: Array.from(modifiedEmailIndices)
      });

      // Handle background job response (new format)
      if (result.status === 'queued') {
        setSuccess(`Personalized mass email queued! Job ID: ${result.job_id}. Writing style will update with ${modifiedEmailIndices.size} edited email(s).`);
      } else {
        // Fallback for old format (shouldn't happen with new backend)
        setSuccess(`Successfully sent ${result.sent} emails! ${result.failed > 0 ? `${result.failed} failed.` : ''}`);
      }

      return result;
    } catch (err) {
      setError(err.message || 'Failed to send personalized emails');
      toast.error(err.message || 'Failed to send personalized emails');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  // Handle send button click
  const handleSendEmails = async () => {
    if (emailMode === 'template') {
      return await handleSendTemplateEmail();
    } else {
      return await handleSendPersonalizedEmails();
    }
  };

  // Truncate company name for tabs
  const truncateCompanyName = (name, maxLength = 12) => {
    if (!name) return 'Unknown';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Get current subject and body based on mode
  const currentSubject = emailMode === 'personalized' && editedEmails[activeEmailIndex]
    ? editedEmails[activeEmailIndex].subject
    : editedSubject;

  const currentBody = emailMode === 'personalized' && editedEmails[activeEmailIndex]
    ? editedEmails[activeEmailIndex].body
    : editedBody;

  // Update handlers for subject and body
  const handleSubjectChange = (newSubject) => {
    if (emailMode === 'personalized') {
      setEditedEmails(prev => ({
        ...prev,
        [activeEmailIndex]: { ...prev[activeEmailIndex], subject: newSubject }
      }));
      setModifiedEmailIndices(prev => new Set([...prev, activeEmailIndex]));
    } else {
      setEditedSubject(newSubject);
    }
  };

  const handleBodyChange = (newBody) => {
    if (emailMode === 'personalized') {
      setEditedEmails(prev => ({
        ...prev,
        [activeEmailIndex]: { ...prev[activeEmailIndex], body: newBody }
      }));
      setModifiedEmailIndices(prev => new Set([...prev, activeEmailIndex]));
    } else {
      setEditedBody(newBody);
    }
  };

  const hasGeneratedContent = emailMode === 'template' ? generatedEmail : personalizedEmails.length > 0;

  return {
    // State
    emailMode,
    setEmailMode,
    emailType,
    setEmailType,
    customMessage,
    setCustomMessage,
    isGenerating,
    isSending,
    error,
    success,
    insertTarget,
    setInsertTarget,
    personalizedEmails,
    activeEmailIndex,
    setActiveEmailIndex,
    generationProgress,
    recipients,
    modifiedEmailIndices,

    // Computed
    canUsePersonalized,
    currentSubject,
    currentBody,
    hasGeneratedContent,

    // Handlers
    handleGenerateEmail,
    handleSendEmails,
    handleSubjectChange,
    handleBodyChange,
    handleInsertColumn,
    truncateCompanyName,
    handleRemoveRecipient,
    handleAddRecipient,

    // Refs
    bodyTextareaRef,
    subjectInputRef
  };
};
