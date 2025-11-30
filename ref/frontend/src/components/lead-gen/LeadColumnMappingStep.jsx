import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../ui/primitives/button';

const LeadColumnMappingStep = ({ analysisResult, onMappingComplete, onBack }) => {
  const [mappings, setMappings] = useState({});

  // Lead field descriptions (different from CRM)
  const fieldDescriptions = {
    company: 'Company name (Required)',
    contact_name: 'Primary contact person name',
    email: 'Contact email address',
    phone: 'Phone number',
    website: 'Company website URL',
    industry: 'Industry sector',
    location: 'Geographic location',
    company_size: 'Company size category',
    revenue: 'Revenue range',
    employees_count: 'Number of employees',
    rating: 'Company rating (0-5)',
    status: 'Lead status',
    source: 'Lead source',
    score: 'Lead score (0-100)',
    notes: 'Additional notes',
    assigned_to: 'Assigned team member',
    position: 'Contact person position',
    linkedin_url: 'LinkedIn company URL',
    tags: 'Tags (comma-separated)'
  };

  // Only company is required for leads
  const requiredFields = ['company'];

  useEffect(() => {
    // Initialize with suggested mappings
    setMappings(analysisResult.suggested_mappings || {});
  }, [analysisResult]);

  const handleMappingChange = (sourceColumn, targetField) => {
    setMappings(prev => ({
      ...prev,
      [sourceColumn]: targetField === 'none' ? undefined : targetField
    }));
  };

  const getMappedFields = () => {
    return Object.values(mappings).filter(Boolean);
  };

  const getUnmappedRequiredFields = () => {
    const mappedFields = getMappedFields();
    return requiredFields.filter(field => !mappedFields.includes(field));
  };

  const canProceed = () => {
    // Check if all required fields are mapped
    const mappedFields = getMappedFields();
    const hasAllRequired = requiredFields.every(field => mappedFields.includes(field));
    return hasAllRequired;
  };

  const handleContinue = () => {
    if (canProceed()) {
      onMappingComplete(mappings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Map Your Columns
        </h3>
        <p className="text-gray-600">
          Match your CSV columns to the appropriate lead fields. Only company name is required.
        </p>
      </div>

      {/* Status Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-900">{analysisResult.source_columns.length}</div>
            <div className="text-gray-600">Source Columns</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{Object.keys(mappings).length}</div>
            <div className="text-gray-600">Mapped Columns</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{analysisResult.crm_fields.length}</div>
            <div className="text-gray-600">Available Fields</div>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {!canProceed() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-red-800">Required Fields Missing</h4>
              <p className="text-red-700 text-sm mt-1">
                Please map the following required fields: {getUnmappedRequiredFields().join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {canProceed() && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-green-800">Ready to Import</h4>
              <p className="text-green-700 text-sm mt-1">
                All required fields are mapped. You can proceed to preview your data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Columns */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Your CSV Columns</h4>
          <div className="space-y-3">
            {analysisResult.source_columns.map((column, index) => {
              const mappedTo = mappings[column];
              return (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{column}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-3" />
                  <div className="flex-1">
                    <select
                      value={mappedTo || 'none'}
                      onChange={(e) => handleMappingChange(column, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">Don't import</option>
                      {analysisResult.crm_fields.map(field => (
                        <option key={field} value={field}>
                          {field} {requiredFields.includes(field) ? '(Required)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Fields */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Lead Fields</h4>
          <div className="space-y-2">
            {analysisResult.crm_fields.map((field, index) => {
              const isRequired = requiredFields.includes(field);
              const isMapped = getMappedFields().includes(field);
              
              return (
                <div key={index} className={`p-3 rounded-lg border ${
                  isRequired 
                    ? isMapped 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                    : isMapped 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="font-medium text-gray-900">
                    {field} {isRequired && <span className="text-red-500">*</span>}
                  </div>
                  <div className="text-sm text-gray-600">
                    {fieldDescriptions[field] || 'Additional field'}
                  </div>
                  {isMapped && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Mapped
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auto-mapping notice */}
      {Object.keys(analysisResult.suggested_mappings || {}).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-blue-800">Smart Mapping Applied</h4>
              <p className="text-blue-700 text-sm mt-1">
                We've automatically suggested {Object.keys(analysisResult.suggested_mappings).length} column mappings based on your field names.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={!canProceed()}
          className="flex items-center gap-2"
        >
          Continue to Preview
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LeadColumnMappingStep;