/**
 * Communication Tips API Service
 * Handles AI-generated communication tips for client interactions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Make HTTP request with error handling
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Generate communication tips for client interactions
 * @param {string} employeeEmail - Employee email
 * @param {number|null} customerId - Specific customer ID (optional)
 * @param {string} context - Additional context for tip generation
 * @returns {Promise<Object>} Communication tips response
 */
export async function generateCommunicationTips(employeeEmail, customerId = null, context = "") {
  try {
    console.log('🎯 Generating communication tips...');

    if (!employeeEmail) {
      throw new Error('Employee email is required for communication tips generation.');
    }

    const response = await makeRequest('/api/db-agent/communication-tips', {
      method: 'POST',
      body: JSON.stringify({
        employee_email: employeeEmail,
        customer_id: customerId,
        context: context
      })
    });

    if (response.success && response.tips) {
      console.log(`🎯 Generated ${response.tips.length} communication tips`);

      // Transform tips to match expected format
      const formattedTips = response.tips.map(tip => ({
        id: tip.id,
        title: tip.title,
        description: tip.description,
        category: tip.category,
        priority: tip.priority,
        applicableCustomers: tip.applicable_customers || [],
        bestTime: tip.best_time,
        expectedOutcome: tip.expected_outcome,
        example: tip.example,
        metadata: {
          employeeId: response.employee_id,
          customersAnalyzed: response.customers_analyzed,
          generatedAt: response.generated_at
        }
      }));

      return {
        success: true,
        tips: formattedTips,
        total: formattedTips.length,
        metadata: {
          employeeId: response.employee_id,
          customersAnalyzed: response.customers_analyzed,
          generatedAt: response.generated_at
        }
      };
    } else {
      throw new Error(response.error || 'Failed to generate communication tips');
    }

  } catch (error) {
    console.error('🎯 Error generating communication tips:', error);
    return {
      success: false,
      error: error.message,
      tips: []
    };
  }
}

/**
 * Get communication tip categories for filtering
 * @returns {Array} Available tip categories
 */
export function getCommunicationTipCategories() {
  return [
    {
      id: 'conversation',
      name: 'Conversation Starters',
      description: 'Personalized ways to begin conversations',
      icon: '💬'
    },
    {
      id: 'timing',
      name: 'Optimal Timing',
      description: 'Best times and methods to contact',
      icon: '⏰'
    },
    {
      id: 'topics',
      name: 'Discussion Topics',
      description: 'Key topics based on customer status',
      icon: '📋'
    },
    {
      id: 'relationship',
      name: 'Relationship Building',
      description: 'Strategies to strengthen relationships',
      icon: '🤝'
    },
    {
      id: 'upsell',
      name: 'Growth Opportunities',
      description: 'Upselling and cross-selling approaches',
      icon: '📈'
    },
    {
      id: 'health-check',
      name: 'Health Monitoring',
      description: 'Customer satisfaction and health checks',
      icon: '💚'
    }
  ];
}

/**
 * Filter tips by category
 * @param {Array} tips - Array of communication tips
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered tips
 */
export function filterTipsByCategory(tips, category) {
  if (!category || category === 'all') {
    return tips;
  }
  return tips.filter(tip => tip.category === category);
}

/**
 * Filter tips by priority
 * @param {Array} tips - Array of communication tips
 * @param {string} priority - Priority to filter by
 * @returns {Array} Filtered tips
 */
export function filterTipsByPriority(tips, priority) {
  if (!priority || priority === 'all') {
    return tips;
  }
  return tips.filter(tip => tip.priority === priority);
}

/**
 * Get tips applicable to a specific customer
 * @param {Array} tips - Array of communication tips
 * @param {string} customerName - Customer name to filter by
 * @returns {Array} Applicable tips
 */
export function getTipsForCustomer(tips, customerName) {
  if (!customerName) {
    return tips;
  }
  return tips.filter(tip => 
    tip.applicableCustomers.some(customer => 
      customer.toLowerCase().includes(customerName.toLowerCase())
    )
  );
}

/**
 * Sort tips by priority (high -> medium -> low)
 * @param {Array} tips - Array of communication tips
 * @returns {Array} Sorted tips
 */
export function sortTipsByPriority(tips) {
  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  return [...tips].sort((a, b) => {
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  });
}

/**
 * Get priority color for UI display
 * @param {string} priority - Priority level
 * @returns {string} CSS color class
 */
export function getPriorityColor(priority) {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get category icon
 * @param {string} category - Category name
 * @returns {string} Icon emoji
 */
export function getCategoryIcon(category) {
  const categories = getCommunicationTipCategories();
  const categoryData = categories.find(cat => cat.id === category);
  return categoryData ? categoryData.icon : '💡';
}
