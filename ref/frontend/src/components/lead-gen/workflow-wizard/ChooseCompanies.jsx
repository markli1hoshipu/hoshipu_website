import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/primitives/button';
import { Checkbox } from '../../ui/primitives/checkbox';
import { Search, Loader2, AlertCircle, Building2, MapPin, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import leadsApiService from '../../../services/leadsApi';

const ChooseCompanies = ({
  query,
  parsedIntent,
  numberOfLeads,
  onComplete,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [previewLeads, setPreviewLeads] = useState([]);
  const [selectedForEnrichment, setSelectedForEnrichment] = useState(new Set());
  const [error, setError] = useState(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Fetch preview leads when component mounts (only if no cache)
  useEffect(() => {
    // Skip if we've already loaded data
    if (hasLoadedData) {
      console.log('⏭️ Skipping fetch - data already loaded');
      return;
    }

    const fetchPreviewLeads = async () => {
      // Small delay to ensure cache clearing from parent completes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check cache first
      try {
        const cached = sessionStorage.getItem('leadgen_workflow_cache');
        console.log('🔍 Checking cache for preview results...');
        if (cached) {
          const cacheData = JSON.parse(cached);
          console.log('📦 Cache check:', {
            hasPreviewResults: !!cacheData.previewResults,
            previewResultsLength: cacheData.previewResults?.length || 0,
            clearTimestamp: cacheData._clearTimestamp,
            isArray: Array.isArray(cacheData.previewResults),
            rawValue: cacheData.previewResults
          });

          if (cacheData.previewResults && cacheData.previewResults.length > 0) {
            console.log('✅ Using cached preview results:', cacheData.previewResults.length, 'companies');
            setPreviewLeads(cacheData.previewResults);
            if (cacheData.selectedCompanies && Array.isArray(cacheData.selectedCompanies)) {
              setSelectedForEnrichment(new Set(cacheData.selectedCompanies));
            }
            setIsLoading(false);
            setHasLoadedData(true);
            return; // Skip API call
          } else {
            console.log('⚠️ Cache exists but preview results empty or missing');
          }
        } else {
          console.log('⚠️ No cache found');
        }
      } catch (error) {
        console.error('Error reading cache:', error);
      }

      console.log('🌐 Fetching fresh data from API...');
      // No cache, fetch from API
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔍 Fetching preview leads:', {
          industry: parsedIntent?.industry,
          location: parsedIntent?.location,
          maxResults: numberOfLeads,
          companySize: parsedIntent?.company_size,
          keywords: parsedIntent?.keywords
        });

        const response = await leadsApiService.previewLeads({
          industry: parsedIntent?.industry,
          location: parsedIntent?.location,
          maxResults: numberOfLeads,
          companySize: parsedIntent?.company_size,
          keywords: parsedIntent?.keywords
        });

        console.log('✅ Preview results received:', response);

        // Google Maps returns 'companies', Apollo returns 'leads' - handle both
        const companies = response.companies || response.leads || [];
        setPreviewLeads(companies);
        setHasLoadedData(true);

        // Save to cache after successful fetch
        try {
          const cached = sessionStorage.getItem('leadgen_workflow_cache');
          const cacheData = cached ? JSON.parse(cached) : {};
          cacheData.previewResults = companies;
          sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
          console.log('💾 Saved preview results to cache:', companies.length, 'companies');
        } catch (error) {
          console.error('Error saving to cache:', error);
        }

        if (companies.length === 0) {
          toast('No new companies found matching your criteria', { icon: 'ℹ️' });
        } else {
          toast.success(`Found ${companies.length} companies`);
        }

      } catch (err) {
        console.error('❌ Preview failed:', err);
        setError(err.message || 'Failed to fetch companies');
        toast.error(err.message || 'Preview search failed');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviewLeads();
  }, [parsedIntent, numberOfLeads, hasLoadedData]);

  const handleSelectAll = useCallback(() => {
    const allCompanyIds = previewLeads.map(company => company.place_id || company.id || company.company_name);
    const newSelection = new Set(allCompanyIds);
    setSelectedForEnrichment(newSelection);

    // Save selection to cache
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      const cacheData = cached ? JSON.parse(cached) : {};
      cacheData.selectedCompanies = Array.from(newSelection);
      sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving selection to cache:', error);
    }
  }, [previewLeads]);

  const handleDeselectAll = useCallback(() => {
    setSelectedForEnrichment(new Set());

    // Save selection to cache
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      const cacheData = cached ? JSON.parse(cached) : {};
      cacheData.selectedCompanies = [];
      sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving selection to cache:', error);
    }
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedForEnrichment.size === 0) {
      toast.error('Please select at least one company to continue');
      return;
    }

    console.log('🚀 ChooseCompanies: Passing to next step:', {
      previewLeadsCount: previewLeads.length,
      selectedCount: selectedForEnrichment.size,
      selectedIds: Array.from(selectedForEnrichment)
    });

    // Pass preview results and selected companies to next step
    onComplete(previewLeads, selectedForEnrichment);
  }, [previewLeads, selectedForEnrichment, onComplete]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <Search className="text-indigo-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">Choose Companies</h2>
        <p className="text-gray-600">
          Select the companies you'd like to enrich with contact information
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-gray-600">Searching for companies...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Search Failed</h3>
              <p className="text-red-800 mb-4">{error}</p>
              <div className="flex gap-2">
                <Button onClick={onBack} variant="outline">
                  Go Back
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Results Table */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Info Banner */}
          {previewLeads.length > 0 && (
            <div className="bg-indigo-50 rounded-lg pt-4 pb-1 px-4">
              <p className="text-sm text-indigo-900">
                Found <strong>{previewLeads.length}</strong> companies matching your criteria
              </p>
            </div>
          )}

          {/* Select All Controls */}
          {previewLeads.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedForEnrichment.size} of {previewLeads.length} selected
              </p>
              <button
                onClick={selectedForEnrichment.size === previewLeads.length ? handleDeselectAll : handleSelectAll}
                className="px-4 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
              >
                {selectedForEnrichment.size === previewLeads.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}

          {/* Company Cards */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {previewLeads.map((company, idx) => {
              const companyId = company.place_id || company.id || idx;
              const isSelected = selectedForEnrichment.has(companyId);

              return (
                <button
                  key={companyId}
                  onClick={() => {
                    const newSelection = new Set(selectedForEnrichment);
                    if (isSelected) {
                      newSelection.delete(companyId);
                    } else {
                      newSelection.add(companyId);
                    }
                    setSelectedForEnrichment(newSelection);

                    // Save selection to cache
                    try {
                      const cached = sessionStorage.getItem('leadgen_workflow_cache');
                      const cacheData = cached ? JSON.parse(cached) : {};
                      cacheData.selectedCompanies = Array.from(newSelection);
                      sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
                    } catch (error) {
                      console.error('Error saving selection to cache:', error);
                    }
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="text-indigo-600" size={20} />
                        <h3 className="text-gray-900 font-medium">{company.name || company.company_name || 'Unknown Company'}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-8 text-sm text-gray-600">
                        {company.industry && <div>Industry: {company.industry}</div>}
                        {company.employee_count && <div>Employees: {company.employee_count}</div>}
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {company.location || company.address || 'N/A'}
                        </div>
                        {company.website && <div>{company.website}</div>}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="ml-4">
                        <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                          <Check className="text-white" size={16} />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onBack} className="border-gray-300">
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={selectedForEnrichment.size === 0}
              className="bg-black hover:bg-gray-800 text-white"
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChooseCompanies;
