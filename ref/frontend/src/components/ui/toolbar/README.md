● 📁 Toolbar Icon Code Locations

  Core Toolbar Components

  - prelude/frontend/src/components/common/toolbar/
    - UnifiedToolbar.jsx - Main configuration processor
    - ActionIconGroup.jsx - Renders the action icons
    - PrimaryActionGroup.jsx - Handles primary + action icons

  Page-Specific Configurations

  - prelude/frontend/src/components/employee/pages/TeamManagement.jsx - Lines ~440-490
  - prelude/frontend/src/components/crm/CustomerRelationshipManagement.jsx - Lines ~800-850
  - prelude/frontend/src/components/lead-gen/EnhancedLeadGeneration.jsx - Lines ~280-330
  - prelude/frontend/src/components/lead-gen/LeadManagement.jsx - Lines ~200-250
  - prelude/frontend/src/components/sales-center/SalesAnalyticsDashboard.jsx - Lines ~100-150

  Configuration Format

  Each page defines its actionIcons array within the UnifiedToolbar config:
  actionIcons: [
    { icon: IconComponent, label: 'Label', onClick: handler }
  ]

  To modify icons: Edit the actionIcons array in the specific page component.