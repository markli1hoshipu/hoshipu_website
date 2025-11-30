import React, { createContext, useContext, useEffect, useState } from 'react';
import { usageAnalyticsService } from '../services/usageAnalyticsService';

const UsageAnalyticsContext = createContext(null);

export const useUsageAnalytics = () => {
  const context = useContext(UsageAnalyticsContext);
  if (!context) {
    throw new Error('useUsageAnalytics must be used within a UsageAnalyticsProvider');
  }
  return context;
};

export const UsageAnalyticsProvider = ({ children }) => {
  const [usageData, setUsageData] = useState(null);
  const [radarData, setRadarData] = useState(null);
  const [workReport, setWorkReport] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);

  useEffect(() => {
    // Load initial data
    updateUsageData();
    
    // Update data periodically
    const interval = setInterval(updateUsageData, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Start tracking when module changes
    if (currentModule) {
      usageAnalyticsService.startModuleTracking(currentModule);
    }

    // Clean up tracking when component unmounts or module changes
    return () => {
      if (currentModule) {
        usageAnalyticsService.endModuleTracking();
      }
    };
  }, [currentModule]);

  const updateUsageData = () => {
    const moduleData = usageAnalyticsService.getModuleUsageData();
    const tokenData = usageAnalyticsService.getTokenUsageData();
    const chartData = usageAnalyticsService.getRadarChartData();
    const report = usageAnalyticsService.generateWorkReport();
    
    setUsageData({ moduleData, tokenData });
    setRadarData(chartData);
    setWorkReport(report);
  };

  const recordTokenUsage = (moduleName, tokens) => {
    usageAnalyticsService.recordTokenUsage(moduleName, tokens);
    updateUsageData();
  };

  const generateWorkReport = () => {
    const report = usageAnalyticsService.generateWorkReport();
    setWorkReport(report);
    return report;
  };

  const value = {
    usageData,
    radarData,
    workReport,
    currentModule,
    setCurrentModule,
    recordTokenUsage,
    generateWorkReport,
    updateUsageData,
  };

  return (
    <UsageAnalyticsContext.Provider value={value}>
      {children}
    </UsageAnalyticsContext.Provider>
  );
}; 