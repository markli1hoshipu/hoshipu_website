import React, { useState, useEffect } from 'react';
import { useThemeColors } from '../../hooks/useTheme';
import {
  Clock,
  Activity,
  RefreshCw,
  Eye,
  Navigation as NavigationIcon,
  TrendingUp,
  Users,
  MousePointer,
  Calendar,
  AlertCircle,
  CheckCircle,
  Timer,
  BarChart3
} from 'lucide-react';
import UnifiedHeader from '../ui/header/UnifiedHeader';
import UnifiedToolbar from '../ui/toolbar/UnifiedToolbar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import activityService from '../../services/activityService';

const UsageAnalyticsRedesigned = () => {
  const { textPrimary, textSecondary, border } = useThemeColors();
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadActivityData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActivityData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const loadActivityData = async () => {
    setIsLoading(true);
    try {
      const daysMap = { 'day': 1, 'week': 7, 'month': 30, 'all': 365 };
      const days = daysMap[selectedTimeRange] || 7;

      const [activities, summary] = await Promise.all([
        activityService.getRecentActivities(null, null, 100, days),
        activityService.getActivitySummary(null, days)
      ]);

      if (activities.success) {
        setRecentActivities(activities.activities || []);
      }

      if (summary.success) {
        setActivitySummary(summary);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate statistics from activities
  const stats = {
    totalActivities: recentActivities.length,
    totalDuration: recentActivities.reduce((sum, a) => sum + (a.duration_ms || 0), 0),
    uniquePages: new Set(recentActivities.filter(a => a.page_url).map(a => a.page_url)).size,
    uniqueUsers: new Set(recentActivities.map(a => a.user_email)).size,
    navigationCount: recentActivities.filter(a => a.action_type === 'navigation').length,
    crmCount: recentActivities.filter(a => a.action_type === 'crm').length,
    successCount: recentActivities.filter(a => a.result_status === 'success').length,
    avgDuration: recentActivities.length > 0
      ? recentActivities.reduce((sum, a) => sum + (a.duration_ms || 0), 0) / recentActivities.filter(a => a.duration_ms).length
      : 0
  };

  const getActionTypeColor = (type) => {
    const colors = {
      navigation: 'bg-blue-100 text-blue-700 border-blue-200',
      crm: 'bg-green-100 text-green-700 border-green-200',
      chat: 'bg-purple-100 text-purple-700 border-purple-200',
      lead_generation: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusColor = (status) => {
    const colors = {
      success: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading && recentActivities.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <UnifiedHeader
          title="Usage Analytics"
          description="Real-time activity tracking from database"
          icon={BarChart3}
          themeColor="indigo"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading activity data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <UnifiedHeader
        title="Usage Analytics"
        description="Real-time activity tracking from database"
        icon={BarChart3}
        themeColor="indigo"
        tabs={['day', 'week', 'month', 'all'].map((range) => ({
          id: range,
          label: range.charAt(0).toUpperCase() + range.slice(1),
          isActive: selectedTimeRange === range,
          onClick: () => setSelectedTimeRange(range)
        }))}
      />

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200">
        <UnifiedToolbar
          config={{
            primaryAction: {
              primaryLabel: 'Refresh Data',
              onPrimaryAction: loadActivityData,
              loading: isLoading
            },
            overflowActions: [],
            themeColor: 'indigo'
          }}
        />
        {lastUpdated && (
          <div className="px-6 pb-3 text-xs text-gray-500">
            Last updated: {formatTime(lastUpdated)}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Activities */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Activities</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalActivities}</p>
                  </div>
                  <Activity className="w-10 h-10 text-blue-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Total Time */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Time</p>
                    <p className="text-3xl font-bold text-green-600">{formatDuration(stats.totalDuration)}</p>
                  </div>
                  <Clock className="w-10 h-10 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Unique Pages */}
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Unique Pages</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.uniquePages}</p>
                  </div>
                  <Eye className="w-10 h-10 text-purple-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Avg Duration */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Duration</p>
                    <p className="text-3xl font-bold text-orange-600">{formatDuration(stats.avgDuration)}</p>
                  </div>
                  <Timer className="w-10 h-10 text-orange-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Type Breakdown */}
          {activitySummary?.by_type && activitySummary.by_type.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Activity Type Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activitySummary.by_type.map((type, index) => (
                    <div key={index} className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 capitalize">{type.action_type}</span>
                        <span className="text-2xl font-bold text-indigo-600">{type.count}</span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Unique users:</span>
                          <span className="font-medium">{type.unique_users}</span>
                        </div>
                        {type.avg_duration_ms > 0 && (
                          <div className="flex justify-between">
                            <span>Avg duration:</span>
                            <span className="font-medium">{formatDuration(type.avg_duration_ms)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 w-full bg-indigo-200 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (type.count / activitySummary.by_type[0].count) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Pages */}
          {activitySummary?.top_pages && activitySummary.top_pages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                  Top Pages by Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activitySummary.top_pages.slice(0, 10).map((page, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-900 truncate">{page.page_url}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">{page.views}</div>
                            <div className="text-xs text-gray-500">views</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">{formatDuration(page.avg_duration_ms)}</div>
                            <div className="text-xs text-gray-500">avg time</div>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (page.views / activitySummary.top_pages[0].views) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Recent Activity Timeline
                <span className="ml-auto text-sm font-normal text-gray-500">
                  Showing {recentActivities.length} activities
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {recentActivities.map((activity, index) => (
                    <div
                      key={activity.id || index}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left side - Activity details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getActionTypeColor(activity.action_type)}`}>
                              {activity.action_type}
                            </span>
                            <span className="text-xs text-gray-500">{activity.action_name}</span>
                            {activity.result_status && (
                              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.result_status)}`}>
                                {activity.result_status === 'success' ? (
                                  <CheckCircle className="w-3 h-3 inline mr-1" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 inline mr-1" />
                                )}
                                {activity.result_status}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm mb-1">
                            <NavigationIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate">
                              {activity.page_url || 'N/A'}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {activity.user_email}
                            </span>
                            {activity.service_name && (
                              <span>• {activity.service_name}</span>
                            )}
                          </div>
                        </div>

                        {/* Right side - Metrics */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {activity.duration_ms && (
                            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                              <Clock className="w-4 h-4" />
                              {formatDuration(activity.duration_ms)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {formatDate(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium mb-2">No activities logged yet</p>
                  <p className="text-gray-400 text-sm">
                    Start navigating through the platform to see your activity here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalyticsRedesigned;
