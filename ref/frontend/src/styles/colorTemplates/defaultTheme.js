// Default Color Theme - Professional Blue
export const defaultTheme = {
  // Primary Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Secondary Colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',  // Main secondary
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Accent Colors
  accent: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // Main accent
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    paper: '#ffffff',
    elevated: '#ffffff',
    overlay: 'rgba(15, 23, 42, 0.8)',
  },

  // Surface Colors
  surface: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#e2e8f0',
    hover: '#f1f5f9',
    active: '#e2e8f0',
    disabled: '#f8fafc',
  },

  // Text Colors
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b',
    disabled: '#94a3b8',
    inverse: '#ffffff',
    placeholder: '#94a3b8',
  },

  // Status Colors
  status: {
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    info: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
  },

  // Interactive States
  interactive: {
    hover: {
      primary: '#2563eb',
      secondary: '#e2e8f0',
      accent: '#0284c7',
    },
    active: {
      primary: '#1d4ed8',
      secondary: '#cbd5e1',
      accent: '#0369a1',
    },
    focus: {
      ring: '#3b82f6',
      background: '#dbeafe',
    },
    disabled: {
      background: '#f8fafc',
      text: '#94a3b8',
      border: '#e2e8f0',
    },
  },

  // Border Colors
  border: {
    primary: '#e2e8f0',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    focus: '#3b82f6',
    error: '#ef4444',
    success: '#22c55e',
  },

  // Shadow Colors
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Chart Colors (for analytics)
  chart: {
    primary: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#ec4899'],
    gradient: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      tertiary: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  },
};

// CSS Custom Properties Generator
export const generateCSSVariables = (theme) => {
  const cssVars = {};
  
  const flattenObject = (obj, prefix = '') => {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}-${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flattenObject(value, newKey);
      } else {
        cssVars[`--color-${newKey}`] = value;
      }
    });
  };
  
  flattenObject(theme);
  return cssVars;
};