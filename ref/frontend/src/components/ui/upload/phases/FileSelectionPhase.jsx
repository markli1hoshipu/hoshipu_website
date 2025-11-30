/**
 * File Selection Phase - First step in progressive upload
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, FileCheck, X, Loader, Database, ChevronDown, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../primitives/card';
import { Button } from '../../primitives/button';
import { validateFile, formatFileSize } from '../utils/fileValidation';

const FileSelectionPhase = ({
  config,
  onFileSelected,
  analysisError,
  isAnalyzing
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [targetTable, setTargetTable] = useState('_new_table');
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Fetch available tables on mount
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchTables = async () => {
      setLoadingTables(true);
      try {
        const baseUrl = import.meta.env.VITE_SALESCENTER_API_URL || 'http://localhost:8002';
        const idToken = localStorage.getItem('id_token');
        const response = await fetch(`${baseUrl}/api/data/tables`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          signal: controller.signal
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableTables(data.tables || []);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch tables:', error);
        }
      } finally {
        setLoadingTables(false);
      }
    };
    
    fetchTables();
    
    return () => controller.abort();
  }, []);

  const handleFileSelect = useCallback((file) => {
    setValidationError(null);
    
    // Validate file
    const validation = validateFile(file, config);
    if (!validation.isValid) {
      setValidationError(validation.errors.join(', '));
      return;
    }
    
    setSelectedFile(file);
    if (onFileSelected) {
      // Pass target table along with file
      const options = {
        target_table: targetTable === '_new_table' ? null : targetTable
      };
      onFileSelected(file, options);
    }
  }, [config, onFileSelected, targetTable]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };


  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidationError(null);
  };

  const handleTableSelect = (table) => {
    setTargetTable(table);
    setShowTableDropdown(false);
    
    // If file already selected, trigger re-analysis with new table
    if (selectedFile && onFileSelected) {
      const options = {
        target_table: table === '_new_table' ? null : table
      };
      onFileSelected(selectedFile, options);
    }
  };

  const serviceConfig = config.getServiceConfig?.() || {};

  // Template download functionality
  const downloadTemplate = useCallback(async () => {
    try {
      // Check if this is a sales-related service
      const isSalesService = config.databaseConfig?.schema_name === 'sales' || 
                            config.databaseConfig?.service_type === 'nl2sql' ||
                            config.mappingConfig?.service_context === 'sales';
      
      if (isSalesService) {
        // Download from the sales template endpoint
        const baseUrl = import.meta.env.VITE_SALESCENTER_API_URL || 'http://localhost:8002';
        const response = await fetch(`${baseUrl}/api/sales/download-template`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'sales_data_template.csv';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          throw new Error('Failed to download template');
        }
      } else {
        // Fallback: create a generic template based on expected columns
        const headers = config.expectedColumns || ['date', 'name', 'value', 'category'];
        const sampleData = [
          ['2024-01-01', 'Sample Item 1', '100', 'Category A'],
          ['2024-01-02', 'Sample Item 2', '200', 'Category B'],
          ['2024-01-03', 'Sample Item 3', '150', 'Category C']
        ];
        
        const csvContent = [
          headers.join(','),
          ...sampleData.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'data_template.csv';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download template:', error);
      // Could add toast notification here
    }
  }, [config]);

  return (
    <div className="p-6 space-y-6">
      {/* Service Information */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {serviceConfig.displayName || 'Data Upload'}
        </h3>
        <p className="text-gray-600">
          {serviceConfig.description || 'Upload your data file for processing'}
        </p>
      </div>

      {/* Table Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Database className="w-4 h-4" />
              <span className="font-medium">Target Table</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowTableDropdown(!showTableDropdown)}
                className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg hover:border-prelude-500 focus:outline-none focus:ring-2 focus:ring-prelude-500 focus:border-transparent transition-colors flex items-center justify-between"
              >
                <span className="text-gray-900">
                  {targetTable === '_new_table' ? 'Create New Table' : targetTable}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTableDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showTableDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <button
                    onClick={() => handleTableSelect('_new_table')}
                    className="w-full px-4 py-2 text-left hover:bg-prelude-50 transition-colors flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium">Create New Table</span>
                  </button>
                  
                  {loadingTables ? (
                    <div className="px-4 py-2 text-gray-500 text-sm">Loading tables...</div>
                  ) : availableTables.length > 0 ? (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <div className="px-4 py-1 text-xs text-gray-500 uppercase tracking-wider">Existing Tables</div>
                      {availableTables.map((table) => (
                        <button
                          key={table.table_name}
                          onClick={() => handleTableSelect(table.table_name)}
                          className="w-full px-4 py-2 text-left hover:bg-prelude-50 transition-colors flex items-center justify-between"
                        >
                          <span>{table.table_name}</span>
                          <span className="text-xs text-gray-500">
                            {table.row_count} rows • {table.column_count} cols
                          </span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-2 text-gray-500 text-sm">No existing tables found</div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {targetTable === '_new_table' 
                ? 'A new table will be created from your file'
                : `Data will be appended to the ${targetTable} table`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template Download Section */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Download className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Need a template?</span>
          </div>
          <p className="text-sm text-green-700 mb-3 text-center">
            Download our template with sample data and proper column headers
          </p>
          <div className="flex justify-center">
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
          <p className="text-xs text-green-600 mt-2 text-center">
            💡 <strong>Tip:</strong> Use the template to see the expected format and column names
          </p>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardContent className="p-0">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
              dragActive
                ? 'border-prelude-800 bg-prelude-50 scale-105 shadow-lg'
                : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-prelude-500 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isAnalyzing ? (
              <div className="space-y-4">
                <Loader className="w-12 h-12 mx-auto text-prelude-800 animate-spin" />
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Analyzing your file...
                  </p>
                  <p className="text-sm text-gray-500">
                    AI is examining columns and data patterns
                  </p>
                </div>
              </div>
            ) : selectedFile ? (
              <div className="space-y-4">
                <FileCheck className="w-12 h-12 mx-auto text-green-500" />
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      {selectedFile.name}
                    </span>
                  </div>
                  <p className="text-sm text-green-600">
                    {formatFileSize(selectedFile.size)} • Ready for analysis
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="mt-2"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className={`w-12 h-12 mx-auto transition-colors ${
                  dragActive ? 'text-prelude-800' : 'text-gray-400'
                }`} />
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Drop your file here
                  </p>
                  <p className="text-sm text-gray-500">
                    or{' '}
                    <label className="text-prelude-800 hover:text-prelude-900 cursor-pointer font-medium underline underline-offset-2">
                      browse to select
                      <input
                        type="file"
                        accept={config.allowedFileTypes?.join(',')}
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supported formats: {config.allowedFileTypes?.join(', ')} • Max size: {config.maxFileSize}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Error */}
      {validationError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">File Validation Error</h4>
                <p className="text-sm text-red-700 mt-1">{validationError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Error */}
      {analysisError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Analysis Error</h4>
                <p className="text-sm text-red-700 mt-1">{analysisError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedFile && onFileSelected(selectedFile)}
                  className="mt-2"
                >
                  Retry Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expected Format Information */}
      <Card className="bg-white border-prelude-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-prelude-800 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Expected Data Format</h4>
              
              {config.expectedColumns && config.expectedColumns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Common columns we look for:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {config.expectedColumns.slice(0, 8).map((column, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700"
                      >
                        {column}
                      </span>
                    ))}
                    {config.expectedColumns.length > 8 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{config.expectedColumns.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div>• First row should contain column headers</div>
                <div>• Data will be automatically analyzed for optimal mapping</div>
                <div>• You can review and adjust mappings if needed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {(isAnalyzing || selectedFile) && !analysisError && (
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-sm text-gray-600"
          >
            {isAnalyzing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Analyzing file structure and content...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Analysis complete • Proceeding to next step</span>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FileSelectionPhase;