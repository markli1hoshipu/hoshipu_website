import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Calendar,
  User,
  Briefcase,
  School,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Target,
  Linkedin,
  MessageSquare,
  Network,
  FileText,
  Database
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import EnhancedCompanyCard from './EnhancedCompanyCard';

const EnhancedLeadDisplay = ({ 
  leads = [], 
  onLeadSelect = null, 
  onContactLead = null,
  onAddToCRM = null,
  showPersonnel = true,
  showSourceIndicators = true,
  className = '' 
}) => {
  const [selectedLead, setSelectedLead] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [filterBy, setFilterBy] = useState('all');

  // Determine lead source based on data characteristics
  const getLeadSource = (lead) => {
    // Check if lead has personnel data (indicates workflow source)
    if (lead.personnel && lead.personnel.length > 0) {
      return 'workflow';
    }
    // Check for workflow-specific fields
    if (lead.website || lead.rating || lead.reviewCount) {
      return 'workflow';
    }
    // Otherwise assume manual/API source
    return 'manual';
  };

  // Get source display info
  const getSourceInfo = (source) => {
    switch (source) {
      case 'workflow':
        return {
          icon: Network,
          label: 'Workflow',
          color: 'bg-blue-100 text-blue-700',
          description: 'From integrated workflow'
        };
      case 'manual':
        return {
          icon: FileText,
          label: 'Manual',
          color: 'bg-gray-100 text-gray-700',
          description: 'Manually added or imported'
        };
      default:
        return {
          icon: Database,
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-600',
          description: 'Unknown source'
        };
    }
  };

  // Process leads with filtering and sorting
  const processedLeads = useMemo(() => {
    let filtered = leads;

    // Apply filters
    if (filterBy !== 'all') {
      filtered = leads.filter(lead => {
        switch (filterBy) {
          case 'with_personnel':
            return lead.personnel && lead.personnel.length > 0;
          case 'no_personnel':
            return !lead.personnel || lead.personnel.length === 0;
          case 'high_score':
            return lead.score >= 80;
          case 'medium_score':
            return lead.score >= 50 && lead.score < 80;
          case 'low_score':
            return lead.score < 50;
          case 'has_website':
            return lead.website && lead.website.length > 0;
          case 'has_rating':
            return lead.rating && lead.rating > 0;
          case 'workflow_source':
            return getLeadSource(lead) === 'workflow';
          case 'manual_source':
            return getLeadSource(lead) === 'manual';
          default:
            return true;
        }
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        case 'personnel_count':
          return (b.personnel?.length || 0) - (a.personnel?.length || 0);
        case 'created_at':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'source':
          return getLeadSource(a).localeCompare(getLeadSource(b));
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });
  }, [leads, sortBy, filterBy]);

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="score">Score</option>
              <option value="company">Company Name</option>
              <option value="personnel_count">Personnel Count</option>
              <option value="created_at">Date Created</option>
              <option value="source">Source Type</option>
              <option value="rating">Rating</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Leads</option>
              <optgroup label="Personnel">
              <option value="with_personnel">With Personnel</option>
              <option value="no_personnel">No Personnel</option>
              </optgroup>
              <optgroup label="Score Range">
              <option value="high_score">High Score (≥80)</option>
                <option value="medium_score">Medium Score (50-79)</option>
                <option value="low_score">Low Score (&lt;50)</option>
              </optgroup>
              <optgroup label="Data Quality">
                <option value="has_website">Has Website</option>
                <option value="has_rating">Has Rating</option>
              </optgroup>
              <optgroup label="Source">
                <option value="workflow_source">Workflow Generated</option>
                <option value="manual_source">Manually Added</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{processedLeads.length} leads displayed</span>
          {leads.length !== processedLeads.length && (
            <span>({leads.length} total)</span>
          )}
        </div>
      </div>

      {/* Enhanced Company Cards */}
      <div className="space-y-4">
        {processedLeads.map((lead, index) => {
          // Create a unique key - use lead ID if available, otherwise create one from company/email
          const uniqueKey = lead.id || `${lead.company || 'unknown'}-${lead.email || 'no-email'}-${index}`;
          
          return (
            <EnhancedCompanyCard
              key={uniqueKey}
              lead={lead}
              onContactLead={onContactLead}
              onAddToCRM={onAddToCRM}
              onLeadSelect={onLeadSelect}
              showSourceIndicators={showSourceIndicators}
              className="transition-all duration-200"
            />
          );
        })}
      </div>

      {/* Empty State */}
      {processedLeads.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {filterBy !== 'all' 
              ? "Try adjusting your filters to see more results."
              : "Start generating leads to see them here."
            }
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedLeadDisplay;