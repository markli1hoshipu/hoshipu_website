import React, { useState, useCallback } from 'react';
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
import { Button } from '../../ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/primitives/dialog';
import ColumnMappingStep from '../forms/ColumnMappingStep';
import ImportPreviewStep from '../forms/ImportPreviewStep';
import { useAuth } from '../../../auth/hooks/useAuth';

const CustomerCsvUpload = ({ onImportComplete, onClose }) => {
  const { authFetch } = useAuth();
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload', 'mapping', 'preview', 'importing', 'complete'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Template data based on CRM customer fields
  const generateTemplateData = () => {
    return [
      {
        'Company Name': 'Example Corp',
        'Primary Contact': 'John Smith',
        'Email Address': 'john.smith@example.com',
        'Phone Number': '+1 (555) 123-4567',
        'Industry': 'Technology',
        'Location': 'San Francisco, CA',
        'Status': 'active',
        'Client Type': 'enterprise',
        'Annual Recurring Revenue': '50000',
        'Contract Value': '100000',
        'Monthly Value': '4167',
        'Renewal Date': '2024-12-31',
        'Health Score': '85',
        'Churn Risk': 'low',
        'Satisfaction Score': '9.0',
        'Expansion Potential': 'high'
      },
      {
        'Company Name': 'Sample Inc',
        'Primary Contact': 'Jane Doe',
        'Email Address': 'jane.doe@sample.com',
        'Phone Number': '+1 (555) 987-6543',
        'Industry': 'Finance',
        'Location': 'New York, NY',
        'Status': 'active',
        'Client Type': 'mid-market',
        'Annual Recurring Revenue': '25000',
        'Contract Value': '50000',
        'Monthly Value': '2083',
        'Renewal Date': '2024-06-30',
        'Health Score': '75',
        'Churn Risk': 'medium',
        'Satisfaction Score': '8.0',
        'Expansion Potential': 'medium'
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
    link.setAttribute('download', 'customer_import_template.csv');
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
      const formData = new FormData();
      formData.append('file', file);

      const response = await authFetch(`${API_BASE_URL}/api/crm/upload/analyze-csv`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze file');
      }

      const result = await response.json();
      
      setUploadedFile(file);
      setAnalysisResult(result);
      setColumnMapping(result.suggested_mappings || {});
      setCurrentStep('mapping');
      
    } catch (err) {
      setError(err.message);
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

      const response = await authFetch(`${API_BASE_URL}/api/crm/upload/import-customers`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import customers');
      }

      const result = await response.json();
      setImportResult(result);
      setCurrentStep('complete');
      
      // Notify parent component
      if (onImportComplete) {
        onImportComplete(result);
      }
      
    } catch (err) {
      setError(err.message);
      setCurrentStep('preview'); // Go back to preview on error
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
          Import Customers from CSV/Excel
        </h3>
        <p className="text-gray-600 mb-4">
          Upload a CSV or Excel file to bulk import customer data into your CRM
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
              <li>• Company Name</li>
              <li>• Primary Contact</li>
              <li>• Email Address</li>
            </ul>
          </div>
          <div>
            <span className="font-medium">Optional Fields:</span>
            <p className="mt-1">Phone, Industry, Location, Financial data (ARR, Contract Value, etc.)</p>
          </div>
        </div>
        <p className="text-sm text-blue-700 mt-3">
          💡 <strong>Tip:</strong> Download the template above to see all available fields with proper formatting examples.
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
          Importing Customers...
        </h3>
        <p className="text-gray-600">
          Please wait while we process your data and import customers into your CRM.
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-800">Total Rows:</span>
                <span className="text-green-700 ml-2">{importResult.total_rows}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Imported:</span>
                <span className="text-green-700 ml-2">{importResult.inserted_rows}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Skipped:</span>
                <span className="text-green-700 ml-2">{importResult.skipped_rows}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Failed:</span>
                <span className="text-green-700 ml-2">{importResult.failed_rows}</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-green-800">
              Processing Time: {Math.round(importResult.processing_time_ms)}ms
            </div>
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl w-full max-h-[95vh] flex flex-col p-0"
        onClose={onClose}
      >
        {/* Modal Header */}
        <DialogHeader className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Import Customers</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Upload CSV or Excel files to bulk import customer data
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step Indicator */}
        {currentStep !== 'upload' && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            {renderStepIndicator()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                <div>
                  <h4 className="font-medium text-red-800">Error</h4>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'upload' && (
            <div>
              {renderUploadStep()}
            </div>
          )}

          {currentStep === 'mapping' && analysisResult && (
            <div>
              <ColumnMappingStep
                analysisResult={analysisResult}
                onMappingComplete={handleMappingComplete}
                onBack={() => setCurrentStep('upload')}
              />
            </div>
          )}

          {currentStep === 'preview' && (
            <div>
              <ImportPreviewStep
                file={uploadedFile}
                columnMapping={columnMapping}
                onPreviewComplete={handlePreviewComplete}
                onBack={() => setCurrentStep('mapping')}
              />
            </div>
          )}

          {currentStep === 'importing' && (
            <div>
              {renderImportingStep()}
            </div>
          )}

          {currentStep === 'complete' && (
            <div>
              {renderCompleteStep()}
            </div>
          )}

          {isLoading && currentStep !== 'importing' && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerCsvUpload;