import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import UnifiedHeader from '../../ui/header/UnifiedHeader';
import EditableDealsTable from '../tables/EditableDealsTable';
import { useCRM } from '../../../contexts/CRMContext';

// Wrapper component for Deals - CRMProvider is now at App level for shared state with CRM
const DealsWrapper = ({ wsConnection }) => {
  const { isLoadedFromCache } = useCRM();

  // Use faster animation when data is loaded from cache (50ms vs 300ms)
  const animationDuration = isLoadedFromCache ? 0.05 : 0.3;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <UnifiedHeader
        title="Deals"
        themeColor="indigo"
        tabs={[]}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDuration }}
          >
            <EditableDealsTable />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DealsWrapper;
