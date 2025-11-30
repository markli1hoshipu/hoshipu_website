import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/primitives/button';

/**
 * SalesCenterPrimaryButton Component
 *
 * Simplified primary action button for Sales Center toolbar.
 * Matches UnifiedToolbar icon sizing and spacing standards.
 *
 * @param {Object} props
 * @param {string} props.label - Label for the button
 * @param {Function} props.onClick - Click handler
 * @param {string} [props.themeColor='purple'] - Theme color
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Loading state
 */
const SalesCenterPrimaryButton = ({
  label = 'New Item',
  onClick,
  themeColor = 'purple',
  disabled = false,
  loading = false,
  ...props
}) => {
  const handleClick = () => {
    if (disabled || loading) return;
    onClick?.();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={label}
      {...props}
    >
      <Plus className="w-4 h-4 mr-2" />
      {loading ? 'Loading...' : label}
    </Button>
  );
};

export default SalesCenterPrimaryButton;
