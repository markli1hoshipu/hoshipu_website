import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/primitives/button';
import { Checkbox } from '../../ui/primitives/checkbox';
import { Database, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Mail, Phone, User, Globe, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import leadsApiService from '../../../services/leadsApi';
import { useLeadContext } from '../../../contexts/LeadContext';

const EnrichAndSave = ({
  previewResults,
  selectedCompanies,
  onComplete,
  onBack,
  onReset
}) => {
  const { loadLeads } = useLeadContext();

  // Normalize company name for matching (remove hyphens, spaces, special chars)
  const normalizeCompanyName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim()
      .replace(/[-\s]+/g, '')  // Remove hyphens and spaces
      .replace(/[^\w]/g, '');   // Remove special chars
  };

  // Enrichment state
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState([]);
  const [enrichmentComplete, setEnrichmentComplete] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Save state
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  // Don't auto-save - we'll save manually after enrichment completes

  // Start enrichment automatically when component mounts (only if no cache)
  useEffect(() => {
    console.log('🎬 EnrichAndSave mounted with props:', {
      selectedCompaniesSize: selectedCompanies?.size || 0,
      selectedCompaniesType: selectedCompanies?.constructor?.name,
      previewResultsCount: previewResults?.length || 0
    });

    // Skip if we've already loaded data
    if (hasLoadedData) {
      return;
    }

    const enrichCompanies = async () => {
      // Check cache first
      try {
        const cached = sessionStorage.getItem('leadgen_workflow_cache');
        if (cached) {
          const cacheData = JSON.parse(cached);
          console.log('📦 Cache contents:', {
            hasEnrichedResults: !!cacheData.enrichedResults,
            enrichedResultsLength: cacheData.enrichedResults?.length || 0,
            hasSelectedCompanies: !!cacheData.selectedCompanies,
            selectedCompaniesLength: cacheData.selectedCompanies?.length || 0,
            hasPreviewResults: !!cacheData.previewResults,
            previewResultsLength: cacheData.previewResults?.length || 0
          });

          if (cacheData.enrichedResults && cacheData.enrichedResults.length > 0) {
            console.log('📦 Using cached enrichment results');
            setEnrichedData(cacheData.enrichedResults);
            if (cacheData.selectedLeads && Array.isArray(cacheData.selectedLeads)) {
              setSelectedLeads(new Set(cacheData.selectedLeads));
            }
            setEnrichmentComplete(true);
            setIsEnriching(false);
            setHasLoadedData(true);
            return; // Skip enrichment API call
          }
        }
      } catch (error) {
        console.error('Error reading cache:', error);
      }

      // No cache, proceed with enrichment
      setIsEnriching(true);

      try {
        // Fallback to cache if selectedCompanies prop is empty
        let companiesToEnrich = selectedCompanies;
        let resultsToUse = previewResults;

        // Try to restore from cache if props are empty
        try {
          const cached = sessionStorage.getItem('leadgen_workflow_cache');
          if (cached) {
            const cacheData = JSON.parse(cached);

            // Restore selectedCompanies from cache
            if (selectedCompanies.size === 0 && cacheData.selectedCompanies && Array.isArray(cacheData.selectedCompanies) && cacheData.selectedCompanies.length > 0) {
              console.log('📦 Restoring selectedCompanies from cache:', cacheData.selectedCompanies.length);
              companiesToEnrich = new Set(cacheData.selectedCompanies);
            }

            // Restore previewResults from cache
            if ((!previewResults || previewResults.length === 0) && cacheData.previewResults && Array.isArray(cacheData.previewResults) && cacheData.previewResults.length > 0) {
              console.log('📦 Restoring previewResults from cache:', cacheData.previewResults.length);
              resultsToUse = cacheData.previewResults;
            }
          }
        } catch (error) {
          console.error('Error reading from cache:', error);
        }

        // Validate we have companies to enrich
        if (companiesToEnrich.size === 0) {
          console.warn('⚠️ No companies selected for enrichment. Wizard will auto-reset to step 1.');
          setIsEnriching(false);
          setHasLoadedData(true);
          return;
        }

        // Validate we have preview results
        if (!resultsToUse || resultsToUse.length === 0) {
          console.warn('⚠️ No preview data available. Wizard will auto-reset to step 1.');
          setIsEnriching(false);
          setHasLoadedData(true);
          return;
        }

        console.log('💼 Enriching companies:', Array.from(companiesToEnrich));
        console.log('📊 Using preview results:', resultsToUse.length);

        // Get full company data for selected companies
        // Note: For Google Maps results, company ID is place_id
        // For Apollo results, company ID is apollo_company_id
        const selectedCompanyData = resultsToUse.filter(lead => {
          const companyId = lead.place_id || lead.apollo_company_id || lead.id;
          return companiesToEnrich.has(companyId);
        });

        // Ensure each company has proper source and company_name fields for backend
        const companiesWithMetadata = selectedCompanyData.map(lead => ({
          ...lead,
          source: lead.source || 'google_maps',  // Default to google_maps if not specified
          company_name: lead.name || lead.company_name,  // Normalize company name field
          location: lead.location || lead.address  // Normalize location field
        }));

        const response = await leadsApiService.enrichLeads({
          companyIds: Array.from(companiesToEnrich),
          companies: companiesWithMetadata
        });

        console.log('✅ Enrichment results:', response);

        // Map enriched data by company name (since IDs may not match for Google Maps results)
        // Use BOTH Apollo name and original name for reliable matching
        const enrichedMap = new Map();
        response.leads.forEach(lead => {
          // Primary key: Apollo's canonical company name (normalized)
          const apolloName = normalizeCompanyName(lead.company_name);
          if (apolloName) {
            enrichedMap.set(apolloName, lead);
          }

          // Fallback key: Original Google Maps company name (normalized)
          // This handles cases where Apollo returns different name than input
          if (lead.original_company_name) {
            const originalName = normalizeCompanyName(lead.original_company_name);
            if (originalName && originalName !== apolloName) {
              enrichedMap.set(originalName, lead);
            }
          }
        });

        // Build enriched results: include both successful and failed enrichments
        const allProcessedLeads = companiesWithMetadata.map(preview => {
          // Match by normalized company name (handles variations like "Mid-Ohio" vs "Mid Ohio")
          const previewName = normalizeCompanyName(preview.company_name);
          const enriched = enrichedMap.get(previewName);

          if (enriched) {
            // Check if enrichment actually found contact email
            const hasEmail = enriched.contact_email && enriched.contact_email.trim() !== '';

            if (hasEmail) {
              // Successfully enriched with contact email
              // Use Apollo's canonical company name for display and saving
              return {
                ...preview,
                ...enriched,
                company_name: enriched.company_name,  // Prioritize Apollo's canonical name
                contact: enriched.contact_name || 'N/A',
                emails: [enriched.contact_email],
                phone: preview.phone || null,  // Include company phone from Google Maps
                websites: enriched.website ? [enriched.website] : (preview.website ? [preview.website] : []),
                final_score: enriched.final_score || 50,
                is_enriched: true,
                enrichment_status: 'success'
              };
            } else {
              // Enrichment returned company but no email found
              // Use Apollo's canonical company name
              return {
                ...preview,
                ...enriched,
                company_name: enriched.company_name,  // Prioritize Apollo's canonical name
                contact: enriched.contact_name || 'No contact found',
                emails: [],
                phone: preview.phone || null,
                websites: enriched.website ? [enriched.website] : (preview.website ? [preview.website] : []),
                final_score: enriched.final_score || 0,
                is_enriched: false,
                enrichment_status: 'failed'
              };
            }
          } else {
            // Failed enrichment (no Apollo match)
            return {
              ...preview,
              contact: 'No contact found',
              emails: [],
              phone: preview.phone || null,  // Add phone from preview
              websites: preview.website ? [preview.website] : [],
              final_score: 0,
              is_enriched: false,
              enrichment_status: 'failed'
            };
          }
        });

        setEnrichedData(allProcessedLeads);
        setEnrichmentComplete(true);
        setHasLoadedData(true);

        // Save to cache after successful enrichment
        try {
          const cached = sessionStorage.getItem('leadgen_workflow_cache');
          const cacheData = cached ? JSON.parse(cached) : {};
          cacheData.enrichedResults = allProcessedLeads;
          sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
          console.log('💾 Saved enrichment results to cache:', allProcessedLeads.length, 'leads');
        } catch (error) {
          console.error('Error saving enrichment to cache:', error);
        }

        // Pass enriched results to parent
        if (onComplete) {
          onComplete(allProcessedLeads);
        }

      } catch (error) {
        console.error('❌ Enrichment failed:', error);
        toast.error(error.message || 'Enrichment failed');
      } finally {
        setIsEnriching(false);
      }
    };

    enrichCompanies();
  }, [selectedCompanies, previewResults, onComplete, hasLoadedData]);

  // Handle saving selected leads to database
  const handleSaveLeads = useCallback(async () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select leads to save');
      return;
    }

    setIsSaving(true);

    try {
      const leadsToSave = Array.from(selectedLeads).map(index => enrichedData[index]);
      console.log('📋 Leads to save:', leadsToSave.length);

      let savedCount = 0;
      let failedCount = 0;
      const savedLeadIds = [];

      for (const lead of leadsToSave) {
        try {
          // Split contact name into first and last name
          const contactName = lead.contact_name || lead.contact || '';
          const nameParts = contactName.trim().split(/\s+/);
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Convert lead to the format expected by the backend
          const leadData = {
            company: lead.company_name,
            location: lead.location || '',
            industry: lead.industry || '',
            email: lead.contact_email || (lead.emails?.[0]) || '',
            phone: lead.contact_phone || '',
            website: lead.website || (lead.websites?.[0]) || '',
            notes: `AI-generated lead from workflow (Contact: ${contactName || 'Unknown'}) - Score: ${lead.final_score}`,
            source: 'api_import',
            status: 'cold',
            personnel: contactName ? [{
              first_name: firstName,
              last_name: lastName,
              company_name: lead.company_name,
              email: lead.contact_email || (lead.emails?.[0]) || null,
              phone: lead.contact_phone || null,
              position: lead.contact_title || null,
              linkedin_url: lead.contact_linkedin || null
            }] : []
          };

          // Try to create the lead
          try {
            const result = await leadsApiService.createLead(leadData);
            savedCount++;
            if (result && result.lead_id) {
              savedLeadIds.push(result.lead_id);
            }
          } catch (createError) {
            // If duplicate error, find existing lead and add personnel
            if (createError.message?.includes('duplicate') || createError.message?.includes('already exists')) {
              try {
                const existingLeads = await leadsApiService.findLeadsByCompany(lead.company_name);

                if (existingLeads && existingLeads.length > 0 && contactName) {
                  const existingLead = existingLeads[0];

                  const personnelData = {
                    first_name: firstName,
                    last_name: lastName,
                    company_name: lead.company_name,
                    email: lead.contact_email || (lead.emails?.[0]) || null,
                    phone: lead.contact_phone || null,
                    position: lead.contact_title || null,
                    linkedin_url: lead.contact_linkedin || null,
                    lead_id: existingLead.lead_id,
                    source: 'api_import'
                  };

                  await leadsApiService.createPersonnel(personnelData);
                  savedCount++;
                  savedLeadIds.push(existingLead.lead_id);
                } else {
                  failedCount++;
                }
              } catch (personnelError) {
                if (personnelError.message?.includes('duplicate') || personnelError.message?.includes('unique_person_company')) {
                  savedCount++;
                } else {
                  failedCount++;
                }
              }
            } else {
              throw createError;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to save lead ${lead.company_name}:`, error);
          failedCount++;
        }
      }

      // Generate AI analysis for saved leads (in background)
      if (savedLeadIds.length > 0) {
        (async () => {
          for (const leadId of savedLeadIds) {
            try {
              const cachedAnalysis = await leadsApiService.getCachedAISuggestions(leadId);
              if (!cachedAnalysis || !cachedAnalysis.suggestions) {
                await leadsApiService.regenerateAISuggestions(leadId);
              }
            } catch (err) {
              console.error(`⚠️ Failed to process AI analysis for lead ${leadId}:`, err);
            }
          }
        })();
      }

      if (savedCount > 0) {
        setSaveComplete(true);

        // Refresh lead data
        await loadLeads(true);

        // Trigger history refresh
        if (onComplete) {
          onComplete(enrichedData);
        }
      } else {
        toast.error('Failed to save any leads to database');
      }

    } catch (error) {
      console.error('Error saving leads:', error);
      toast.error('Failed to save leads to database');
    } finally {
      setIsSaving(false);
    }
  }, [enrichedData, selectedLeads, loadLeads]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <Database className="text-indigo-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">
          {saveComplete ? 'Leads Saved Successfully!' : 'Enrich & Save Leads'}
        </h2>
        <p className="text-gray-600">
          {saveComplete
            ? 'Your enriched leads have been saved to the database'
            : isEnriching
            ? 'Gathering contact information and enriching leads'
            : 'Review enriched leads and save to database'}
        </p>
      </div>

      {/* Save Complete State */}
      {saveComplete && (
        <div className="space-y-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
            <CheckCircle2 className="text-green-600 mx-auto mb-4" size={64} />
            <h3 className="text-xl font-bold text-green-900 mb-2">
              {selectedLeads.size} Lead{selectedLeads.size !== 1 ? 's' : ''} Saved
            </h3>
            <p className="text-green-700">
              All selected leads have been enriched and saved to your database
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={onReset} className="bg-black hover:bg-gray-800 text-white">
              Start New Search
            </Button>
          </div>
        </div>
      )}

      {/* Enriching State */}
      {!saveComplete && isEnriching && (
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
            <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
            <p className="text-indigo-900 font-medium">
              Enriching {selectedCompanies.size} companies with contact information...
            </p>
            <p className="text-sm text-indigo-700 mt-2">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Enrichment Complete - Show Results */}
      {!saveComplete && !isEnriching && enrichmentComplete && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg pt-4 pb-1 px-4">
            <p className="text-sm text-indigo-900">
              Enriched {enrichedData.filter(l => l.enrichment_status === 'success').length} of {enrichedData.length} companies
            </p>
          </div>

          {/* Select All Controls */}
          {enrichedData.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedLeads.size} of {enrichedData.length} selected
              </p>
              <button
                onClick={() => {
                  if (selectedLeads.size === enrichedData.length) {
                    setSelectedLeads(new Set());
                  } else {
                    setSelectedLeads(new Set(enrichedData.map((_, idx) => idx)));
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
              >
                {selectedLeads.size === enrichedData.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}

          {/* Company Cards */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {enrichedData
              .map((lead, originalIndex) => ({ lead, originalIndex }))
              .sort((a, b) => {
                const aIsSuccess = a.lead.enrichment_status === 'success';
                const bIsSuccess = b.lead.enrichment_status === 'success';

                // Sort successful (green) cards first
                if (aIsSuccess && !bIsSuccess) return -1;
                if (!aIsSuccess && bIsSuccess) return 1;

                // Within same status, maintain original order
                return 0;
              })
              .map(({ lead, originalIndex }) => {
              const isEnriched = lead.enrichment_status === 'success';
              const isSelected = selectedLeads.has(originalIndex);

              return (
                <button
                  key={originalIndex}
                  onClick={() => {
                    const newSelection = new Set(selectedLeads);
                    if (isSelected) {
                      newSelection.delete(originalIndex);
                    } else {
                      newSelection.add(originalIndex);
                    }
                    setSelectedLeads(newSelection);
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50'
                      : isEnriched
                      ? 'border-green-200 bg-green-50 hover:border-green-300'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-gray-900 font-medium">{lead.company_name}</h4>
                    {isSelected ? (
                      <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center flex-shrink-0">
                        <Check className="text-white" size={16} />
                      </div>
                    ) : isEnriched ? (
                      <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
                    ) : (
                      <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                    )}
                  </div>

                  {isEnriched && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User size={16} className="text-gray-400" />
                        {lead.contact || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail size={16} className="text-gray-400" />
                        {lead.emails?.[0] || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={16} className="text-gray-400" />
                        {lead.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Globe size={16} className="text-gray-400" />
                        {lead.website || lead.websites?.[0] || 'N/A'}
                      </div>
                    </div>
                  )}

                  {!isEnriched && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        No contact information found. Showing company contact instead.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={16} className="text-gray-400" />
                          N/A
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={16} className="text-gray-400" />
                          N/A
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={16} className="text-gray-400" />
                          {lead.phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Globe size={16} className="text-gray-400" />
                          {lead.websites?.[0] || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onBack} disabled={isSaving} className="border-gray-300">
              Back
            </Button>
            <Button
              onClick={handleSaveLeads}
              disabled={selectedLeads.size === 0 || isSaving}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                'Save to Database'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrichAndSave;
