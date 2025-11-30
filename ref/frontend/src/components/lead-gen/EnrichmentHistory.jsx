import React, { useState, useEffect } from 'react';
import { CheckCircle, Calendar, Building, Mail, Phone, MapPin, Briefcase, RefreshCw } from 'lucide-react';
import { Checkbox } from '../ui/primitives/checkbox';
import { Button } from '../ui/primitives/button';
import leadsApiService from '../../services/leadsApi';
import toast from 'react-hot-toast';
import { useLeadContext } from '../../contexts/LeadContext';

const EnrichmentHistory = ({ refreshTrigger }) => {
  const { loadLeads } = useLeadContext();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState(new Set());

  // Load enrichment history and check which companies already exist
  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await leadsApiService.getEnrichmentHistory(100);
      setHistory(data);

      // Batch check which companies already exist in the database
      const existingSet = new Set();
      if (data && data.length > 0) {
        try {
          const companyNames = data.map(record => record.company_name);
          const existingCompaniesMap = await leadsApiService.batchCheckCompaniesExist(companyNames);

          // Build set of existing companies
          for (const [companyName, exists] of Object.entries(existingCompaniesMap)) {
            if (exists) {
              existingSet.add(companyName);
            }
          }
        } catch (error) {
          console.error('Error batch checking companies:', error);
          // Fall back to empty set if batch check fails
        }
      }
      setExistingCompanies(existingSet);
    } catch (error) {
      console.error('Error loading enrichment history:', error);
      // If employee not found, show empty state instead of error
      if (error.message?.includes('Employee not found')) {
        setHistory([]);
      } else {
        toast.error('Failed to load enrichment history');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when refresh triggered
  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]);

  // Handle select/deselect individual item
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle select/deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(r => r.id)));
    }
  };

  // Handle save selected to database
  const handleSaveSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select companies to save');
      return;
    }

    try {
      setIsSaving(true);
      toast.loading('Saving to lead database...', { id: 'save-enrichment' });

      // Get selected records
      const selectedRecords = history.filter(r => selectedIds.has(r.id));

      let savedCount = 0;
      let failedCount = 0;
      let updatedCount = 0;
      const savedLeadIds = []; // Track successfully saved lead IDs for AI generation

      // Save each lead individually
      for (const record of selectedRecords) {
        try {
          // Split contact name into first and last name
          const contactName = record.contact_name || '';
          const nameParts = contactName.trim().split(/\s+/);
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';

          const leadData = {
            company: record.company_name,
            location: record.location || null,
            industry: record.industry || null,
            email: record.contact_email || null,
            phone: record.contact_phone || null,
            website: record.website || null,
            notes: `Enriched lead from Apollo.io`,
            source: 'api_import',
            status: 'cold',
            // Include personnel data
            personnel: record.contact_name ? [{
              first_name: firstName,
              last_name: lastName,
              company_name: record.company_name,
              email: record.contact_email || null,
              phone: record.contact_phone || null,
              position: record.contact_title || null,
              linkedin_url: record.contact_linkedin || null
            }] : []
          };

          // Try to create the lead
          try {
            const result = await leadsApiService.createLead(leadData);
            savedCount++;
            // Track lead ID for AI generation
            if (result && result.lead_id) {
              savedLeadIds.push(result.lead_id);
            }
          } catch (createError) {
            // If duplicate error, find existing lead and add personnel
            if (createError.message?.includes('duplicate') || createError.message?.includes('already exists')) {
              try {
                // Find existing lead by company name
                const existingLeads = await leadsApiService.findLeadsByCompany(record.company_name);

                if (existingLeads && existingLeads.length > 0 && record.contact_name) {
                  // Get the first matching lead
                  const existingLead = existingLeads[0];

                  // Create personnel record for the existing lead
                  const personnelData = {
                    first_name: firstName,
                    last_name: lastName,
                    company_name: record.company_name,
                    email: record.contact_email || null,
                    phone: record.contact_phone || null,
                    position: record.contact_title || null,
                    linkedin_url: record.contact_linkedin || null,
                    lead_id: existingLead.lead_id,
                    source: 'api_import'
                  };

                  await leadsApiService.createPersonnel(personnelData);
                  updatedCount++;
                  // Track existing lead ID for AI generation
                  savedLeadIds.push(existingLead.lead_id);
                } else {
                  // No existing lead found or no contact name to add
                  failedCount++;
                }
              } catch (personnelError) {
                // Check if personnel already exists
                if (personnelError.message?.includes('duplicate') || personnelError.message?.includes('unique_person_company')) {
                  // Personnel already exists, consider it an update
                  updatedCount++;
                } else {
                  console.error(`Failed to add personnel for ${record.company_name}:`, personnelError);
                  failedCount++;
                }
              }
            } else {
              throw createError;
            }
          }
        } catch (error) {
          console.error(`Failed to process ${record.company_name}:`, error);
          failedCount++;
        }
      }

      // Generate AI analysis for all successfully saved leads (in background)
      // Only generate if analysis doesn't already exist
      if (savedLeadIds.length > 0) {
        console.log(`🤖 Checking AI analysis for ${savedLeadIds.length} saved leads...`);
        // Process AI analysis generation sequentially
        (async () => {
          for (const leadId of savedLeadIds) {
            try {
              // Check if analysis already exists
              const cachedAnalysis = await leadsApiService.getCachedAISuggestions(leadId);
              if (cachedAnalysis && cachedAnalysis.suggestions) {
                console.log(`ℹ️ AI analysis already exists for lead ${leadId}, skipping generation`);
              } else {
                // Generate new analysis only if it doesn't exist
                await leadsApiService.regenerateAISuggestions(leadId);
                console.log(`✅ AI analysis generated for lead ${leadId}`);
              }
            } catch (err) {
              console.error(`⚠️ Failed to process AI analysis for lead ${leadId}:`, err);
            }
          }
        })();
      }

      toast.dismiss('save-enrichment');

      const totalSuccess = savedCount + updatedCount;

      if (totalSuccess > 0) {
        let message = '';
        if (savedCount > 0) {
          message += `Saved ${savedCount} new lead${savedCount > 1 ? 's' : ''}`;
        }
        if (updatedCount > 0) {
          if (message) message += ', ';
          message += `added personnel to ${updatedCount} existing lead${updatedCount > 1 ? 's' : ''}`;
        }
        if (failedCount > 0) {
          message += ` (${failedCount} failed)`;
        }
        toast.success(message);

        // Clear selection
        setSelectedIds(new Set());

        // Refresh lead data to show newly saved leads in the table
        await loadLeads(true);

        // Refresh enrichment history to update checkbox states
        await loadHistory();
      } else {
        toast.error('Failed to save any leads to database');
      }

    } catch (error) {
      console.error('Error saving leads:', error);
      toast.dismiss('save-enrichment');
      toast.error(error.message || 'Failed to save leads');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <h3 className="text-3xl font-black text-gray-900 mb-2">Enrichment History</h3>
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <h3 className="text-3xl font-black text-gray-900 mb-2">Enrichment History</h3>
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600 font-medium">
              No enrichment history yet
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Your enriched companies will appear here after you use the "Enrich Selected Companies" feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-3xl font-black text-gray-900 mb-2">Enrichment History</h3>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600 font-medium">
              {history.length} enriched {history.length === 1 ? 'company' : 'companies'}
            </span>
          </div>
        </div>

        {/* Action Bar - Above Table - Full Width */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-t-lg px-4 py-3">
          <div className="text-sm text-gray-600">
            {selectedIds.size > 0 ? `${selectedIds.size} ${selectedIds.size === 1 ? 'company' : 'companies'} selected` : 'Select companies to save'}
          </div>
          <Button
            onClick={handleSaveSelected}
            disabled={selectedIds.size === 0 || isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save to Database'
            )}
          </Button>
        </div>

        {/* History Table */}
        <div className="bg-white border-l border-r border-b border-gray-200 rounded-b-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedIds.size === history.length && history.length > 0}
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enriched Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((record) => {
                  const isExisting = existingCompanies.has(record.company_name);
                  const isSelected = selectedIds.has(record.id);

                  // Determine checkbox appearance:
                  // - Existing + Selected = Blue with tick (default selected style)
                  // - Existing + Not Selected = Gray with tick (show as pre-filled)
                  // - New + Selected = Blue with tick (default selected style)
                  // - New + Not Selected = Empty (default unselected style)
                  const checkboxClassName = isExisting && !isSelected
                    ? "bg-gray-400 border-gray-400"
                    : "";
                  const forceShowTick = isExisting && !isSelected;

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={isSelected || forceShowTick}
                          onCheckedChange={() => handleToggleSelect(record.id)}
                          className={checkboxClassName}
                        />
                      </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.company_name}
                          </div>
                          {record.website && (
                            <a
                              href={record.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {record.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {record.contact_name && (
                          <div className="font-medium text-gray-900">
                            {record.contact_name}
                          </div>
                        )}
                        {record.contact_title && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {record.contact_title}
                          </div>
                        )}
                        {record.contact_email && (
                          <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {record.contact_email}
                          </div>
                        )}
                        {record.contact_phone && (
                          <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {record.contact_phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {record.location && (
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {record.location}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {record.industry && (
                        <span className="text-sm text-gray-900">{record.industry}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(record.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrichmentHistory;
