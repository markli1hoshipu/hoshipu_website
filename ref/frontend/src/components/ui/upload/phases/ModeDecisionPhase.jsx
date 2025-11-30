/**
 * Mode Decision Phase - Choose between Quick and Advanced upload
 */
import React from 'react';
import { AlertTriangle, Zap, Settings, TrendingUp, FileText, Loader, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../primitives/card';
import ModeOption from '../components/ModeOption';
import { UPLOAD_MODES } from '../utils/uploadConfig';

const ModeDecisionPhase = ({
  analysisResult,
  analysisSummary,
  dataQuality,
  isQuickRecommended,
  onModeSelected
}) => {
  if (!analysisResult || !analysisSummary) {
    return (
      <div className="p-6 text-center space-y-4">
        <Loader className="w-12 h-12 mx-auto text-prelude-800 animate-spin" />
        <div>
          <p className="text-lg font-medium text-gray-700">
            Analyzing Your Data...
          </p>
          <p className="text-sm text-gray-500">
            AI is examining columns and suggesting optimal mappings
          </p>
        </div>
      </div>
    );
  }

  const {
    totalColumns,
    mappedColumns,
    mappingPercentage,
    overallConfidence,
    missingColumnsCount,
    newColumnsCount,
    dataIssuesCount,
    highSeverityIssues
  } = analysisSummary;

  const quickMode = {
    ...UPLOAD_MODES.QUICK,
    confidence: overallConfidence
  };

  const advancedMode = {
    ...UPLOAD_MODES.ADVANCED,
    confidence: 100 // Advanced mode always has 100% user control
  };

  const hasIssues = missingColumnsCount > 0 || newColumnsCount > 0 || highSeverityIssues > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Analysis Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analysis Complete</h3>
          <p className="text-gray-600">
            Your file has been analyzed. Choose how you'd like to proceed.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center gap-6 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{totalColumns}</div>
            <div className="text-gray-600">Columns</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold flex items-center justify-center gap-1 ${
              overallConfidence >= 90 ? 'text-green-600' :
              overallConfidence >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {overallConfidence}%
              {overallConfidence >= 90 && <CheckCircle className="w-3 h-3" />}
              {overallConfidence < 70 && <AlertTriangle className="w-3 h-3" />}
            </div>
            <div className="text-gray-600">Match Confidence</div>
            <div className="text-xs text-gray-500">
              {overallConfidence >= 90 ? 'Excellent' :
               overallConfidence >= 70 ? 'Good' : 'Needs Review'}
            </div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${
              dataQuality?.score >= 80 ? 'text-green-600' :
              dataQuality?.score >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {dataQuality?.score || 0}%
            </div>
            <div className="text-gray-600">Data Quality</div>
          </div>
        </div>
      </motion.div>

      {/* Issues Alert (if any) */}
      {hasIssues && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-2">Mapping Considerations</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {overallConfidence < 70 && (
                      <li>• Some columns have low mapping confidence ({overallConfidence}%)</li>
                    )}
                    {missingColumnsCount > 0 && (
                      <li>• {missingColumnsCount} expected columns not found in your file</li>
                    )}
                    {newColumnsCount > 0 && (
                      <li>• {newColumnsCount} new columns will be added to the database</li>
                    )}
                    {highSeverityIssues > 0 && (
                      <li>• {highSeverityIssues} critical data quality issues detected</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Mode Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <ModeOption
          icon={Zap}
          title={quickMode.name}
          description={quickMode.description}
          features={quickMode.features}
          confidence={quickMode.confidence}
          recommended={isQuickRecommended && !hasIssues}
          onClick={() => onModeSelected('quick')}
          disabled={highSeverityIssues > 0}
        />

        <ModeOption
          icon={Settings}
          title={advancedMode.name}
          description={advancedMode.description}
          features={advancedMode.features}
          recommended={!isQuickRecommended || hasIssues}
          onClick={() => onModeSelected('advanced')}
        />
      </motion.div>

      {/* Detailed Analysis Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Mapping Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Column Mapping</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Mapped columns:</span>
                <span className="font-medium">{mappedColumns} of {totalColumns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success rate:</span>
                <span className={`font-medium ${
                  mappingPercentage >= 90 ? 'text-green-600' :
                  mappingPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {mappingPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    mappingPercentage >= 90 ? 'bg-green-500' :
                    mappingPercentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${mappingPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Quality */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-gray-900">Data Quality</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Overall score:</span>
                <span className={`font-medium ${
                  (dataQuality?.score || 0) >= 90 ? 'text-green-600' :
                  (dataQuality?.score || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {dataQuality?.score || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data issues:</span>
                <span className={`font-medium ${
                  dataIssuesCount === 0 ? 'text-green-600' :
                  dataIssuesCount < 5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {dataIssuesCount} found
                </span>
              </div>
              {dataQuality?.issues && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Critical issues:</span>
                  <span className={`font-medium ${
                    dataQuality.issues.critical === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {dataQuality.issues.critical}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center p-4 bg-gray-50 rounded-lg"
      >
        <p className="text-sm text-gray-600">
          <strong>Recommendation:</strong>{' '}
          {isQuickRecommended && !hasIssues
            ? 'Your data looks great! Quick Upload should work perfectly.'
            : 'We recommend Advanced Mapping to ensure the best results.'
          }
        </p>
      </motion.div>
    </div>
  );
};

export default ModeDecisionPhase;