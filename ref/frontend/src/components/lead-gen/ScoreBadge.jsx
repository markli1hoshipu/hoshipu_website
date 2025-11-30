import React from 'react';
import PropTypes from 'prop-types';

/**
 * ScoreBadge Component
 *
 * Displays lead score as a categorized badge (Low, Medium, High)
 * with color-coded styling instead of raw numeric values.
 *
 * Score Categories:
 * - High (70-100): Green badge
 * - Medium (40-69): Blue badge
 * - Low (0-39): Orange badge
 */
const ScoreBadge = ({ score, showNumeric = false, size = 'sm' }) => {
  // Handle null/undefined scores
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400 px-2 py-1">
        N/A
      </span>
    );
  }

  // Clamp score to 0-100 range
  const validScore = Math.max(0, Math.min(100, Number(score) || 0));

  // Categorize score
  const getCategory = (score) => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const category = getCategory(validScore);

  // Style mappings
  const styles = {
    high: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-400',
      dot: 'bg-green-500',
      label: 'High'
    },
    medium: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-400',
      dot: 'bg-blue-500',
      label: 'Medium'
    },
    low: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-400',
      dot: 'bg-orange-500',
      label: 'Low'
    }
  };

  const style = styles[category];

  // Size variants
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2'
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses[size]}`}
      role="status"
      aria-label={`Lead score: ${style.label}, ${validScore} out of 100`}
      title={`Score: ${validScore}/100 (${style.label})`}
    >
      <span
        className={`rounded-full ${style.dot} ${dotSizes[size]}`}
        aria-hidden="true"
      />
      <span className="whitespace-nowrap">{style.label}</span>
      {showNumeric && (
        <span className="opacity-70 ml-0.5">({validScore})</span>
      )}
    </span>
  );
};

ScoreBadge.propTypes = {
  score: PropTypes.number,
  showNumeric: PropTypes.bool,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg'])
};

ScoreBadge.defaultProps = {
  score: null,
  showNumeric: false,
  size: 'sm'
};

export default React.memo(ScoreBadge);
