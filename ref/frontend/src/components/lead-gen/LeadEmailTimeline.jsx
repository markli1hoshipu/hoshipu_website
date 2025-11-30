import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  MailOpen,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  TrendingUp,
  Building,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/primitives/button';
import leadsApiService from '../../services/leadsApi';

const TIMELINE_COLLAPSED_LIMIT = 10;

const LeadEmailTimeline = ({ selectedLead, onAddToCRM, onCheckReplies, isCheckingReplies }) => {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Load timeline data
  useEffect(() => {
    if (!selectedLead?.lead_id && !selectedLead?.id) {
      return;
    }

    const loadTimelineData = async () => {
      setLoading(true);
      setError(null);

      try {
        const leadId = selectedLead.lead_id || selectedLead.id;

        // Load both stats and timeline in parallel
        const [statsData, timelineData] = await Promise.all([
          leadsApiService.getLeadEmailStats(leadId),
          leadsApiService.getLeadEmailTimeline(leadId, {
            limit: 50,
            days_back: 30,
            direction: 'all'
          })
        ]);

        setStats(statsData);
        setEmails(timelineData.timeline || []);
      } catch (err) {
        console.error('Error loading email timeline:', err);
        setError(err.message || 'Failed to load email timeline');
      } finally {
        setLoading(false);
      }
    };

    loadTimelineData();
  }, [selectedLead]);

  // Filter and search emails
  const getFilteredEmails = () => {
    let filtered = emails;

    // Apply direction filter
    if (timelineFilter !== 'all') {
      filtered = filtered.filter(email => email.direction === timelineFilter);
    }

    // Apply search filter
    if (timelineSearch.trim()) {
      const searchLower = timelineSearch.toLowerCase();
      filtered = filtered.filter(email =>
        email.subject?.toLowerCase().includes(searchLower) ||
        email.body?.toLowerCase().includes(searchLower) ||
        email.from_email?.toLowerCase().includes(searchLower) ||
        email.to_email?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredEmails = getFilteredEmails();
  const displayEmails = isTimelineExpanded
    ? filteredEmails
    : filteredEmails.slice(0, TIMELINE_COLLAPSED_LIMIT);
  const hasMoreEmails = filteredEmails.length > TIMELINE_COLLAPSED_LIMIT;

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get sentiment badge
  const getSentimentBadge = (sentiment, confidence) => {
    if (!sentiment || sentiment === 'neutral') return null;

    const colors = {
      positive: 'bg-green-100 text-green-800 border-green-200',
      negative: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[sentiment]}`}
        title={`Confidence: ${confidence ? (confidence * 100).toFixed(0) + '%' : 'N/A'}`}
      >
        {sentiment === 'positive' ? '👍' : '👎'} {sentiment}
      </span>
    );
  };

  // Get email type config (sent vs received)
  const getEmailTypeConfig = (direction) => {
    if (direction === 'sent') {
      return {
        icon: Mail,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-200',
        label: 'Sent'
      };
    } else {
      return {
        icon: MailOpen,
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
        borderColor: 'border-green-200',
        label: 'Received'
      };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-[500px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading email timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-[500px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load email timeline</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-600" />
            Email Timeline
          </h3>
          {stats && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                {stats.total_emails} total
              </span>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {stats.total_sent} sent
              </span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {stats.total_received} received
              </span>
            </div>
          )}
          {hasMoreEmails && !isTimelineExpanded && (
            <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs">
              {filteredEmails.length - TIMELINE_COLLAPSED_LIMIT} more
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onAddToCRM && (
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-x-2"
              onClick={onAddToCRM}
            >
              <Building className="w-4 h-4" />
              Add to CRM
            </Button>
          )}
          {onCheckReplies && (
            <Button
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-600 hover:bg-orange-50 gap-x-2"
              onClick={onCheckReplies}
              disabled={isCheckingReplies}
            >
              {isCheckingReplies ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync Replies
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-shrink-0">
        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All', icon: Filter },
            { key: 'sent', label: 'Sent', icon: Mail },
            { key: 'received', label: 'Received', icon: MailOpen }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTimelineFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors ${
                timelineFilter === key
                  ? 'bg-pink-100 text-pink-700 border border-pink-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={timelineSearch}
            onChange={(e) => setTimelineSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-6">
          {displayEmails.length > 0 ? (
            <AnimatePresence>
              {displayEmails.map((email, index) => {
                const typeConfig = getEmailTypeConfig(email.direction);
                const TypeIcon = typeConfig.icon;
                const emailDate = new Date(email.email_timestamp);

                return (
                  <motion.div
                    key={`email-${email.email_id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`border rounded-lg p-4 hover:shadow-md hover:bg-gray-50 transition-all ${typeConfig.borderColor}`}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="flex-none">
                        <div className={`w-10 h-10 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
                          <TypeIcon className={`w-5 h-5 ${typeConfig.textColor}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${typeConfig.textColor}`}>
                                {typeConfig.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(email.email_timestamp)}
                              </span>
                              {email.direction === 'received' && getSentimentBadge(email.sentiment, email.confidence)}
                            </div>
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {email.subject || '(No Subject)'}
                            </h4>
                          </div>
                        </div>

                        {/* Email Details */}
                        <div className="text-xs text-gray-600 mb-2 space-y-1">
                          <div>
                            <span className="font-medium">From:</span> {email.from_email}
                          </div>
                          <div>
                            <span className="font-medium">To:</span> {email.to_email}
                          </div>
                          {email.employee_name && (
                            <div>
                              <span className="font-medium">Employee:</span> {email.employee_name}
                            </div>
                          )}
                        </div>

                        {/* Body Preview */}
                        <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 border border-gray-100">
                          {(email.body_preview || email.body || '').includes('<') && (email.body_preview || email.body || '').includes('>') ? (
                            <div
                              className="line-clamp-3"
                              dangerouslySetInnerHTML={{ __html: email.body_preview || email.body || 'No content' }}
                            />
                          ) : (
                            <p className="line-clamp-3">
                              {email.body_preview || email.body || 'No content'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full py-12">
              <div className="text-center">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-600 mb-2">No emails found</h4>
                <p className="text-sm text-gray-500">
                  {timelineSearch ? 'Try adjusting your search' : 'No email history for this lead yet'}
                </p>
              </div>
            </div>
          )}

          {/* Expand/Collapse Button */}
          {hasMoreEmails && (
            <motion.div
              className="mt-6 pt-4 border-t border-gray-100 px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center gap-2">
                {/* Email count display */}
                <div className="text-xs text-gray-500">
                  Showing {isTimelineExpanded ? filteredEmails.length : TIMELINE_COLLAPSED_LIMIT} of {filteredEmails.length} emails
                </div>

                {/* Toggle button */}
                <Button
                  variant="ghost"
                  onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 flex items-center gap-2 transition-all duration-200"
                >
                  {isTimelineExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show More
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadEmailTimeline;
