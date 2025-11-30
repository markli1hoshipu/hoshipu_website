import React, { useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import ExecutiveSummarySection from './ExecutiveSummarySection';
import ActionCardsGrid from './ActionCardsGrid';
import { useSalesCenter } from '../../contexts/SalesCenterContext';
import { Card } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';

const BusinessInsightsPage = () => {
  const {
    insights,
    insightsLoading,
    insightsError,
    selectedTable,
    loadInsightsData
  } = useSalesCenter();

  // Load insights when table changes (only if not cached)
  useEffect(() => {
    if (selectedTable && insights === null && !insightsLoading) {
      loadInsightsData(selectedTable);
    }
    // Note: loadInsightsData is intentionally omitted from deps to prevent infinite loops
    // It's a stable function from context and only needs to run when table/data state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable, insights, insightsLoading]);

  // No table selected state
  if (!selectedTable) {
    return (
      <Card className="p-12 text-center border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <Lightbulb className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Select a Data Source
        </h3>
        <p className="text-gray-600">
          Choose a data table to generate AI-powered business insights and analytics.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Loading State */}
      {insightsLoading && (
        <div className="space-y-8 animate-pulse">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {insightsError && !insightsLoading && (
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Insights</h3>
          <p className="text-red-700">{insightsError}</p>
          <Button
            onClick={() => loadInsightsData(selectedTable, true)}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Insights Display */}
      {insights && !insightsLoading && !insightsError && (
        <>
          {/* Part 1: Executive Summary */}
          {insights.part_1_summary?.overview && (
            <ExecutiveSummarySection overview={insights.part_1_summary.overview} />
          )}

          {/* Part 2: Action Cards Grid */}
          {insights.part_2_actions && (
            <ActionCardsGrid actionsData={insights.part_2_actions} />
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(BusinessInsightsPage);