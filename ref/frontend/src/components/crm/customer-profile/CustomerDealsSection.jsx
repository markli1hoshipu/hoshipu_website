import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';

/**
 * Customer Deals Section
 * Displays deals associated with a customer
 */
const CustomerDealsSection = ({ customer, authFetch }) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  const [deals, setDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState('');

  // Fetch deals for this customer
  const fetchDeals = async () => {
    if (!customer?.id) return;

    setIsLoadingDeals(true);
    setDealsError('');

    try {
      console.log('[Deals] Fetching deals for customer:', customer.id);
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/deals/customer/${customer.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const customerDeals = await response.json();
      console.log('[Deals] Customer deals received:', customerDeals.length);

      setDeals(customerDeals);
    } catch (error) {
      console.error('[Deals] Error fetching deals:', error);
      setDealsError('Failed to load deals');
    } finally {
      setIsLoadingDeals(false);
    }
  };

  // Fetch deals when customer changes
  useEffect(() => {
    if (customer?.id) {
      fetchDeals();
    }
  }, [customer?.id]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoadingDeals) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (dealsError) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{dealsError}</span>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No deals found for this customer</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <motion.div
          key={deal.deal_id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border border-gray-200 rounded-lg hover:border-pink-300 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">{deal.deal_name}</h4>
              <p className="text-sm text-gray-500 mt-1">{deal.description || 'No description'}</p>
            </div>
            <StatusBadge status={deal.stage} type="deal" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span>Value</span>
              </div>
              <p className="font-semibold text-gray-900">{formatCurrency(deal.deal_value)}</p>
            </div>

            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span>Close Date</span>
              </div>
              <p className="font-semibold text-gray-900">{formatDate(deal.expected_close_date)}</p>
            </div>

            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Probability</span>
              </div>
              <p className="font-semibold text-gray-900">{deal.probability || 0}%</p>
            </div>
          </div>

          {deal.assigned_salesperson_name && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Assigned to: <span className="font-medium text-gray-700">{deal.assigned_salesperson_name}</span>
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default CustomerDealsSection;

