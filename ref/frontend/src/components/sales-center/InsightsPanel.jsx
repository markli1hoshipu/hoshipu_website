import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Target,
  ArrowRight,
  Activity,
  CheckCircle
} from 'lucide-react';
import { Card } from '../ui/primitives/card';

/**
 * InsightsPanel Component for displaying business insights
 */
const InsightsPanel = ({ insights, loading, error, onRetry }) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8"
      >
        <Card className="p-6 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Loading Business Insights</h3>
              <p className="text-sm text-gray-600">
                Retrieving AI-generated insights for your selected timeframe...
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="animate-pulse">
              <div className="h-4 bg-purple-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-purple-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-purple-200 rounded w-5/6"></div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

    // Error state
    if (error) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        >
          <Card className="p-6 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Failed to Load Insights
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {error}
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      );
    }

    // Success state - render insights
    if (insights) {
      // Handle new lightweight string format
      if (typeof insights === 'string') {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <Card className="p-6 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Business Insights</h3>
                  <p className="text-sm text-gray-600">
                    AI-generated analysis of your sales data
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {insights}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      }

      // Handle array format for backward compatibility
      if (Array.isArray(insights) && insights.length > 0) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <Card className="p-6 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Business Insights</h3>
                  <p className="text-sm text-gray-600">
                    AI-generated analysis of your sales data
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4">
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {insight.title || insight.category || `Insight ${index + 1}`}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {insight.description || insight.insight || insight}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        );
      }
      
      // Handle object format (current backend format)
      if (insights.summary || insights.key_insights || insights.recommendations) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <Card className="p-6 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Business Insights</h3>
                  <p className="text-sm text-gray-600">
                    AI-generated analysis of your sales data
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Executive Summary */}
                {insights.summary && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2">Executive Summary</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {insights.summary}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Key Insights */}
                {insights.key_insights && insights.key_insights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-3">Key Insights</h4>
                        <div className="space-y-2">
                          {insights.key_insights.map((insight, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {insight}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Recommendations */}
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Target className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                        <div className="space-y-2">
                          {insights.recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <ArrowRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        );
      }
    }

    // Empty state
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8"
      >
        <Card className="p-6 border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">No Insights Available</h3>
              <p className="text-sm text-gray-600">
                No insights found for the selected timeframe. Try adjusting your time period filter.
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading
            </button>
          )}
        </Card>
      </motion.div>
    );
  };

export default InsightsPanel; 