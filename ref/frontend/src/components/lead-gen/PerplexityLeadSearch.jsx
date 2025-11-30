import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
  Search,
  Zap,
  Globe,
  MapPin,
  Building,
  Users,
  Star,
  Phone,
  Mail,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Brain,
  Clock,
  Target,
  Database,
  Download,
  Save,
  Eye,
  TrendingUp,
  Shield,
  Lightbulb,
  Network,
  RefreshCw,
  Settings,
  Info,
  ArrowRight,
  Award,
  Calendar,
  DollarSign,
  FileText,
  Link,
  Activity
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import perplexityApiService from '../../services/perplexityApi';

const PerplexityLeadSearch = () => {
  // Search state
  const [searchForm, setSearchForm] = useState({
    region: '',
    industry: '',
    numCompanies: 10,
    model: 'sonar-pro'
  });

  // Results state
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [convertedLeads, setConvertedLeads] = useState([]);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [availableModels, setAvailableModels] = useState([]);
  const [serviceStats, setServiceStats] = useState(null);

  // Comprehensive details - always included in search
  const ALL_DETAILS = [
    'contact', 'size', 'revenue', 'description', 'website', 
    'founded', 'leadership', 'social', 'certifications', 'address', 
    'phone', 'email', 'employees'
  ];

  // Test connection on component mount
  useEffect(() => {
    const initializeService = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Test connection
        const connectionResult = await perplexityApiService.testConnection();
        setConnectionStatus(connectionResult.connected ? 'connected' : 'disconnected');
        
        if (connectionResult.connected) {
          // Get available models
          try {
            const models = await perplexityApiService.getAvailableModels();
            setAvailableModels(Object.entries(models.models || {}));
          } catch (error) {
            console.warn('Could not load available models:', error);
          }
          
          // Get service stats
          try {
            const stats = await perplexityApiService.getServiceStats();
            setServiceStats(stats);
          } catch (error) {
            console.warn('Could not load service stats:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing Perplexity service:', error);
        setConnectionStatus('error');
      }
    };

    initializeService();
  }, []);

  // Handle search form changes
  const handleFormChange = useCallback((field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // No longer needed - using comprehensive search always

  // Execute search
  const handleSearch = useCallback(async () => {
    if (!searchForm.region || !searchForm.industry) {
      toast.error('Please enter both region and industry');
      return;
    }

    setIsSearching(true);
    setSearchProgress(0);
    setSearchResults(null);

    try {
      // Improved progress tracking
      const progressInterval = setInterval(() => {
        setSearchProgress(prev => Math.min(prev + 5, 85)); // Only go to 85%
      }, 800);

      console.log('🤖 Starting Perplexity search with params:', searchForm);
      
      // Execute search with comprehensive details
      const searchParams = perplexityApiService.formatSearchParams(
        searchForm.region,
        searchForm.industry,
        searchForm.numCompanies,
        {
          includeDetails: ALL_DETAILS,
          model: searchForm.model
        }
      );

      setSearchProgress(90); // Show we're making the API call
      const results = await perplexityApiService.searchCompanies(searchParams);
      
      clearInterval(progressInterval);
      setSearchProgress(100);

      if (results.success) {
        setSearchResults(results);
        toast.success(
          `🎉 Found ${results.total_found} companies using Perplexity AI!`,
          { duration: 4000 }
        );
        
        // Show additional info about the search
        if (results.search_metadata) {
          const metadata = results.search_metadata;
          setTimeout(() => {
            toast.success(
              `📊 Search completed in ${metadata.search_duration_seconds?.toFixed(1)}s using ${metadata.model_used}`,
              { duration: 3000 }
            );
          }, 1500);
        }
      } else {
        const errorMessage = results.errors?.join(', ') || 'Unknown error';
        console.error('❌ Perplexity search failed:', results);
        toast.error(
          `Search failed: ${errorMessage}`,
          { duration: 8000 }
        );
        // Show detailed error info in console for debugging
        console.log('🔍 Debug info:', {
          searchParams,
          results,
          metadata: results.search_metadata
        });
      }
    } catch (error) {
      console.error('❌ Perplexity search error:', error);
      toast.error(`Search failed: ${error.message}`);
      setSearchProgress(0);
    } finally {
      setIsSearching(false);
    }
  }, [searchForm]);

  // Convert results to leads
  const handleConvertToLeads = useCallback(async (autoCreate = false) => {
    if (!searchResults || !searchResults.companies) {
      toast.error('No search results to convert');
      return;
    }

    try {
      console.log('🔄 Converting Perplexity results to leads...');
      
      const converted = await perplexityApiService.convertToLeads(searchResults, autoCreate);
      
      setConvertedLeads(converted.leads || []);
      
      if (autoCreate) {
        toast.success(
          `✅ Created ${converted.created_count} leads in database!`,
          { duration: 4000 }
        );
      } else {
        toast.success(
          `✅ Converted ${converted.converted_count} companies to lead format`,
          { duration: 3000 }
        );
      }
    } catch (error) {
      console.error('Error converting to leads:', error);
      toast.error('Failed to convert results to leads');
    }
  }, [searchResults]);

  // Get connection status icon and color
  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' };
      case 'disconnected':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' };
      case 'connecting':
        return { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' };
      default:
        return { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  // Render company card
  const renderCompanyCard = (company, index) => (
    <motion.div
      key={company.name || index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedCompany(company)}
    >
      {/* Company header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            {company.name}
          </h3>
          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {company.location}
          </p>
          <p className="text-sm text-gray-500 mt-1">{company.industry}</p>
        </div>
        
        {/* Confidence score */}
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
          <Star className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">
            {Math.round((company.confidence_score || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Company details */}
      <div className="space-y-2">
        {/* Contact info */}
        {(company.contact_info?.phone || company.contact_info?.email || company.website) && (
          <div className="flex flex-wrap gap-2">
            {company.contact_info?.phone && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Phone className="w-3 h-3" />
                {company.contact_info.phone}
              </div>
            )}
            {company.contact_info?.email && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Mail className="w-3 h-3" />
                {company.contact_info.email}
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Globe className="w-3 h-3" />
                <a href={company.website} target="_blank" rel="noopener noreferrer">
                  Website
                </a>
              </div>
            )}
          </div>
        )}

        {/* Company size and revenue */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          {(company.company_size || company.employees) && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {company.company_size || company.employees}
            </div>
          )}
          {company.revenue && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {company.revenue}
            </div>
          )}
          {company.founded_year && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Founded {company.founded_year}
            </div>
          )}
          {company.company_type && (
            <div className="flex items-center gap-1">
              <Building className="w-3 h-3" />
              {company.company_type}
            </div>
          )}
        </div>

        {/* Description */}
        {company.description && (
          <p className="text-xs text-gray-700 line-clamp-2">
            {company.description}
          </p>
        )}

        {/* Leadership */}
        {company.leadership && company.leadership.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Target className="w-3 h-3" />
            {company.leadership.slice(0, 2).map(leader => 
              typeof leader === 'string' ? leader : leader.name
            ).join(', ')}
            {company.leadership.length > 2 && ' +more'}
          </div>
        )}

        {/* Social profiles */}
        {(company.social_profiles?.linkedin || company.social_profiles?.twitter) && (
          <div className="flex items-center gap-2 text-xs">
            {company.social_profiles.linkedin && (
              <a href={company.social_profiles.linkedin} target="_blank" rel="noopener noreferrer" 
                 className="flex items-center gap-1 text-blue-600 hover:underline">
                <Network className="w-3 h-3" />
                LinkedIn
              </a>
            )}
            {company.social_profiles.twitter && (
              <a href={company.social_profiles.twitter} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1 text-blue-600 hover:underline">
                <Network className="w-3 h-3" />
                Twitter
              </a>
            )}
          </div>
        )}

        {/* Source citations */}
        {company.source_citations && company.source_citations.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Shield className="w-3 h-3" />
            {company.source_citations.length} source{company.source_citations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </motion.div>
  );

  const statusInfo = getConnectionStatus();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Perplexity AI Search
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered real-time company search and analysis
          </p>
        </div>
        
        {/* Connection status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusInfo.bg}`}>
          <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             connectionStatus === 'disconnected' ? 'Disconnected' : 'Unknown'}
          </span>
        </div>
      </div>

      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Search Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic search inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region / Location
              </label>
              <input
                type="text"
                value={searchForm.region}
                onChange={(e) => handleFormChange('region', e.target.value)}
                placeholder="e.g., Toronto, Canada"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <input
                type="text"
                value={searchForm.industry}
                onChange={(e) => handleFormChange('industry', e.target.value)}
                placeholder="e.g., Software Development"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Advanced options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Companies
              </label>
              <input
                type="number"
                value={searchForm.numCompanies}
                onChange={(e) => handleFormChange('numCompanies', parseInt(e.target.value) || 10)}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                value={searchForm.model}
                onChange={(e) => handleFormChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sonar-pro">Sonar Pro (Recommended)</option>
                <option value="sonar-medium">Sonar Medium</option>
                <option value="sonar-small">Sonar Small</option>
              </select>
            </div>
          </div>

          {/* Comprehensive search info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Comprehensive Lead Information</h3>
            </div>
            <p className="text-sm text-blue-700">
              Each search automatically includes: Contact details (email, phone), leadership team, 
              company size, revenue, website, location, industry type, founding year, and social profiles.
            </p>
          </div>

          {/* Search button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchForm.region || !searchForm.industry}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              {isSearching ? 'Searching...' : 'Search with AI'}
            </Button>
            
            {/* Progress indicator */}
            {isSearching && (
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${searchProgress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{searchProgress}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search results */}
      {searchResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Search Results
                <span className="text-sm font-normal text-gray-500">
                  ({searchResults.total_found} companies found)
                </span>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConvertToLeads(false)}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Preview as Leads
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConvertToLeads(true)}
                  className="flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Save to Database
                </Button>
              </div>
            </div>
            
            {/* Search metadata */}
            {searchResults.search_metadata && (
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {searchResults.search_metadata.search_duration_seconds?.toFixed(1)}s
                </div>
                <div className="flex items-center gap-1">
                  <Brain className="w-4 h-4" />
                  {searchResults.search_metadata.model_used}
                </div>
                {searchResults.search_metadata.tokens_used && (
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    {searchResults.search_metadata.tokens_used} tokens
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {searchResults.companies && searchResults.companies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.companies.map((company, index) => 
                  renderCompanyCard(company, index)
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No companies found. Try adjusting your search parameters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Converted leads preview */}
      {convertedLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Converted Leads Preview
              <span className="text-sm font-normal text-gray-500">
                ({convertedLeads.length} leads)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {convertedLeads.slice(0, 5).map((lead, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{lead.company}</h4>
                    <p className="text-sm text-gray-600">{lead.location} • {lead.industry}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {lead.score}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {lead.source}
                    </span>
                  </div>
                </div>
              ))}
              {convertedLeads.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  ...and {convertedLeads.length - 5} more leads
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company detail modal */}
      <AnimatePresence>
        {selectedCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
            onClick={() => setSelectedCompany(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h3>
                    <p className="text-gray-600">{selectedCompany.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full">
                      <Star className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {Math.round((selectedCompany.confidence_score || 0) * 100)}%
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCompany(null)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Description */}
                  {selectedCompany.description && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-700">{selectedCompany.description}</p>
                    </div>
                  )}

                  {/* Contact information */}
                  {selectedCompany.contact_info && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                      <div className="space-y-2">
                        {selectedCompany.contact_info.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{selectedCompany.contact_info.phone}</span>
                          </div>
                        )}
                        {selectedCompany.contact_info.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{selectedCompany.contact_info.email}</span>
                          </div>
                        )}
                        {selectedCompany.contact_info.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-500" />
                            <a 
                              href={selectedCompany.contact_info.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {selectedCompany.contact_info.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Company details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCompany.company_size && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Company Size</h4>
                        <p className="text-gray-700">{selectedCompany.company_size.employees}</p>
                      </div>
                    )}
                    {selectedCompany.revenue && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Revenue</h4>
                        <p className="text-gray-700">{selectedCompany.revenue}</p>
                      </div>
                    )}
                    {selectedCompany.founded_year && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Founded</h4>
                        <p className="text-gray-700">{selectedCompany.founded_year}</p>
                      </div>
                    )}
                  </div>

                  {/* Leadership */}
                  {selectedCompany.leadership && selectedCompany.leadership.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Leadership</h4>
                      <div className="space-y-2">
                        {selectedCompany.leadership.map((leader, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-gray-500" />
                            <span>{leader.name} - {leader.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products/Services */}
                  {selectedCompany.products_services && selectedCompany.products_services.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Products & Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCompany.products_services.map((item, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source citations */}
                  {selectedCompany.source_citations && selectedCompany.source_citations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Sources</h4>
                      <div className="space-y-1">
                        {selectedCompany.source_citations.map((source, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                            <Shield className="w-3 h-3" />
                            <span>{source}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerplexityLeadSearch;