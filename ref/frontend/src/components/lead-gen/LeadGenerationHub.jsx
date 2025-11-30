import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MapPin,
  Network,
  TrendingUp
} from 'lucide-react';
import UnifiedHeader from '../ui/header/UnifiedHeader';
import { useLeadContext } from '../../contexts/LeadContext';

import LeadManagement from './LeadManagement';
import GeneratingNewLeads from './GeneratingNewLeads';
import MarketDensityHeatmap from './MarketDensityHeatmap';

const LeadGenerationHub = ({ wsConnection }) => {
  const [activeMainTab, setActiveMainTab] = useState('lead-management');
  const { isLoadedFromCache } = useLeadContext();

  // Use faster animation when data is loaded from cache (50ms vs 200ms)
  const animationDuration = isLoadedFromCache ? 0.05 : 0.2;

  // Track analytics for Lead Generation module visit
  // useEffect(() => {
  //   analyticsApiService.trackModuleVisit('Lead Generation', ['view_leads', 'market_analysis']);
    
  //   return () => {
  //     analyticsApiService.updateModuleTimeSpent('Lead Generation');
  //   };
  // }, []);

  const mainTabs = [
    {
      id: 'lead-management',
      label: 'Lead Management',
      icon: Users
    },
    {
      id: 'generating-new-leads',
      label: 'Generating New Leads',
      icon: Network
    }
    // Market Density tab hidden for now but preserved for future use
    // {
    //   id: 'market-density',
    //   label: 'Market Density',
    //   icon: MapPin
    // }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <UnifiedHeader
        title="Lead Generation"
        themeColor="blue"
        tabs={mainTabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          isActive: activeMainTab === tab.id,
          onClick: () => setActiveMainTab(tab.id)
        }))}
      />

      {/* Tab Content */}
      <div className="flex-1">
        {activeMainTab === 'lead-management' && (
          <motion.div
            key="lead-management"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDuration }}
            className="h-full"
          >
            <LeadManagement />
          </motion.div>
        )}

        {activeMainTab === 'generating-new-leads' && (
          <motion.div
            key="generating-new-leads"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDuration }}
            className="h-full"
          >
            <GeneratingNewLeads />
          </motion.div>
        )}

        {activeMainTab === 'market-density' && (
          <motion.div
            key="market-density"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDuration }}
            className="h-full"
          >
            <div className="h-full p-4 overflow-y-auto">
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-medium text-gray-900">Market Opportunities</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Identify high-potential regions for business expansion
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Network className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Competitive Analysis</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Analyze competitor density and market saturation
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium text-gray-900">Geographic Insights</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Interactive heatmaps with detailed regional data
                  </p>
                </div>
              </div>

              {/* Market Density Content */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <MarketDensityHeatmap className="w-full" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LeadGenerationHub;