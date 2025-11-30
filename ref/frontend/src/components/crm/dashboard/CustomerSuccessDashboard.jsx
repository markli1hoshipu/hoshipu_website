import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../hooks/useTheme';
import UnifiedHeader from '../../ui/header/UnifiedHeader';
import UnifiedToolbar from '../../ui/toolbar/UnifiedToolbar';

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  DollarSign,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Star,
  Heart,
  Zap,
  Shield,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/primitives/card';
import { useMetricsCollapse } from '../../../hooks/useMetricsCollapse';

const CustomerSuccessDashboard = () => {
  const { getChartColorPalette } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('3months');
  const [alerts, setAlerts] = useState([]);
  const { isCollapsed: isMetricsCollapsed, toggleCollapsed: toggleMetricsCollapsed } = useMetricsCollapse('analytics');

  // Memoized analytics data generator
  const generateAnalyticsData = useCallback(() => {
    try {
      return {
        healthScoreTrend: {
          data: Array.from({ length: 12 }, (_, i) => ({
            month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
            avgScore: Math.max(0, Math.min(100, Math.floor(Math.random() * 20) + 70 + (i * 2))), // Trending upward slightly, clamped 0-100
            totalCustomers: 666
          }))
        },
        churnPrediction: {
          highRisk: 666,
          mediumRisk: 666,
          lowRisk: 666,
          predictedChurnRevenue: 666,
          preventionActions: 666
        },
        renewalForecast: {
          upcomingRenewals: 666,
          renewalValue: 666,
          renewalProbability: 666,
          atRiskRenewals: 666,
          expansionOpportunities: 666
        },
        customerSegments: [
          { 
            name: 'Enterprise', 
            count: 666, 
            revenue: 666, 
            healthScore: 666, 
            color: getChartColorPalette(3)[0]
          },
          { 
            name: 'Mid-Market', 
            count: 666, 
            revenue: 666, 
            healthScore: 666, 
            color: getChartColorPalette(3)[1]
          },
          { 
            name: 'SMB', 
            count: 666, 
            revenue: 666, 
            healthScore: 666, 
            color: getChartColorPalette(3)[2]
          }
        ],
        activityMetrics: {
          totalInteractions: 666,
          averageResponseTime: `${(Math.random() * 2 + 1).toFixed(1)} hours`,
          customerSatisfaction: Math.min(5, Math.max(1, (Math.random() * 1 + 4).toFixed(1))),
          supportTickets: 666,
          resolvedTickets: 666
        },
        predictiveInsights: [
          { 
            type: 'churn_risk', 
            customer: 'TechFlow Solutions', 
            score: 666, 
            prediction: 'High churn risk - low product usage', 
            action: 'Schedule health check call',
            priority: 'high'
          },
          { 
            type: 'expansion', 
            customer: 'DataSync Industries', 
            score: 666, 
            prediction: 'Strong expansion candidate - high engagement', 
            action: 'Present premium features',
            priority: 'medium'
          },
          { 
            type: 'renewal', 
            customer: 'CloudScale Systems', 
            score: 666, 
            prediction: 'Likely to renew - excellent health score', 
            action: 'Prepare renewal proposal',
            priority: 'low'
          }
        ]
      };
    } catch (error) {
      console.error('Error generating analytics data:', error);
      throw new Error('Failed to generate analytics data');
    }
  }, []);

  // Memoized alerts generator
  const generateAlerts = useCallback(() => {
    try {
      const alertTypes = [
        {
          type: 'churn_alert',
          title: 'Customer Health Score Drop',
          message: 'Acme Corporation health score dropped by 25 points',
          severity: 'high',
          customer: 'Acme Corporation',
          action: 'Contact customer immediately'
        },
        {
          type: 'renewal_reminder',
          title: 'Renewal Due Soon',
          message: 'TechFlow Solutions renewal due in 15 days',
          severity: 'medium',
          customer: 'TechFlow Solutions',
          action: 'Prepare renewal materials'
        },
        {
          type: 'expansion_opportunity',
          title: 'Expansion Opportunity Identified',
          message: 'InnovateLabs showing high usage patterns',
          severity: 'low',
          customer: 'InnovateLabs',
          action: 'Schedule expansion call'
        }
      ];

      return alertTypes.map((alert, index) => ({
        ...alert,
        id: index + 1,
        timestamp: new Date(Date.now() - 1000 * 60 * Math.random() * 360) // Random time within last 6 hours
      }));
    } catch (error) {
      console.error('Error generating alerts:', error);
      return [];
    }
  }, []);

  // Load data with error handling
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const analyticsData = generateAnalyticsData();
      const alertsData = generateAlerts();
      
      setAnalytics(analyticsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [generateAnalyticsData, generateAlerts]);

  useEffect(() => {
    loadData();
  }, [timeRange, loadData]);

  // Memoized helper functions
  const getSeverityColor = useCallback((severity) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  const getSeverityIcon = useCallback((severity) => {
    const icons = {
      high: <AlertTriangle className="w-4 h-4" />,
      medium: <Clock className="w-4 h-4" />,
      low: <CheckCircle className="w-4 h-4" />
    };
    return icons[severity] || <Bell className="w-4 h-4" />;
  }, []);

  const formatCurrency = useCallback((amount) => {
    if (typeof amount !== 'number') return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formatTimeAgo = useCallback((date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  }, []);

  // Memoized calculations
  const dashboardStats = useMemo(() => {
    if (!analytics) return null;
    
    const latestHealthScore = analytics.healthScoreTrend.data[analytics.healthScoreTrend.data.length - 1]?.avgScore || 0;
    const previousHealthScore = analytics.healthScoreTrend.data[analytics.healthScoreTrend.data.length - 2]?.avgScore || 0;
    const healthScoreTrend = latestHealthScore - previousHealthScore;
    
    return {
      avgHealthScore: latestHealthScore,
      healthScoreTrend,
      atRiskCustomers: analytics.churnPrediction.highRisk,
      renewalRate: analytics.renewalForecast.renewalProbability,
      renewalPipeline: analytics.renewalForecast.renewalValue
    };
  }, [analytics]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics || !dashboardStats) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <UnifiedHeader
        title="Customer Success Analytics"
        description="AI-powered insights and predictive analytics for customer success"
        icon={BarChart3}
        themeColor="pink"
      />

      {/* Unified Toolbar */}
      <div className="bg-white">
        <UnifiedToolbar
          config={{
            filters: [
              {
                key: 'timeRange',
                label: 'Time Period',
                type: 'select',
                value: timeRange,
                onChange: setTimeRange,
                options: [
                  { value: '1month', label: 'Last Month' },
                  { value: '3months', label: 'Last 3 Months' },
                  { value: '6months', label: 'Last 6 Months' },
                  { value: '1year', label: 'Last Year' }
                ]
              }
            ],
            overflowActions: [
              {
                label: 'Refresh Data',
                onClick: loadData,
                icon: <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />,
                disabled: loading
              },
              {
                label: 'Download Report',
                onClick: () => {},
                icon: <Download className="w-4 h-4" />
              }
            ],
            themeColor: 'pink'
          }}
        />
      </div>

      {/* Key Metrics */}
      <div className="p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Analytics Overview</h3>
          <button
            onClick={toggleMetricsCollapsed}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            title={isMetricsCollapsed ? "Show Metrics & Details" : "Hide Metrics & Details"}
          >
            {isMetricsCollapsed ? (
              <>
                <span>Show Details</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Hide Details</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
          
          <motion.div
            initial={false}
            animate={{
              height: isMetricsCollapsed ? 0 : 'auto',
              opacity: isMetricsCollapsed ? 0 : 1
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Avg Health Score</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {dashboardStats.avgHealthScore}
                    </span>
                    {dashboardStats.healthScoreTrend > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">+{dashboardStats.healthScoreTrend.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">{dashboardStats.healthScoreTrend.toFixed(1)}%</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">At Risk Customers</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {dashboardStats.atRiskCustomers}
                    </span>
                    <TrendingDown className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">-2 this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Renewal Rate</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {dashboardStats.renewalRate}%
                    </span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">+5.1%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Renewal Pipeline</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(dashboardStats.renewalPipeline)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Charts and Analytics */}
          <div className="col-span-2 space-y-6">
            {/* Health Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Health Score Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {analytics.healthScoreTrend.data.map((month) => (
                    <div key={month.month} className="flex flex-col items-center">
                      <div 
                        className="bg-purple-500 rounded-t w-8 mb-2 transition-all duration-300 hover:bg-purple-600"
                        style={{ height: `${Math.max(20, (month.avgScore / 100) * 200)}px` }}
                        title={`${month.month}: ${month.avgScore}% (${month.totalCustomers} customers)`}
                      />
                      <span className="text-xs text-gray-600">{month.month}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Segments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Customer Segments Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.customerSegments.map((segment) => (
                    <div key={segment.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: segment.color }}
                        />
                        <div>
                          <span className="font-medium">{segment.name}</span>
                          <span className="text-sm text-gray-600 ml-2">({segment.count} customers)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(segment.revenue)}</div>
                        <div className="text-sm text-gray-600">Health: {segment.healthScore}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Predictive Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  AI Predictive Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.predictiveInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{insight.customer}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                            insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {insight.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{insight.prediction}</p>
                        <p className="text-sm font-medium text-indigo-600">{insight.action}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{insight.score}%</div>
                        <div className="text-xs text-gray-500">confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Alerts and Quick Stats */}
          <div className="space-y-6">
            {/* Real-time Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  Recent Alerts
                  <span className="ml-auto bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {alerts.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div key={alert.id} className={`p-3 rounded-lg border transition-colors hover:bg-opacity-80 ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1">
                            <div className="font-medium text-sm">{alert.title}</div>
                            <div className="text-xs opacity-90">{alert.message}</div>
                            <div className="text-xs mt-2 font-medium">{alert.action}</div>
                            <div className="text-xs opacity-75 mt-1">{formatTimeAgo(alert.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">No recent alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Review At-Risk Customers</span>
                    </div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Schedule Renewal Calls</span>
                    </div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Identify Expansion Opportunities</span>
                    </div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium">Generate Health Report</span>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gray-600" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Interactions</span>
                    <span className="font-medium">{analytics.activityMetrics.totalInteractions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="font-medium">{analytics.activityMetrics.averageResponseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{analytics.activityMetrics.customerSatisfaction}</span>
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Support Tickets</span>
                    <span className="font-medium">
                      {analytics.activityMetrics.resolvedTickets}/{analytics.activityMetrics.supportTickets}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSuccessDashboard;