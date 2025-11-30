import { useState, useEffect } from 'react';
import {
  getCurrentTheme,
  getTheme,
  setTheme as setGlobalTheme,
  onThemeChange,
  getColorValue,
  getChartColors
} from '../styles/colorTemplates';

/**
 * Custom hook for theme management
 * Provides theme state, setters, and utility functions
 */
export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());
  const [themeObject, setThemeObject] = useState(getTheme());

  useEffect(() => {
    const unsubscribe = onThemeChange((themeName, theme) => {
      setCurrentTheme(themeName);
      setThemeObject(theme);
    });

    return unsubscribe;
  }, []);

  const setTheme = (themeName) => {
    setGlobalTheme(themeName);
  };

  const getColor = (colorPath) => {
    return getColorValue(colorPath, themeObject);
  };

  const getChartColorPalette = (count = 8) => {
    return getChartColors(count, themeObject);
  };

  return {
    currentTheme,
    theme: themeObject,
    setTheme,
    getColor,
    getChartColorPalette,
  };
};

/**
 * Hook for accessing theme colors in components
 * Returns commonly used color values
 */
export const useThemeColors = () => {
  const { theme, getColor } = useTheme();

  return {
    // Primary colors
    primary: getColor('primary.500'),
    primaryHover: getColor('interactive.hover.primary'),
    primaryActive: getColor('interactive.active.primary'),
    
    // Secondary colors
    secondary: getColor('secondary.500'),
    secondaryHover: getColor('interactive.hover.secondary'),
    
    // Background colors
    background: getColor('background.primary'),
    backgroundSecondary: getColor('background.secondary'),
    surface: getColor('surface.primary'),
    
    // Text colors
    textPrimary: getColor('text.primary'),
    textSecondary: getColor('text.secondary'),
    textTertiary: getColor('text.tertiary'),
    
    // Border colors
    border: getColor('border.primary'),
    borderSecondary: getColor('border.secondary'),
    
    // Status colors
    success: getColor('status.success.500'),
    warning: getColor('status.warning.500'),
    error: getColor('status.error.500'),
    info: getColor('status.info.500'),
    
    // Chart colors
    chartColors: getColor('chart.primary'),
  };
};

/**
 * Hook for responsive theme behavior
 * Handles system theme preferences and media queries
 */
export const useResponsiveTheme = () => {
  const { currentTheme, setTheme } = useTheme();
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e) => {
      setSystemPrefersDark(e.matches);
      
      // Auto-switch to dark theme if user hasn't explicitly chosen a theme
      if (!localStorage.getItem('prelude-theme')) {
        setTheme(e.matches ? 'dark' : 'default');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setTheme]);

  const toggleDarkMode = () => {
    const newTheme = currentTheme === 'dark' ? 'default' : 'dark';
    setTheme(newTheme);
  };

  const setAutoTheme = () => {
    setTheme(systemPrefersDark ? 'dark' : 'default');
    localStorage.removeItem('prelude-theme'); // Remove saved preference for auto-detection
  };

  return {
    currentTheme,
    systemPrefersDark,
    isDarkMode: currentTheme === 'dark',
    toggleDarkMode,
    setAutoTheme,
    setTheme,
  };
};