import React, { useState, useEffect } from 'react';
import {
  Mail,
  User,
  MessageSquare,
  Calendar,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Copy,
  Send,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../../auth/hooks/useAuth';

const CustomerEmailComposer = ({ customer, onClose, onEmailSent, embedded = false, dealId = null, smartSendWindow: propSmartSendWindow = null }) => {
  const { authFetch } = useAuth();
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  const [emailForm, setEmailForm] = useState({
    emailType: null,
    message: '',
    generatedEmail: null,
    editedTo: '',
    editedSubject: '',
    editedBody: ''
  });
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [smartSendWindow, setSmartSendWindow] = useState(propSmartSendWindow);
  const [loadingSmartWindow, setLoadingSmartWindow] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Update smartSendWindow when prop changes
  useEffect(() => {
    if (propSmartSendWindow) {
      console.log('[SmartSendWindow] Using pre-fetched data from parent');
      setSmartSendWindow(propSmartSendWindow);
    }
  }, [propSmartSendWindow]);

  const generateEmail = async () => {
    setIsEmailSending(true);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/generate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          email_type: emailForm.emailType,
          custom_prompt: emailForm.message
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEmailForm({
          ...emailForm,
          generatedEmail: {
            subject: data.email_data?.subject || `Follow up regarding ${customer.company}`,
            body: data.email_data?.body || `Hi ${customer.primaryContact || 'there'},\n\nI hope this email finds you well.\n\nBest regards,\n[Your Name]`,
            to: customer.email
          },
          editedTo: customer.email,
          editedSubject: data.email_data?.subject || `Follow up regarding ${customer.company}`,
          editedBody: data.email_data?.body || `Hi ${customer.primaryContact || 'there'},\n\nI hope this email finds you well.\n\nBest regards,\n[Your Name]`
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate email');
      }
    } catch (error) {
      console.error('Email generation error:', error);
      alert('Failed to generate email: ' + error.message);
    } finally {
      setIsEmailSending(false);
    }
  };

  const sendEmail = async () => {
    if (!emailForm.generatedEmail) {
      alert('Please generate an email first');
      return;
    }

    if (!validateEmail(emailForm.editedTo)) {
      alert('Please enter a valid email address');
      return;
    }
    if (!emailForm.editedSubject.trim()) {
      alert('Please enter a subject line');
      return;
    }
    if (!emailForm.editedBody.trim()) {
      alert('Please enter an email message');
      return;
    }

    setIsEmailSending(true);
    try {
      console.log('Sending email from CustomerEmailComposer...');

      const authProvider = localStorage.getItem('auth_provider');
      const accessToken = authProvider === 'google' ? localStorage.getItem('google_access_token') : null;

      const emailData = {
        to_email: emailForm.editedTo,
        subject: emailForm.editedSubject,
        body: emailForm.editedBody,
        customer_id: customer.id,
        ...(dealId && { deal_id: dealId }),
        provider: authProvider === 'google' ? 'gmail' : null,
        access_token: accessToken
      };

      console.log('Sending email with data:', emailData);

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });

      const data = await response.json();
      console.log('Send email response:', data);

      if (response.ok) {
        alert(`Email sent successfully to ${data.sent_to}`);
        if (onEmailSent) {
          onEmailSent(data);
        }
        onClose();
      } else {
        alert(`Failed to send email: ${data.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error.message}`);
    } finally {
      setIsEmailSending(false);
    }
  };

  const copyToClipboard = () => {
    const fullEmail = `Subject: ${emailForm.editedSubject}\n\n${emailForm.editedBody}`;
    navigator.clipboard.writeText(fullEmail);
    alert('Copied to clipboard!');
  };

  const content = (
    <div className={embedded ? "h-full flex flex-col" : ""}>
      <div className="flex flex-col lg:flex-row flex-1 h-full">
        {/* Left Panel - Email Composer */}
        <div className="lg:w-1/3 p-6 border-r border-gray-200 overflow-y-auto bg-gray-50">
          <div className="space-y-6">
            {/* Email Type Selection - Only Follow Up and Meeting Request */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Email Purpose (Optional)
              </label>
              <div className="space-y-3">
                {[
                  { id: 'follow_up', name: 'Follow Up', description: 'Follow up on previous contact or conversation', icon: MessageSquare },
                  { id: 'meeting_request', name: 'Meeting Request', description: 'Request a meeting or schedule a demo', icon: Calendar }
                ].map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setEmailForm({...emailForm, emailType: template.id})}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        emailForm.emailType === template.id
                          ? 'border-pink-600 bg-pink-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          emailForm.emailType === template.id
                            ? 'bg-pink-100'
                            : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            emailForm.emailType === template.id
                              ? 'text-pink-600'
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium mb-1 ${
                            emailForm.emailType === template.id
                              ? 'text-pink-700'
                              : 'text-gray-900'
                          }`}>
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={() => setEmailForm({...emailForm, emailType: null})}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    emailForm.emailType === null
                      ? 'border-pink-600 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-pink-100">
                      <Edit3 className="w-5 h-5 text-pink-600" />
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
                value={emailForm.message}
                onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                placeholder="Add specific details, topics to discuss, or any context for the AI to include..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none bg-white"
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-2">
                This context will help generate a more personalized email
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateEmail}
              disabled={isEmailSending || (!customer.email && !customer.primaryContact) || (emailForm.emailType === null && !emailForm.message.trim())}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
            >
              {isEmailSending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating Email...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate with AI
                </>
              )}
            </button>

            {!customer.email && !customer.primaryContact && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No email address found for this customer
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Email Preview */}
        <div className="lg:w-2/3 flex flex-col flex-1">
          <div className="p-6 flex-1 overflow-y-auto h-full">
            {/* Smart Send Window Recommendation */}
            {smartSendWindow && (
              <div className={`mb-4 border rounded-lg p-4 ${
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
              </div>
            )}

            {emailForm.generatedEmail ? (
              <div className="space-y-4">
                {/* Email Actions */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Email Draft</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </div>

                {/* Email Content */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <input
                          type="email"
                          value={emailForm.editedTo}
                          onChange={(e) => setEmailForm({...emailForm, editedTo: e.target.value})}
                          placeholder="recipient@example.com"
                          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={emailForm.editedSubject}
                          onChange={(e) => setEmailForm({...emailForm, editedSubject: e.target.value})}
                          placeholder="Email subject..."
                          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Body
                        </label>
                        {emailForm.editedBody?.includes('<') && emailForm.editedBody?.includes('>') ? (
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setEmailForm({...emailForm, editedBody: e.currentTarget.innerHTML})}
                            onInput={(e) => setEmailForm({...emailForm, editedBody: e.currentTarget.innerHTML})}
                            dangerouslySetInnerHTML={{ __html: emailForm.editedBody }}
                            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-600 overflow-y-auto"
                            style={{ whiteSpace: 'pre-wrap', minHeight: '288px', maxHeight: '400px' }}
                          />
                        ) : (
                          <textarea
                            value={emailForm.editedBody}
                            onChange={(e) => setEmailForm({...emailForm, editedBody: e.target.value})}
                            placeholder="Email content..."
                            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-600 resize-none"
                            rows={12}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
          {emailForm.generatedEmail && (customer.email || customer.primaryContact) && (
            <div className="p-6 border-t bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmail}
                  disabled={isEmailSending}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  {isEmailSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {content}
      </div>
    </div>
  );
};

export default CustomerEmailComposer;
