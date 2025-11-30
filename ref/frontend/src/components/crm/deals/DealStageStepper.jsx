import React, { useState } from 'react';
import { Check, Circle, GitBranch } from 'lucide-react';

const DealStageStepper = ({ currentStage, dealId, authFetch, onStageUpdate, stageUpdatedAt, stageUpdatedBy, stageUpdateType }) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
  const [isUpdating, setIsUpdating] = useState(false);

  // Debug: Log stage tracking props
  console.log('[DealStageStepper] Stage tracking data:', {
    stageUpdatedAt,
    stageUpdatedBy,
    stageUpdateType,
    hasData: !!stageUpdatedAt
  });

  // Format date to EST timezone
  const formatToEST = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Define linear stage progression
  const stages = [
    { id: 'Opportunity', label: 'Opportunity', order: 1, type: 'normal' },
    { id: 'Discovery', label: 'Discovery', order: 2, type: 'normal' },
    { id: 'Negotiation', label: 'Negotiation', order: 3, type: 'normal' },
    { id: 'Closed-Won', label: 'Closed Won', order: 4, type: 'success' },
    { id: 'Closed-Lost', label: 'Closed Lost', order: 5, type: 'failure' }
  ];

  // Get current stage info
  const getCurrentStageOrder = () => {
    const stage = stages.find(s => s.id === currentStage);
    return stage ? stage.order : 0;
  };

  const currentOrder = getCurrentStageOrder();
  const currentStageInfo = stages.find(s => s.id === currentStage);

  // Handle stage click
  const handleStageClick = async (stageId) => {
    if (stageId === currentStage || isUpdating) return;

    setIsUpdating(true);
    try {
      console.log(`Updating deal ${dealId} stage to ${stageId}...`);
      const url = `${CRM_API_BASE_URL}/api/crm/deals/${dealId}`;
      console.log('Request URL:', url);

      const response = await authFetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: stageId })
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Stage updated successfully:', data);

        // Call parent callback to refresh deal data
        if (onStageUpdate) {
          onStageUpdate(stageId);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Update failed:', errorData);
        throw new Error(errorData.detail || `Failed to update stage (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Stage update error:', error);

      // More detailed error message
      let errorMessage = 'Failed to update deal stage';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to CRM service. Please ensure the CRM backend is running on port 8003.';
      } else {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine stage status
  const getStageStatus = (stage) => {
    if (stage.id === currentStage) return 'current';
    if (stage.order < currentOrder) return 'completed';
    return 'upcoming';
  };

  // Get stage styles
  const getStageStyles = (status, type = 'normal') => {
    // Terminal stage colors
    if (type === 'success' && status === 'current') {
      return {
        circle: 'bg-green-600 border-green-600 text-white ring-4 ring-green-100',
        label: 'text-green-700 font-semibold',
        connector: 'bg-green-600'
      };
    }

    if (type === 'failure' && status === 'current') {
      return {
        circle: 'bg-red-600 border-red-600 text-white ring-4 ring-red-100',
        label: 'text-red-700 font-semibold',
        connector: 'bg-red-600'
      };
    }

    // Standard progression colors
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-indigo-600 border-indigo-600 text-white',
          label: 'text-indigo-700',
          connector: 'bg-indigo-600'
        };
      case 'current':
        return {
          circle: 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100',
          label: 'text-indigo-700 font-semibold',
          connector: 'bg-gray-300'
        };
      case 'upcoming':
        return {
          circle: 'bg-white border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50',
          label: 'text-gray-500',
          connector: 'bg-gray-300'
        };
      default:
        return {
          circle: 'bg-gray-200 border-gray-300 text-gray-400',
          label: 'text-gray-500',
          connector: 'bg-gray-300'
        };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
      {/* Header - matching Activity & Notes style */}
      <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2 mb-3">
        <GitBranch className="w-5 h-5 text-indigo-600" />
        Deal Stage
      </h3>

      <div className="relative">
        {/* Linear progression stages */}
        <div className="flex items-center justify-between">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage);
            const styles = getStageStyles(status, stage.type);
            const isClickable = !isUpdating && status !== 'current';

            return (
              <React.Fragment key={stage.id}>
                {/* Stage */}
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => isClickable && handleStageClick(stage.id)}
                    disabled={isUpdating || status === 'current'}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${styles.circle} ${
                      isClickable ? 'cursor-pointer transform hover:scale-110' : 'cursor-default'
                    } ${isUpdating ? 'opacity-50' : ''}`}
                  >
                    {status === 'completed' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : status === 'current' ? (
                      <Circle className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <span className="text-xs font-medium">{stage.order}</span>
                    )}
                  </button>
                  <span className={`mt-1 text-xs text-center ${styles.label} transition-colors`}>
                    {stage.label}
                  </span>
                </div>

                {/* Connector */}
                {index < stages.length - 1 && (
                  <div className="flex-1 mx-1 mb-4">
                    <div className={`h-0.5 ${styles.connector} transition-colors`}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Stage Update Info */}
      {stageUpdatedAt && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span>{formatToEST(stageUpdatedAt)} EST</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-700">Type:</span>
              <span className={stageUpdateType === 'automatic' ? 'font-medium text-blue-600' : 'font-medium text-gray-700'}>
                {stageUpdateType === 'automatic' ? 'Prelude AI' : 'Manual'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealStageStepper;

