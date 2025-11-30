import { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  RefreshCw,
  Braces,
  Bold,
  Italic,
  Underline,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../primitives/button';
import { Label } from '../primitives/label';
import { Textarea } from '../primitives/textarea';
import { Card } from '../primitives/card';
import { Input } from '../primitives/input';
import { Toggle } from '../primitives/toggle';
import { Separator } from '../primitives/separator';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { Alert, AlertDescription } from '../primitives/alert';
import { Tabs, TabsList, TabsTrigger } from '../primitives/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../primitives/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';

const MassEmailComposerUI = ({
  title,
  columns,
  templates,
  recipientLabel,
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
  canUsePersonalized,
  currentSubject,
  currentBody,
  hasGeneratedContent,
  recipients,
  handleRemoveRecipient,
  handleAddRecipient,
  allRecipients,
  handleGenerateEmail,
  handleSendEmails,
  handleSubjectChange,
  handleBodyChange,
  handleInsertColumn,
  truncateCompanyName,
  bodyTextareaRef,
  subjectInputRef,
  onClose,
  onEmailsSent,
  getCompanyName,
  getCompanyEmail,
  // CRM-specific: Saved template selection
  useSavedTemplates = false,
  savedTemplates = [],
  selectedSavedTemplate = null,
  onSavedTemplateSelect,
  // Writing style tracking
  modifiedEmailIndices = new Set(),
}) => {
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [editableToEmail, setEditableToEmail] = useState('');
  const recipientInputRef = useRef(null);

  // Formatting state
  const [linkPopover, setLinkPopover] = useState({
    isOpen: false,
    url: '',
    text: ''
  });
  const [selection, setSelection] = useState(null);

  // Update contentEditable when external content changes (use hook's refs)
  useEffect(() => {
    if (subjectInputRef.current && document.activeElement !== subjectInputRef.current) {
      subjectInputRef.current.textContent = currentSubject || '';
    }
  }, [currentSubject, activeEmailIndex, subjectInputRef]);

  useEffect(() => {
    if (bodyTextareaRef.current && document.activeElement !== bodyTextareaRef.current) {
      const content = currentBody || '';
      // Always convert \n to <br> for proper line break rendering
      // This handles plain text, mixed content (text + HTML signature), and pure HTML
      const htmlContent = content.replace(/\n/g, '<br>');
      bodyTextareaRef.current.innerHTML = htmlContent;
    }
  }, [currentBody, activeEmailIndex, bodyTextareaRef]);

  const handleSend = async () => {
    try {
      const result = await handleSendEmails();
      if (onEmailsSent && result) {
        onEmailsSent(result);
      }
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      // Error handled in hook
    }
  };

  const filteredRecipients = allRecipients.filter(
    r => !recipients.find(selected => selected.id === r.id)
  ).filter(r => {
    if (!recipientSearch) return false;
    const search = recipientSearch.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(search)) ||
      (r.email && r.email.toLowerCase().includes(search)) ||
      (r.company && r.company.toLowerCase().includes(search))
    );
  });

  const handleRecipientInputChange = (e) => {
    const value = e.target.value;
    setRecipientSearch(value);
    setShowRecipientDropdown(value.length > 0);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRecipientInputKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && recipientSearch.trim()) {
      e.preventDefault();
      const email = recipientSearch.trim();

      if (isValidEmail(email)) {
        handleAddRecipient({
          id: `custom_${Date.now()}`,
          email: email,
          name: email,
          company: email
        });
        setRecipientSearch('');
        setShowRecipientDropdown(false);
      }
    } else if (e.key === 'Backspace' && recipientSearch === '' && recipients.length > 0) {
      handleRemoveRecipient(recipients[recipients.length - 1].id);
    }
  };

  const handleSelectRecipient = (recipient) => {
    handleAddRecipient(recipient);
    setRecipientSearch('');
    setShowRecipientDropdown(false);
    recipientInputRef.current?.focus();
  };

  // Formatting helper functions
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSelection(sel.getRangeAt(0).cloneRange());
    }
  };

  const restoreSelection = () => {
    if (selection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selection);
    }
  };

  const executeCommand = (command, value) => {
    document.execCommand(command, false, value);
    bodyTextareaRef.current?.focus();
    const htmlContent = bodyTextareaRef.current?.innerHTML || '';
    // Convert <br> tags back to newlines for storage/sending
    // Keep actual HTML tags from signatures, only convert line break elements
    const plainContent = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div>\n?/gi, '\n')
      .replace(/<\/div>/gi, '');
    handleBodyChange(plainContent);
  };

  const handleBold = () => executeCommand('bold');
  const handleItalic = () => executeCommand('italic');
  const handleUnderline = () => executeCommand('underline');

  const handleAlignment = (alignment) => {
    executeCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
  };

  const isCommandActive = (command) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const handleLinkClick = () => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      setLinkPopover({
        isOpen: true,
        url: '',
        text: sel.toString()
      });
      saveSelection();
    } else {
      setLinkPopover({
        isOpen: true,
        url: '',
        text: ''
      });
      saveSelection();
    }
  };

  const insertLink = () => {
    if (linkPopover.url) {
      restoreSelection();
      if (linkPopover.text && !window.getSelection()?.toString()) {
        const linkHtml = `<a href="${linkPopover.url}" style="color: #3b82f6; text-decoration: underline;">${linkPopover.text}</a>`;
        executeCommand('insertHTML', linkHtml);
      } else {
        executeCommand('createLink', linkPopover.url);
        const links = bodyTextareaRef.current?.querySelectorAll('a');
        if (links && links.length > 0) {
          const lastLink = links[links.length - 1];
          lastLink.style.color = '#3b82f6';
          lastLink.style.textDecoration = 'underline';
        }
      }
    }
    setLinkPopover({ isOpen: false, url: '', text: '' });
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleBold();
          break;
        case 'i':
          e.preventDefault();
          handleItalic();
          break;
        case 'u':
          e.preventDefault();
          handleUnderline();
          break;
        case 'k':
          e.preventDefault();
          handleLinkClick();
          break;
      }
    }
  };

  const currentToEmail = emailMode === 'personalized' && personalizedEmails.length > 0
    ? getCompanyEmail(personalizedEmails[activeEmailIndex])
    : '';

  // Override hasGeneratedContent for saved templates
  const effectiveHasGeneratedContent = (useSavedTemplates && selectedSavedTemplate) ? true : hasGeneratedContent;

  // Handle contentEditable for subject
  const handleSubjectInput = (e) => {
    const newContent = e.currentTarget.textContent || '';
    handleSubjectChange(newContent);
  };

  // Handle contentEditable for body
  const handleBodyInput = (e) => {
    const htmlContent = e.currentTarget.innerHTML || '';
    // Convert <br> tags back to newlines for storage/sending
    // Keep actual HTML tags from signatures, only convert line break elements
    const plainContent = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div>\n?/gi, '\n')
      .replace(/<\/div>/gi, '');
    handleBodyChange(plainContent);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-full w-full h-[95vh] p-0 flex flex-col" onClose={onClose}>
        <DialogHeader className="p-6 border-b flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left Panel */}
          <div className="lg:w-1/3 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Recipients Input */}
              <div>
                <Label className="mb-2 block">To</Label>
                <div className="relative">
                  <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-ring bg-background min-h-[42px]">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-md"
                      >
                        <span className="max-w-[150px] truncate">
                          {recipient.name || recipient.email}
                        </span>
                        <button
                          onClick={() => handleRemoveRecipient(recipient.id)}
                          className="hover:bg-blue-200 rounded-sm p-0.5"
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <input
                      ref={recipientInputRef}
                      type="text"
                      value={recipientSearch}
                      onChange={handleRecipientInputChange}
                      onKeyDown={handleRecipientInputKeyDown}
                      onFocus={() => recipientSearch && setShowRecipientDropdown(true)}
                      placeholder={recipients.length === 0 ? "Type name or email..." : ""}
                      className="flex-1 min-w-[150px] outline-none text-sm bg-transparent"
                    />
                  </div>

                  {showRecipientDropdown && filteredRecipients.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowRecipientDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-20 max-h-60 overflow-y-auto">
                        {filteredRecipients.slice(0, 20).map((recipient) => (
                          <button
                            key={recipient.id}
                            onClick={() => handleSelectRecipient(recipient)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex flex-col"
                            type="button"
                          >
                            <span className="font-medium text-sm">{recipient.name || recipient.company}</span>
                            <span className="text-xs text-gray-500">{recipient.email}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{recipients.length} selected</p>
              </div>

              {/* Mode Selection */}
              <div>
                <Label className="mb-3 block">Mode</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setEmailMode('template')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      emailMode === 'template'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    type="button"
                  >
                    <div className="font-medium">Template</div>
                    <div className="text-xs text-gray-500 mt-1">One email • Fast</div>
                  </button>
                  <button
                    onClick={() => canUsePersonalized && setEmailMode('personalized')}
                    disabled={!canUsePersonalized}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      emailMode === 'personalized'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : canUsePersonalized
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                    type="button"
                  >
                    <div className="font-medium">Personalized {!canUsePersonalized && '(Max 50)'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {canUsePersonalized ? 'Unique per recipient' : `⚠️ Max 50. Currently: ${recipients.length}`}
                    </div>
                  </button>
                </div>
              </div>

              {/* Template Selection (CRM) or AI Generation (Lead Gen) */}
              {emailMode === 'template' && useSavedTemplates ? (
                /* CRM: Saved Template Selection */
                <div>
                  <Label className="mb-3 block">Select Template</Label>
                  <select
                    value={selectedSavedTemplate?.id || ''}
                    onChange={(e) => {
                      const template = savedTemplates.find(t => t.id === e.target.value);
                      onSavedTemplateSelect?.(template);
                      if (template) {
                        handleSubjectChange(template.subject);
                        handleBodyChange(template.body);
                      }
                    }}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Choose a template...</option>
                    {savedTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {selectedSavedTemplate && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-900 font-medium">
                        {selectedSavedTemplate.description || 'No description'}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        ✓ {selectedSavedTemplate.performance_stats?.total_sends || 0} sends •{' '}
                        {selectedSavedTemplate.performance_stats?.success_rate?.toFixed(1) || 100}% success
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Lead Gen: AI Generation */
                <>
                  {/* Purpose */}
                  <div>
                    <Label className="mb-3 block">Purpose</Label>
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
                          type="button"
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Context */}
                  <div>
                    <Label htmlFor="context" className="mb-2 block">Context</Label>
                    <Textarea
                      id="context"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Add context..."
                      className="resize-none border-gray-200"
                      rows={4}
                    />
                  </div>

                  {/* Generate */}
                  <Button
                    onClick={handleGenerateEmail}
                    disabled={isGenerating || recipients.length === 0}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {generationProgress || 'Generating...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:w-2/3 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="mb-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {effectiveHasGeneratedContent ? (
                <div className="space-y-4">
                  {/* Personalized: Tabs */}
                  {emailMode === 'personalized' && personalizedEmails.length > 0 && (
                    <>
                      <Tabs
                        value={activeEmailIndex.toString()}
                        onValueChange={(value) => setActiveEmailIndex(parseInt(value))}
                      >
                        <TabsList className="w-full justify-start overflow-x-auto">
                          {personalizedEmails.map((email, index) => (
                            <TabsTrigger
                              key={index}
                              value={index.toString()}
                              className="whitespace-nowrap relative"
                            >
                              {truncateCompanyName(getCompanyName(email))}
                              {modifiedEmailIndices.has(index) && (
                                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-teal-700 bg-teal-100 rounded-full">
                                  ✓
                                </span>
                              )}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                      {modifiedEmailIndices.size > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm">
                          <Sparkles className="h-4 w-4 text-teal-600" />
                          <span className="text-teal-900 font-medium">
                            {modifiedEmailIndices.size} email{modifiedEmailIndices.size !== 1 ? 's' : ''} edited - writing style will be updated
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Email Preview Container */}
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    {/* To Field (Editable in personalized mode) */}
                    {emailMode === 'personalized' && personalizedEmails.length > 0 && (
                      <div className="flex items-center gap-2 text-sm pb-2 border-b">
                        <span className="text-gray-500 font-medium">To:</span>
                        <input
                          type="email"
                          value={editableToEmail || currentToEmail}
                          onChange={(e) => setEditableToEmail(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-gray-900"
                          placeholder="recipient@email.com"
                        />
                      </div>
                    )}

                    {/* Subject */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 mb-1 block">Subject</Label>
                      <div
                        ref={subjectInputRef}
                        contentEditable
                        onInput={handleSubjectInput}
                        onFocus={() => setInsertTarget('subject')}
                        suppressContentEditableWarning
                        className="w-full p-4 border border-gray-200 rounded-md bg-white text-foreground text-base min-h-[56px] outline-none focus:ring-2 focus:ring-blue-500 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                        data-placeholder="Subject..."
                      />
                    </div>

                    {/* Body */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500 mb-1 block">Body</Label>

                      {/* Formatting Toolbar */}
                      <Card className="p-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Text Formatting Group */}
                          <div className="flex items-center gap-1">
                            <Toggle
                              pressed={isCommandActive('bold')}
                              onPressedChange={handleBold}
                              size="sm"
                              aria-label="Bold"
                            >
                              <Bold className="h-4 w-4" />
                            </Toggle>
                            <Toggle
                              pressed={isCommandActive('italic')}
                              onPressedChange={handleItalic}
                              size="sm"
                              aria-label="Italic"
                            >
                              <Italic className="h-4 w-4" />
                            </Toggle>
                            <Toggle
                              pressed={isCommandActive('underline')}
                              onPressedChange={handleUnderline}
                              size="sm"
                              aria-label="Underline"
                            >
                              <Underline className="h-4 w-4" />
                            </Toggle>
                          </div>

                          <Separator orientation="vertical" className="h-6" />

                          {/* Alignment Group */}
                          <div className="flex items-center gap-1">
                            <Toggle
                              pressed={isCommandActive('justifyLeft')}
                              onPressedChange={() => handleAlignment('left')}
                              size="sm"
                              aria-label="Align Left"
                            >
                              <AlignLeft className="h-4 w-4" />
                            </Toggle>
                            <Toggle
                              pressed={isCommandActive('justifyCenter')}
                              onPressedChange={() => handleAlignment('center')}
                              size="sm"
                              aria-label="Align Center"
                            >
                              <AlignCenter className="h-4 w-4" />
                            </Toggle>
                            <Toggle
                              pressed={isCommandActive('justifyRight')}
                              onPressedChange={() => handleAlignment('right')}
                              size="sm"
                              aria-label="Align Right"
                            >
                              <AlignRight className="h-4 w-4" />
                            </Toggle>
                          </div>

                          <Separator orientation="vertical" className="h-6" />

                          {/* Link Insertion */}
                          <Popover
                            open={linkPopover.isOpen}
                            onOpenChange={(open) => setLinkPopover(prev => ({ ...prev, isOpen: open }))}
                          >
                            <PopoverTrigger asChild>
                              <Toggle
                                pressed={false}
                                onPressedChange={handleLinkClick}
                                size="sm"
                                aria-label="Insert Link"
                              >
                                <Link className="h-4 w-4" />
                              </Toggle>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="link-text">Link Text</Label>
                                  <Input
                                    id="link-text"
                                    value={linkPopover.text}
                                    onChange={(e) => setLinkPopover(prev => ({ ...prev, text: e.target.value }))}
                                    placeholder="Display text"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="link-url">URL</Label>
                                  <Input
                                    id="link-url"
                                    value={linkPopover.url}
                                    onChange={(e) => setLinkPopover(prev => ({ ...prev, url: e.target.value }))}
                                    placeholder="https://example.com"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={insertLink} size="sm">Insert Link</Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLinkPopover({ isOpen: false, url: '', text: '' })}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </Card>

                      {/* Body Editor */}
                      <div
                        ref={bodyTextareaRef}
                        contentEditable
                        onInput={handleBodyInput}
                        onKeyDown={handleKeyDown}
                        onBlur={saveSelection}
                        onFocus={() => setInsertTarget('body')}
                        suppressContentEditableWarning
                        className="p-4 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] overflow-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                        data-placeholder="Email body..."
                      />

                      {/* Placeholder Legend (Template Mode Only) */}
                      {emailMode === 'template' && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                          <span>💡 Placeholders:</span>
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-mono">
                            [{columns[0]?.id}]
                          </span>
                          <span className="text-gray-400">AI-generated</span>
                          <span className="text-gray-300">•</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-mono">
                            {`{${columns[0]?.id}}`}
                          </span>
                          <span className="text-gray-400">Your placeholders</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insert Field */}
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                        >
                          <Braces className="w-4 h-4 mr-2" />
                          Insert Field
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {columns.map((col) => (
                          <DropdownMenuItem
                            key={col.id}
                            onClick={() => handleInsertColumn(col.id)}
                            className="flex flex-col items-start cursor-pointer"
                          >
                            <span className="font-medium">{col.label}</span>
                            {col.description && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {col.description}
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="text-xs text-gray-500">Click in subject or body, then insert</span>
                  </div>

                  {emailMode === 'personalized' && (
                    <div className="text-sm text-gray-600">
                      ✓ {personalizedEmails.length}/{recipients.length} ready
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
                  <p className="text-gray-600 text-sm">
                    {recipients.length === 0 ? 'Add recipients above' : 'Click Generate to create emails'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {effectiveHasGeneratedContent && (
              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button
                    onClick={handleSend}
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
                        Send to {recipients.length}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MassEmailComposerUI;
