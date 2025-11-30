/**
 * Mapping Preview Component - Shows data preview with applied mappings
 */
import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Button } from '../../primitives/button';

const MappingPreview = React.memo(({
  previewData,
  mappings = {},
  dataIssues = [],
  isLoading = false,
  className = ''
}) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Process preview data to show mapped columns
  const processedData = useMemo(() => {
    if (!previewData || !previewData.preview_data) return [];

    return previewData.preview_data.map(row => {
      const processedRow = {};
      
      Object.entries(row).forEach(([sourceCol, value]) => {
        const targetCol = mappings[sourceCol] || sourceCol;
        processedRow[targetCol] = {
          value,
          sourceColumn: sourceCol,
          isMapped: !!mappings[sourceCol],
          hasIssues: dataIssues.some(issue => issue.column === sourceCol)
        };
      });
      
      return processedRow;
    });
  }, [previewData, mappings, dataIssues]);

  // Get visible columns
  const visibleColumns = useMemo(() => {
    if (!processedData.length) return [];
    
    const allColumns = Object.keys(processedData[0]);
    
    if (showAllColumns) {
      return allColumns;
    }
    
    // Show mapped columns first, then limit to first 5
    const mappedColumns = allColumns.filter(col => 
      processedData[0][col].isMapped
    );
    const unmappedColumns = allColumns.filter(col => 
      !processedData[0][col].isMapped
    );
    
    return [...mappedColumns, ...unmappedColumns].slice(0, 5);
  }, [processedData, showAllColumns]);

  // Get data quality summary
  const qualitySummary = useMemo(() => {
    if (!previewData) return null;

    const { data_quality_score, preview_stats } = previewData;
    
    return {
      score: Math.round(data_quality_score || 0),
      totalRows: preview_stats?.total_rows_analyzed || 0,
      nullPercentage: Math.round(preview_stats?.null_percentage || 0),
      issuesCount: dataIssues.length
    };
  }, [previewData, dataIssues]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previewData || !processedData.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No preview data available</p>
            <p className="text-sm">Upload a file to see data preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Data Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllColumns(!showAllColumns)}
            >
              {showAllColumns ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="ml-1">
                {showAllColumns ? 'Show Less' : 'Show All'}
              </span>
            </Button>
            
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
              <span className="ml-1">Export</span>
            </Button>
          </div>
        </div>
        
        {/* Quality Summary */}
        {qualitySummary && (
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Quality: {qualitySummary.score}%</span>
            </div>
            <div>{qualitySummary.totalRows} rows sampled</div>
            {qualitySummary.nullPercentage > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span>{qualitySummary.nullPercentage}% null values</span>
              </div>
            )}
            {qualitySummary.issuesCount > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span>{qualitySummary.issuesCount} data issues</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Data Issues Alert */}
        {dataIssues.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Data Quality Issues</h4>
                <div className="space-y-1">
                  {dataIssues.slice(0, 3).map((issue, index) => (
                    <div key={index} className="text-sm text-amber-700">
                      <span className="font-medium">{issue.column}:</span> {issue.description}
                    </div>
                  ))}
                  {dataIssues.length > 3 && (
                    <div className="text-sm text-amber-600">
                      +{dataIssues.length - 3} more issues
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {visibleColumns.map(column => {
                  const cellData = processedData[0][column];
                  return (
                    <th key={column} className="px-3 py-2 text-left">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{column}</div>
                        {cellData.sourceColumn !== column && (
                          <div className="text-xs text-gray-500">
                            from: {cellData.sourceColumn}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {cellData.isMapped ? (
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                          ) : (
                            <span className="inline-block w-2 h-2 bg-gray-300 rounded-full"></span>
                          )}
                          {cellData.hasIssues && (
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {processedData.slice(0, 10).map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    selectedRow === rowIndex ? 'bg-prelude-50' : ''
                  }`}
                  onClick={() => setSelectedRow(selectedRow === rowIndex ? null : rowIndex)}
                >
                  {visibleColumns.map(column => {
                    const cellData = row[column];
                    const value = cellData?.value;
                    
                    return (
                      <td key={column} className="px-3 py-2">
                        <div className="max-w-[200px]">
                          {value === null || value === undefined ? (
                            <span className="text-gray-400 italic">null</span>
                          ) : typeof value === 'string' && value.length > 50 ? (
                            <span title={value} className="truncate block">
                              {value.substring(0, 47)}...
                            </span>
                          ) : (
                            <span className={
                              typeof value === 'number' ? 'font-mono' : ''
                            }>
                              {String(value)}
                            </span>
                          )}
                          {cellData?.hasIssues && (
                            <div className="text-xs text-amber-600 mt-1">
                              Data issue detected
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show more indicator */}
        {processedData.length > 10 && (
          <div className="text-center py-3 text-sm text-gray-500 border-t">
            Showing 10 of {processedData.length} rows
          </div>
        )}

        {/* Column summary */}
        {!showAllColumns && Object.keys(processedData[0]).length > 5 && (
          <div className="text-center py-2 text-sm text-gray-500">
            Showing 5 of {Object.keys(processedData[0]).length} columns
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default MappingPreview;