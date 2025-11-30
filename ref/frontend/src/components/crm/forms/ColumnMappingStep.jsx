import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Info,
  X,
  Settings
} from 'lucide-react';
import { Button } from '../../ui/primitives/button';

const ColumnMappingStep = ({ analysisResult, onMappingComplete, onBack }) => {
  const [mappings, setMappings] = useState({});
  const [isValid, setIsValid] = useState(false);

  // CRM field descriptions for better UX
  const fieldDescriptions = {
    company: 'Company or organization name (Required)',
    primaryContact: 'Primary contact person name (Required)', 
    email: 'Email address (Required)',
    phone: 'Phone number',
    industry: 'Industry or business sector',
    location: 'Physical location or address',
    status: 'Customer status (active, inactive, etc.)',
    clientType: 'Type of client (lead, customer, etc.)',
    arr: 'Annual Recurring Revenue',
    contractValue: 'Total contract value',
    monthlyValue: 'Monthly recurring revenue',
    renewalDate: 'Contract renewal date',
    healthScore: 'Customer health score (0-100)',
    churnRisk: 'Risk of customer churn (low, medium, high)',
    satisfactionScore: 'Customer satisfaction score',
    expansionPotential: 'Potential for account expansion'
  };

  const requiredFields = ['company', 'primaryContact', 'email'];

  useEffect(() => {
    // Initialize mappings with suggested mappings
    setMappings(analysisResult.suggested_mappings || {});
  }, [analysisResult]);

  useEffect(() => {
    // Check if all required fields are mapped
    const mappedFields = Object.values(mappings);
    const hasAllRequired = requiredFields.every(field => mappedFields.includes(field));
    setIsValid(hasAllRequired);
  }, [mappings]);

  const handleMappingChange = (sourceColumn, targetField) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      
      // Remove this target field from any other source column
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === targetField) {
          delete newMappings[key];
        }
      });
      
      // Set the new mapping (or remove if targetField is empty)
      if (targetField) {
        newMappings[sourceColumn] = targetField;
      } else {
        delete newMappings[sourceColumn];
      }
      
      return newMappings;
    });
  };

  const handleContinue = () => {
    onMappingComplete(mappings);
  };

  const getMappedSourceColumn = (targetField) => {
    return Object.keys(mappings).find(key => mappings[key] === targetField);
  };

  const getUnmappedSourceColumns = () => {
    return analysisResult.source_columns.filter(col => !mappings[col]);
  };

  const getUnmappedRequiredFields = () => {
    const mappedFields = Object.values(mappings);
    return requiredFields.filter(field => !mappedFields.includes(field));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Map Your Columns
        </h3>
        <p className="text-gray-600">
          Match your file columns to CRM fields. Required fields must be mapped to continue.
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
            <div className={`font-medium ${isValid ? 'text-green-600' : 'text-orange-600'}`}>
              {getUnmappedRequiredFields().length === 0 ? 'Ready' : 'Missing Required'}
            </div>
            <div className="text-gray-600">Status</div>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {getUnmappedRequiredFields().length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-orange-800">Required Fields Missing</h4>
              <p className="text-orange-700 text-sm mt-1">
                Please map the following required fields: {getUnmappedRequiredFields().join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Columns */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Your File Columns</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analysisResult.source_columns.map((column, index) => {
              const mappedTo = mappings[column];
              return (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    mappedTo 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{column}</span>
                    {mappedTo && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        → {mappedTo}
                      </span>
                    )}
                  </div>
                  <select
                    value={mappedTo || ''}
                    onChange={(e) => handleMappingChange(column, e.target.value)}
                    className="mt-2 w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select CRM field...</option>
                    {analysisResult.crm_fields.map(field => (
                      <option 
                        key={field} 
                        value={field}
                        disabled={getMappedSourceColumn(field) && getMappedSourceColumn(field) !== column}
                      >
                        {field} {requiredFields.includes(field) ? '(Required)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* CRM Fields */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">CRM Fields</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analysisResult.crm_fields.map((field, index) => {
              const mappedSource = getMappedSourceColumn(field);
              const isRequired = requiredFields.includes(field);
              
              return (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    mappedSource 
                      ? 'border-green-200 bg-green-50' 
                      : isRequired 
                      ? 'border-orange-200 bg-orange-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{field}</span>
                      {isRequired && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    {mappedSource ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-xs text-green-700">{mappedSource}</span>
                      </div>
                    ) : isRequired ? (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    ) : null}
                  </div>
                  {fieldDescriptions[field] && (
                    <p className="text-xs text-gray-600 mt-1">
                      {fieldDescriptions[field]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auto-mapping suggestions */}
      {Object.keys(analysisResult.suggested_mappings || {}).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-blue-800">Auto-Detected Mappings</h4>
              <p className="text-blue-700 text-sm mt-1">
                We've automatically suggested {Object.keys(analysisResult.suggested_mappings).length} column mappings based on your field names. 
                You can modify these mappings above if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unmapped columns warning */}
      {getUnmappedSourceColumns().length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">Unmapped Columns</h4>
              <p className="text-yellow-700 text-sm mt-1">
                The following columns won't be imported: {getUnmappedSourceColumns().join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!isValid}
          className={isValid ? '' : 'opacity-50 cursor-not-allowed'}
        >
          Continue to Preview
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ColumnMappingStep;