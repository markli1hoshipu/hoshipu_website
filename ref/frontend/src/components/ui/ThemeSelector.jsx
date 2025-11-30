import React, { useState, useEffect } from 'react';
import { getCurrentTheme, setTheme, onThemeChange, themeMetadata } from '../../styles/colorTemplates';

const ThemeSelector = ({ className = '' }) => {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onThemeChange((themeName) => {
      setCurrentTheme(themeName);
    });

    return unsubscribe;
  }, []);

  const handleThemeChange = (themeName) => {
    setTheme(themeName);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const currentThemeData = themeMetadata[currentTheme];

  return (
    <div className={`theme-selector relative ${className}`}>
      <button
        onClick={toggleDropdown}
        className="theme-selector-trigger flex items-center space-x-2 px-3 py-2 rounded-md border border-theme-border bg-theme-surface hover:bg-theme-surface-hover focus:outline-none focus:ring-2 focus:ring-theme-primary transition-colors"
        aria-label="Select theme"
      >
        <div className="flex items-center space-x-2">
          <div className="theme-preview-colors flex space-x-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentThemeData.preview.primary }}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentThemeData.preview.secondary }}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentThemeData.preview.accent }}
            />
          </div>
          <span className="text-sm font-medium text-theme-text-secondary">
            {currentThemeData.name}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-80 bg-theme-surface rounded-lg shadow-lg border border-theme-border z-20">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-theme-text-primary mb-3">Choose Theme</h3>
              <div className="space-y-2">
                {Object.entries(themeMetadata).map(([themeName, themeData]) => (
                  <button
                    key={themeName}
                    onClick={() => handleThemeChange(themeName)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${
                      currentTheme === themeName
                        ? 'bg-theme-primary-50 border border-theme-primary-200'
                        : 'hover:bg-theme-surface-hover border border-transparent'
                    }`}
                  >
                    <div className="flex space-x-1">
                      <div
                        className="w-4 h-4 rounded-full border border-theme-border"
                        style={{ backgroundColor: themeData.preview.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-theme-border"
                        style={{ backgroundColor: themeData.preview.secondary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-theme-border"
                        style={{ backgroundColor: themeData.preview.accent }}
                      />
                      <div
                        className="w-4 h-4 rounded border border-theme-border"
                        style={{ backgroundColor: themeData.preview.background }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-theme-text-primary">
                          {themeData.name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-theme-surface-secondary text-theme-text-secondary rounded-full">
                          {themeData.category}
                        </span>
                      </div>
                      <p className="text-xs text-theme-text-tertiary mt-1">
                        {themeData.description}
                      </p>
                    </div>
                    {currentTheme === themeName && (
                      <div className="text-theme-primary">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 rounded-b-lg">
              <p className="text-xs text-gray-500">
                Theme preferences are saved locally and will persist between sessions.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;