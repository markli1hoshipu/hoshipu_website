/**
 * Outlier Detection Service
 *
 * Business logic for filtering unknown entities from sales data.
 * Follows CRM architecture pattern - all business logic in /services/
 */

/**
 * Filters unknown entities from data
 * @param {Array} data - Array of data items with 'name' property
 * @returns {Object} Object with unknownEntities, cleanData, and stats
 */
export function filterUnknownEntities(data) {
  if (!data || !Array.isArray(data)) {
    return {
      unknownEntities: [],
      cleanData: [],
      stats: {
        totalCount: 0,
        unknownCount: 0,
        cleanCount: 0
      }
    };
  }

  const unknownEntities = data.filter(item =>
    item.name === 'Unknown' ||
    item.name === 'unknown' ||
    item.name?.toLowerCase().includes('unknown')
  );

  const cleanData = data.filter(item =>
    item.name !== 'Unknown' &&
    item.name !== 'unknown' &&
    !item.name?.toLowerCase().includes('unknown')
  );

  return {
    unknownEntities,
    cleanData,
    stats: {
      totalCount: data.length,
      unknownCount: unknownEntities.length,
      cleanCount: cleanData.length
    }
  };
}
