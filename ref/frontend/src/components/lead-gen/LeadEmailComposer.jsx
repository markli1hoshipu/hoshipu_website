import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Send,
  Sparkles,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Copy,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { Alert } from '../ui/primitives/alert';
import leadsApiService from '../../services/leadsApi';

const LeadEmailComposer = ({ lead, onClose, onEmailSent, embedded = false, smartSendWindow: propSmartSendWindow = null }) => {
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editedTo, setEditedTo] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [templates, setTemplates] = useState([]);
  const [emailType, setEmailType] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [smartSendWindow, setSmartSendWindow] = useState(propSmartSendWindow);
  const [loadingSmartWindow, setLoadingSmartWindow] = useState(false);

  useEffect(() => {
    setTemplates([
      {
        id: 'cold_outreach',
        name: 'Cold Outreach',
        description: 'First-time introduction to potential customer'
      },
      {
        id: 'introduction',
        name: 'Company Introduction',
        description: 'Introduce your company and services'
      }
    ]);
  }, []);

  // Update smartSendWindow when prop changes
  useEffect(() => {
    if (propSmartSendWindow) {
      console.log('[SmartSendWindow] Using pre-fetched data from parent');
      setSmartSendWindow(propSmartSendWindow);
    }
  }, [propSmartSendWindow]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const generateEmail = async () => {
    try {
      setIsGenerating(true);
      setError('');

      // Build custom prompt from email type and custom message
      let prompt = '';
      const selectedTemplate = templates.find(t => t.id === emailType);
      if (selectedTemplate) {
        prompt = selectedTemplate.description;
      }
      if (customMessage.trim()) {
        prompt += (prompt ? '. ' : '') + customMessage.trim();
      }

      // Use lead_id since that's the database column name
      const leadId = lead.lead_id;

      if (!leadId) {
        throw new Error('No valid lead ID found. Cannot generate email without lead ID.');
      }

      const data = await leadsApiService.generateEmail(
        leadId,
        prompt
      );

      const emailData = {
        subject: data.subject || data.email_data?.subject || data.email?.subject,
        body: data.body || data.email_data?.body || data.email?.body
      };

      setGeneratedEmail(emailData);
      setEditedTo(lead.email);
      setEditedSubject(emailData.subject);
      setEditedBody(emailData.body);
    } catch (err) {
      console.error('Error generating email:', err);
      setError(err.message || 'Error connecting to server');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!generatedEmail) return;

    if (!validateEmail(editedTo)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!editedSubject.trim()) {
      setError('Please enter a subject line');
      return;
    }
    if (!editedBody.trim()) {
      setError('Please enter an email message');
      return;
    }

    try {
      setIsSending(true);
      setError('');

      // Use lead_id since that's the database column name
      const leadId = lead.lead_id;

      if (!leadId) {
        throw new Error('No valid lead ID found. Cannot send email without lead ID.');
      }

      const data = await leadsApiService.sendEmail(
        editedTo,
        editedSubject,
        editedBody,
        leadId
      );

      setSuccess(`Email sent successfully to ${data.sent_to}`);
      if (onEmailSent) {
        onEmailSent(data);
      }
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err.message || 'Error sending email');
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = () => {
    const fullEmail = `Subject: ${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(fullEmail);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Render content without modal wrapper if embedded
  const content = (
    <div className={embedded ? "h-full flex flex-col" : "bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"}>
      {/* Header - only show in non-embedded mode */}
      {!embedded && (
        <div className="flex items-center justify-end p-6 border-b">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

        <div className={`flex flex-col lg:flex-row ${embedded ? 'flex-1 h-full' : 'max-h-[calc(90vh-80px)]'}`}>
          {/* Left Panel - Email Generation */}
          <div className={`lg:w-1/3 p-6 border-r border-gray-200 ${embedded ? 'overflow-y-auto' : ''}`}>
            <div className="space-y-6">
              {/* Email Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Email Purpose (Optional)
                </label>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setEmailType(template.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        emailType === template.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.description}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setEmailType(null)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      emailType === null
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Edit3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium mb-1">Custom Only</div>
                        <div className="text-xs text-gray-500">
                          Generate based purely on your context
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Context
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any custom message or specific details..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateEmail}
                disabled={isGenerating || !lead.email || (emailType === null && !customMessage.trim())}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Email
                  </>
                )}
              </Button>

              {!lead.email && (
                <p className="text-sm text-red-600 mt-2">
                  No email address found for this lead
                </p>
              )}
            </div>
          </div>

          {/* Right Panel - Email Preview */}
          <div className={`lg:w-2/3 flex flex-col ${embedded ? 'flex-1' : ''}`}>
            <div className={`p-6 flex-1 ${embedded ? 'overflow-y-auto h-full' : 'overflow-y-auto'}`}>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">{success}</span>
                </Alert>
              )}

              {/* Smart Send Window Recommendation */}
              {smartSendWindow && (
                <Alert className={`mb-4 ${
                  smartSendWindow.has_recommendation
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {smartSendWindow.has_recommendation ? (
                      <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    )}
                    <div className={`text-sm ${
                      smartSendWindow.has_recommendation ? 'text-blue-900' : 'text-amber-900'
                    }`}>
                      {smartSendWindow.has_recommendation && (
                        <span className="font-medium">Best send time: </span>
                      )}
                      {smartSendWindow.message}
                    </div>
                  </div>
                </Alert>
              )}

              {generatedEmail ? (
                <div className="space-y-4">
                  {/* Email Actions */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Email Draft</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  {/* Email Content */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <input
                            type="email"
                            value={editedTo}
                            onChange={(e) => setEditedTo(e.target.value)}
                            placeholder="recipient@example.com"
                            className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={editedSubject}
                            onChange={(e) => setEditedSubject(e.target.value)}
                            placeholder="Email subject..."
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Body
                          </label>
                          {editedBody?.includes('<') && editedBody?.includes('>') ? (
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => setEditedBody(e.currentTarget.innerHTML)}
                              onInput={(e) => setEditedBody(e.currentTarget.innerHTML)}
                              dangerouslySetInnerHTML={{ __html: editedBody }}
                              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
                              style={{ whiteSpace: 'pre-wrap', minHeight: '288px', maxHeight: '400px' }}
                            />
                          ) : (
                            <textarea
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              placeholder="Email content..."
                              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={12}
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Generate Your Email
                  </h3>
                  <p className="text-gray-600">
                    Select an email type and click "Generate Email" to create a personalized message.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {generatedEmail && lead.email && (
              <div className={`p-6 border-t bg-gray-50 ${embedded ? 'flex-shrink-0' : ''}`}>
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendEmail}
                    disabled={isSending}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );

  // Return either embedded content or modal
  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {content}
      </motion.div>
    </div>
  );
};

export default LeadEmailComposer;
