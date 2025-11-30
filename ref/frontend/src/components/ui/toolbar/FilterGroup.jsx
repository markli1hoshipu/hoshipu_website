import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Funnel, ChevronDown } from 'lucide-react';
import { Button } from '../primitives/button';

/**
 * FilterGroup Component
 * 
 * Right-aligned filter icons with popover panels.
 * Follows Monday.com design patterns for filtering.
 * 
 * @param {Object} props
 * @param {Array} props.filters - Array of filter configurations
 * @param {string} [props.className] - Additional CSS classes
 */
const FilterGroup = ({
  filters = [],
  className = '',
  ...props
}) => {
  const [activePopover, setActivePopover] = useState(null);

  const handleFilterClick = (filterId) => {
    setActivePopover(activePopover === filterId ? null : filterId);
  };

  const closePopover = () => {
    setActivePopover(null);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} {...props}>
      {filters.map((filter) => {
        const isActive = activePopover === filter.id || filter.isActive;

        return (
          <div key={filter.id} className="relative">
            {/* Filter Button */}
            <button
              onClick={() => handleFilterClick(filter.id)}
              disabled={filter.disabled}
              className={`
                flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors border
                ${isActive
                  ? 'bg-gray-50 text-gray-900 border-gray-400'
                  : 'text-gray-700 hover:bg-gray-100 border-gray-300'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={filter.label}
              aria-expanded={activePopover === filter.id}
              aria-haspopup="dialog"
            >
              <Funnel className="w-4 h-4" aria-hidden="true" />
              <span>{filter.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isActive ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {/* Popover Panel */}
            <AnimatePresence>
              {activePopover === filter.id && filter.content && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-20"
                    onClick={closePopover}
                    aria-hidden="true"
                  />
                  
                  {/* Panel */}
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-full left-0 mt-2 z-30"
                    role="dialog"
                    aria-labelledby={`${filter.id}-title`}
                  >
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 min-w-96 w-96">
                      {/* Header */}
                      {filter.title && (
                        <div className="px-4 py-3 border-b border-gray-100">
                          <h3 
                            id={`${filter.id}-title`}
                            className="text-sm font-medium text-gray-900"
                          >
                            {filter.title}
                          </h3>
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-4">
                        {typeof filter.content === 'function' 
                          ? filter.content({ onClose: closePopover })
                          : filter.content
                        }
                      </div>

                      {/* Footer Actions */}
                      {filter.actions && (
                        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
                          {filter.actions.map((action, index) => (
                            <Button
                              key={index}
                              variant={action.variant || 'outline'}
                              size="sm"
                              onClick={() => {
                                action.onClick?.();
                                if (action.closeOnClick !== false) {
                                  closePopover();
                                }
                              }}
                              disabled={action.disabled}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default FilterGroup;