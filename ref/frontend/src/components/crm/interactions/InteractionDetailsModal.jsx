import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Users,
  MessageSquare,
  Building,
  ArrowRight,
  FileText,
  Star,
  Trash2,
  RefreshCw,
  Edit3,
  Save,
  XCircle,
  Send,
  Download,
  Reply,
  CornerDownRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/primitives/dialog';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * InteractionDetailsModal - Enhanced with shadcn Dialog primitive
 *
 * Now uses shadcn's Dialog for better accessibility and consistency.
 * Supports both old (isOpen/onClose) and new (open/onOpenChange) prop names for backward compatibility.
 *
 * @param {object} event - Event/interaction object to display
 * @param {object} customer - Customer object
 * @param {object} deal - Optional deal object for deal context
 * @param {boolean} open - Whether the modal is visible (new prop name)
 * @param {boolean} isOpen - Legacy prop name (backward compatibility)
 * @param {function} onOpenChange - Callback when modal state changes (new prop name)
 * @param {function} onClose - Legacy callback (backward compatibility)
 * @param {array} notes - Array of notes linked to this interaction
 * @param {array} customerInteractions - Array of customer interactions
 * @param {function} onDelete - Callback to delete interaction
 * @param {function} onUpdate - Callback when interaction is updated
 * @param {function} authFetch - Authentication fetch function
 */
const InteractionDetailsModal = ({
  event,
  customer,
  deal, // Optional: for deal context
  open,
  isOpen, // Legacy prop
  onOpenChange,
  onClose, // Legacy prop
  notes = [],
  customerInteractions = [],
  onDelete,
  onUpdate,
  authFetch
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Determine context (customer or deal)
  const contextId = deal ? deal.deal_id : customer?.id;
  const contextType = deal ? 'deal' : 'customer';
  const contextName = deal ? deal.deal_name : customer?.name;

  // Support both new (open) and legacy (isOpen) prop names
  const modalOpen = open !== undefined ? open : isOpen;

  // Support both new (onOpenChange) and legacy (onClose) callbacks
  const handleOpenChange = (newOpen) => {
    if (!newOpen && !isSaving && !isDeleting && !isEditing) {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else if (onClose) {
        onClose();
      }
    }
  };

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTheme, setEditedTheme] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // State for expandable previous messages
  const [expandedMessages, setExpandedMessages] = useState({});

  // State for expandable main message
  const [isMainMessageExpanded, setIsMainMessageExpanded] = useState(false);

  // State for expandable previous messages section
  const [isPreviousMessagesExpanded, setIsPreviousMessagesExpanded] = useState(false);

  const MAX_THEME_LENGTH = 50;
  const MAX_CONTENT_LENGTH = 5000;

  // Check if this is a call event
  const isCallEvent = event?.originalType === 'call';

  // Check if this is an email event
  const isEmailEvent = event?.originalType === 'email';

  // Initialize edit fields when event changes
  useEffect(() => {
    if (event && modalOpen && isCallEvent) {
      setEditedTheme(event.metadata?.theme || event.title || '');
      setEditedContent(event.description || '');
      setIsEditing(false);
      setError('');
    }
  }, [event, modalOpen, isCallEvent]);

  // Early return AFTER all hooks
  if (!event) return null;

  // Get notes linked to this interaction - try multiple possible ID fields
  const interactionId = event.metadata?.interactionId || event.id || event.metadata?.interaction_id;

  const linkedNotes = notes.filter(note => note.interaction_id === interactionId);

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const formatNoteDate = (date) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(parsedDate);
  };

  // Helper function to check if note is starred
  const isNoteStarred = (star) => {
    return star === 'important' || star === 'urgent' || star === 'starred';
  };

  // Helper function to get star display text
  const getStarDisplayText = (star) => {
    switch(star) {
      case 'important': return 'Important';
      case 'urgent': return 'Urgent';
      case 'starred': return 'Starred';
      default: return '';
    }
  };

  // Enhanced email content parser with better thread detection
  // Now supports parsing MULTIPLE previous messages in a thread
  const parseEmailContent = (content, subject) => {
    if (!content) return {
      newReply: '',
      signature: '',
      quotedReplies: []
    };

    // IMPORTANT: Remove "Subject: [subject]\n\n" prefix if present
    // Backend concatenates subject and body, but we display them separately
    let cleanedContent = content;
    if (subject && content.startsWith('Subject: ')) {
      const subjectLine = `Subject: ${subject}`;
      if (content.startsWith(subjectLine)) {
        cleanedContent = content.substring(subjectLine.length).trim();
      }
    }

    // Common patterns for quoted/original emails with more comprehensive detection
    // Includes international patterns (Chinese, Japanese, etc.)
    const quotedPatterns = [
      {
        pattern: /\n\s*On .+?wrote:\s*\n/gi, // Changed to global flag
        type: 'gmail',
        extractSender: (match) => {
          const senderMatch = match.match(/On .+?, (.+?) <(.+?)> wrote:/i);
          return senderMatch ? { name: senderMatch[1], email: senderMatch[2] } : null;
        }
      },
      {
        // Chinese Gmail pattern: "张三 于2025年11月11日周二 11:40写道："
        // Matches: [name] 于[YYYY]年[MM]月[DD]日[weekday] [HH:MM]写道：
        pattern: /\n\s*.+?于\d{4}年\d{1,2}月\d{1,2}日.+?写道[：:]\s*\n/g,
        type: 'gmail-chinese',
        extractSender: (match) => {
          // Extract sender name before "于"
          const senderMatch = match.match(/\n\s*(.+?)\s*于\d{4}年/);
          return senderMatch ? { name: senderMatch[1].trim(), email: null } : null;
        }
      },
      {
        // Japanese Gmail pattern: "2025年11月11日(火) 11:40 <email@example.com>:"
        // Matches: [YYYY]年[MM]月[DD]日([weekday]) [HH:MM] <email>:
        pattern: /\n\s*\d{4}年\d{1,2}月\d{1,2}日.+?<(.+?)>.+?:\s*\n/g,
        type: 'gmail-japanese',
        extractSender: (match) => {
          const emailMatch = match.match(/<(.+?)>/);
          return emailMatch ? { name: null, email: emailMatch[1] } : null;
        }
      },
      {
        // Korean Gmail pattern: "2025년 11월 11일 (화) 오전/오후 11:40 <email> 작성:"
        // Matches: [YYYY]년 [MM]월 [DD]일 ... 작성:
        pattern: /\n\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일.+?작성[：:]\s*\n/g,
        type: 'gmail-korean',
        extractSender: (match) => {
          const emailMatch = match.match(/<(.+?)>/);
          return emailMatch ? { name: null, email: emailMatch[1] } : null;
        }
      },
      {
        // Spanish Gmail pattern: "El ... escribió:"
        // Matches: El [date] ... escribió:
        pattern: /\n\s*El\s+.+?escribió:\s*\n/gi,
        type: 'gmail-spanish',
        extractSender: (match) => {
          const senderMatch = match.match(/,\s*(.+?)\s*<(.+?)>\s*escribió:/i);
          return senderMatch ? { name: senderMatch[1], email: senderMatch[2] } : null;
        }
      },
      {
        // French Gmail pattern: "Le ... a écrit :"
        // Matches: Le [date] ... a écrit :
        pattern: /\n\s*Le\s+.+?a écrit\s*:\s*\n/gi,
        type: 'gmail-french',
        extractSender: (match) => {
          const senderMatch = match.match(/,\s*(.+?)\s*<(.+?)>\s*a écrit/i);
          return senderMatch ? { name: senderMatch[1], email: senderMatch[2] } : null;
        }
      },
      {
        // German Gmail pattern: "Am ... schrieb:"
        // Matches: Am [date] ... schrieb:
        pattern: /\n\s*Am\s+.+?schrieb:\s*\n/gi,
        type: 'gmail-german',
        extractSender: (match) => {
          const senderMatch = match.match(/,\s*(.+?)\s*<(.+?)>\s*schrieb:/i);
          return senderMatch ? { name: senderMatch[1], email: senderMatch[2] } : null;
        }
      },
      {
        pattern: /\n\s*From:.+?Sent:.+?To:/gis,
        type: 'outlook',
        extractSender: (match) => {
          const senderMatch = match.match(/From:\s*(.+?)\s*<(.+?)>/i);
          return senderMatch ? { name: senderMatch[1], email: senderMatch[2] } : null;
        }
      },
      {
        pattern: /\n\s*-+\s*Original Message\s*-+/gi,
        type: 'generic',
        extractSender: () => null
      },
      {
        pattern: /\n\s*_{5,}/g,
        type: 'separator',
        extractSender: () => null
      }
    ];

    let newReply = cleanedContent;
    let quotedReplies = [];

    // Find ALL quoted email patterns (not just the first one)
    let allMatches = [];

    for (const { pattern, type, extractSender } of quotedPatterns) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(cleanedContent)) !== null) {
        allMatches.push({
          index: match.index,
          matchText: match[0],
          type: type,
          extractSender: extractSender
        });
      }
    }

    // Sort matches by index to process them in order
    allMatches.sort((a, b) => a.index - b.index);

    if (allMatches.length > 0) {
      // The first match separates the new reply from quoted content
      const firstMatch = allMatches[0];
      newReply = cleanedContent.substring(0, firstMatch.index).trim();

      // Process each quoted section
      for (let i = 0; i < allMatches.length; i++) {
        const currentMatch = allMatches[i];
        const nextMatch = allMatches[i + 1];

        const startIndex = currentMatch.index;
        const endIndex = nextMatch ? nextMatch.index : cleanedContent.length;

        const quotedContent = cleanedContent.substring(startIndex, endIndex).trim();

        // Extract sender info if possible
        const sender = currentMatch.extractSender(currentMatch.matchText);

        // Clean up quoted content by removing ">" quote markers
        const cleanedQuoted = quotedContent
          .split('\n')
          .map(line => line.replace(/^\s*>\s?/, ''))
          .join('\n')
          .trim();

        // Only add if there's actual content (not just the header)
        if (cleanedQuoted.length > currentMatch.matchText.length) {
          quotedReplies.push({
            content: cleanedQuoted,
            sender: sender,
            type: currentMatch.type
          });
        }
      }
    }

    // Try to separate signature from new reply
    let signature = '';
    const signaturePatterns = [
      /\n\s*--\s*\n/,
      /\n\s*Best regards,?\s*\n/i,
      /\n\s*Sincerely,?\s*\n/i,
      /\n\s*Thanks,?\s*\n/i,
      /\n\s*Regards,?\s*\n/i,
      /\n\s*Cheers,?\s*\n/i,
      /\n\s*Thank you,?\s*\n/i
    ];

    for (const pattern of signaturePatterns) {
      const match = newReply.match(pattern);
      if (match) {
        const splitIndex = match.index;
        const potentialSignature = newReply.substring(splitIndex).trim();
        // Only treat as signature if it's reasonably short (< 300 chars)
        if (potentialSignature.length < 300) {
          signature = potentialSignature;
          newReply = newReply.substring(0, splitIndex).trim();
          break;
        }
      }
    }

    return { newReply, signature, quotedReplies };
  };

  const dateTime = formatDateTime(event.date);

  // Handle save edit for call events
  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      setError('Call summary content cannot be empty');
      return;
    }

    if (editedContent.length > MAX_CONTENT_LENGTH) {
      setError(`Content cannot exceed ${MAX_CONTENT_LENGTH} characters`);
      return;
    }

    if (editedTheme.length > MAX_THEME_LENGTH) {
      setError(`Theme cannot exceed ${MAX_THEME_LENGTH} characters`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Build API endpoint based on context
      const endpoint = contextType === 'deal'
        ? `${CRM_API_BASE_URL}/api/crm/deals/${contextId}/call-summaries/${interactionId}`
        : `${CRM_API_BASE_URL}/api/crm/customers/${contextId}/call-summaries/${interactionId}`;

      const response = await authFetch(
        endpoint,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: editedContent.trim(),
            theme: editedTheme.trim() || null
          }),
        }
      );

      if (response.ok) {
        const updatedCallSummary = await response.json();
        if (onUpdate) {
          await onUpdate(updatedCallSummary);
        }
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        setError('Failed to update call summary: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating call summary:', err);
      setError('Error updating call summary: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedTheme(event.metadata?.theme || event.title || '');
    setEditedContent(event.description || '');
    setIsEditing(false);
    setError('');
  };

  // Handle delete for call events
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this call summary?')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      // Build API endpoint based on context
      const endpoint = contextType === 'deal'
        ? `${CRM_API_BASE_URL}/api/crm/deals/${contextId}/call-summaries/${interactionId}`
        : `${CRM_API_BASE_URL}/api/crm/customers/${contextId}/call-summaries/${interactionId}`;

      const response = await authFetch(
        endpoint,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        if (onDelete) {
          await onDelete(interactionId);
        }
        onClose();
      } else {
        const errorData = await response.json();
        setError('Failed to delete call summary: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting call summary:', err);
      setError('Error deleting call summary: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get type-specific icon and styling
  const getTypeConfig = (type) => {
    switch (type) {
      case 'email':
        return {
          icon: Mail,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        };
      case 'call':
        return {
          icon: Phone,
          bgColor: 'bg-green-100',
          textColor: 'text-green-600',
          borderColor: 'border-green-200'
        };
      case 'meeting':
        return {
          icon: Users,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          icon: MessageSquare,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Helper function to get email direction badge
  const getEmailDirectionBadge = (direction) => {
    if (!direction) return null;

    const directionLower = direction.toLowerCase();

    if (directionLower === 'sent') {
      return {
        icon: Send,
        label: 'Sent',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        iconColor: 'text-green-600'
      };
    } else if (directionLower === 'received') {
      return {
        icon: Download,
        label: 'Received',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-600'
      };
    }

    return null;
  };

  const typeConfig = getTypeConfig(event.originalType);
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
              <TypeIcon className={`w-6 h-6 ${typeConfig.textColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                {/* Email Direction Badge */}
                {isEmailEvent && event.metadata?.direction && (() => {
                  const directionBadge = getEmailDirectionBadge(event.metadata.direction);
                  if (!directionBadge) return null;
                  return (
                    <div className={`px-2 py-1 ${directionBadge.bgColor} ${directionBadge.textColor} rounded-full text-xs font-medium`}>
                      {directionBadge.label}
                    </div>
                  );
                })()}
              </div>
              <p className="text-sm text-gray-500 capitalize">{event.originalType} Interaction</p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dateTime.date}</p>
                    <p className="text-xs text-gray-500">Date</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dateTime.time}</p>
                    <p className="text-xs text-gray-500">Time</p>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Participants
                </h3>
                
                {/* Email-specific sender/receiver logic */}
                {event.originalType === 'email' && event.metadata?.sourceName && event.metadata?.sourceType ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {event.metadata.sourceType === 'customer' ? event.metadata.sourceName : event.employeeName}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({event.metadata.sourceType === 'customer' ? 'Customer' : 'Employee'})
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {event.metadata.sourceType === 'customer' ? event.employeeName : customer?.company}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({event.metadata.sourceType === 'customer' ? 'Employee' : 'Customer'})
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{event.employeeName}</span>
                        <span className="text-xs text-gray-500">(Employee)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{customer?.company}</span>
                        <span className="text-xs text-gray-500">(Customer)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>



              {/* Interaction Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    {isEmailEvent ? 'Email Content' : 'Content'}
                  </h3>
                  {isCallEvent && !isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                </div>

                {/* Email-specific structured display with enhanced UI */}
                {isEmailEvent ? (
                  <div className="space-y-4">
                    {(() => {
                      const emailSubject = event.metadata?.subject || event.title || 'No Subject';
                      const { newReply, signature, quotedReplies } = parseEmailContent(
                        event.description,
                        emailSubject
                      );

                      return (
                        <AnimatePresence mode="wait">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            {/* Main Email Message with Integrated Subject */}
                            {newReply && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden"
                              >
                                {/* Subject with Sender Info and Timestamp */}
                                <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full ${
                                      event.metadata?.direction === 'sent'
                                        ? 'bg-green-100'
                                        : 'bg-blue-100'
                                    } flex items-center justify-center`}>
                                      {event.metadata?.direction === 'sent' ? (
                                        <Send className="w-3.5 h-3.5 text-green-600" />
                                      ) : (
                                        <Download className="w-3.5 h-3.5 text-blue-600" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {emailSubject}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {event.metadata?.from_email || 'Unknown'}
                                        {' • '}
                                        {dateTime.date} at {dateTime.time}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Email Content */}
                                <div className="px-5 py-4">
                                  <div className={`prose prose-sm max-w-none ${
                                    !isMainMessageExpanded && newReply.length > 500 ? 'line-clamp-6' : ''
                                  }`}>
                                    {newReply.includes('<') && newReply.includes('>') ? (
                                      <div
                                        className="text-sm text-gray-800 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: newReply }}
                                      />
                                    ) : (
                                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {newReply}
                                      </p>
                                    )}
                                  </div>

                                  {/* Expand/Collapse Button for Main Message */}
                                  {newReply.length > 500 && (
                                    <button
                                      onClick={() => setIsMainMessageExpanded(!isMainMessageExpanded)}
                                      className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                    >
                                      {isMainMessageExpanded ? (
                                        <>
                                          <ChevronUp className="w-3 h-3" />
                                          Show Less
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3 h-3" />
                                          Show More
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}

                            {/* Email Signature */}
                            {signature && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.15 }}
                                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Signature
                                  </span>
                                </div>
                                {signature.includes('<') && signature.includes('>') ? (
                                  <div
                                    className="text-xs text-gray-600 leading-relaxed italic"
                                    dangerouslySetInnerHTML={{ __html: signature }}
                                  />
                                ) : (
                                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed italic">
                                    {signature}
                                  </p>
                                )}
                              </motion.div>
                            )}

                            {/* Quoted/Previous Messages in Thread - Expandable Section */}
                            {quotedReplies.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-6 pt-4 border-t-2 border-gray-200"
                              >
                                {/* Expandable Header */}
                                <button
                                  onClick={() => setIsPreviousMessagesExpanded(!isPreviousMessagesExpanded)}
                                  className="flex items-center gap-2 mb-3 w-full hover:bg-gray-50 rounded p-2 -ml-2 transition-colors"
                                >
                                  {isPreviousMessagesExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  )}
                                  <CornerDownRight className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Previous Messages in Thread ({quotedReplies.length})
                                  </span>
                                </button>

                                {/* Expandable Content */}
                                {isPreviousMessagesExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                  >
                                    {quotedReplies.map((quoted, index) => {
                                      const isExpanded = expandedMessages[index];

                                      return (
                                        <motion.div
                                          key={index}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.05 + (index * 0.05) }}
                                          className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden"
                                        >
                                          {/* Subject with Sender Info and Timestamp - Same Design as Main Email */}
                                          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                                            <div className="flex items-center gap-2">
                                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                                <Mail className="w-3.5 h-3.5 text-gray-600" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="text-sm font-semibold text-gray-900">
                                                  {quoted.subject || emailSubject}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {quoted.sender?.email || 'Unknown'}
                                                  {quoted.date && (
                                                    <>
                                                      {' • '}
                                                      {quoted.date}
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Email Content */}
                                          <div className="px-5 py-4">
                                            <div className={`prose prose-sm max-w-none ${
                                              !isExpanded && quoted.content.length > 500 ? 'line-clamp-6' : ''
                                            }`}>
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                {quoted.content}
                                              </p>
                                            </div>

                                            {/* Expand/Collapse Button for Individual Message */}
                                            {quoted.content.length > 500 && (
                                              <button
                                                onClick={() => setExpandedMessages(prev => ({
                                                  ...prev,
                                                  [index]: !prev[index]
                                                }))}
                                                className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                              >
                                                {isExpanded ? (
                                                  <>
                                                    <ChevronUp className="w-3 h-3" />
                                                    Show Less
                                                  </>
                                                ) : (
                                                  <>
                                                    <ChevronDown className="w-3 h-3" />
                                                    Show More
                                                  </>
                                                )}
                                              </button>
                                            )}
                                          </div>
                                        </motion.div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      );
                    })()}
                  </div>
                ) : isCallEvent && isEditing ? (
                  <div className="space-y-4">
                    {/* Theme Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editedTheme}
                          onChange={(e) => setEditedTheme(e.target.value)}
                          placeholder="Call theme..."
                          className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_THEME_LENGTH}
                          disabled={isSaving}
                        />
                        <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                          {editedTheme.length}/{MAX_THEME_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Content Textarea */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Summary <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          placeholder="Call summary..."
                          className="w-full h-48 px-3 py-2 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_CONTENT_LENGTH}
                          disabled={isSaving}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {editedContent.length}/{MAX_CONTENT_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Edit Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEdit}
                        disabled={!editedContent.trim() || isSaving}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Default content display for calls and other interactions */
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {event.description || 'No content available'}
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Notes Section */}
              {linkedNotes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Notes ({linkedNotes.length})
                  </h3>
                  <div className="space-y-3">
                    {linkedNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`rounded-lg border p-4 ${
                          note.isStarred ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          </div>

                          {/* Note Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-1">
                              {note.title && (
                                <h5 className="text-sm font-medium text-gray-900 truncate">
                                  {note.title}
                                </h5>
                              )}
                              {note.isStarred && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                  {getStarDisplayText(note.star)}
                                </div>
                              )}
                            </div>

                            {/* Body */}
                            <div className="text-sm text-gray-700 leading-relaxed mb-2">
                              {note.body || note.content}
                            </div>

                            {/* Date */}
                            <div className="text-xs text-gray-500">
                              {formatNoteDate(note.date)}
                              {note.updated_at && note.updated_at.getTime() !== note.date.getTime() && (
                                <span> • edited {formatNoteDate(note.updated_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving || isDeleting}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InteractionDetailsModal;
