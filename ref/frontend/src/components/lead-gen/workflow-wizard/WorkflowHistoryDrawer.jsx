import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../ui/primitives/sheet';
import { ScrollArea } from '../../ui/primitives/scroll-area';
import { Button } from '../../ui/primitives/button';
import { Badge } from '../../ui/primitives/badge';
import { Separator } from '../../ui/primitives/separator';
import { Checkbox } from '../../ui/primitives/checkbox';
import {
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  RefreshCw,
  CheckCircle
  // Trash2 - removed from UI but backend delete logic preserved for future use
} from 'lucide-react';
import leadsApiService from '../../../services/leadsApi';
import toast from 'react-hot-toast';
import { useLeadContext } from '../../../contexts/LeadContext';

const WorkflowHistoryDrawer = ({ open, onOpenChange }) => {
  const { loadLeads } = useLeadContext();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState(new Set());
  // const [deleteConfirm, setDeleteConfirm] = useState(null); // REMOVED: Delete UI hidden, backend preserved
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);

  // Load enrichment history (initial load with pagination)
  const loadHistory = async (skipCache = false) => {
    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      try {
        const cached = sessionStorage.getItem('leadgen_history_cache');
        if (cached) {
          const cacheData = JSON.parse(cached);
          console.log('📦 Using cached history data');
          setHistory(cacheData.history || []);
          setExistingCompanies(new Set(cacheData.existingCompanies || []));
          setHasMore(cacheData.hasMore || false);
          setCurrentOffset(cacheData.currentOffset || 0);
          setLoading(false);
          return; // Skip API call
        }
      } catch (error) {
        console.error('Error reading history cache:', error);
      }
    }

    // No cache, fetch first page from API
    try {
      setLoading(true);
      const result = await leadsApiService.getEnrichmentHistory(20, 0);
      setHistory(result.history);
      setHasMore(result.hasMore);
      setCurrentOffset(20);

      // Batch check which companies already exist
      const existingSet = new Set();
      if (result.history && result.history.length > 0) {
        try {
          const companyNames = result.history.map(record => record.company_name);
          const existingCompaniesMap = await leadsApiService.batchCheckCompaniesExist(companyNames);

          for (const [companyName, exists] of Object.entries(existingCompaniesMap)) {
            if (exists) {
              existingSet.add(companyName);
            }
          }
        } catch (error) {
          console.error('Error batch checking companies:', error);
        }
      }
      setExistingCompanies(existingSet);

      // Save to cache
      try {
        const cacheData = {
          history: result.history,
          existingCompanies: Array.from(existingSet),
          hasMore: result.hasMore,
          currentOffset: 20,
          timestamp: Date.now()
        };
        sessionStorage.setItem('leadgen_history_cache', JSON.stringify(cacheData));
        console.log('💾 Saved history to cache:', result.history.length, 'records');
      } catch (error) {
        console.error('Error saving history to cache:', error);
      }

    } catch (error) {
      console.error('Error loading enrichment history:', error);
      if (error.message?.includes('Employee not found')) {
        setHistory([]);
      } else {
        toast.error('Failed to load enrichment history');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load more records
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const result = await leadsApiService.getEnrichmentHistory(20, currentOffset);

      // Append new records to existing history
      const newHistory = [...history, ...result.history];
      setHistory(newHistory);
      setHasMore(result.hasMore);
      setCurrentOffset(currentOffset + 20);

      // Batch check new companies
      if (result.history && result.history.length > 0) {
        try {
          const companyNames = result.history.map(record => record.company_name);
          const existingCompaniesMap = await leadsApiService.batchCheckCompaniesExist(companyNames);

          const existingSet = new Set(existingCompanies);
          for (const [companyName, exists] of Object.entries(existingCompaniesMap)) {
            if (exists) {
              existingSet.add(companyName);
            }
          }
          setExistingCompanies(existingSet);

          // Update cache
          try {
            const cacheData = {
              history: newHistory,
              existingCompanies: Array.from(existingSet),
              hasMore: result.hasMore,
              currentOffset: currentOffset + 20,
              timestamp: Date.now()
            };
            sessionStorage.setItem('leadgen_history_cache', JSON.stringify(cacheData));
          } catch (error) {
            console.error('Error updating cache:', error);
          }
        } catch (error) {
          console.error('Error batch checking companies:', error);
        }
      }
    } catch (error) {
      console.error('Error loading more history:', error);
      toast.error('Failed to load more records');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load on mount, when drawer opens, and when cache refresh is triggered
  useEffect(() => {
    if (open) {
      loadHistory();
    }

    // Listen for cache refresh events
    const handleStorageChange = (e) => {
      if (e.key === 'leadgen_history_refresh' && open) {
        // Clear cache and reload
        sessionStorage.removeItem('leadgen_history_cache');
        loadHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check on interval for same-tab updates (storage event doesn't fire in same tab)
    const checkRefresh = () => {
      if (open) {
        try {
          const refreshTimestamp = sessionStorage.getItem('leadgen_history_refresh');
          const lastCheck = sessionStorage.getItem('leadgen_history_last_check');

          if (refreshTimestamp && refreshTimestamp !== lastCheck) {
            sessionStorage.setItem('leadgen_history_last_check', refreshTimestamp);
            // Clear cache and reload
            sessionStorage.removeItem('leadgen_history_cache');
            loadHistory();
          }
        } catch (error) {
          console.error('Error checking history refresh:', error);
        }
      }
    };

    const intervalId = setInterval(checkRefresh, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [open]);

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

  // REMOVED FROM UI: Delete functionality preserved for future use
  // Backend endpoint still available at: DELETE /api/enrichment-history/{record_id}
  // Frontend API method: leadsApiService.deleteEnrichmentHistory(recordId)
  /*
  const handleDeleteRecord = async () => {
    if (!deleteConfirm) return;

    try {
      // 1. Optimistically update UI immediately
      setHistory(prev => prev.filter(record => record.id !== deleteConfirm.id));
      setDeleteConfirm(null);

      // 2. Delete from backend in background
      await leadsApiService.deleteEnrichmentHistory(deleteConfirm.id);

      // 3. Clear cache so next open fetches fresh data
      sessionStorage.removeItem('leadgen_history_cache');

      toast.success(`Removed ${deleteConfirm.name} from history`);
    } catch (error) {
      // 4. If delete fails, revert by reloading
      console.error('Error deleting record:', error);

      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to delete record';
      toast.error(errorMessage);

      loadHistory(true); // Reload to restore correct state
    }
  };
  */

  // Handle save selected to database
  const handleSaveSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select companies to save');
      return;
    }

    const selectedRecords = history.filter(r => selectedIds.has(r.id));
    const savedCompanyNames = selectedRecords.map(r => r.company_name);

    try {
      // 1. IMMEDIATELY update UI - mark as saved
      setExistingCompanies(prev => {
        const updated = new Set(prev);
        savedCompanyNames.forEach(name => updated.add(name));
        return updated;
      });

      // 2. Clear selection immediately
      setSelectedIds(new Set());

      // 3. Show optimistic success message
      toast.success(`Saving ${selectedRecords.length} lead${selectedRecords.length > 1 ? 's' : ''} to database...`);

      // 4. Save in background (don't block UI)
      setIsSaving(true);
      let savedCount = 0;
      let failedCount = 0;
      const savedLeadIds = [];

      for (const record of selectedRecords) {
        try {
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

          try {
            const result = await leadsApiService.createLead(leadData);
            savedCount++;
            if (result && result.lead_id) {
              savedLeadIds.push(result.lead_id);
            }
          } catch (createError) {
            if (createError.message?.includes('duplicate') || createError.message?.includes('already exists')) {
              try {
                const existingLeads = await leadsApiService.findLeadsByCompany(record.company_name);

                if (existingLeads && existingLeads.length > 0 && record.contact_name) {
                  const existingLead = existingLeads[0];

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
          console.error(`Failed to save ${record.company_name}:`, error);
          failedCount++;
        }
      }

      // 5. Background tasks (don't block user)
      if (savedLeadIds.length > 0) {
        // Generate AI analysis in background
        (async () => {
          for (const leadId of savedLeadIds) {
            try {
              const cachedAnalysis = await leadsApiService.getCachedAISuggestions(leadId);
              if (!cachedAnalysis || !cachedAnalysis.suggestions) {
                await leadsApiService.regenerateAISuggestions(leadId);
              }
            } catch (err) {
              console.error(`Failed to process AI analysis for lead ${leadId}:`, err);
            }
          }
        })();

        // Refresh lead list in background
        loadLeads(true);
      }

      // 6. Update cache to persist saved state
      try {
        const cached = sessionStorage.getItem('leadgen_history_cache');
        if (cached) {
          const cacheData = JSON.parse(cached);
          cacheData.existingCompanies = Array.from(existingCompanies);
          sessionStorage.setItem('leadgen_history_cache', JSON.stringify(cacheData));
        }
      } catch (err) {
        console.error('Error updating cache:', err);
      }

      // 7. Show final result if there were errors
      if (failedCount > 0 && savedCount > 0) {
        toast(`Saved ${savedCount}, ${failedCount} failed`, { icon: '⚠️' });
      } else if (savedCount === 0) {
        toast.error('Failed to save any leads');
        // Revert UI on complete failure
        setExistingCompanies(prev => {
          const updated = new Set(prev);
          savedCompanyNames.forEach(name => updated.delete(name));
          return updated;
        });
      }
    } catch (error) {
      console.error('Error saving leads:', error);
      toast.error('Failed to save leads');

      // Revert optimistic UI update on error
      setExistingCompanies(prev => {
        const updated = new Set(prev);
        savedCompanyNames.forEach(name => updated.delete(name));
        return updated;
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle  className="text-2xl font-bold">Search History</SheetTitle>
          <SheetDescription>
            View and manage your previous lead generation searches
          </SheetDescription>
        </SheetHeader>

        {/* Action Buttons */}
        {history.length > 0 && (
          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="text-sm text-gray-600">
              {selectedIds.size > 0 && `${selectedIds.size} selected`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Clear cache and refresh
                  sessionStorage.removeItem('leadgen_history_cache');
                  loadHistory(true);
                }}
                disabled={loading}
                className="border-gray-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSelected}
                disabled={selectedIds.size === 0 || isSaving}
                className="bg-black hover:bg-gray-800 text-white"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save Selected (${selectedIds.size})`
                )}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No enrichment history yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Enriched companies will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {history.map((record) => {
                  const alreadyExists = existingCompanies.has(record.company_name);
                  const isSelected = selectedIds.has(record.id);

                  return (
                    <div
                      key={record.id}
                      onClick={() => handleToggleSelect(record.id)}
                      className={`w-full border rounded-lg p-4 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-indigo-300 bg-indigo-50'
                          : alreadyExists
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={alreadyExists ? true : isSelected}
                            onClick={(e) => e.stopPropagation()}
                            className={alreadyExists && !isSelected ? "bg-gray-400 border-gray-400" : ""}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Building className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              <h4 className="font-medium text-gray-900 truncate">
                                {record.company_name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              {alreadyExists && (
                                <Badge variant="secondary" className="text-xs">
                                  Saved
                                </Badge>
                              )}
                              {/* DELETE BUTTON REMOVED: Backend delete logic preserved for future use */}
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 mb-3">
                            {record.contact_name && (
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-3 h-3 text-gray-400" />
                                <span className="truncate">
                                  {record.contact_name}
                                  {record.contact_title && ` • ${record.contact_title}`}
                                </span>
                              </div>
                            )}
                            {record.contact_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="truncate">{record.contact_email}</span>
                              </div>
                            )}
                            {record.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="truncate">{record.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(record.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="border-gray-300"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {/* DELETE CONFIRMATION DIALOG REMOVED: Backend delete logic preserved for future use */}
      </SheetContent>
    </Sheet>
  );
};

export default WorkflowHistoryDrawer;
