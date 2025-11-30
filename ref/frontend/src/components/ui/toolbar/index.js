// Toolbar Components Export
export { default as ToolbarContainer } from './ToolbarContainer';
export { default as PrimaryActionGroup } from './PrimaryActionGroup';
export { default as SearchGroup } from './SearchGroup';
export { default as FilterGroup, filterIcons } from './FilterGroup';
export { default as OverflowMenu, actionIcons } from './OverflowMenu';
export { default as UnifiedToolbar } from './UnifiedToolbar';

// Complete Toolbar Configuration Helper
export const createToolbarConfig = ({
  primaryAction,
  search,
  filters,
  overflowActions,
  themeColor = 'blue'
}) => ({
  primaryAction: {
    primaryLabel: primaryAction?.label || 'New Item',
    onPrimaryAction: primaryAction?.onClick,
    dropdownActions: primaryAction?.dropdownActions || [],
    themeColor,
    disabled: primaryAction?.disabled || false,
    loading: primaryAction?.loading || false
  },
  search: {
    placeholder: search?.placeholder || 'Search...',
    value: search?.value,
    onChange: search?.onChange,
    onSearch: search?.onSearch,
    onClear: search?.onClear,
    autoFocus: search?.autoFocus || false,
    disabled: search?.disabled || false
  },
  filters: filters || [],
  overflowActions: overflowActions || [],
  themeColor
});

// Predefined toolbar configurations for common pages
export const toolbarConfigs = {
  leadGeneration: {
    primaryAction: {
      label: 'Generate Leads',
      dropdownActions: [
        { label: 'New Lead', onClick: () => {} },
        { label: 'Bulk Upload CSV', onClick: () => {} }
      ]
    },
    filters: [
      { id: 'person', icon: 'person', label: 'Person Filter' },
      { id: 'filter', icon: 'filter', label: 'Filter' },
      { id: 'group', icon: 'group', label: 'Group By' }
    ],
    overflowActions: [
      { label: 'Export Data', icon: 'download' },
      { label: 'Import Settings', icon: 'upload' },
      { label: 'Settings', icon: 'settings' }
    ]
  },
  crm: {
    primaryAction: {
      label: 'Add Customer',
      dropdownActions: [
        { label: 'New Customer', onClick: () => {} },
        { label: 'Import from CSV', onClick: () => {} },
        { label: 'Sync from Email', onClick: () => {} }
      ]
    },
    filters: [
      { id: 'person', icon: 'person', label: 'Person Filter' },
      { id: 'status', icon: 'status', label: 'Status' },
      { id: 'tag', icon: 'tag', label: 'Tags' }
    ],
    overflowActions: [
      { label: 'Bulk Actions', icon: 'settings' },
      { label: 'Export Customers', icon: 'download' },
      { label: 'Email Campaign', icon: 'share' }
    ]
  },
  teamManagement: {
    primaryAction: {
      label: 'Add Employee',
      dropdownActions: [
        { label: 'New Employee', onClick: () => {} },
        { label: 'Bulk Import', onClick: () => {} },
        { label: 'Invite Team Member', onClick: () => {} }
      ]
    },
    filters: [
      { id: 'person', icon: 'person', label: 'Person Filter' },
      { id: 'filter', icon: 'filter', label: 'Filter' },
      { id: 'group', icon: 'group', label: 'Group By' }
    ],
    overflowActions: [
      { label: 'Team Settings', icon: 'settings' },
      { label: 'Export Team Data', icon: 'download' },
      { label: 'Performance Reports', icon: 'trend' }
    ]
  },
  salesCenter: {
    primaryAction: {
      label: 'New Analysis',
      dropdownActions: [
        { label: 'Upload Data', onClick: () => {} }
      ]
    },
    filters: [
      { id: 'time', icon: 'time', label: 'Time Range' },
      { id: 'filter', icon: 'filter', label: 'Filter' },
      { id: 'group', icon: 'group', label: 'Group By' }
    ],
    overflowActions: [
      { label: 'Export Analysis', icon: 'download' },
      { label: 'Schedule Report', icon: 'calendar' },
      { label: 'Dashboard Settings', icon: 'settings' }
    ]
  }
};