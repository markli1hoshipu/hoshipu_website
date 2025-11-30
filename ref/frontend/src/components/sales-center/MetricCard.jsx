import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { TrendingUp, DollarSign, Users, Target, AlertCircle } from 'lucide-react';

const MetricCard = ({
  title,
  value,
  icon = 'TrendingUp',
  color = 'blue',
  formatType = 'number',
  loading = false,
  error = null
}) => {
  // Icon mapping
  const IconComponent = {
    TrendingUp,
    DollarSign,
    Users,
    Target
  }[icon] || TrendingUp;

  // Color class mapping
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50'
  };

  // Format value based on type
  const formatValue = (val, type) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';

    const numVal = Number(val);

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numVal);

      case 'percentage':
        return `${numVal.toFixed(1)}%`;

      case 'number':
      default:
        if (numVal >= 1000000) {
          return `${(numVal / 1000000).toFixed(1)}M`;
        } else if (numVal >= 1000) {
          return `${(numVal / 1000).toFixed(1)}K`;
        }
        return numVal.toLocaleString();
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`h-4 w-4 rounded ${colorClasses[color] || colorClasses.blue}`}>
            <div className="animate-pulse bg-current opacity-20 h-full w-full rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full border-red-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">Error</div>
          <p className="text-xs text-red-500 mt-1">Failed to load</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          <IconComponent className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value, formatType)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time data
        </p>
      </CardContent>
    </Card>
  );
};

export default React.memo(MetricCard);