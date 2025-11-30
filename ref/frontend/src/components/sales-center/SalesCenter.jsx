import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Upload,
  MessageSquare,
  Lightbulb
} from 'lucide-react';
import UnifiedHeader from '../ui/header/UnifiedHeader';

// Import Sales Center components
import SalesAnalyticsDashboard from './SalesAnalyticsDashboard';
import NaturalLanguageQuery from './NaturalLanguageQuery';
import BusinessInsightsPage from './BusinessInsightsPage';

// Import the sales center context
import { useSalesCenter } from '../../contexts/SalesCenterContext';
// import analyticsApiService from '../../services/analyticsApiService';

const SalesCenter = () => {
  const [activeTab, setActiveTab] = useState('upload');
  
  // Get all state from context instead of local state
  const {
    selectedTable,
    availableTables,
    tablesLoading,
    handleTableChange,
    comparativeData,
    comparativeLoading,
    loadComparativeData,
  } = useSalesCenter();

  const tabs = [
    { id: 'upload', label: 'Upload & Overview', icon: Upload },
    { id: 'comparative', label: 'Comparative Metrics', icon: BarChart3 },
    { id: 'insights', label: 'Business Insights', icon: Lightbulb },
    { id: 'ask', label: 'Ask Questions', icon: MessageSquare }
  ];

  // Track analytics for Sales Center module visit
  // useEffect(() => {
  //   analyticsApiService.trackModuleVisit('Sales Center', ['view_dashboard']);
    
  //   return () => {
  //     analyticsApiService.updateModuleTimeSpent('Sales Center');
  //   };
  // }, []);

  // Load data for specific tabs using useEffect instead of render-time side effects
  React.useEffect(() => {
    if (activeTab === 'comparative' && !comparativeData && !comparativeLoading && selectedTable) {
      loadComparativeData();
    }
  }, [activeTab, comparativeData, comparativeLoading, selectedTable, loadComparativeData]);

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <SalesAnalyticsDashboard
            key="upload-tab"
            mode="upload-only"
            selectedTable={selectedTable}
            availableTables={availableTables}
            tablesLoading={tablesLoading}
            onTableChange={handleTableChange}
          />
        );
      case 'insights':
        return (
          <BusinessInsightsPage
            key="insights-tab"
            selectedTable={selectedTable}
            availableTables={availableTables}
            tablesLoading={tablesLoading}
            onTableChange={handleTableChange}
          />
        );
      case 'comparative':
        return (
          <SalesAnalyticsDashboard
            key="comparative-tab"
            mode="comparative-metrics"
            selectedTable={selectedTable}
            availableTables={availableTables}
            tablesLoading={tablesLoading}
            preloadedData={comparativeData}
            dataLoading={comparativeLoading}
          />
        );
      case 'ask':
        return <NaturalLanguageQuery key="ask-tab" selectedTable={selectedTable} />;
      default:
        return (
          <SalesAnalyticsDashboard 
            key="main-overview-tab"
            mode="main-overview" 
            selectedTable={selectedTable}
            availableTables={availableTables}
            tablesLoading={tablesLoading}
            onTableChange={handleTableChange}
          />
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <UnifiedHeader
        title="Sales Center"
        themeColor="purple"
        tabs={tabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          isActive: activeTab === tab.id,
          onClick: () => setActiveTab(tab.id)
        }))}
      />

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SalesCenter); 