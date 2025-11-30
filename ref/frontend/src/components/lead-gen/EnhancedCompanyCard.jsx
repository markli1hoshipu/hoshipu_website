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
  Database,
  DollarSign,
  Users2,
  Building,
  Award,
  Layers
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { Badge } from '../ui/primitives/badge';

const EnhancedCompanyCard = ({ 
  lead, 
  onContactLead = null, 
  onAddToCRM = null,
  onLeadSelect = null,
  showSourceIndicators = true,
  className = '' 
}) => {
  // Helper function to safely render any value as text
  const safeRender = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      // Don't render objects directly - return empty string to avoid React error
      console.warn('Attempted to render object directly:', value);
      return '';
    }
    return String(value);
  };
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [personnelFilter, setPersonnelFilter] = useState('all');

  // Generate unique key for animations
  const uniqueKey = `lead-${lead.id || lead.company}-${Date.now()}`;

  // Get lead source info
  const getLeadSource = (lead) => {
    if (lead.source) return lead.source;
    if (lead.personnel && lead.personnel.length > 0) return 'workflow';
    if (lead.website || lead.rating || lead.reviewCount) return 'workflow';
    return 'manual';
  };

  const source = getLeadSource(lead);
  const sourceInfo = {
    workflow: { icon: Network, label: 'Workflow', color: 'bg-blue-100 text-blue-700' },
    yellowpages: { icon: Building, label: 'Yellow Pages', color: 'bg-yellow-100 text-yellow-700' },
    linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-100 text-blue-700' },
    manual: { icon: FileText, label: 'Manual', color: 'bg-gray-100 text-gray-700' }
  }[source] || { icon: Database, label: source, color: 'bg-gray-100 text-gray-700' };

  // Helper to parse contact_info if it's a JSON string
  const parseContactInfo = (contact_info) => {
    if (!contact_info) return {};
    if (typeof contact_info === 'string') {
      try {
        return JSON.parse(contact_info);
      } catch {
        return {};
      }
    }
    return contact_info;
  };

  // Organize company contact information - prioritize individual fields over contact_info object
  const parsedContactInfo = parseContactInfo(lead.contact_info);
  const contactInfo = {
    website: lead.website || parsedContactInfo?.website,
    phone: lead.phone || parsedContactInfo?.phone, 
    email: lead.email || parsedContactInfo?.email,
    address: lead.address || lead.location,
    linkedin: lead.linkedin_url || parsedContactInfo?.linkedin
  };

  // Company details and metrics
  const companyDetails = {
    size: lead.company_size || (lead.employees_count ? `${lead.employees_count} employees` : null),
    revenue: lead.revenue,
    industry: lead.industry,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    description: lead.description,
    notes: lead.notes
  };

  // Group personnel by department/role
  const groupedPersonnel = useMemo(() => {
    const personnel = lead.personnel || [];
    const groups = {
      all: personnel,
      executives: [],
      sales: [],
      marketing: [],
      engineering: [],
      other: []
    };

    personnel.forEach(person => {
      const position = (person.position || '').toLowerCase();
      const department = (person.department || '').toLowerCase();
      
      if (position.includes('ceo') || position.includes('president') || 
          position.includes('founder') || position.includes('director') ||
          position.includes('vp') || position.includes('vice president')) {
        groups.executives.push(person);
      } else if (position.includes('sales') || position.includes('business development') ||
                 position.includes('account')) {
        groups.sales.push(person);
      } else if (position.includes('marketing') || position.includes('growth') ||
                 position.includes('brand') || position.includes('content')) {
        groups.marketing.push(person);
      } else if (position.includes('engineer') || position.includes('developer') || 
                 position.includes('tech') || position.includes('software') ||
                 position.includes('architect')) {
        groups.engineering.push(person);
      } else {
        groups.other.push(person);
      }
    });

    return groups;
  }, [lead.personnel]);

  const currentPersonnel = groupedPersonnel[personnelFilter] || [];

  // Score color coding
  const getScoreColor = (score) => {
    if (!score) return 'bg-gray-100 text-gray-700';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`company-card ${className}`}
    >
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-4">
          {/* Company Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {lead.company}
                </h3>
                
                {/* Score Badge */}
                {lead.score && (
                  <Badge className={`${getScoreColor(lead.score)}`}>
                    {lead.score}/100
                  </Badge>
                )}
                
                {/* Source Indicator */}
                {showSourceIndicators && (
                  <Badge variant="outline" className={sourceInfo.color}>
                    <sourceInfo.icon className="w-3 h-3 mr-1" />
                    {sourceInfo.label}
                  </Badge>
                )}
              </div>

              {/* Company Quick Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                {lead.industry && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    <span>{lead.industry}</span>
                  </div>
                )}
                
                {(lead.location || lead.address) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{lead.location || lead.address}</span>
                  </div>
                )}
                
                {companyDetails.size && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{companyDetails.size}</span>
                  </div>
                )}
                
                {companyDetails.revenue && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{companyDetails.revenue}</span>
                  </div>
                )}
              </div>

              {/* Rating and Personnel Count */}
              <div className="flex items-center gap-4 text-sm">
                {lead.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span>{lead.rating}</span>
                    {lead.reviewCount && (
                      <span className="text-gray-500">({lead.reviewCount} reviews)</span>
                    )}
                  </div>
                )}
                
                {lead.personnel && lead.personnel.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users2 className="w-4 h-4 text-blue-500" />
                    <span>{lead.personnel.length} employees found</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expand Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Enhanced Contact Information Bar */}
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Details */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Contact Information</h4>
                <div className="grid grid-cols-1 gap-1">
                  {contactInfo.website && (
                    <a
                      href={contactInfo.website.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span className="truncate font-medium">{contactInfo.website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  
                  {contactInfo.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">{contactInfo.phone}</span>
                    </div>
                  )}
                  
                  {contactInfo.email && (
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="truncate font-medium">{contactInfo.email}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Company Quick Facts */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Company Details</h4>
                <div className="grid grid-cols-1 gap-1">
                  {companyDetails.revenue && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span><span className="text-gray-500">Revenue:</span> <span className="font-medium">{companyDetails.revenue}</span></span>
                    </div>
                  )}
                  
                  {companyDetails.size && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span><span className="text-gray-500">Size:</span> <span className="font-medium">{companyDetails.size}</span></span>
                    </div>
                  )}
                  
                  {lead.rating && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span><span className="text-gray-500">Rating:</span> <span className="font-medium">{lead.rating}/5.0</span></span>
                      {lead.reviewCount && (
                        <span className="text-gray-500">({lead.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {(onContactLead || onAddToCRM) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex gap-2">
                  {onContactLead && (
                    <Button
                      size="sm"
                      onClick={() => onContactLead(lead)}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Contact Company
                    </Button>
                  )}
                  {onAddToCRM && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddToCRM(lead)}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Database className="w-4 h-4" />
                      Add to CRM
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  {lead.personnel && lead.personnel.length > 0 && (
                    <button
                      onClick={() => setActiveTab('personnel')}
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'personnel'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Personnel ({lead.personnel.length})
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Company Profile Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{lead.company}</h3>
                          {companyDetails.industry && (
                            <p className="text-blue-700 font-medium mb-2">{companyDetails.industry}</p>
                          )}
                          {companyDetails.description && (
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {companyDetails.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Company Details Cards */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Building className="w-5 h-5 text-blue-600" />
                          Company Information
                        </h4>
                        <div className="space-y-3">
                          {companyDetails.industry && (
                            <div className="flex items-start gap-3">
                              <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Industry</span>
                                <p className="font-medium text-gray-900">{companyDetails.industry}</p>
                              </div>
                            </div>
                          )}
                          
                          {companyDetails.size && (
                            <div className="flex items-start gap-3">
                              <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Company Size</span>
                                <p className="font-medium text-gray-900">{companyDetails.size}</p>
                              </div>
                            </div>
                          )}
                          
                          {companyDetails.revenue && (
                            <div className="flex items-start gap-3">
                              <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Revenue</span>
                                <p className="font-medium text-gray-900">{companyDetails.revenue}</p>
                              </div>
                            </div>
                          )}

                          {(contactInfo.address || lead.location) && (
                            <div className="flex items-start gap-3">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Location</span>
                                <p className="font-medium text-gray-900">{contactInfo.address || lead.location}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Phone className="w-5 h-5 text-green-600" />
                          Contact Details
                        </h4>
                        <div className="space-y-3">
                          {contactInfo.website && (
                            <div className="flex items-start gap-3">
                              <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Website</span>
                                <a
                                  href={contactInfo.website.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  {contactInfo.website}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {contactInfo.phone && (
                            <div className="flex items-start gap-3">
                              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Phone</span>
                                <a
                                  href={`tel:${contactInfo.phone}`}
                                  className="font-medium text-gray-900 hover:text-blue-600"
                                >
                                  {contactInfo.phone}
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {contactInfo.email && (
                            <div className="flex items-start gap-3">
                              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Email</span>
                                <a
                                  href={`mailto:${contactInfo.email}`}
                                  className="font-medium text-blue-600 hover:text-blue-800"
                                >
                                  {contactInfo.email}
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Rating */}
                          {lead.rating && (
                            <div className="flex items-start gap-3">
                              <Star className="w-4 h-4 text-yellow-400 mt-0.5" />
                              <div>
                                <span className="text-sm text-gray-600">Rating</span>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{lead.rating} / 5.0</p>
                                  {lead.reviewCount && (
                                    <span className="text-sm text-gray-500">({lead.reviewCount} reviews)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    {companyDetails.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Notes
                        </h4>
                        <p className="text-amber-800 text-sm leading-relaxed">
                          {companyDetails.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'personnel' && lead.personnel && lead.personnel.length > 0 && (
                  <div className="space-y-6">
                    {/* Company Header for Personnel Tab */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{lead.company}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            {companyDetails.industry && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {companyDetails.industry}
                              </span>
                            )}
                            {(contactInfo.address || lead.location) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {contactInfo.address || lead.location}
                              </span>
                            )}
                            {companyDetails.size && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {companyDetails.size}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-green-700">
                            <Users2 className="w-5 h-5" />
                            <span className="font-bold text-lg">{lead.personnel.length}</span>
                          </div>
                          <p className="text-sm text-gray-600">personnel found</p>
                        </div>
                      </div>
                      
                      {/* Quick Contact Bar for Personnel Tab */}
                      <div className="mt-3 pt-3 border-t border-green-200 flex flex-wrap gap-3">
                        {contactInfo.website && (
                          <a
                            href={contactInfo.website.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            {contactInfo.website}
                          </a>
                        )}
                        {contactInfo.phone && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contactInfo.phone}
                          </span>
                        )}
                        {contactInfo.email && (
                          <a
                            href={`mailto:${contactInfo.email}`}
                            className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            {contactInfo.email}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Personnel Department Filter */}
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(groupedPersonnel).map(([key, personnel]) => (
                        personnel.length > 0 && (
                          <button
                            key={key}
                            onClick={() => setPersonnelFilter(key)}
                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                              personnelFilter === key 
                                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                            }`}
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1)} ({personnel.length})
                          </button>
                        )
                      ))}
                    </div>

                    {/* Personnel Cards Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {currentPersonnel.map((person, personIndex) => (
                        <div
                          key={`${uniqueKey}-person-${personIndex}`}
                          className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                        >
                          {/* Personnel Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {safeRender(person.full_name || person.name) || 'Unknown'}
                                  </h4>
                                  {person.position && (
                                    <p className="text-sm text-gray-600">{safeRender(person.position)}</p>
                                  )}
                                  <p className="text-xs text-blue-600 font-medium">@ {String(lead.company || '')}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* LinkedIn Link */}
                            {person.linkedin_url && (
                              <a
                                href={person.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-blue-600 hover:text-blue-800"
                              >
                                <Linkedin className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          {/* Personnel Details */}
                          <div className="space-y-2 text-sm">
                            {person.department && (
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-gray-400" />
                                <span>{String(person.department || '')}</span>
                              </div>
                            )}
                            
                            {person.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{String(person.email || '')}</span>
                              </div>
                            )}
                            
                            {person.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{String(person.phone || '')}</span>
                              </div>
                            )}
                            
                            {person.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{String(person.location || '')}</span>
                              </div>
                            )}
                            
                            {person.experience_years && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{String(person.experience_years || '')} years experience</span>
                              </div>
                            )}

                            {person.education && typeof person.education === 'string' && person.education.trim() && (
                              <div className="flex items-center gap-2">
                                <School className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{person.education}</span>
                              </div>
                            )}

                            {/* Skills */}
                            {person.skills && Array.isArray(person.skills) && person.skills.length > 0 && (
                              <div className="mt-2">
                                <div className="flex flex-wrap gap-1">
                                  {person.skills.slice(0, 3).map((skill, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                      {String(skill)}
                                    </span>
                                  ))}
                                  {person.skills.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded">
                                      +{person.skills.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Other Social Profiles - safely handle objects */}
                            {person.other_social_profiles && 
                             typeof person.other_social_profiles === 'object' && 
                             !Array.isArray(person.other_social_profiles) &&
                             Object.keys(person.other_social_profiles).length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-gray-500 mb-1">Social Profiles:</div>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(person.other_social_profiles).slice(0, 2).map(([platform, url], idx) => (
                                    url && typeof url === 'string' && url.trim() && (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded hover:bg-gray-100"
                                      >
                                        {String(platform)}
                                      </a>
                                    )
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Personnel Action Buttons */}
                          {(onContactLead || onAddToCRM) && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex gap-2">
                                {onContactLead && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onContactLead(lead, person)}
                                    className="flex-1"
                                  >
                                    <Mail className="w-4 h-4 mr-1" />
                                    Contact {person.first_name || person.name?.split(' ')[0] || 'Person'}
                                  </Button>
                                )}
                                {onAddToCRM && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onAddToCRM(lead, person)}
                                    className="flex-1"
                                  >
                                    <Database className="w-4 h-4 mr-1" />
                                    Add to CRM
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {currentPersonnel.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No personnel found in this category
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default EnhancedCompanyCard;