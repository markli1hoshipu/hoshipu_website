import React from 'react';
import CustomerRelationshipManagement from './customer-management/CustomerRelationshipManagement';

// Wrapper component for CRM - CRMProvider is now at App level for shared state with Deals
const CRMWrapper = ({ wsConnection }) => {
  return <CustomerRelationshipManagement wsConnection={wsConnection} />;
};

export default CRMWrapper;