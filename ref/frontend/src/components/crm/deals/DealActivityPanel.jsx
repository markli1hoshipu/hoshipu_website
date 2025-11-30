import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FileText,
  PhoneCall,
  Calendar,
  Clock,
  User,
  Star,
  RefreshCw,
  Filter,
  Search,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Mail
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import AddDealActivityModal from './AddDealActivityModal';
import DeleteConfirmationModal from '../shared/DeleteConfirmationModal';
import { Trash2 } from 'lucide-react';

const DealActivityPanel = ({
  deal,
  authFetch,
  onActivityAdded,
  expandedPanel,
  setExpandedPanel,
  handleEventClick, // Event click handler from parent
  notes = [], // Notes data for linking
  isDeletingNote, // Deleting state from parent
  handleDeleteNote, // Delete handler from parent
  onCallDeleted // Call delete handler from parent
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  const [activities, setActivities] = useState({ notes: [], interactions: [], timeline: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showAddActivityDropdown, setShowAddActivityDropdown] = useState(false);
  const [selectedActivityType, setSelectedActivityType] = useState('note');
  const [filterType, setFilterType] = useState('all'); // all, notes, calls, meetings
  const [searchQuery, setSearchQuery] = useState('');
  const [showCommunicationDropdown, setShowCommunicationDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const communicationDropdownRef = useRef(null);

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

  // Load activities when deal changes
  useEffect(() => {
    if (deal?.deal_id) {
      loadActivities();
    }
  }, [deal?.deal_id]);

  const loadActivities = async () => {
    if (!deal?.deal_id) return;

    setIsLoading(true);
    try {
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/deals/${deal.deal_id}/activities`
      );

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error loading deal activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivityAdded = async () => {
    await loadActivities();
    if (onActivityAdded) {
      onActivityAdded();
    }
  };

  const handleActivityOptionClick = (activityType) => {
    setSelectedActivityType(activityType);
    setShowAddActivityDropdown(false);
    setShowAddActivityModal(true);
  };

  // Helper function to check if current filter is a communication type
  const isCommunicationFilter = () => {
    return ['email', 'call', 'meeting'].includes(filterType);
  };

  // Filter activities based on type and search
  const getFilteredActivities = () => {
    let filtered = activities.timeline || [];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => {
        if (filterType === 'notes') return activity.activity_type === 'note';
        if (filterType === 'email') return activity.activity_type === 'email';
        if (filterType === 'calls') return activity.activity_type === 'call';
        if (filterType === 'meetings') return activity.activity_type === 'meet';
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => {
        const title = activity.title?.toLowerCase() || '';
        const body = activity.body?.toLowerCase() || '';
        const content = activity.content?.toLowerCase() || '';
        const theme = activity.theme?.toLowerCase() || '';
        return title.includes(query) || body.includes(query) || content.includes(query) || theme.includes(query);
      });
    }

    return filtered;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'note':
        return {
          icon: FileText,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600'
        };
      case 'call':
        return {
          icon: PhoneCall,
          bgColor: 'bg-green-100',
          textColor: 'text-green-600'
        };
      case 'meeting':
      case 'meet':
        return {
          icon: Calendar,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600'
        };
      case 'email':
        return {
          icon: Mail,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600'
        };
      default:
        return {
          icon: FileText,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        };
    }
  };

  const getStarDisplayText = (star) => {
    if (star === 'important') return 'Important';
    return '';
  };

  // Delete confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'note'|'call', id: noteId|interactionId }
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete confirmation
  const handleDeleteConfirmation = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'note') {
        // Delete note
        if (handleDeleteNote) {
          await handleDeleteNote(deleteTarget.id);
        }
      } else if (deleteTarget.type === 'call') {
        // Delete call summary
        const response = await authFetch(
          `${CRM_API_BASE_URL}/api/crm/deals/${deal.deal_id}/call-summaries/${deleteTarget.id}`,
          { method: 'DELETE' }
        );

        if (response.ok && onCallDeleted) {
          await onCallDeleted(deleteTarget.id);
        }
      }

      // Close modal and reload activities on success
      setShowDeleteConfirmation(false);
      setDeleteTarget(null);
      await loadActivities();
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredActivities = getFilteredActivities();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Activity & Notes
          {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Add Activity Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowAddActivityDropdown(!showAddActivityDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
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
          {setExpandedPanel && (
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
          )}
        </div>
      </div>

      {/* Event Type Filters */}
      {(!expandedPanel || expandedPanel !== 'summary') && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-shrink-0">
          {/* Filter Buttons */}
          <div className="flex gap-2 items-center flex-wrap">
            {/* All Button */}
            <button
              onClick={() => setFilterType('all')}
              className={`h-7 px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors ${
                filterType === 'all'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
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
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
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
                      setFilterType('email');
                      setShowCommunicationDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      filterType === 'email' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('calls');
                      setShowCommunicationDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      filterType === 'calls' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4 text-green-600" />
                    Call
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('meetings');
                      setShowCommunicationDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      filterType === 'meetings' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
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
              onClick={() => setFilterType('notes')}
              className={`h-7 px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors ${
                filterType === 'notes'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-3 h-3" />
              Notes
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Activities Timeline */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading activities...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No activities found for this deal</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Activity" to create one</p>
          </div>
        ) : (
          filteredActivities.map((activity, index) => {
            const activityDate = new Date(activity.created_at);
            const typeConfig = getTypeConfig(activity.activity_type);
            const TypeIcon = typeConfig.icon;
            const isNote = activity.activity_type === 'note';
            const isCall = activity.activity_type === 'call';

            return (
              <motion.div
                key={`${activity.activity_type}-${activity.note_id || activity.interaction_id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`bg-white border rounded-lg p-4 transition-all group relative ${
                  isNote
                    ? activity.star === 'important'
                      ? 'border-yellow-200 bg-yellow-50 hover:shadow-md'
                      : 'border-gray-200 hover:shadow-md'
                    : 'border-gray-200 hover:shadow-md'
                }`}
              >
                {/* Trash icon button for note and call events */}
                {(isNote || isCall) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isNote) {
                        setDeleteTarget({ type: 'note', id: activity.note_id });
                        setShowDeleteConfirmation(true);
                      } else if (isCall) {
                        const interactionId = activity.interaction_id;
                        if (interactionId) {
                          setDeleteTarget({ type: 'call', id: interactionId });
                          setShowDeleteConfirmation(true);
                        }
                      }
                    }}
                    disabled={isDeletingNote === activity.note_id}
                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    {isDeletingNote === activity.note_id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}

                <div className="flex gap-4" onClick={() => handleEventClick && handleEventClick(activity)}>
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 ${typeConfig.bgColor} rounded-lg flex items-center justify-center`}>
                    <TypeIcon className={`w-5 h-5 ${typeConfig.textColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors`}>
                          {activity.activity_type === 'email'
                            ? (activity.theme || activity.subject || (activity.content ? activity.content.substring(0, 50) + (activity.content.length > 50 ? '...' : '') : 'No subject'))
                            : activity.title || activity.theme || `${activity.activity_type === 'note' ? 'Note' : activity.activity_type === 'call' ? 'Call' : 'Meeting'}`}
                        </h4>
                        {isNote && activity.star === 'important' && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-shrink-0">
                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            {getStarDisplayText(activity.star)}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {activity.activity_type === 'note' && activity.body}
                      {activity.activity_type === 'call' && activity.content}
                      {activity.activity_type === 'email' && (activity.content || '')}
                      {(activity.activity_type === 'meet' || activity.activity_type === 'meeting') && activity.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {activity.employee_name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Activity Modal */}
      <AddDealActivityModal
        isOpen={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        deal={deal}
        onActivityAdded={handleActivityAdded}
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
    </div>
  );
};

export default DealActivityPanel;

