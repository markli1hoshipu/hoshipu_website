/**
 * Icon system for CustomDropdown components
 * MondayCRM-inspired design with color-coded backgrounds
 */
import React from 'react';
import { 
  Sparkles, 
  Database, 
  Plus, 
  X, 
  ChevronDown, 
  Search,
  Brain,
  Table,
  Upload,
  EyeOff
} from 'lucide-react';

// SVG Icon Components
export const SparkleIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(Sparkles, { className })
);

export const DatabaseIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(Database, { className })
);

export const PlusIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(Plus, { className })
);

export const XIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(X, { className })
);

export const ChevronDownIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(ChevronDown, { className })
);

export const SearchIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(Search, { className })
);

export const BrainIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(Brain, { className })
);

export const TableIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(Table, { className })
);

export const UploadIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(Upload, { className })
);

export const EyeOffIcon = ({ className = "w-4 h-4" }) => (
  React.createElement(EyeOff, { className })
);

// Option type configurations with MondayCRM-inspired styling
export const OPTION_TYPES = {
  ai_recommendation: {
    icon: SparkleIcon,
    iconColor: 'text-white',
    bgColor: 'bg-purple-500',
    hoverBgColor: 'hover:bg-purple-600',
    label: 'AI Recommended',
    description: 'Suggested by artificial intelligence'
  },
  database_column: {
    icon: DatabaseIcon,
    iconColor: 'text-white',
    bgColor: 'bg-blue-500',
    hoverBgColor: 'hover:bg-blue-600',
    label: 'Database Column',
    description: 'Existing PostgreSQL column'
  },
  import_new: {
    icon: PlusIcon,
    iconColor: 'text-white',
    bgColor: 'bg-green-500',
    hoverBgColor: 'hover:bg-green-600',
    label: 'Import as New',
    description: 'Create new column in database'
  },
  ignore_column: {
    icon: EyeOffIcon,
    iconColor: 'text-white',
    bgColor: 'bg-gray-500',
    hoverBgColor: 'hover:bg-gray-600',
    label: 'Ignore Column',
    description: 'Exclude from import'
  },
  choose: {
    icon: ChevronDownIcon,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-200',
    hoverBgColor: 'hover:bg-gray-300',
    label: 'Choose Column',
    description: 'Select mapping option'
  }
};

// Group configurations for organizing dropdown options
export const OPTION_GROUPS = {
  ai_recommendations: {
    title: 'AI Recommendations',
    icon: BrainIcon,
    description: 'Intelligent mapping suggestions',
    priority: 1
  },
  database_columns: {
    title: 'Available Database Columns',
    icon: TableIcon,
    description: 'Existing PostgreSQL columns',
    priority: 2
  },
  import_options: {
    title: 'Import Options',
    icon: UploadIcon,
    description: 'Column handling options',
    priority: 3
  }
};

// Utility function to get option type configuration
export const getOptionConfig = (type) => {
  return OPTION_TYPES[type] || OPTION_TYPES.choose;
};

// Utility function to determine option type from option data
export const determineOptionType = (option) => {
  if (option.isRecommended && option.confidence > 0) {
    return 'ai_recommendation';
  }
  if (option.value === 'import_as_new') {
    return 'import_new';
  }
  if (option.value === 'ignore_column') {
    return 'ignore_column';
  }
  if (option.value === '' || option.value === null) {
    return 'choose';
  }
  return 'database_column';
};

// Utility function to group options
export const groupOptions = (options) => {
  const grouped = {
    ai_recommendations: [],
    database_columns: [],
    import_options: []
  };

  options.forEach(option => {
    const type = determineOptionType(option);
    
    if (type === 'ai_recommendation') {
      grouped.ai_recommendations.push({ ...option, type });
    } else if (type === 'import_new' || type === 'ignore_column') {
      grouped.import_options.push({ ...option, type });
    } else if (type === 'database_column') {
      grouped.database_columns.push({ ...option, type });
    }
  });

  return grouped;
};

export default {
  OPTION_TYPES,
  OPTION_GROUPS,
  getOptionConfig,
  determineOptionType,
  groupOptions
};