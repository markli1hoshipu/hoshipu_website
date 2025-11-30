// Color Templates Index - Theme Manager
import { defaultTheme, generateCSSVariables } from './defaultTheme.js';
import { darkTheme } from './darkTheme.js';
import { vibrantTheme } from './vibrantTheme.js';
import { oceanTheme } from './oceanTheme.js';
import { sunsetTheme } from './sunsetTheme.js';

// Available themes
export const themes = {
  default: oceanTheme,  // Changed default to ocean theme
  dark: darkTheme,
  vibrant: vibrantTheme,
  ocean: oceanTheme,
  sunset: sunsetTheme,
};

// Theme metadata for UI selection
export const themeMetadata = {
  default: {
    name: 'Ocean (Default)',
    description: 'Calming blue-green ocean inspired colors',
    category: 'Natural',
    preview: {
      primary: '#14b8a6',
      secondary: '#0ea5e9',
      accent: '#10b981',
      background: '#ffffff',
    },
  },
  dark: {
    name: 'Dark Mode',
    description: 'Modern dark theme for reduced eye strain',
    category: 'Professional',
    preview: {
      primary: '#6366f1',
      secondary: '#94a3b8',
      accent: '#38bdf8',
      background: '#0f172a',
    },
  },
  vibrant: {
    name: 'Vibrant',
    description: 'Energetic pink and green color palette',
    category: 'Creative',
    preview: {
      primary: '#ec4899',
      secondary: '#22c55e',
      accent: '#f97316',
      background: '#ffffff',
    },
  },
  ocean: {
    name: 'Ocean',
    description: 'Calming blue-green ocean inspired colors',
    category: 'Natural',
    preview: {
      primary: '#14b8a6',
      secondary: '#0ea5e9',
      accent: '#10b981',
      background: '#ffffff',
    },
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm orange and red sunset gradients',
    category: 'Natural',
    preview: {
      primary: '#f97316',
      secondary: '#ef4444',
      accent: '#eab308',
      background: '#ffffff',
    },
  },
};

// Current theme state management
let currentTheme = 'default';
let themeChangeCallbacks = [];

// Theme management functions
export const getCurrentTheme = () => currentTheme;

export const getTheme = (themeName = currentTheme) => {
  return themes[themeName] || themes.default;
};

export const setTheme = (themeName) => {
  if (themes[themeName]) {
    currentTheme = themeName;
    applyThemeToDOM(themes[themeName]);
    notifyThemeChange(themeName);
    localStorage.setItem('prelude-theme', themeName);
  }
};

export const initializeTheme = () => {
  const savedTheme = localStorage.getItem('prelude-theme');
  const initialTheme = savedTheme && themes[savedTheme] ? savedTheme : 'default';
  setTheme(initialTheme);
};

export const onThemeChange = (callback) => {
  themeChangeCallbacks.push(callback);
  return () => {
    themeChangeCallbacks = themeChangeCallbacks.filter(cb => cb !== callback);
  };
};

// Apply theme to DOM
const applyThemeToDOM = (theme) => {
  const cssVars = generateCSSVariables(theme);
  const root = document.documentElement;
  
  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Add theme class to body for component-specific styling
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add(`theme-${currentTheme}`);
};

// Notify theme change listeners
const notifyThemeChange = (themeName) => {
  themeChangeCallbacks.forEach(callback => {
    try {
      callback(themeName, themes[themeName]);
    } catch (error) {
      console.error('Theme change callback error:', error);
    }
  });
};

// Utility functions for components
export const getColorValue = (colorPath, theme = getTheme()) => {
  const keys = colorPath.split('.');
  let value = theme;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }
  
  return value;
};

export const getChartColors = (count = 8, theme = getTheme()) => {
  const colors = theme.chart?.primary || themes.default.chart.primary;
  if (count <= colors.length) {
    return colors.slice(0, count);
  }
  
  // If we need more colors, repeat the pattern
  const repeated = [];
  for (let i = 0; i < count; i++) {
    repeated.push(colors[i % colors.length]);
  }
  return repeated;
};

// Export theme utilities
export {
  generateCSSVariables,
  defaultTheme,
  darkTheme,
  vibrantTheme,
  oceanTheme,
  sunsetTheme,
};