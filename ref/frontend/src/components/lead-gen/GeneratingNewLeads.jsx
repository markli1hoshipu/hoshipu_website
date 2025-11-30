import React from 'react';
import LeadGenWorkflowWizard from './workflow-wizard/LeadGenWorkflowWizard';

/**
 * GeneratingNewLeads - Main component for the "Generating New Leads" tab
 *
 * This component now uses a 4-step wizard workflow:
 * 1. Define Leads - Natural language query input
 * 2. Refine Search - Review AI understanding and set number of leads
 * 3. Choose Companies - Preview and select companies
 * 4. Enrich & Save - Enrich contacts and save to database
 */
const GeneratingNewLeads = () => {
  return <LeadGenWorkflowWizard />;
};

export default GeneratingNewLeads;
