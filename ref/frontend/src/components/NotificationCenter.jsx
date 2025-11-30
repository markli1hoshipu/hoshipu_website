import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Mail, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * Get relative time string from timestamp
 * @param {Date} timestamp - Notification timestamp
 * @returns {string} Relative time (e.g., "2 minutes ago")
 */
function getRelativeTime(timestamp) {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

  // For older notifications, show date
  return new Date(timestamp).toLocaleDateString();
}

/**
 * NotificationItem - Individual notification in the list
 */
function NotificationItem({ notification, onRemove, onMarkAsRead, isExpanded, onToggleExpand, onLeadClick, onCustomerClick }) {
  const { id, type, message, timestamp, read, metadata } = notification;

  // Check if this is an expandable notification
  const isExpandableLeadReply = type === 'lead-reply' && metadata?.expandable && metadata?.leadsWithReplies?.length > 0;
  const isExpandableCrmSync = type === 'crm-sync' && metadata?.expandable && metadata?.customersWithEmails?.length > 0;
  const isExpandable = isExpandableLeadReply || isExpandableCrmSync;

  // Get icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'lead-reply':
        return <Mail className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleClick = () => {
    if (!read) {
      onMarkAsRead(id);
    }
    if (isExpandable) {
      onToggleExpand(id);
    }
  };

  // Render expandable lead-reply notification
  if (isExpandableLeadReply) {
    const { leadsWithReplies, newReplies, leadsQualified } = metadata;

    // Group leads by sentiment
    const positiveLead = leadsWithReplies.filter(l => l.sentiment === 'positive');
    const negativeLeads = leadsWithReplies.filter(l => l.sentiment === 'negative');
    const qualifiedLeads = leadsWithReplies.filter(l => l.statusChanged);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className={`
          group relative border-b border-gray-100
          ${read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-500'}
        `}
      >
        {/* Collapsed/Expanded Header */}
        <div
          onClick={handleClick}
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  {newReplies} New Lead {newReplies === 1 ? 'Email' : 'Emails'}: {positiveLead.length} Positive
                  {leadsQualified > 0 && `, ${leadsQualified} Qualified`}
                </p>
              </div>

              {/* Company names grouped by sentiment */}
              {!isExpanded && (
                <div className="space-y-1 text-sm">
                  {positiveLead.length > 0 && (
                    <p className="text-green-600">
                      {positiveLead.slice(0, 3).map(l => l.companyName).join(', ')}
                      {positiveLead.length > 3 && `, and ${positiveLead.length - 3} more`}
                    </p>
                  )}
                  {negativeLeads.length > 0 && (
                    <p className="text-gray-500">
                      {negativeLeads.slice(0, 3).map(l => l.companyName).join(', ')}
                      {negativeLeads.length > 3 && `, and ${negativeLeads.length - 3} more`}
                    </p>
                  )}
                  {qualifiedLeads.length > 0 && (
                    <p className="text-pink-600 font-semibold">
                      🎉 Qualified: {qualifiedLeads.map(l => l.companyName).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-gray-500 mt-2">
                {getRelativeTime(timestamp)} • {metadata.provider}
              </p>
            </div>

            {/* Expand/Collapse Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(id);
              }}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-opacity"
              aria-label={isExpanded ? "Collapse notification" : "Expand notification"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
              aria-label="Remove notification"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Expanded Lead Cards */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-2"
          >
            {leadsWithReplies.map((lead, index) => {
              // Set background and border colors based on sentiment
              const isPositive = lead.sentiment === 'positive';
              const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';
              const hoverBgColor = isPositive ? 'hover:bg-green-100' : 'hover:bg-red-100';
              const borderColor = isPositive ? 'border-green-200' : 'border-red-200';
              const hoverBorderColor = isPositive ? 'hover:border-green-300' : 'hover:border-red-300';

              return (
                <motion.div
                  key={lead.leadId || index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLeadClick(lead.leadId);
                  }}
                  className={`flex items-center gap-3 p-3 ${bgColor} ${hoverBgColor} border ${borderColor} ${hoverBorderColor} rounded-md cursor-pointer transition-all group/card`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onLeadClick(lead.leadId);
                    }
                  }}
                >
                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {lead.companyName}
                    </p>
                    {lead.replySubject && (
                      <p className="text-xs text-gray-600 italic truncate">
                        "{lead.replySubject}"
                      </p>
                    )}
                    {lead.statusChanged && (
                      <p className="text-xs text-pink-600 font-medium mt-0.5">
                        Contacted → Qualified
                      </p>
                    )}
                  </div>

                  {/* Arrow Icon */}
                  <ArrowRight className={`w-4 h-4 transition-colors flex-shrink-0 ${isPositive ? 'text-green-400 group-hover/card:text-green-600' : 'text-red-400 group-hover/card:text-red-600'}`} />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Unread indicator dot */}
        {!read && (
          <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full" />
        )}
      </motion.div>
    );
  }

  // Render expandable CRM sync notification
  if (isExpandableCrmSync) {
    const { customersWithEmails, emailsSynced } = metadata;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className={`
          group relative border-b border-gray-100
          ${read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-500'}
        `}
      >
        {/* Collapsed/Expanded Header */}
        <div
          onClick={handleClick}
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  {emailsSynced} New Customer {emailsSynced === 1 ? 'Email' : 'Emails'}
                </p>
              </div>

              {/* Customer names (collapsed view) */}
              {!isExpanded && (
                <div className="text-sm text-gray-700">
                  {customersWithEmails.slice(0, 3).map(c => c.customerName).join(', ')}
                  {customersWithEmails.length > 3 && `, and ${customersWithEmails.length - 3} more`}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-gray-500 mt-2">
                {getRelativeTime(timestamp)} • {metadata.provider}
              </p>
            </div>

            {/* Expand/Collapse Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(id);
              }}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-opacity"
              aria-label={isExpanded ? "Collapse notification" : "Expand notification"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
              aria-label="Remove notification"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Expanded Customer Cards */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-2"
          >
            {customersWithEmails.map((customer, index) => (
              <motion.div
                key={customer.customerId || index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCustomerClick(customer.customerId);
                }}
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 rounded-md cursor-pointer transition-all group/card"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCustomerClick(customer.customerId);
                  }
                }}
              >
                {/* Envelope Icon (same for all customers - no sentiment) */}
                <div className="flex-shrink-0 text-lg">
                  📨
                </div>

                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {customer.customerName}
                  </p>
                  {customer.emailSubject && (
                    <p className="text-xs text-gray-600 italic truncate">
                      "{customer.emailSubject}"
                    </p>
                  )}
                </div>

                {/* Arrow Icon */}
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover/card:text-pink-600 transition-colors flex-shrink-0" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Unread indicator dot */}
        {!read && (
          <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full" />
        )}
      </motion.div>
    );
  }

  // Render standard notification (non-expandable)
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`
        group relative p-4 border-b border-gray-100 cursor-pointer
        transition-colors duration-150
        ${read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-500'}
        hover:bg-gray-50
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-line">
            {message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {getRelativeTime(timestamp)}
          </p>
        </div>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
          aria-label="Remove notification"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Unread indicator dot */}
      {!read && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full" />
      )}
    </motion.div>
  );
}

/**
 * NotificationCenter - Popup showing notification history
 *
 * @param {boolean} isCollapsed - Whether sidebar is collapsed
 */
function NotificationCenter({ isCollapsed = false }) {
  const {
    notifications,
    closePopup,
    removeNotification,
    clearAll,
    markAsRead
  } = useNotifications();

  const popupRef = useRef(null);

  // State to track which notifications are expanded
  const [expandedNotifs, setExpandedNotifs] = useState(new Set());

  // Toggle expand/collapse for a notification
  const toggleExpand = (notifId) => {
    setExpandedNotifs(prev => {
      const next = new Set(prev);
      if (next.has(notifId)) {
        next.delete(notifId);
      } else {
        next.add(notifId);
      }
      return next;
    });
  };

  // Check if notification is expanded
  const isExpanded = (notifId) => expandedNotifs.has(notifId);

  // Handle lead click - trigger event to open lead modal
  const handleLeadClick = (leadId) => {
    // Close notification popup
    closePopup();

    // Navigate to Lead Gen section first
    const navEvent = new CustomEvent('navigateToSection', {
      detail: { section: 'leadgen' }
    });
    window.dispatchEvent(navEvent);

    // Then dispatch event to open lead modal (with slight delay to ensure section switch)
    setTimeout(() => {
      const event = new CustomEvent('openLeadModal', {
        detail: { leadId }
      });
      window.dispatchEvent(event);
    }, 100);
  };

  // Handle customer click - trigger event to open customer profile modal
  const handleCustomerClick = (customerId) => {
    // Close notification popup
    closePopup();

    // Navigate to CRM section first
    const navEvent = new CustomEvent('navigateToSection', {
      detail: { section: 'crm' }
    });
    window.dispatchEvent(navEvent);

    // Then dispatch event to open customer profile modal (with slight delay to ensure section switch)
    setTimeout(() => {
      const event = new CustomEvent('openCustomerProfile', {
        detail: { customerId }
      });
      window.dispatchEvent(event);
    }, 100);
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        // Check if the click was on the bell button
        const bellButton = event.target.closest('button[aria-label="Notifications"]');
        if (!bellButton) {
          closePopup();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closePopup]);

  // Calculate popup position based on sidebar state
  const getPopupPosition = () => {
    if (isCollapsed) {
      return {
        left: '5rem', // Position to right of collapsed sidebar (80px)
        top: '8rem'
      };
    } else {
      return {
        left: '14.5rem', // Position to right of expanded sidebar (224px + spacing)
        top: '8rem'
      };
    }
  };

  const position = getPopupPosition();

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 w-[360px] max-h-[480px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col"
      style={position}
      role="dialog"
      aria-labelledby="notification-header"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2
          id="notification-header"
          className="text-lg font-semibold text-gray-900"
        >
          Notifications
        </h2>
        <button
          onClick={closePopup}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close notifications"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 text-center">
              No notifications yet
            </p>
          </div>
        ) : (
          // Notification items
          <AnimatePresence>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRemove={removeNotification}
                onMarkAsRead={markAsRead}
                isExpanded={isExpanded(notification.id)}
                onToggleExpand={toggleExpand}
                onLeadClick={handleLeadClick}
                onCustomerClick={handleCustomerClick}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={clearAll}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default NotificationCenter;
