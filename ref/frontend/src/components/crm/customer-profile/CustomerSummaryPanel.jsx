import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, AlertCircle, Brain } from 'lucide-react';
import { Button } from '../../ui/primitives/button';

/**
 * Customer Summary Panel
 * Displays AI-generated interaction summary
 */
const CustomerSummaryPanel = ({
  customer,
  cachedSummary,
  onGenerateSummary,
  authFetch
}) => {
  const [summaryPeriod, setSummaryPeriod] = useState(30);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const handleGenerateSummary = async () => {
    if (!customer?.id) return;

    setIsGeneratingSummary(true);
    setSummaryError('');

    try {
      await onGenerateSummary(customer.id, summaryPeriod);
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummaryError('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const renderSummaryContent = () => {
    if (!cachedSummary) {
      return (
        <div className="text-center py-8">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">No AI insights generated yet</p>
          <Button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            {isGeneratingSummary ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Insights
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* AI Insights Section */}
        {cachedSummary.recent_activities && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-pink-600" />
              AI Insights
            </h4>
            <div className="prose prose-sm max-w-none">
              <div
                className="text-gray-700 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: cachedSummary.recent_activities }}
              />
            </div>
          </div>
        )}

        {/* Next Steps Section */}
        {cachedSummary.next_steps && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Next Steps</h4>
            <div className="prose prose-sm max-w-none">
              <div
                className="text-gray-700 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: cachedSummary.next_steps }}
              />
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isGeneratingSummary ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Summary
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Period Selector */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Analysis Period:</label>
        <select
          value={summaryPeriod}
          onChange={(e) => setSummaryPeriod(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          disabled={isGeneratingSummary}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Error Message */}
      {summaryError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{summaryError}</span>
        </motion.div>
      )}

      {/* Summary Content */}
      <div className="flex-1 overflow-y-auto">
        {renderSummaryContent()}
      </div>
    </div>
  );
};

export default CustomerSummaryPanel;

