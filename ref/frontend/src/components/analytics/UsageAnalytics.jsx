import React, { useState, useEffect } from 'react';
import { useThemeColors } from '../../hooks/useTheme';
import {
  Clock,
  BarChart2,
  FileText,
  Download,
  Calendar,
  Users,
  MessageSquare,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Award,
  Mouse,
  Upload,
  AlertTriangle,
  Monitor,
  Globe,
  DollarSign,
  Activity,
  Timer,
  TrendingUp
} from 'lucide-react';
import UnifiedHeader from '../ui/header/UnifiedHeader';
import UnifiedToolbar from '../ui/toolbar/UnifiedToolbar';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
import { usageAnalyticsService, TRACKED_MODULES } from '../../services/usageAnalyticsService';
import activityService from '../../services/activityService';
// import analyticsApiService from '../../services/analyticsApiService';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const UsageAnalytics = () => {
  const { textSecondary, textPrimary, border } = useThemeColors();
  const [_isMetricsCollapsed, _setIsMetricsCollapsed] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [radarData, setRadarData] = useState(null);
  const [workReport, setWorkReport] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [apiStats, setApiStats] = useState(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState(null);
  const [dailyReports, setDailyReports] = useState(null);
  const [, setIsLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    engagement: false,
    technical: false,
    performance: false,
    sessions: false,
    activities: true  // Show activities section by default
  });

  useEffect(() => {
    // Track module visit
    // analyticsApiService.trackModuleVisit('Usage Analytics', ['view_dashboard']);

    // Load initial data
    updateUsageData();
    loadApiStats();
    loadRealActivityData();

    // Update data periodically
    const interval = setInterval(() => {
      updateUsageData();
      loadApiStats();
      loadRealActivityData();
    }, 60000); // Update every minute

    return () => {
      clearInterval(interval);
      // Update time spent when leaving
      // analyticsApiService.updateModuleTimeSpent('Usage Analytics');
    };
  }, []);

  useEffect(() => {
    // Reload API stats when time range changes
    loadApiStats();
    loadRealActivityData();
  }, [selectedTimeRange]);

  const loadRealActivityData = async () => {
    try {
      // Get days based on selected time range
      const daysMap = { 'day': 1, 'week': 7, 'month': 30, 'all': 365 };
      const days = daysMap[selectedTimeRange] || 7;

      // Fetch real activity data
      const [activities, summary] = await Promise.all([
        activityService.getRecentActivities(null, null, 50, days),
        activityService.getActivitySummary(null, days)
      ]);

      if (activities.success) {
        setRecentActivities(activities.activities || []);
      }

      if (summary.success) {
        setActivitySummary(summary);
      }
    } catch (error) {
      console.error('Error loading real activity data:', error);
    }
  };

  const updateUsageData = () => {
    try {
      const moduleData = usageAnalyticsService.getModuleUsageData();
      const tokenData = usageAnalyticsService.getTokenUsageData();
      const chartData = usageAnalyticsService.getRadarChartData();
      
      setUsageData({ moduleData, tokenData });
      setRadarData(chartData);
      setWorkReport(usageAnalyticsService.generateWorkReport());
    } catch (error) {
      console.error('Error getting local usage data:', error);
      // Set fallback data so the component doesn't get stuck loading
      setUsageData({ moduleData: [], tokenData: [] });
      setRadarData({
        labels: ['Chat', 'CRM', 'Analytics', 'Employee', 'Lead Gen'],
        datasets: [
          {
            label: 'Time Spent',
            data: [65, 80, 45, 70, 55],
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(99, 102, 241, 1)',
            pointBorderColor: '#fff',
            pointRadius: 4,
          },
          {
            label: 'Visits',
            data: [45, 90, 60, 55, 75],
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            pointBorderColor: '#fff',
            pointRadius: 4,
          },
          {
            label: 'Token Usage',
            data: [30, 60, 70, 40, 85],
            backgroundColor: 'rgba(245, 101, 101, 0.2)',
            borderColor: 'rgba(245, 101, 101, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(245, 101, 101, 1)',
            pointBorderColor: '#fff',
            pointRadius: 4,
          }
        ]
      });
      setWorkReport({
        summary: {
          totalTimeSpent: 0,
          totalModuleVisits: 0,
          totalTokensUsed: 0,
          mostUsedModule: 'N/A'
        },
        moduleBreakdown: [],
        tokenUsageHistory: []
      });
    }
  };

  const loadApiStats = async () => {
    setIsLoading(true);
    try {
      // Get days based on selected time range
      const daysMap = { 'day': 1, 'week': 7, 'month': 30, 'all': 365 };
      const days = daysMap[selectedTimeRange] || 30;
      
      // Fetch stats from API with correct email
      // const stats = await analyticsApiService.getUserStats('mark@preludeos.com', days);
      // setApiStats(stats);
      const stats = null;
      setApiStats(null);
      
      // Load detailed analytics data
      await loadDetailedAnalytics(days);
      
      // Load daily reports
      await loadDailyReports(days);
      
      // Merge API data with local data if available
      if (stats && stats.module_breakdown && stats.module_breakdown.length > 0) {
        // Create radar chart data from API stats
        const apiRadarData = createRadarChartFromApiData(stats.module_breakdown);
        if (apiRadarData) {
          setRadarData(apiRadarData);
        }
      }
    } catch (error) {
      console.error('Error loading API stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetailedAnalytics = async (days) => {
    try {
      // const API_URL = import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005';
      // const response = await fetch(`${API_URL}/api/analytics/detailed?user_email=mark@preludeos.com&days=${days}`);
      // if (response.ok) {
      //   const data = await response.json();
      //   setDetailedAnalytics(data);
      // }
      setDetailedAnalytics(null);
    } catch (error) {
      console.error('Error loading detailed analytics:', error);
    }
  };

  const loadDailyReports = async (days) => {
    try {
      // const API_URL = import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005';
      // const response = await fetch(`${API_URL}/api/analytics/daily-reports?user_email=mark@preludeos.com&days=${days}`);
      // if (response.ok) {
      //   const data = await response.json();
      //   setDailyReports(data);
      // }
      setDailyReports(null);
    } catch (error) {
      console.error('Error loading daily reports:', error);
    }
  };

  const createRadarChartFromApiData = (moduleBreakdown) => {
    if (!moduleBreakdown || moduleBreakdown.length === 0) {
      return null;
    }
    
    const labels = moduleBreakdown.map(m => m.module_name || 'Unknown');
    
    // Convert string time values to numbers and get maximum values for normalization
    const maxTime = Math.max(...moduleBreakdown.map(m => parseInt(m.time_spent_ms) || 0));
    const maxVisits = Math.max(...moduleBreakdown.map(m => parseInt(m.visits) || 0));
    const maxTokens = Math.max(...moduleBreakdown.map(m => parseInt(m.tokens_used) || 0));
    
    // Create normalized data for each metric (0-100 scale)
    const timeData = moduleBreakdown.map(m => {
      const time = parseInt(m.time_spent_ms) || 0;
      const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0;
      return Math.round(percentage);
    });
    
    const visitsData = moduleBreakdown.map(m => {
      const visits = parseInt(m.visits) || 0;
      const percentage = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
      return Math.round(percentage);
    });
    
    const tokensData = moduleBreakdown.map(m => {
      const tokens = parseInt(m.tokens_used) || 0;
      const percentage = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;
      return Math.round(percentage);
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Time Spent',
          data: timeData,
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
          pointRadius: 4,
        },
        {
          label: 'Visits',
          data: visitsData,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
          pointRadius: 4,
        },
        {
          label: 'Token Usage',
          data: tokensData,
          backgroundColor: 'rgba(245, 101, 101, 0.2)',
          borderColor: 'rgba(245, 101, 101, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(245, 101, 101, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(245, 101, 101, 1)',
          pointRadius: 4,
        }
      ]
    };
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const handleGenerateReport = async () => {
    // Track report generation
    // analyticsApiService.trackEvent('generate_report', 'Usage Analytics');
    
    const report = usageAnalyticsService.generateWorkReport();
    setWorkReport(report);
    
    // Also generate daily report from API
    try {
      // const apiReport = await analyticsApiService.generateDailyReport();
      // console.log('API Daily Report:', apiReport);
    } catch (error) {
      console.error('Error generating API report:', error);
    }
    
    // You could also trigger a download of the report here
    const reportJson = JSON.stringify(report, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!usageData || !radarData || !workReport) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <UnifiedHeader
        title="Usage Analytics"
        description="Track and analyze your platform usage patterns"
        icon={BarChart2}
        themeColor="indigo"
        tabs={['day', 'week', 'month', 'all'].map((range) => ({
          id: range,
          label: range.charAt(0).toUpperCase() + range.slice(1),
          isActive: selectedTimeRange === range,
          onClick: () => setSelectedTimeRange(range)
        }))}
      />

      {/* Unified Toolbar */}
      <div className="bg-white">
        <UnifiedToolbar
          config={{
            primaryAction: {
              primaryLabel: 'Generate Report',
              onPrimaryAction: handleGenerateReport,
              loading: false
            },
            overflowActions: [
              {
                label: 'Refresh Data',
                onClick: () => {
                  updateUsageData();
                  loadApiStats();
                },
                icon: <RefreshCw className="w-4 h-4" />
              }
            ],
            themeColor: 'indigo'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Time</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatDuration(
                        apiStats?.total_time_spent_ms || workReport?.summary?.totalTimeSpent || 0
                      )}
                    </p>
                    {apiStats && (
                      <p className="text-xs text-gray-500 mt-1">From Database</p>
                    )}
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-green-600">
                      {apiStats?.total_sessions || workReport?.summary?.totalModuleVisits || 0}
                    </p>
                    {apiStats && (
                      <p className="text-xs text-gray-500 mt-1">From Database</p>
                    )}
                  </div>
                  <Target className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tokens Used</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(apiStats?.total_tokens_used || workReport?.summary?.totalTokensUsed || 0).toLocaleString()}
                    </p>
                    {apiStats && (
                      <p className="text-xs text-gray-500 mt-1">From Database</p>
                    )}
                  </div>
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Most Used</p>
                    <p className="text-lg font-bold text-orange-600">
                      {apiStats?.most_used_module || workReport?.summary?.mostUsedModule || 'N/A'}
                    </p>
                    {apiStats && (
                      <p className="text-xs text-gray-500 mt-1">From Database</p>
                    )}
                  </div>
                  <Award className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Session</p>
                    <p className="text-2xl font-bold text-teal-600">
                      {formatDuration(
                        dailyReports && dailyReports.length > 0 
                          ? dailyReports.reduce((sum, r) => sum + (r.avg_session_duration_ms || 0), 0) / dailyReports.length
                          : 0
                      )}
                    </p>
                    {dailyReports && (
                      <p className="text-xs text-gray-500 mt-1">From Database</p>
                    )}
                  </div>
                  <Timer className="w-8 h-8 text-teal-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${(detailedAnalytics?.total_cost_estimate || 0).toFixed(2)}
                    </p>
                    {detailedAnalytics && (
                      <p className="text-xs text-gray-500 mt-1">Token Costs</p>
                    )}
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Error Rate</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(dailyReports && dailyReports.length > 0 
                        ? (dailyReports.reduce((sum, r) => sum + (r.error_rate || 0), 0) / dailyReports.length * 100).toFixed(1)
                        : 0)}%
                    </p>
                    {dailyReports && (
                      <p className="text-xs text-gray-500 mt-1">Avg Daily</p>
                    )}
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                Usage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px] flex items-center justify-center">
                <Radar
                  data={radarData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 100,
                        min: 0,
                        ticks: {
                          stepSize: 20,
                          backdropColor: 'transparent',
                          color: textSecondary,
                          font: {
                            size: 12
                          }
                        },
                        grid: {
                          color: border,
                          lineWidth: 1
                        },
                        pointLabels: {
                          color: textPrimary,
                          font: {
                            size: 13,
                            weight: '500'
                          }
                        },
                        angleLines: {
                          color: border,
                          lineWidth: 1
                        }
                      },
                    },
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle',
                          font: {
                            size: 12,
                            weight: '500'
                          },
                          color: textPrimary
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#6B7280',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                          title: (context) => {
                            return context[0].label;
                          },
                          label: (context) => {
                            return `${context.dataset.label}: ${Math.round(context.raw)}%`;
                          },
                        },
                      },
                    },
                    interaction: {
                      intersect: false,
                      mode: 'index'
                    },
                    elements: {
                      line: {
                        tension: 0.2
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Module Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Module Breakdown
                {apiStats && apiStats.module_breakdown.length > 0 && (
                  <span className="text-xs text-gray-500 ml-2">(Live Data)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(apiStats?.module_breakdown?.length > 0 ? 
                  apiStats.module_breakdown : 
                  (workReport?.moduleBreakdown || [])
                ).map((module) => (
                  <div key={module.name || module.module_name} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{module.name || module.module_name}</span>
                        {module.percentageOfTotal && (
                          <span className="text-xs text-gray-500">
                            ({module.percentageOfTotal}% of total time)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDuration(module.timeSpent || module.time_spent_ms || 0)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Visits: </span>
                        <span className="font-medium">{module.visits || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tokens: </span>
                        <span className="font-medium">
                          {(module.tokensUsed || module.tokens_used || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Visit: </span>
                        <span className="font-medium">
                          {module.lastVisit || module.last_accessed ? 
                            formatDate(module.lastVisit || module.last_accessed) : 'Never'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${module.percentageOfTotal || 50}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('engagement')}>
                <Mouse className="w-5 h-5 text-blue-600" />
                Engagement Metrics
                {expandedSections.engagement ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.engagement && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Mouse className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {detailedAnalytics?.total_clicks || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Clicks</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {detailedAnalytics?.total_messages || 0}
                    </p>
                    <p className="text-sm text-gray-600">Messages Sent</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">
                      {detailedAnalytics?.total_files_uploaded || 0}
                    </p>
                    <p className="text-sm text-gray-600">Files Uploaded</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-600">
                      {detailedAnalytics?.total_api_calls || 0}
                    </p>
                    <p className="text-sm text-gray-600">API Calls</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('technical')}>
                <Monitor className="w-5 h-5 text-gray-600" />
                Technical Details
                {expandedSections.technical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.technical && (
              <CardContent>
                <div className="space-y-4">
                  {detailedAnalytics?.browser_breakdown && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Browser Distribution
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(detailedAnalytics.browser_breakdown).map(([browser, count]) => (
                          <div key={browser} className="p-2 bg-gray-50 rounded text-center">
                            <p className="font-medium">{browser}</p>
                            <p className="text-sm text-gray-600">{count} sessions</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailedAnalytics?.device_breakdown && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Device Distribution
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(detailedAnalytics.device_breakdown).map(([device, count]) => (
                          <div key={device} className="p-2 bg-gray-50 rounded text-center">
                            <p className="font-medium capitalize">{device}</p>
                            <p className="text-sm text-gray-600">{count} sessions</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('performance')}>
                <TrendingUp className="w-5 h-5 text-green-600" />
                Performance Metrics
                {expandedSections.performance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.performance && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {detailedAnalytics?.avg_response_time_ms ? `${detailedAnalytics.avg_response_time_ms.toFixed(0)}ms` : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">
                      {detailedAnalytics?.total_errors || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Errors</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Target className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">
                      {detailedAnalytics?.success_rate ? `${(detailedAnalytics.success_rate * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('sessions')}>
                <Activity className="w-5 h-5 text-indigo-600" />
                Session Details
                {expandedSections.sessions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.sessions && (
              <CardContent>
                <div className="space-y-4">
                  {detailedAnalytics?.recent_sessions && detailedAnalytics.recent_sessions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Recent Sessions</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {detailedAnalytics.recent_sessions.slice(0, 10).map((session, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{session.session_id}</p>
                                <p className="text-sm text-gray-600">
                                  {session.module_name} • {formatDuration(session.session_duration_ms || 0)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{session.tokens_used || 0} tokens</p>
                                <p className="text-xs text-gray-500">
                                  {session.session_start ? formatDate(session.session_start) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Real-Time Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('activities')}>
                <Activity className="w-5 h-5 text-blue-600" />
                Page View Activities (Live from Database)
                {activitySummary && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({recentActivities.length} activities logged)
                  </span>
                )}
                {expandedSections.activities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.activities && (
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Cards */}
                  {activitySummary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Activities</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {recentActivities.length}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Activity Types</p>
                        <p className="text-2xl font-bold text-green-600">
                          {activitySummary.by_type?.length || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Top Page</p>
                        <p className="text-lg font-bold text-purple-600">
                          {activitySummary.top_pages?.[0]?.page_url?.split('/').pop() || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activitySummary.top_pages?.[0]?.views || 0} views
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Top Pages */}
                  {activitySummary?.top_pages && activitySummary.top_pages.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Top Pages</h4>
                      <div className="space-y-2">
                        {activitySummary.top_pages.slice(0, 5).map((page, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{page.page_url}</p>
                                <p className="text-xs text-gray-500">
                                  {page.views} views • Avg duration: {formatDuration(page.avg_duration_ms || 0)}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="w-full bg-gray-200 rounded-full h-2 min-w-[100px]">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(100, (page.views / activitySummary.top_pages[0].views) * 100)}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity Log */}
                  <div>
                    <h4 className="font-medium mb-3">Recent Activity</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                          <div key={activity.id || index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    activity.action_type === 'navigation' ? 'bg-blue-100 text-blue-700' :
                                    activity.action_type === 'crm' ? 'bg-green-100 text-green-700' :
                                    activity.action_type === 'chat' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {activity.action_type}
                                  </span>
                                  <span className="text-xs text-gray-500">{activity.action_name}</span>
                                </div>
                                <p className="text-sm font-medium text-gray-900">{activity.page_url || 'N/A'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {activity.user_email} • {activity.service_name || 'frontend'}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                {activity.duration_ms && (
                                  <p className="text-sm font-medium text-blue-600">
                                    {formatDuration(activity.duration_ms)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {formatDate(activity.timestamp)}
                                </p>
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                  activity.result_status === 'success' ? 'bg-green-100 text-green-700' :
                                  activity.result_status === 'error' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {activity.result_status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No activities logged yet. Start using the platform to see your activity here!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Activity Type Breakdown */}
                  {activitySummary?.by_type && activitySummary.by_type.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Activity Type Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activitySummary.by_type.map((type, index) => (
                          <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium capitalize">{type.action_type}</p>
                                <p className="text-xs text-gray-600">{type.unique_users} users</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-600">{type.count}</p>
                                <p className="text-xs text-gray-600">
                                  {type.avg_duration_ms ? `${formatDuration(type.avg_duration_ms)} avg` : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Daily Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Daily Usage Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyReports && dailyReports.length > 0 ? (
                  dailyReports.slice(0, 7).map((report, index) => (
                    <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          {new Date(report.report_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </h4>
                        <span className="text-sm text-gray-600">
                          {report.total_sessions} sessions
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Time: </span>
                          <span className="font-medium">{formatDuration(report.total_time_spent_ms || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Tokens: </span>
                          <span className="font-medium">{(report.total_tokens_used || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Modules: </span>
                          <span className="font-medium">{report.modules_accessed?.length || 0}</span>
                        </div>
                      </div>
                      {report.modules_accessed && report.modules_accessed.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {report.modules_accessed.map((module, i) => (
                              <span key={i} className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs">
                                {module}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No daily reports available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Token Usage History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Token Usage History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(workReport?.tokenUsageHistory || []).slice(-10).reverse().map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <span className="font-medium">{entry.module}</span>
                        <span className="text-gray-500 ml-2">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {entry.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics; 