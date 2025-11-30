import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Mail,
  PhoneCall,
  Calendar,
  Search,
  Plus,
  FileText,
  Activity,
  User,
  Clock,
  ExternalLink,
  Star,
  Trash2,
  Send,
  Download,
  Reply
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import AddActivityModal from './AddActivityModal';
import DeleteConfirmationModal from '../shared/DeleteConfirmationModal';

const ActivityPanel = ({
  customer,
  customerInteractions,
  loadingInteractions,
  timelineFilter,
  setTimelineFilter,
  timelineSearch,
  setTimelineSearch,
  isTimelineExpanded,
  handleTimelineToggle,
  expandedPanel,
  setExpandedPanel,
  handleEventClick,
  getTimelineEvents,
  authFetch,
  onNoteAdded,
  onInteractionAdded,
  // Notes props
  notes,
  isLoadingNotes,
  isRefreshingNotes,
  handleDeleteNote,
  handleToggleNoteStar,
  isDeletingNote,
  // Call events props
  onCallDeleted
}) => {
  const [showAddActivityDropdown, setShowAddActivityDropdown] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedActivityType, setSelectedActivityType] = useState('note');
  const [showCommunicationDropdown, setShowCommunicationDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const communicationDropdownRef = useRef(null);

  // Delete confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'note'|'call', id: noteId|interactionId }
  const [isDeleting, setIsDeleting] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAddActivityDropdown(false);
      }
    };

    if (showAddActivityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddActivityDropdown]);

  // Close communication dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (communicationDropdownRef.current && !communicationDropdownRef.current.contains(event.target)) {
        setShowCommunicationDropdown(false);
      }
    };

    if (showCommunicationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCommunicationDropdown]);

  // Handle activity option click
  const handleActivityOptionClick = (activityType) => {
    setSelectedActivityType(activityType);
    setShowAddActivityDropdown(false);
    setShowAddActivityModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirmation = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'note') {
        // Delete note
        await handleDeleteNote(deleteTarget.id);
      } else if (deleteTarget.type === 'call') {
        // Delete call summary
        const response = await authFetch(
          `${import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003'}/api/crm/customers/${customer.id}/call-summaries/${deleteTarget.id}`,
          { method: 'DELETE' }
        );

        if (response.ok && onCallDeleted) {
          await onCallDeleted(deleteTarget.id);
        }
      }

      // Close modal on success
      setShowDeleteConfirmation(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to check if current filter is a communication type
  const isCommunicationFilter = () => {
    return ['email', 'call', 'meeting'].includes(timelineFilter);
  };

  // Format date helper
  const formatDate = (date) => {
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

  // Get type-specific styling
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
          icon: PhoneCall,
          bgColor: 'bg-green-100',
          textColor: 'text-green-600',
          borderColor: 'border-green-200'
        };
      case 'meeting':
        return {
          icon: Calendar,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200'
        };
      case 'note':
        return {
          icon: FileText,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-600',
          borderColor: 'border-yellow-200'
        };
      default:
        return {
          icon: Activity,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Get combined timeline events including notes
  const getCombinedTimelineEvents = () => {
    const timelineEvents = getTimelineEvents();

    // Convert notes to timeline event format
    const noteEvents = (notes || []).map(note => ({
      type: 'note',
      originalType: 'note',
      title: note.title || 'Note',
      description: note.body || note.content,
      date: note.date,
      employeeName: 'You',
      metadata: {
        noteId: note.id,
        isStarred: note.isStarred,
        star: note.star,
        interaction_id: note.interaction_id
      }
    }));

    // Combine and sort by date
    const allEvents = [...timelineEvents, ...noteEvents];
    return allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const combinedEvents = getCombinedTimelineEvents();

  // Filter events based on timelineFilter
  const filteredEvents = timelineFilter === 'all'
    ? combinedEvents
    : timelineFilter === 'note'
    ? combinedEvents.filter(e => e.originalType === 'note')
    : combinedEvents.filter(e => e.originalType === timelineFilter);

  const TIMELINE_COLLAPSED_LIMIT = 3;
  const displayedEvents = isTimelineExpanded ? filteredEvents : filteredEvents.slice(0, TIMELINE_COLLAPSED_LIMIT);

  return (
    <>
      <div className={`bg-white rounded-lg border border-gray-200 flex flex-col transition-all duration-300 ${
        expandedPanel === 'activity' ? 'h-[calc(1000px+1rem-60px-1rem)] p-6' : expandedPanel === 'summary' ? 'h-[60px] overflow-visible px-6 py-3' : 'h-[500px] p-6'
      }`}>
        {/* Header with Add Activity Button */}
        <div className={`flex items-center justify-between flex-shrink-0 ${expandedPanel === 'summary' ? 'mb-0' : 'mb-4'}`}>
          <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-600" />
            Activity & Notes
            {(loadingInteractions || isLoadingNotes || isRefreshingNotes) && <RefreshCw className="w-4 h-4 animate-spin" />}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Add Activity Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowAddActivityDropdown(!showAddActivityDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Activity
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showAddActivityDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => handleActivityOptionClick('meeting')}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Schedule Meeting
                  </button>
                  <button
                    onClick={() => handleActivityOptionClick('note')}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Add Note
                  </button>
                  <button
                    onClick={() => handleActivityOptionClick('callSummary')}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <PhoneCall className="w-4 h-4 text-green-600" />
                    Add Call Summary
                  </button>
                </div>
              )}
            </div>

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'activity' ? null : 'activity')}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded flex-shrink-0"
              title={expandedPanel === 'activity' ? 'Collapse' : 'Expand'}
            >
              {expandedPanel === 'activity' ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {expandedPanel !== 'summary' && (
          <>
            {/* Event Type Filters - Always Visible */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-shrink-0">
              {/* Filter Buttons */}
              <div className="flex gap-2 items-center">
                {/* All Button */}
                <button
                  onClick={() => setTimelineFilter('all')}
                  className={`h-7 px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors ${
                    timelineFilter === 'all'
                      ? 'bg-pink-100 text-pink-700 border border-pink-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  All
                </button>

                {/* Communication Button with Dropdown */}
                <div className="relative" ref={communicationDropdownRef}>
                  <button
                    onClick={() => setShowCommunicationDropdown(!showCommunicationDropdown)}
                    className={`h-7 px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors ${
                      isCommunicationFilter()
                        ? 'bg-pink-100 text-pink-700 border border-pink-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    Communication
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Dropdown Menu */}
                  {showCommunicationDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setTimelineFilter('email');
                          setShowCommunicationDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          timelineFilter === 'email' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <Mail className="w-4 h-4 text-blue-600" />
                        Email
                      </button>
                      <button
                        onClick={() => {
                          setTimelineFilter('call');
                          setShowCommunicationDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          timelineFilter === 'call' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                        }`}
                      >
                        <PhoneCall className="w-4 h-4 text-green-600" />
                        Call
                      </button>
                      <button
                        onClick={() => {
                          setTimelineFilter('meeting');
                          setShowCommunicationDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          timelineFilter === 'meeting' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                        }`}
                      >
                        <Calendar className="w-4 h-4 text-purple-600" />
                        Meeting
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes Button */}
                <button
                  onClick={() => setTimelineFilter('note')}
                  className={`h-7 px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors ${
                    timelineFilter === 'note'
                      ? 'bg-pink-100 text-pink-700 border border-pink-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Notes
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search timeline..."
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-6">
                {filteredEvents.length > 0 ? (
                  <AnimatePresence>
                    {displayedEvents.map((event, index) => {
                      const eventDate = new Date(event.date);
                      const typeConfig = getTypeConfig(event.originalType);
                      const TypeIcon = typeConfig.icon;

                      const isNote = event.originalType === 'note';

                      return (
                        <motion.div
                          key={`${event.type || 'event'}-${event.date || index}-${event.id || index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={`bg-white border rounded-lg p-4 transition-all group relative ${
                            isNote
                              ? event.metadata?.isStarred
                                ? 'border-yellow-200 bg-yellow-50 hover:shadow-md'
                                : 'border-gray-200 hover:shadow-md'
                              : 'border-gray-200 hover:shadow-md'
                          }`}
                        >
                          {/* Trash icon button for note and call events */}
                          {(isNote || event.originalType === 'call') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isNote) {
                                  setDeleteTarget({ type: 'note', id: event.metadata?.noteId });
                                  setShowDeleteConfirmation(true);
                                } else if (event.originalType === 'call') {
                                  const interactionId = event.metadata?.interactionId;
                                  if (interactionId) {
                                    setDeleteTarget({ type: 'call', id: interactionId });
                                    setShowDeleteConfirmation(true);
                                  }
                                }
                              }}
                              disabled={isDeletingNote === event.metadata?.noteId}
                              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              {isDeletingNote === event.metadata?.noteId ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <div className="flex gap-4" onClick={() => handleEventClick(event)}>
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-10 h-10 ${typeConfig.bgColor} rounded-lg flex items-center justify-center`}>
                              <TypeIcon className={`w-5 h-5 ${typeConfig.textColor}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <h4 className={`text-sm font-semibold text-gray-900 group-hover:text-pink-600 transition-colors`}>
                                    {event.title}
                                  </h4>
                                  {/* Email Direction Badge */}
                                  {event.originalType === 'email' && event.metadata?.direction && (() => {
                                    const directionBadge = getEmailDirectionBadge(event.metadata.direction);
                                    if (!directionBadge) return null;
                                    return (
                                      <div className={`px-2 py-0.5 ${directionBadge.bgColor} ${directionBadge.textColor} rounded-full text-xs font-medium flex-shrink-0`}>
                                        {directionBadge.label}
                                      </div>
                                    );
                                  })()}
                                  {/* Note Star Badge */}
                                  {isNote && event.metadata?.isStarred && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-shrink-0">
                                      <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                      {getStarDisplayText(event.metadata.star)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {event.description}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {event.employeeName}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(event.date)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium mb-1">
                      {timelineFilter !== 'all' ? `No ${timelineFilter === 'note' ? 'note' : timelineFilter} activities found` : 'No activities yet'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {timelineSearch ? 'Try adjusting your search terms' : 'Customer interactions will appear here'}
                    </p>
                  </div>
                )}

                {/* Show More/Less Button */}
                {filteredEvents.length > TIMELINE_COLLAPSED_LIMIT && (
                  <button
                    onClick={handleTimelineToggle}
                    className="w-full py-2 text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
                  >
                    {isTimelineExpanded ? 'Show Less' : `Show ${filteredEvents.length - TIMELINE_COLLAPSED_LIMIT} More`}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        customer={customer}
        onNoteAdded={onNoteAdded}
        onInteractionAdded={onInteractionAdded}
        authFetch={authFetch}
        initialActivityType={selectedActivityType}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirmation}
        title="Confirm Deletion"
        itemName={deleteTarget?.type === 'note' ? 'this note' : 'this call summary'}
        itemType={deleteTarget?.type || 'item'}
        isDeleting={isDeleting}
        deleteButtonText="Delete"
      />
    </>
  );
};

export default ActivityPanel;

