import React, { useState } from 'react';
import {
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/primitives/button';
import { Card } from '../ui/primitives/card';
import SalesCenterToolbar from './toolbar/SalesCenterToolbar';
import { getAvailableTables } from '../../services/salesDataApi';

// Import the sales center context
import { useSalesCenter } from '../../contexts/SalesCenterContext';

/**
 * Error Boundary Component for handling React errors gracefully
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 text-center border-red-200 bg-red-50">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
          <p className="text-red-600 mb-4">
            There was an error loading this component. Please refresh the page and try again.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-red-700">Error Details</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}

import UploadModal from './UploadModal';
import ComparativeMetrics from './ComparativeMetrics';
import MainDashboard from './MainDashboard';
import { useDateFilter } from '../../hooks/useDateFilter';
import { useComparativeMetricsFilter } from '../../hooks/useComparativeMetricsFilter';
import { useUnknownFilter } from '../../hooks/useUnknownFilter';
import { useDataLimitFilter } from '../../hooks/useDataLimitFilter';

/**
 * Main Sales Analytics Dashboard Component
 */
const SalesAnalyticsDashboard = ({ mode = 'main-overview', selectedTable, availableTables = [], tablesLoading = false, onTableChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingTables, setIsUpdatingTables] = useState(false);

  // Get context functions and loading states
  const { setAvailableTables, overallLoading, trendsLoading } = useSalesCenter();

  // Date filter hook
  const { dateFilter, setDateFilter, clearFilter, setPreset } = useDateFilter();

  // Comparative metrics filter hook
  const {
    selectedMetric,
    setSelectedMetric,
    showBenchmark,
    setShowBenchmark,
    showConcentration,
    setShowConcentration,
    topN,
    setTopN
  } = useComparativeMetricsFilter();

  // Unknown filter hook (comparative-metrics mode only)
  const { showUnknown, setShowUnknown } = useUnknownFilter();

  // Data limit filter hook (both modes)
  const {
    dataLimit,
    setDataLimit,
    limitEnabled,
    setLimitEnabled
  } = useDataLimitFilter();

  const handleUploadSuccess = async (_uploadResult) => {
    // Prevent multiple simultaneous updates
    if (isUpdatingTables) {
      console.log('⏸️ Upload success - tables update already in progress, skipping');
      return;
    }

    console.log('🔄 Upload success - updating tables list');
    setIsUpdatingTables(true);

    try {
      // Only update the tables list without triggering full context refresh
      const tables = await getAvailableTables();
      setAvailableTables(tables);
      console.log('✅ Upload success - tables list updated');
    } catch (error) {
      console.error('Failed to update tables after upload:', error);
    } finally {
      setIsUpdatingTables(false);
    }
  };


  // Handle overview and upload modes with the new layout (including default fallback)
  if (mode === 'main-overview' || mode === 'upload-only' || mode === 'default') {
    return (
      <div className="space-y-8">
        {/* Sales Center Toolbar */}
        <SalesCenterToolbar
          mode="overview"
          primaryAction={{
            label: 'Upload Data',
            onClick: () => setIsModalOpen(true),
            loading: overallLoading || trendsLoading
          }}
          selectedTable={selectedTable}
          availableTables={availableTables}
          tablesLoading={tablesLoading}
          onTableChange={onTableChange}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          clearDateFilter={clearFilter}
          setDatePreset={setPreset}
          limitEnabled={limitEnabled}
          setLimitEnabled={setLimitEnabled}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          themeColor="purple"
        />

        {/* Main Dashboard Content */}
        <MainDashboard
          selectedTable={selectedTable}
          dateFilter={dateFilter}
          dataLimit={dataLimit}
          limitEnabled={limitEnabled}
        />
        
        {/* Upload Modal */}
        <UploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />

      </div>
    );
  }


  if (mode === 'comparative-metrics') {
    return (
      <div className="space-y-6">
        {/* Sales Center Toolbar for Comparative Metrics */}
        <SalesCenterToolbar
          mode="comparative"
          selectedMetric={selectedMetric}
          setSelectedMetric={setSelectedMetric}
          showUnknown={showUnknown}
          setShowUnknown={setShowUnknown}
          showBenchmark={showBenchmark}
          setShowBenchmark={setShowBenchmark}
          showConcentration={showConcentration}
          setShowConcentration={setShowConcentration}
          topN={topN}
          setTopN={setTopN}
          themeColor="purple"
        />

        <ComparativeMetrics
          tableName={selectedTable}
          selectedMetric={selectedMetric}
          showBenchmark={showBenchmark}
          showConcentration={showConcentration}
          showUnknown={showUnknown}
          topN={topN}
          dataLimit={dataLimit}
          limitEnabled={limitEnabled}
        />
      </div>
    );
  }

};

// Wrap main component with error boundary and memo
const SalesAnalyticsDashboardWithErrorBoundary = React.memo((props) => (
  <ErrorBoundary>
    <SalesAnalyticsDashboard {...props} />
  </ErrorBoundary>
));

SalesAnalyticsDashboardWithErrorBoundary.displayName = 'SalesAnalyticsDashboardWithErrorBoundary';

export default SalesAnalyticsDashboardWithErrorBoundary; 