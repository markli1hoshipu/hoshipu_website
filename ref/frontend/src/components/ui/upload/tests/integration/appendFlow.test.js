/**
 * Comprehensive End-to-End Integration Tests for CSV Append Flow Frontend
 * Tests the complete frontend implementation from UI interactions to API calls.
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock modules before imports
jest.mock('../../services/uploadService');
jest.mock('../../utils/uploadConfig');

import ProgressiveUploadModal from '../../phases/ProgressiveUploadModal';
import ColumnMappingPhase from '../../phases/ColumnMappingPhase';
import UploadService from '../../services/uploadService';
import { useColumnMapping } from '../../hooks/useColumnMapping';

// Mock implementations
const mockUploadService = {
  analyzeUpload: jest.fn(),
  previewMapping: jest.fn(),
  uploadFile: jest.fn(),
  checkLLMServiceHealth: jest.fn().mockResolvedValue(true),
  getDisplayError: jest.fn()
};

UploadService.mockImplementation(() => mockUploadService);

describe('CSV Append Flow Integration Tests', () => {
  let user;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Reset default mock implementations
    mockUploadService.analyzeUpload.mockResolvedValue(defaultAnalysisResult);
    mockUploadService.previewMapping.mockResolvedValue(defaultPreviewResult);
    mockUploadService.uploadFile.mockResolvedValue(defaultUploadResult);
  });

  // ============================================================================
  // TEST DATA FIXTURES
  // ============================================================================

  const defaultAnalysisResult = {
    upload_mode: 'advanced',
    source_columns: [
      { name: 'employee_name', type: 'text', sample_values: ['John Doe', 'Jane Smith'] },
      { name: 'sales_amount', type: 'number', sample_values: [1000, 2500] },
      { name: 'location', type: 'text', sample_values: ['New York', 'Los Angeles'] },
      { name: 'product_type', type: 'text', sample_values: ['Premium', 'Standard'] }
    ],
    existing_table_info: {
      table_name: 'sales_data',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'employee_name', type: 'text' },
        { name: 'sales_amount', type: 'real' },
        { name: 'location', type: 'text' },
        { name: 'sale_date', type: 'date' },
        { name: 'customer_name', type: 'text' }
      ]
    },
    mapping_suggestions: [
      { source_column: 'employee_name', target_column: 'employee_name', confidence: 95 },
      { source_column: 'sales_amount', target_column: 'sales_amount', confidence: 90 },
      { source_column: 'location', target_column: 'location', confidence: 85 }
    ],
    missing_columns: ['sale_date', 'customer_name'],
    new_columns: ['product_type'],
    overall_confidence: 78,
    llm_recommendations: {
      business_context: 'Sales data with product information',
      recommendations: [
        {
          type: 'add_column',
          column_name: 'product_type',
          reasoning: 'New product categorization data',
          confidence: 85
        }
      ]
    }
  };

  const defaultPreviewResult = {
    preview_data: [
      { employee_name: 'John Doe', sales_amount: 1000, location: 'New York' },
      { employee_name: 'Jane Smith', sales_amount: 2500, location: 'Los Angeles' }
    ],
    data_quality: {
      null_percentage: 5,
      duplicate_rows: 0,
      issues: []
    }
  };

  const defaultUploadResult = {
    success: true,
    operation_mode: 'APPEND',
    table_name: 'sales_data',
    records_processed: 2,
    schema_evolved: true,
    added_columns: ['product_type']
  };

  const createMockFile = (name = 'test_sales.csv', type = 'text/csv') => {
    return new File(['employee_name,sales_amount,location\nJohn Doe,1000,New York'], name, { type });
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    targetService: 'nl2sql',
    existingTables: ['sales_data', 'customer_data', 'product_data'],
    onUploadSuccess: jest.fn()
  };

  // ============================================================================
  // TEST SCENARIOS: Parameter Forwarding
  // ============================================================================

  describe('Parameter Forwarding Tests', () => {
    test('should forward targetTable selection to backend', async () => {
      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      // Upload file
      await user.upload(fileInput, file);
      
      // Select existing table
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');
      
      // Wait for analysis to be called
      await waitFor(() => {
        expect(mockUploadService.analyzeUpload).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            target_table: 'sales_data'
          })
        );
      });
    });

    test('should send correct operation_mode based on table selection', async () => {
      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      // Upload file and select existing table
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');
      
      // Complete mapping and proceed to upload
      await waitFor(() => screen.getByText(/confirm upload|proceed/i));
      const confirmButton = screen.getByText(/confirm upload|proceed/i);
      await user.click(confirmButton);
      
      // Verify upload called with correct parameters
      await waitFor(() => {
        expect(mockUploadService.uploadFile).toHaveBeenCalledWith(
          expect.any(File),
          expect.any(Object),
          expect.any(String),
          expect.objectContaining({
            target_table: 'sales_data'
          })
        );
      });
    });

    test('should handle new table creation mode correctly', async () => {
      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      // Upload file but don't select existing table (create new)
      await user.upload(fileInput, file);
      
      // Should proceed to upload without target_table
      await waitFor(() => screen.getByText(/confirm upload|proceed/i));
      const confirmButton = screen.getByText(/confirm upload|proceed/i);
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockUploadService.uploadFile).toHaveBeenCalledWith(
          expect.any(File),
          expect.any(Object),
          expect.any(String),
          expect.objectContaining({
            target_table: undefined
          })
        );
      });
    });
  });

  // ============================================================================
  // TEST SCENARIOS: LLM Recommendation Display
  // ============================================================================

  describe('LLM Recommendation Display Tests', () => {
    test('should display LLM recommendations in compatibility phase', async () => {
      const analysisWithLLM = {
        ...defaultAnalysisResult,
        llm_recommendations: {
          business_context: 'Sales data with enhanced product tracking',
          recommendations: [
            {
              type: 'add_column',
              column_name: 'product_type',
              reasoning: 'New product categorization improves sales analytics',
              confidence: 88,
              suggested_action: 'add_to_schema'
            }
          ],
          compatibility_summary: 'High compatibility with minor enhancements needed'
        }
      };

      mockUploadService.analyzeUpload.mockResolvedValue(analysisWithLLM);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      // Wait for LLM recommendations to appear
      await waitFor(() => {
        expect(screen.getByText(/ai recommendations|llm insights/i)).toBeInTheDocument();
      });

      // Check specific recommendation content
      expect(screen.getByText(/product categorization improves sales analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/88%|88/)).toBeInTheDocument(); // Confidence score
    });

    test('should handle missing LLM recommendations gracefully', async () => {
      const analysisWithoutLLM = {
        ...defaultAnalysisResult,
        llm_recommendations: null
      };

      mockUploadService.analyzeUpload.mockResolvedValue(analysisWithoutLLM);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      // Should not crash and should show mapping interface
      await waitFor(() => {
        expect(screen.getByText(/column mapping|map columns/i)).toBeInTheDocument();
      });

      // LLM section should be hidden or show fallback message
      const llmSection = screen.queryByText(/ai recommendations|llm insights/i);
      if (llmSection) {
        expect(screen.getByText(/no recommendations available/i)).toBeInTheDocument();
      }
    });

    test('should display business context analysis', async () => {
      const contextAnalysis = {
        ...defaultAnalysisResult,
        llm_recommendations: {
          business_context: 'Sales performance data with regional and product dimensions',
          data_insights: [
            'Strong geographical distribution across major markets',
            'Product type data suggests expansion into premium segment'
          ],
          recommendations: []
        }
      };

      mockUploadService.analyzeUpload.mockResolvedValue(contextAnalysis);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      // Check for business context display
      await waitFor(() => {
        expect(screen.getByText(/sales performance data with regional/i)).toBeInTheDocument();
      });

      // Check for data insights
      expect(screen.getByText(/strong geographical distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/premium segment/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST SCENARIOS: Schema Evolution UI
  // ============================================================================

  describe('Schema Evolution UI Tests', () => {
    test('should display schema evolution confirmation modal', async () => {
      const evolutionAnalysis = {
        ...defaultAnalysisResult,
        new_columns: ['product_type', 'sales_channel'],
        llm_recommendations: {
          recommendations: [
            {
              type: 'add_column',
              column_name: 'product_type',
              reasoning: 'Valuable for product analytics',
              confidence: 90
            }
          ]
        }
      };

      mockUploadService.analyzeUpload.mockResolvedValue(evolutionAnalysis);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      // Proceed through mapping
      await waitFor(() => screen.getByText(/confirm upload|proceed/i));
      const proceedButton = screen.getByText(/confirm upload|proceed/i);
      await user.click(proceedButton);

      // Should show schema evolution confirmation
      await waitFor(() => {
        expect(screen.getByText(/schema changes|add columns/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/product_type/i)).toBeInTheDocument();
      expect(screen.getByText(/sales_channel/i)).toBeInTheDocument();
    });

    test('should allow user to approve schema evolution', async () => {
      const evolutionAnalysis = {
        ...defaultAnalysisResult,
        new_columns: ['product_type']
      };

      mockUploadService.analyzeUpload.mockResolvedValue(evolutionAnalysis);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      await waitFor(() => screen.getByText(/confirm upload|proceed/i));
      const proceedButton = screen.getByText(/confirm upload|proceed/i);
      await user.click(proceedButton);

      // Find and click approve schema evolution
      await waitFor(() => screen.getByText(/approve|confirm changes/i));
      const approveButton = screen.getByText(/approve|confirm changes/i);
      await user.click(approveButton);

      // Should proceed with upload
      await waitFor(() => {
        expect(mockUploadService.uploadFile).toHaveBeenCalledWith(
          expect.any(File),
          expect.any(Object),
          expect.any(String),
          expect.objectContaining({
            allow_schema_evolution: true
          })
        );
      });
    });
  });

  // ============================================================================
  // TEST SCENARIOS: Error Handling
  // ============================================================================

  describe('Error Handling Tests', () => {
    test('should handle table not found error gracefully', async () => {
      mockUploadService.analyzeUpload.mockRejectedValue(new Error('Target table does not exist'));
      mockUploadService.getDisplayError.mockReturnValue({
        title: 'Table Not Found',
        message: 'The selected table does not exist in the database',
        severity: 'high',
        recoverable: true,
        actions: ['select_different_table', 'create_new_table']
      });

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'nonexistent_table');

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/table not found/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/does not exist in the database/i)).toBeInTheDocument();
      
      // Should show recovery options
      expect(screen.getByText(/select different table|try different table/i)).toBeInTheDocument();
    });

    test('should handle LLM service unavailable scenario', async () => {
      mockUploadService.checkLLMServiceHealth.mockResolvedValue(false);
      
      const analysisWithoutLLM = {
        ...defaultAnalysisResult,
        llm_recommendations: null,
        warnings: ['AI recommendations unavailable - proceeding with basic analysis']
      };

      mockUploadService.analyzeUpload.mockResolvedValue(analysisWithoutLLM);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);

      // Should show warning about LLM service
      await waitFor(() => {
        expect(screen.getByText(/ai recommendations unavailable/i)).toBeInTheDocument();
      });

      // Should still allow proceeding with basic analysis
      expect(screen.getByText(/column mapping|map columns/i)).toBeInTheDocument();
    });

    test('should provide meaningful error messages for upload failures', async () => {
      mockUploadService.uploadFile.mockRejectedValue(new Error('Schema incompatible'));
      mockUploadService.getDisplayError.mockReturnValue({
        title: 'Schema Incompatibility',
        message: 'The file structure is not compatible with the target table',
        severity: 'high',
        recoverable: true,
        actions: ['review_mapping', 'allow_schema_evolution']
      });

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      await waitFor(() => screen.getByText(/confirm upload|proceed/i));
      const confirmButton = screen.getByText(/confirm upload|proceed/i);
      await user.click(confirmButton);

      // Should show error after upload attempt
      await waitFor(() => {
        expect(screen.getByText(/schema incompatibility/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/not compatible with the target table/i)).toBeInTheDocument();
      
      // Should show recovery actions
      expect(screen.getByText(/review mapping|allow schema evolution/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST SCENARIOS: Complete Workflow Integration
  // ============================================================================

  describe('Complete Workflow Integration Tests', () => {
    test('should complete full append flow with schema evolution', async () => {
      const fullWorkflowAnalysis = {
        ...defaultAnalysisResult,
        new_columns: ['product_type'],
        overall_confidence: 85,
        llm_recommendations: {
          business_context: 'Enhanced sales data with product categorization',
          recommendations: [
            {
              type: 'add_column',
              column_name: 'product_type',
              reasoning: 'Adds valuable product insights',
              confidence: 90
            }
          ]
        }
      };

      const successfulUpload = {
        ...defaultUploadResult,
        schema_evolved: true,
        added_columns: ['product_type'],
        records_processed: 150
      };

      mockUploadService.analyzeUpload.mockResolvedValue(fullWorkflowAnalysis);
      mockUploadService.uploadFile.mockResolvedValue(successfulUpload);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile('enhanced_sales.csv');
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      // Step 1: Upload and analyze file
      await user.upload(fileInput, file);
      expect(screen.getByText(/enhanced_sales.csv/i)).toBeInTheDocument();

      // Step 2: Select target table
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      // Step 3: Review LLM recommendations
      await waitFor(() => {
        expect(screen.getByText(/enhanced sales data with product categorization/i)).toBeInTheDocument();
      });

      // Step 4: Review and confirm mapping
      await waitFor(() => screen.getByText(/confirm upload|proceed/i));
      const proceedButton = screen.getByText(/confirm upload|proceed/i);
      await user.click(proceedButton);

      // Step 5: Approve schema evolution
      await waitFor(() => screen.getByText(/approve|confirm changes/i));
      const approveButton = screen.getByText(/approve|confirm changes/i);
      await user.click(approveButton);

      // Step 6: Verify successful completion
      await waitFor(() => {
        expect(screen.getByText(/upload successful|success/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/150 records processed/i)).toBeInTheDocument();
      expect(screen.getByText(/schema evolved|product_type added/i)).toBeInTheDocument();

      // Verify onUploadSuccess was called
      expect(defaultProps.onUploadSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          records_processed: 150,
          schema_evolved: true
        })
      );
    });

    test('should handle quick upload flow for high confidence matches', async () => {
      const quickUploadAnalysis = {
        ...defaultAnalysisResult,
        overall_confidence: 95,
        upload_mode: 'quick',
        missing_columns: [],
        new_columns: [],
        mapping_suggestions: [
          { source_column: 'employee_name', target_column: 'employee_name', confidence: 98 },
          { source_column: 'sales_amount', target_column: 'sales_amount', confidence: 96 },
          { source_column: 'location', target_column: 'location', confidence: 94 }
        ]
      };

      mockUploadService.analyzeUpload.mockResolvedValue(quickUploadAnalysis);

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile('perfect_match.csv');
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      // Should show quick upload option due to high confidence
      await waitFor(() => {
        expect(screen.getByText(/quick upload|high confidence/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/95%/)).toBeInTheDocument(); // Confidence display

      // Click quick upload
      const quickUploadButton = screen.getByText(/quick upload|upload now/i);
      await user.click(quickUploadButton);

      // Should proceed directly to upload without detailed mapping
      await waitFor(() => {
        expect(mockUploadService.uploadFile).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // TEST SCENARIOS: Column Mapping Enhancements
  // ============================================================================

  describe('Column Mapping Enhancement Tests', () => {
    const ColumnMappingTestComponent = () => {
      const [userMappings, setUserMappings] = React.useState({});
      
      const handleUpdateMapping = (sourceColumn, targetColumn) => {
        setUserMappings(prev => ({
          ...prev,
          [sourceColumn]: targetColumn
        }));
      };

      return (
        <ColumnMappingPhase
          selectedFile={createMockFile()}
          analysisResult={defaultAnalysisResult}
          userMappings={userMappings}
          onUpdateMapping={handleUpdateMapping}
          llmRecommendations={defaultAnalysisResult.llm_recommendations}
        />
      );
    };

    test('should integrate LLM suggestions into mapping interface', async () => {
      render(<ColumnMappingTestComponent />);

      // Should display LLM insights
      expect(screen.getByText(/ai recommendations|llm insights/i)).toBeInTheDocument();
      
      // Should show confidence scores for mappings
      expect(screen.getByText(/95%/)).toBeInTheDocument(); // High confidence mapping
      expect(screen.getByText(/90%/)).toBeInTheDocument(); // Medium confidence mapping

      // Should highlight new columns with AI reasoning
      expect(screen.getByText(/product categorization/i)).toBeInTheDocument();
    });

    test('should allow applying LLM recommendations automatically', async () => {
      render(<ColumnMappingTestComponent />);

      // Find and click auto-apply AI suggestions
      const autoApplyButton = screen.getByText(/apply ai suggestions|auto apply/i);
      await user.click(autoApplyButton);

      // High confidence mappings should be applied
      await waitFor(() => {
        const employeeNameMapping = screen.getByDisplayValue('employee_name');
        expect(employeeNameMapping).toBeInTheDocument();
        
        const salesAmountMapping = screen.getByDisplayValue('sales_amount');
        expect(salesAmountMapping).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // TEST SCENARIOS: Accessibility and UX
  // ============================================================================

  describe('Accessibility and UX Tests', () => {
    test('should be keyboard navigable', async () => {
      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      // Tab navigation should work
      await user.tab();
      expect(fileInput).toHaveFocus();
      
      // File upload via keyboard
      const file = createMockFile();
      await user.upload(fileInput, file);
      
      await user.tab();
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      expect(tableSelect).toHaveFocus();
    });

    test('should provide proper loading states', async () => {
      // Mock delayed response
      mockUploadService.analyzeUpload.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(defaultAnalysisResult), 100))
      );

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      
      // Should show loading state
      expect(screen.getByText(/analyzing|loading/i)).toBeInTheDocument();
      
      // Should complete and show results
      await waitFor(() => {
        expect(screen.getByText(/column mapping|map columns/i)).toBeInTheDocument();
      });
    });

    test('should handle progress indicators correctly', async () => {
      mockUploadService.uploadFile.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(defaultUploadResult), 200))
      );

      render(<ProgressiveUploadModal {...defaultProps} />);
      
      const file = createMockFile();
      const fileInput = screen.getByLabelText(/select file|choose file|upload/i);
      
      await user.upload(fileInput, file);
      const tableSelect = screen.getByRole('combobox', { name: /select table|target table/i });
      await user.selectOptions(tableSelect, 'sales_data');

      await waitFor(() => screen.getByText(/confirm upload|proceed/i));
      const confirmButton = screen.getByText(/confirm upload|proceed/i);
      await user.click(confirmButton);

      // Should show upload progress
      expect(screen.getByText(/uploading|processing/i)).toBeInTheDocument();
      
      // Should complete successfully
      await waitFor(() => {
        expect(screen.getByText(/upload successful|success/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});

// ============================================================================
// MOCK SETUP AND UTILITIES
// ============================================================================

// Mock the useColumnMapping hook
jest.mock('../../hooks/useColumnMapping', () => ({
  useColumnMapping: jest.fn(() => ({
    userMappings: {},
    effectiveMappings: {},
    mappingStats: { mapped: 0, unmapped: 0, total: 0 },
    overallConfidence: 0,
    validationResults: { isValid: true, errors: [] },
    updateMapping: jest.fn(),
    resetMappings: jest.fn(),
    applyAIRecommendations: jest.fn()
  }))
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  AlertTriangle: () => <div data-testid="warning-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
}));