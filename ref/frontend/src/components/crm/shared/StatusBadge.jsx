import React from 'react';
import { Badge } from '../../ui/primitives/badge';
import { cn } from '../../../lib/utils';

/**
 * Enhanced status badge component for CRM
 * Now based on shadcn Badge primitive with type-specific color variants
 *
 * @param {string} status - The status value (e.g., 'active', 'closed-won')
 * @param {string} type - The type of status ('customer', 'deal', 'churn')
 * @param {string} className - Additional CSS classes
 */
const StatusBadge = ({ status, type = 'customer', className }) => {
  /**
   * Get the appropriate color classes based on status and type
   */
  const getStatusColor = (status, type) => {
    const normalizedStatus = status?.toLowerCase();

    if (type === 'customer') {
      switch (normalizedStatus) {
        case 'active':
          return 'bg-green-100 text-green-800 hover:bg-green-200';
        case 'inactive':
          return 'bg-red-100 text-red-800 hover:bg-red-200';
        case 'at-risk':
          return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
        case 'renewal-pending':
          return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
        case 'completed':
          return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
        default:
          return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      }
    } else if (type === 'deal') {
      switch (normalizedStatus) {
        case 'opportunity':
          return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
        case 'qualification':
          return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
        case 'proposal':
          return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
        case 'negotiation':
          return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
        case 'closed-won':
          return 'bg-green-100 text-green-800 hover:bg-green-200';
        case 'closed-lost':
          return 'bg-red-100 text-red-800 hover:bg-red-200';
        default:
          return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      }
    } else if (type === 'churn') {
      switch (normalizedStatus) {
        case 'low':
          return 'bg-green-100 text-green-800 hover:bg-green-200';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
        case 'high':
          return 'bg-red-100 text-red-800 hover:bg-red-200';
        default:
          return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      }
    }
    return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  };

  /**
   * Format status text for display (capitalize and replace hyphens with spaces)
   */
  const formatStatusText = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');
  };

  return (
    <Badge
      className={cn(
        'border-transparent',
        getStatusColor(status, type),
        className
      )}
    >
      {formatStatusText(status)}
    </Badge>
  );
};

export default StatusBadge;

