// Sunset Color Theme - Warm Orange-Red Gradients
export const sunsetTheme = {
  // Primary Colors
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',  // Main primary
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },

  // Secondary Colors
  secondary: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Main secondary
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Accent Colors
  accent: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',  // Main accent
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#fff7ed',
    tertiary: '#fef2f2',
    paper: '#ffffff',
    elevated: '#fffbf5',
    overlay: 'rgba(249, 115, 22, 0.1)',
  },

  // Surface Colors
  surface: {
    primary: '#ffffff',
    secondary: '#fff7ed',
    tertiary: '#ffedd5',
    hover: '#fff7ed',
    active: '#ffedd5',
    disabled: '#fffaf5',
  },

  // Text Colors
  text: {
    primary: '#7c2d12',
    secondary: '#9a3412',
    tertiary: '#c2410c',
    disabled: '#fdba74',
    inverse: '#ffffff',
    placeholder: '#fed7aa',
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
      50: '#fefce8',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
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
      primary: '#ea580c',
      secondary: '#ffedd5',
      accent: '#ca8a04',
    },
    active: {
      primary: '#c2410c',
      secondary: '#fed7aa',
      accent: '#a16207',
    },
    focus: {
      ring: '#f97316',
      background: '#ffedd5',
    },
    disabled: {
      background: '#fffaf5',
      text: '#fed7aa',
      border: '#ffedd5',
    },
  },

  // Border Colors
  border: {
    primary: '#fed7aa',
    secondary: '#fecaca',
    tertiary: '#fef08a',
    focus: '#f97316',
    error: '#fca5a5',
    success: '#86efac',
  },

  // Shadow Colors
  shadow: {
    sm: '0 1px 2px 0 rgb(249 115 22 / 0.1)',
    md: '0 4px 6px -1px rgb(249 115 22 / 0.1), 0 2px 4px -2px rgb(249 115 22 / 0.1)',
    lg: '0 10px 15px -3px rgb(249 115 22 / 0.1), 0 4px 6px -4px rgb(249 115 22 / 0.1)',
    xl: '0 20px 25px -5px rgb(249 115 22 / 0.1), 0 8px 10px -6px rgb(249 115 22 / 0.1)',
  },

  // Chart Colors (for analytics)
  chart: {
    primary: ['#f97316', '#ef4444', '#eab308', '#fb923c', '#f59e0b', '#f87171', '#fbbf24', '#fcd34d'],
    gradient: {
      primary: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
      secondary: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      tertiary: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
    },
  },
};