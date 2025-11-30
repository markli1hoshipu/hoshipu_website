import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';

const InsightModal = ({
  isOpen,
  onClose,
  insights,
  currentIndex,
  onNavigate,
  cardPosition,
  navigationDirection
}) => {
  const currentInsight = insights[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < insights.length - 1;
  const [showDescription, setShowDescription] = useState(false);
  const [optimizedActions, setOptimizedActions] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimized, setShowOptimized] = useState(false);

  // Section descriptions mapping
  const sectionDescriptions = {
    "Today's Priorities": {
      description: "Analyzes today's transactions to identify high-value customer activities requiring immediate follow-up.",
      timeframe: "Today only"
    },
    "Customer Engagement": {
      description: "Tracks customer interaction frequency changes over the past 30 days to identify relationships needing reactivation or maintenance.",
      timeframe: "Past 30 days"
    },
    "Revenue Opportunities": {
      description: "Identifies high-revenue but low-frequency customers from historical data to uncover growth potential.",
      timeframe: "Lifetime value (all-time)"
    },
    "Strategic Initiatives": {
      description: "Identifies long-term strategic customers and growth opportunities based on historical data to plan future direction.",
      timeframe: "Lifetime analysis (all-time)"
    },
    "Risk Assessment": {
      description: "Analyzes revenue concentration risk using the Pareto principle (80/20 rule) to identify over-dependence on specific customers. Healthy distribution: top 20% of customers should generate 70-85% of revenue.",
      timeframe: "Lifetime value (all-time)"
    },
    "Performance Intelligence": {
      description: "Monitors daily revenue fluctuation trends over the past 30 days to identify dates with exceptional performance.",
      timeframe: "Past 30 days"
    }
  };

  const currentDescription = sectionDescriptions[currentInsight?.title] || null;

  // Reset description visibility and optimization state when navigating between insights
  useEffect(() => {
    setShowDescription(false);
    setOptimizedActions(null);
    setShowOptimized(false);
  }, [currentIndex]);

  // Optimize actions with AI
  const handleOptimizeActions = async () => {
    if (!currentInsight || !currentInsight.actions || currentInsight.actions.length === 0) {
      return;
    }

    // If already optimized, just toggle the view
    if (optimizedActions) {
      setShowOptimized(!showOptimized);
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await fetch('http://localhost:8002/api/insights/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section_name: currentInsight.title,
          situation: currentInsight.situation,
          actions: currentInsight.actions,
          additional_context: {}
        })
      });

      const result = await response.json();

      if (result.success && result.optimized_actions) {
        setOptimizedActions(result.optimized_actions);
        setShowOptimized(true);
      } else {
        console.error('Optimization failed:', result.message);
        alert('Failed to optimize actions. Please try again.');
      }
    } catch (error) {
      console.error('Error optimizing actions:', error);
      alert('Failed to optimize actions. Please check your connection.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && canGoPrev) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && canGoNext) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, canGoPrev, canGoNext, onClose, onNavigate]);

  const handlePrev = useCallback(() => {
    if (canGoPrev) onNavigate(currentIndex - 1);
  }, [canGoPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (canGoNext) onNavigate(currentIndex + 1);
  }, [canGoNext, currentIndex, onNavigate]);

  const getPriorityStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'MAJOR':  // New: Highest priority level
      case 'CRITICAL':  // Backward compatibility
        return 'text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded';
      case 'HIGH':
        return 'text-red-600 font-semibold';
      case 'MEDIUM':
        return 'text-yellow-600 font-medium';
      case 'LOW':
        return 'text-blue-600 font-normal';
      default:
        return 'text-foreground font-normal';
    }
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return 'No deadline';
    try {
      const date = new Date(deadline);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return deadline;
    }
  };

  if (!currentInsight) return null;

  const Icon = currentInsight.icon;
  const actionCount = currentInsight.actions?.length || 0;
  const hasActions = actionCount > 0;

  // Calculate initial position for zoom animation from card (only on first open)
  const getInitialPosition = () => {
    if (!cardPosition || navigationDirection !== null) {
      // If navigating between insights, use simple fade in without zoom
      return { opacity: 1, scale: 1, x: 0, y: 0 };
    }

    // First time opening: zoom from card center
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const cardCenterX = cardPosition.left + cardPosition.width / 2;
    const cardCenterY = cardPosition.top + cardPosition.height / 2;

    return {
      opacity: 0,
      scale: 0.3,
      x: cardCenterX - viewportCenterX,
      y: cardCenterY - viewportCenterY,
    };
  };

  // Calculate slide direction for content switching
  const getSlideDirection = () => {
    if (!navigationDirection) return { x: 0 }; // Initial open, no slide
    return navigationDirection === 'next'
      ? { x: 20 }  // Next: slide in from right
      : { x: -20 }; // Prev: slide in from left
  };

  const getSlideExit = () => {
    if (!navigationDirection) return { x: 0 };
    return navigationDirection === 'next'
      ? { x: -20 } // Exit to left when going next
      : { x: 20 };  // Exit to right when going prev
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal wrapper with arrows outside */}
          <div className="relative z-50 w-full max-w-2xl mx-4">
            {/* Modal Content - Only animates on first open, not on navigation */}
            <motion.div
              initial={getInitialPosition()}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
                duration: 0.3
              }}
              className="relative w-full max-h-[85vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {Icon && <Icon className="w-6 h-6 text-foreground" />}
                  <h2 className="text-xl font-semibold text-foreground">
                    {currentInsight.title}
                  </h2>
                  {currentDescription && (
                    <button
                      onClick={() => setShowDescription(!showDescription)}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      title="Show section information"
                    >
                      <Info className={`h-4 w-4 ${showDescription ? 'text-purple-600' : 'text-gray-400'}`} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {currentIndex + 1} / {insights.length}
                  </span>
                  <button
                    onClick={onClose}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Description */}
              <AnimatePresence>
                {showDescription && currentDescription && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 leading-relaxed mb-2">
                        {currentDescription.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">Timeframe:</span>
                        <span className="text-xs text-purple-600 font-semibold">{currentDescription.timeframe}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Scrollable Body with directional slide animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, ...getSlideDirection() }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, ...getSlideExit() }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-y-auto max-h-[calc(85vh-80px)] p-6 space-y-6"
              >
                {/* Insight Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Insight
                  </h3>
                  <p className="text-base text-gray-800 leading-relaxed">
                    {currentInsight.situation || 'No insight details available'}
                  </p>
                </div>

                {/* Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Actions ({actionCount})
                      </h3>
                      {showOptimized && optimizedActions && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                          AI Optimized
                        </span>
                      )}
                    </div>
                    {hasActions && (
                      <button
                        onClick={handleOptimizeActions}
                        disabled={isOptimizing}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className={`h-4 w-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
                        {isOptimizing ? 'Optimizing...' : showOptimized ? 'View Original' : 'Optimize with AI'}
                      </button>
                    )}
                  </div>
                  {hasActions ? (
                    <div className="space-y-4">
                      {(showOptimized && optimizedActions ? optimizedActions : currentInsight.actions).map((actionItem, index) => (
                        <div
                          key={index}
                          className={`rounded-lg p-4 border transition-all ${
                            showOptimized && optimizedActions
                              ? 'bg-purple-50 border-purple-300 shadow-sm'
                              : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="font-medium text-foreground mb-2 text-base">
                            {typeof actionItem === 'string' ? actionItem : actionItem.action}
                          </div>
                          {!(showOptimized && optimizedActions) && typeof actionItem === 'object' && (
                            <div className="flex flex-wrap gap-3 text-sm">
                              {actionItem.customer && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Customer:</span>
                                  <span className="font-medium text-gray-900">{actionItem.customer}</span>
                                </div>
                              )}
                              {actionItem.priority && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Priority:</span>
                                  <span className={getPriorityStyle(actionItem.priority)}>
                                    {actionItem.priority}
                                  </span>
                                </div>
                              )}
                              {actionItem.deadline && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Due:</span>
                                  <span className="text-gray-900">{formatDeadline(actionItem.deadline)}</span>
                                </div>
                              )}
                              {actionItem.confidence && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Confidence:</span>
                                  <span className="text-gray-900 font-medium">{(actionItem.confidence * 100).toFixed(0)}%</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Calculation Details - Revenue Opportunities */}
                          {!(showOptimized && optimizedActions) && typeof actionItem === 'object' && actionItem.calculation_details && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                View Calculation Details
                              </summary>
                              <div className="mt-3 p-4 bg-white rounded-lg border border-purple-200 space-y-3 text-sm">
                                {/* Opportunity Value */}
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-700 min-w-[140px]">Opportunity Value:</span>
                                  <span className="text-green-600 font-bold">
                                    ${actionItem.calculation_details.opportunity_value?.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                </div>

                                {/* Formula */}
                                {actionItem.calculation_details.formula && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-700 min-w-[140px]">Formula:</span>
                                    <code className="flex-1 text-xs bg-gray-50 px-3 py-2 rounded border border-gray-200 font-mono">
                                      {actionItem.calculation_details.formula}
                                    </code>
                                  </div>
                                )}

                                {/* Assumptions */}
                                {actionItem.calculation_details.assumptions && actionItem.calculation_details.assumptions.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-700 min-w-[140px]">Assumptions:</span>
                                    <ul className="flex-1 list-disc list-inside space-y-1">
                                      {actionItem.calculation_details.assumptions.map((assumption, idx) => (
                                        <li key={idx} className="text-gray-600">{assumption}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Reasoning */}
                                {actionItem.calculation_details.reason && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-700 min-w-[140px]">Reasoning:</span>
                                    <span className="flex-1 text-gray-600">{actionItem.calculation_details.reason}</span>
                                  </div>
                                )}

                                {/* Target */}
                                {actionItem.calculation_details.target_description && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-700 min-w-[140px]">Target:</span>
                                    <span className="flex-1 text-gray-600">{actionItem.calculation_details.target_description}</span>
                                  </div>
                                )}

                                {/* Data Sources */}
                                {actionItem.calculation_details.data_sources && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <span className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Data Sources:</span>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                      {Object.entries(actionItem.calculation_details.data_sources).map(([key, value]) => (
                                        <div key={key} className="flex justify-between bg-gray-50 px-2 py-1 rounded">
                                          <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                                          <span className="font-medium text-gray-900">
                                            {typeof value === 'number' && key.includes('value')
                                              ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                              : value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center bg-gray-50 rounded-lg py-12 px-6 border border-gray-200">
                      <p className="text-gray-600 text-base">No actions required for this area.</p>
                      <p className="text-gray-500 text-sm mt-1">Business operations are normal.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            </motion.div>

            {/* Navigation Arrows - Positioned outside modal with synchronized animation */}
            {insights.length > 1 && (
              <>
                {/* Previous Button */}
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: canGoPrev ? 0.9 : 0.5, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="absolute left-[-60px] top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-lg transition-all z-10 hover:bg-gray-100 hover:scale-110 cursor-pointer"
                  aria-label="Previous insight"
                >
                  <ChevronLeft className="w-7 h-7 text-gray-700" />
                </motion.button>

                {/* Next Button */}
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: canGoNext ? 0.9 : 0.5, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="absolute right-[-60px] top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-lg transition-all z-10 hover:bg-gray-100 hover:scale-110 cursor-pointer"
                  aria-label="Next insight"
                >
                  <ChevronRight className="w-7 h-7 text-gray-700" />
                </motion.button>
              </>
            )}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InsightModal;
