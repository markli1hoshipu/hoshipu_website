/**
 * TemplateEditor Component
 * Right panel for creating/editing email templates
 * Includes AI generation capability
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/primitives/button';
import { Input } from '../ui/primitives/input';
import { Textarea } from '../ui/primitives/textarea';
import { Label } from '../ui/primitives/label';
import { TokenInserter } from './TokenInserter';
import { templateApi } from '../../services/templateApi';
import toast from 'react-hot-toast';
import { Save, Sparkles, RefreshCw, Users } from 'lucide-react';

export function TemplateEditor({ template, userEmail, onSave, templateType = 'crm' }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiSection, setShowAiSection] = useState(false);

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  // Load template data when editing
  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setSubject(template.subject || '');
      setBody(template.body || '');
      setDescription(template.description || '');
      // Use is_shared field from backend
      setIsShared(template.is_shared || false);
    } else {
      // Reset form for new template
      setName('');
      setSubject('');
      setBody('');
      setDescription('');
      setIsShared(false);  // Default to personal
    }
  }, [template]);

  const insertToken = (textareaRef, token) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + token + text.substring(end);

    if (textareaRef === subjectRef) {
      setSubject(newText);
    } else {
      setBody(newText);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + token.length;
    }, 0);
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!userEmail) {
      toast.error('User email not available');
      return;
    }

    setIsGenerating(true);

    try {
      const result = await templateApi.generateTemplate(aiPrompt, userEmail, templateType);

      // Pre-fill the subject and body fields
      setSubject(result.subject);
      setBody(result.body);

      setShowAiSection(false);
      setAiPrompt('');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error(error.message || 'Failed to generate template');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userEmail) {
      toast.error('User email not available');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        name,
        subject,
        body,
        description,
        channel: "email",
        template_type: templateType,
        is_shared: isShared
      };

      if (template) {
        await templateApi.updateTemplate(template.id, data, userEmail);
      } else {
        await templateApi.createTemplate(data, userEmail);
      }

      onSave?.();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-4">
            {/* AI Generation Section */}
            {!template && (
              <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <Label className="text-sm font-semibold text-purple-900">AI Template Generator</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAiSection(!showAiSection)}
                  >
                    {showAiSection ? 'Hide' : 'Show'}
                  </Button>
                </div>

                {showAiSection && (
                  <div className="space-y-3">
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe the email template you want to create... e.g., 'A friendly follow-up email to check in on customers we haven't spoken to in a while'"
                      rows={3}
                      className="resize-none bg-white"
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating || !aiPrompt.trim()}
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-purple-700">
                      AI will generate a template with tokens like {templateType === 'crm' ? '[name], [primary_contact], [industry]' : '[company], [location], [industry]'} that you can customize.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <Label htmlFor="template-name" className="text-lg font-semibold mb-2 block">Template Name *</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Follow-up Check-in"
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of when to use this template"
                rows={2}
                className="mt-1 resize-none"
              />
            </div>

            {/* Share Template Option */}
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-shared"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  disabled={template && template.is_shared}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Label htmlFor="is-shared" className="cursor-pointer flex items-center gap-2 mb-0">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">Share with all users</span>
                </Label>
              </div>
              <p className="text-xs text-gray-600 mt-2 ml-6">
                {isShared
                  ? "This template will be visible to all users in your organization (read-only for others)"
                  : "This template will only be visible to you"
                }
              </p>
              {template && template.is_shared && (
                <p className="text-xs text-amber-600 mt-2 ml-6 flex items-center gap-1">
                  <span className="font-medium">⚠️</span> Cannot change sharing status of existing shared templates
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="template-subject">Subject *</Label>
              <Input
                ref={subjectRef}
                id="template-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Email subject line"
                className="mt-1"
              />
              <div className="mt-2">
                <TokenInserter onInsert={(token) => insertToken(subjectRef, token)} />
              </div>
            </div>

            <div>
              <Label htmlFor="template-body">Body *</Label>
              <Textarea
                ref={bodyRef}
                id="template-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                placeholder="Email body text..."
                rows={16}
                className="mt-1 font-mono text-sm resize-none"
              />
              <div className="mt-2">
                <TokenInserter onInsert={(token) => insertToken(bodyRef, token)} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Available tokens: {templateType === 'crm'
                  ? '[name], [primary_contact], [industry], [email], [phone]'
                  : '[company], [location], [industry], [website], [phone]'
                }
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white pb-2 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default TemplateEditor;
