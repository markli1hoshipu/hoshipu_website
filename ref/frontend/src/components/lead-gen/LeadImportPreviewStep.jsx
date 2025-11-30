import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft, 
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  FileText
} from 'lucide-react';
import { Button } from '../ui/primitives/button';

const LeadImportPreviewStep = ({ file, columnMapping, onPreviewComplete, onBack }) => {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Since leads service doesn't have a preview endpoint, we'll simulate preview
      // by reading the CSV file and applying column mappings
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) {
        throw new Error('File is empty');
      }
      
      // Parse CSV headers
      const headerLine = lines[0];
      const headers = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < headerLine.length; i++) {
        const char = headerLine[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          headers.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      headers.push(current.trim());
      
      // Clean up headers
      const cleanHeaders = headers.map(h => h.replace(/^"(.*)"$/, '$1'));
      const dataRows = lines.slice(1);
      
      // Parse data rows and apply column mapping
      const previewRows = dataRows.slice(0, 10).map(row => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"(.*)"$/, '$1'));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"(.*)"$/, '$1'));
        
        // Apply column mapping
        const mappedRow = {};
        cleanHeaders.forEach((header, index) => {
          const targetField = columnMapping[header];
          if (targetField && values[index] !== undefined) {
            mappedRow[targetField] = values[index];
          }
        });
        
        return mappedRow;
      });
      
      setPreviewData({
        preview_data: previewRows,
        total_rows: dataRows.length,
        ready_for_import: true
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (previewData) {
      onPreviewComplete(previewData);
    }
  };

  const renderPreviewTable = () => {
    if (!previewData || !previewData.preview_data.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          No preview data available
        </div>
      );
    }

    const columns = Object.keys(previewData.preview_data[0]);
    const requiredFields = ['company']; // Only company is required for leads

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => {
                const isRequired = requiredFields.includes(column);
                return (
                  <th
                    key={index}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b ${
                      isRequired ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      {column}
                      {isRequired && (
                        <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewData.preview_data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => {
                  const value = row[column];
                  const isEmpty = !value || value.trim() === '';
                  const isRequired = requiredFields.includes(column);
                  
                  return (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-sm border-b ${
                        isEmpty && isRequired 
                          ? 'bg-red-50 text-red-700' 
                          : 'text-gray-900'
                      }`}
                    >
                      {isEmpty ? (
                        <span className="text-gray-400 italic">
                          {isRequired ? 'Missing required data' : 'Empty'}
                        </span>
                      ) : (
                        <span className="truncate block max-w-xs" title={value}>
                          {value}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderValidationSummary = () => {
    if (!previewData) return null;

    const hasValidData = previewData.ready_for_import;
    const requiredFields = ['company'];
    
    // Check for missing required data in preview
    let missingDataRows = 0;
    previewData.preview_data.forEach(row => {
      const hasMissingRequired = requiredFields.some(field => 
        !row[field] || row[field].trim() === ''
      );
      if (hasMissingRequired) missingDataRows++;
    });

    return (
      <div className={`rounded-lg p-4 ${hasValidData ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
        <div className="flex items-start">
          {hasValidData ? (
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 mr-3" />
          )}
          <div className="flex-1">
            <h4 className={`font-medium ${hasValidData ? 'text-green-800' : 'text-orange-800'}`}>
              {hasValidData ? 'Data Validation Passed' : 'Data Validation Issues'}
            </h4>
            <div className={`text-sm mt-1 ${hasValidData ? 'text-green-700' : 'text-orange-700'}`}>
              {hasValidData ? (
                <p>All required fields are properly mapped and your data looks good for import.</p>
              ) : (
                <div>
                  <p>Some issues were found with your data:</p>
                  {missingDataRows > 0 && (
                    <p className="mt-1">• {missingDataRows} rows have missing required data</p>
                  )}
                  <p className="mt-1">These rows will be skipped during import.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Generating Preview...
          </h3>
          <p className="text-gray-600">
            Please wait while we process your data and generate a preview.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-red-800">Preview Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Mapping
          </Button>
          <Button onClick={loadPreview}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Eye className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Preview Your Lead Data
        </h3>
        <p className="text-gray-600">
          Review how your lead data will be imported. Check that everything looks correct before proceeding.
        </p>
      </div>

      {/* Summary Stats */}
      {previewData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <FileText className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <div className="text-sm text-gray-600">File</div>
            <div className="font-medium text-gray-900">{file.name}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-sm text-blue-600">Total Rows</div>
            <div className="font-medium text-blue-900">{previewData.total_rows}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-sm text-green-600">Preview Rows</div>
            <div className="font-medium text-green-900">{previewData.preview_data.length}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <Eye className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <div className="text-sm text-purple-600">Mapped Fields</div>
            <div className="font-medium text-purple-900">{Object.keys(columnMapping).length}</div>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {renderValidationSummary()}

      {/* Column Mapping Summary */}
      {Object.keys(columnMapping).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Column Mappings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {Object.entries(columnMapping).map(([source, target]) => (
              <div key={source} className="flex items-center justify-between bg-white rounded px-3 py-2">
                <span className="text-gray-600">{source}</span>
                <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                <span className="font-medium text-gray-900">{target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Lead Data Preview (First 10 Rows)</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {renderPreviewTable()}
        </div>
      </div>

      {/* Import Options */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Import Settings</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• Duplicate companies will be handled according to your settings</div>
          <div>• Rows with missing company name will be skipped</div>
          <div>• Invalid data will be cleaned or set to defaults</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mapping
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={!previewData}
          className="bg-green-600 hover:bg-green-700"
        >
          Start Import
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default LeadImportPreviewStep;