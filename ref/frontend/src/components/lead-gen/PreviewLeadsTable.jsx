import React from 'react';
import { Checkbox } from '../ui/primitives/checkbox';
import { Button } from '../ui/primitives/button';
import { CheckCircle, RefreshCw } from 'lucide-react';

/**
 * PreviewLeadsTable - Displays preview leads with selection for enrichment
 * Stage 1 of the two-stage workflow: shows company data without contact details
 * Matches the styling of Workflow Results block
 */
const PreviewLeadsTable = ({
  leads = [],
  selectedForEnrichment = new Set(),
  onSelectionChange,
  onEnrichSelected,
  isEnriching = false,
}) => {
  // Handle selection toggle for individual row
  const handleToggleSelection = (apolloCompanyId) => {
    const newSelection = new Set(selectedForEnrichment);
    if (newSelection.has(apolloCompanyId)) {
      newSelection.delete(apolloCompanyId);
    } else {
      newSelection.add(apolloCompanyId);
    }
    onSelectionChange(newSelection);
  };

  // Handle select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedForEnrichment.size === leads.length) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      const allIds = new Set(leads.map(lead => lead.apollo_company_id));
      onSelectionChange(allIds);
    }
  };

  // Check if all visible rows are selected
  const allSelected = leads.length > 0 && selectedForEnrichment.size === leads.length;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-3xl font-black text-gray-900 mb-2">Preview Results</h3>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600 font-medium">
              Found {leads.length} companies • {selectedForEnrichment.size} selected for enrichment
            </span>
          </div>
        </div>

        {/* Empty State */}
        {(!leads || leads.length === 0) && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No New Companies Found</h4>
            <p className="text-gray-600">
              All companies matching your search criteria already exist in the database or your enrichment history.
            </p>
          </div>
        )}

        {/* Preview Leads Table - Only show when there are leads */}
        {leads && leads.length > 0 && (
        <div className="mb-6">
          {/* Action Bar - Above Table - Full Width */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-t-lg px-4 py-3">
            <div className="text-sm text-gray-600">
              {selectedForEnrichment.size > 0 ? `${selectedForEnrichment.size} compan${selectedForEnrichment.size > 1 ? 'ies' : 'y'} selected` : 'Select companies to enrich'}
            </div>
            <Button
              onClick={onEnrichSelected}
              disabled={selectedForEnrichment.size === 0 || isEnriching}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
            >
              {isEnriching ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                'Enrich Companies'
              )}
            </Button>
          </div>

          {/* Table */}
          <div className="bg-white border-l border-r border-b border-gray-200 rounded-b-lg">
          {/* Scrollable Table Container */}
          <div className="overflow-x-auto overflow-y-auto max-h-96">
            {/* Table using proper CSS table layout for perfect alignment */}
            <table className="w-full table-fixed min-w-max">
              {/* Table Header - Sticky */}
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="w-12 px-3 py-3 text-left">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleToggleSelectAll}
                      disabled={isEnriching}
                      aria-label="Select all leads"
                    />
                  </th>
                  <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {leads.map((lead) => {
                  const isSelected = selectedForEnrichment.has(lead.apollo_company_id);

                  return (
                    <tr
                      key={lead.apollo_company_id}
                      onClick={() => !isEnriching && handleToggleSelection(lead.apollo_company_id)}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="w-12 px-3 py-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={isEnriching}
                          aria-label={`Select ${lead.company_name}`}
                        />
                      </td>
                      <td className="w-48 px-3 py-3 text-sm font-medium text-gray-900 truncate" title={lead.company_name}>
                        {lead.company_name}
                      </td>
                      <td className="w-24 px-3 py-3 text-sm text-purple-600 truncate" title={lead.industry}>
                        {lead.industry || 'N/A'}
                      </td>
                      <td className="w-32 px-3 py-3 text-sm text-gray-600 truncate" title={lead.location}>
                        {lead.location || 'N/A'}
                      </td>
                      <td className="w-48 px-3 py-3 text-sm truncate">
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 underline"
                            title={lead.website}
                          >
                            {lead.website}
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="w-24 px-3 py-3 text-sm text-gray-600 truncate">
                        {lead.employee_count || 'N/A'}
                      </td>
                      <td className="w-32 px-3 py-3 text-sm text-gray-600 truncate">
                        {lead.revenue_estimate || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default PreviewLeadsTable;
