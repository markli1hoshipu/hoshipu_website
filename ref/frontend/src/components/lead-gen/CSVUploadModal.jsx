import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  ArrowRight,
  Users,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { Button } from '../ui/primitives/button';
import LeadColumnMappingStep from './LeadColumnMappingStep';
import LeadImportPreviewStep from './LeadImportPreviewStep';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLeadContext } from '../../contexts/LeadContext';
import toast from 'react-hot-toast';

const CSVUploadModal = ({ isOpen, onClose }) => {
  const { authFetch } = useAuth();
  const { loadLeads } = useLeadContext();
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload', 'mapping', 'preview', 'importing', 'complete'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_LEAD_API_URL || 'http://localhost:9000';

  // Template data based on actual lead backend schema
  const generateTemplateData = () => {
    return [
      {
        'company': 'Example Corp',
        'contact_name': 'John Smith',
        'email': 'john.smith@example.com',
        'phone': '+1 (555) 123-4567',
        'website': 'https://example.com',
        'industry': 'Technology',
        'location': 'San Francisco, CA',
        'company_size': '11-50',
        'revenue': '1-10M',
        'employees_count': '50',
        'rating': '4.5',
        'status': 'warm',
        'source': 'csv_upload',
        'score': '85',
        'notes': 'Imported lead from CSV',
        'assigned_to': '',
        'position': 'CEO',
        'linkedin_url': 'https://linkedin.com/company/example',
        'tags': 'technology,b2b,saas'
      },
      {
        'company': 'Sample Inc',
        'contact_name': 'Jane Doe',
        'email': 'jane.doe@sample.com',
        'phone': '+1 (555) 987-6543',
        'website': 'https://sample.com',
        'industry': 'Finance',
        'location': 'New York, NY',
        'company_size': '51-200',
        'revenue': '10-50M',
        'employees_count': '100',
        'rating': '4.0',
        'status': 'cold',
        'source': 'csv_upload',
        'score': '75',
        'notes': 'Another imported lead from CSV',
        'assigned_to': '',
        'position': 'CFO',
        'linkedin_url': 'https://linkedin.com/company/sample',
        'tags': 'finance,enterprise,b2b'
      }
    ];
  };

  const downloadTemplate = () => {
    const templateData = generateTemplateData();
    const headers = Object.keys(templateData[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          return value.includes(',') || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'leads_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Read and analyze the file content to detect columns
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) {
        throw new Error('File is empty');
      }
      
      // Parse CSV headers - handle quoted fields
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
      
      // Clean up headers (remove quotes)
      const cleanHeaders = headers.map(h => h.replace(/^"(.*)"$/, '$1'));
      const dataRows = lines.slice(1);
      
      // Available lead fields for mapping
      const leadFields = [
        'company', 'contact_name', 'email', 'phone', 'website', 'industry', 
        'location', 'company_size', 'revenue', 'employees_count', 'rating', 
        'status', 'source', 'score', 'notes', 'assigned_to', 'position', 
        'linkedin_url', 'tags'
      ];

      // Simulate analysis result like CRM does
      setUploadedFile(file);
      setAnalysisResult({
        source_columns: cleanHeaders, // What CRM expects instead of detected_columns
        crm_fields: leadFields, // Available target fields for mapping
        suggested_mappings: cleanHeaders.reduce((mappings, header) => {
          // Create intelligent mappings based on common field names
          const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          // Smart mapping suggestions
          if (lowerHeader.includes('company') || lowerHeader.includes('business')) {
            mappings[header] = 'company';
          } else if (lowerHeader.includes('contact') || lowerHeader.includes('name')) {
            mappings[header] = 'contact_name';
          } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
            mappings[header] = 'email';
          } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
            mappings[header] = 'phone';
          } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
            mappings[header] = 'website';
          } else if (lowerHeader.includes('industry') || lowerHeader.includes('sector')) {
            mappings[header] = 'industry';
          } else if (lowerHeader.includes('location') || lowerHeader.includes('address')) {
            mappings[header] = 'location';
          } else if (lowerHeader.includes('score')) {
            mappings[header] = 'score';
          } else if (lowerHeader.includes('status')) {
            mappings[header] = 'status';
          } else if (lowerHeader.includes('rating')) {
            mappings[header] = 'rating';
          } else if (lowerHeader.includes('size')) {
            mappings[header] = 'company_size';
          } else if (lowerHeader.includes('revenue')) {
            mappings[header] = 'revenue';
          } else if (lowerHeader.includes('employee')) {
            mappings[header] = 'employees_count';
          } else if (lowerHeader.includes('note')) {
            mappings[header] = 'notes';
          } else if (lowerHeader.includes('position') || lowerHeader.includes('title')) {
            mappings[header] = 'position';
          } else if (lowerHeader.includes('linkedin')) {
            mappings[header] = 'linkedin_url';
          } else if (lowerHeader.includes('tag')) {
            mappings[header] = 'tags';
          } else if (lowerHeader.includes('assign')) {
            mappings[header] = 'assigned_to';
          } else if (lowerHeader.includes('source')) {
            mappings[header] = 'source';
          } else {
            // Default 1:1 mapping if field exists in lead fields
            if (leadFields.includes(header)) {
              mappings[header] = header;
            }
          }
          return mappings;
        }, {}),
        row_count: dataRows.length,
        sample_data: dataRows.slice(0, 3), // First 3 rows for preview
        headers: cleanHeaders
      });
      
      // Set initial column mapping based on suggested mappings
      const suggestedMappings = cleanHeaders.reduce((mappings, header) => {
        // Use the same smart mapping logic
        const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (lowerHeader.includes('company') || lowerHeader.includes('business')) {
          mappings[header] = 'company';
        } else if (lowerHeader.includes('contact') || lowerHeader.includes('name')) {
          mappings[header] = 'contact_name';
        } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
          mappings[header] = 'email';
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
          mappings[header] = 'phone';
        } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
          mappings[header] = 'website';
        } else if (lowerHeader.includes('industry') || lowerHeader.includes('sector')) {
          mappings[header] = 'industry';
        } else if (lowerHeader.includes('location') || lowerHeader.includes('address')) {
          mappings[header] = 'location';
        } else if (lowerHeader.includes('score')) {
          mappings[header] = 'score';
        } else if (lowerHeader.includes('status')) {
          mappings[header] = 'status';
        } else if (lowerHeader.includes('rating')) {
          mappings[header] = 'rating';
        } else if (lowerHeader.includes('size')) {
          mappings[header] = 'company_size';
        } else if (lowerHeader.includes('revenue')) {
          mappings[header] = 'revenue';
        } else if (lowerHeader.includes('employee')) {
          mappings[header] = 'employees_count';
        } else if (lowerHeader.includes('note')) {
          mappings[header] = 'notes';
        } else if (lowerHeader.includes('position') || lowerHeader.includes('title')) {
          mappings[header] = 'position';
        } else if (lowerHeader.includes('linkedin')) {
          mappings[header] = 'linkedin_url';
        } else if (lowerHeader.includes('tag')) {
          mappings[header] = 'tags';
        } else if (lowerHeader.includes('assign')) {
          mappings[header] = 'assigned_to';
        } else if (lowerHeader.includes('source')) {
          mappings[header] = 'source';
        } else if (leadFields.includes(header)) {
          mappings[header] = header;
        }
        return mappings;
      }, {});
      
      setColumnMapping(suggestedMappings);
      
      // Move to mapping step (following CRM workflow)
      setCurrentStep('mapping');
      
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleMappingComplete = (mappings) => {
    setColumnMapping(mappings);
    setCurrentStep('preview');
  };

  const handlePreviewComplete = (preview) => {
    setPreviewData(preview);
    performImport();
  };

  const performImport = async () => {
    setCurrentStep('importing');
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('column_mapping', JSON.stringify(columnMapping));
      formData.append('skip_duplicates', 'true');

      const response = await authFetch(`${API_BASE_URL}/api/leads/upload-csv`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import leads');
      }

      const result = await response.json();
      
      // Check if the import had errors
      if (result.status === 'error') {
        throw new Error(result.message || 'Import failed');
      }
      
      setImportResult(result);
      setCurrentStep('complete');
      
      // Refresh leads list
      await loadLeads(true);
      
      // Show success message
      toast.success(
        `✅ Successfully imported ${result.successful || 0} of ${result.total_processed || 0} leads!`,
        { duration: 5000 }
      );
      
    } catch (err) {
      setError(err.message);
      setCurrentStep('preview'); // Go back to preview on error
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetUpload = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setAnalysisResult(null);
    setColumnMapping({});
    setPreviewData(null);
    setImportResult(null);
    setError(null);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Import Leads from CSV/Excel
        </h3>
        <p className="text-gray-600 mb-4">
          Upload a CSV or Excel file to bulk import lead data into your system
        </p>
        
        {/* Download Template Section */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Download className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Need a template?</span>
          </div>
          <p className="text-sm text-green-700 mb-3">
            Download our template with sample data and proper column headers
          </p>
          <Button 
            onClick={downloadTemplate}
            variant="outline"
            size="sm"
            className="bg-white border-green-300 text-green-700 hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            Drop your file here, or{' '}
            <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
              browse
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isLoading}
              />
            </label>
          </p>
          <p className="text-sm text-gray-500">
            Supports CSV, XLSX, and XLS files up to 10MB
          </p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">File Requirements:</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <div>
            <span className="font-medium">Required Fields:</span>
            <ul className="mt-1 space-y-1 ml-4">
              <li>• company (Company name)</li>
            </ul>
          </div>
          <div>
            <span className="font-medium">Optional Fields:</span>
            <p className="mt-1">contact_name, email, phone, website, industry, location, company_size, revenue, employees_count, rating, status, source, score, notes, assigned_to, position, linkedin_url, tags</p>
          </div>
        </div>
        <p className="text-sm text-blue-700 mt-3">
          💡 <strong>Tip:</strong> Download the template above to see all available fields with proper column names and formatting examples.
        </p>
      </div>
    </div>
  );

  const renderStepIndicator = () => {
    const steps = [
      { id: 'upload', label: 'Upload File', icon: Upload },
      { id: 'mapping', label: 'Map Columns', icon: Settings },
      { id: 'preview', label: 'Preview Data', icon: Eye },
      { id: 'importing', label: 'Import', icon: RefreshCw },
      { id: 'complete', label: 'Complete', icon: CheckCircle }
    ];

    const currentIndex = steps.findIndex(step => step.id === currentStep);

    return (
      <div className="flex items-center justify-center space-x-4 mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isDisabled = index > currentIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-300 ml-4" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <RefreshCw className="h-16 w-16 text-blue-500 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Importing Leads...
        </h3>
        <p className="text-gray-600">
          Please wait while we process your data and import leads into your system.
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Import Completed Successfully!
        </h3>
        {importResult && (
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            {importResult.message && (
              <div className="mb-3 text-sm text-green-800 font-medium">
                {importResult.message}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-800">Total Processed:</span>
                <span className="text-green-700 ml-2">{importResult.total_processed}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Successful:</span>
                <span className="text-green-700 ml-2">{importResult.successful}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Failed:</span>
                <span className="text-green-700 ml-2">{importResult.failed}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Status:</span>
                <span className="text-green-700 ml-2 capitalize">{importResult.status}</span>
              </div>
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3 text-sm text-green-800">
                <span className="font-medium">Sample Errors:</span>
                <ul className="mt-1 space-y-1">
                  {importResult.errors.slice(0, 3).map((error, idx) => (
                    <li key={idx} className="text-xs">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-x-3">
        <Button onClick={resetUpload} variant="outline">
          Import Another File
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[95vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Import Leads</h2>
              <p className="text-sm text-gray-600">Upload CSV or Excel files to bulk import lead data</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Indicator */}
        {currentStep !== 'upload' && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            {renderStepIndicator()}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
              >
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-red-800">Error</h4>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {renderUploadStep()}
              </motion.div>
            )}

            {currentStep === 'mapping' && analysisResult && (
              <motion.div
                key="mapping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <LeadColumnMappingStep
                  analysisResult={analysisResult}
                  onMappingComplete={handleMappingComplete}
                  onBack={() => setCurrentStep('upload')}
                />
              </motion.div>
            )}

            {currentStep === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <LeadImportPreviewStep
                  file={uploadedFile}
                  columnMapping={columnMapping}
                  onPreviewComplete={handlePreviewComplete}
                  onBack={() => setCurrentStep('mapping')}
                />
              </motion.div>
            )}

            {currentStep === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {renderImportingStep()}
              </motion.div>
            )}

            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {renderCompleteStep()}
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && currentStep !== 'importing' && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CSVUploadModal;