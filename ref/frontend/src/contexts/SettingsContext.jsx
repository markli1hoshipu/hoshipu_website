import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(() => {
        // Load settings from localStorage on initialization
        const savedSettings = localStorage.getItem('prelude-settings');
        if (savedSettings) {
            try {
                return JSON.parse(savedSettings);
            } catch (error) {
                console.error('Error parsing saved settings:', error);
            }
        }
        
        // Default settings
        return {
            // Profile Settings
            profile: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                company: '',
                position: '',
                location: '',
                timezone: 'America/New_York',
                language: 'en',
                avatar: ''
            },
            
            // UI & Theme Settings
            appearance: {
                theme: 'light', // light, dark, auto
                primaryColor: '#3B82F6',
                fontSize: 'medium', // small, medium, large
                sidebarCollapsed: false,
                animationsEnabled: true,
                densityMode: 'comfortable', // compact, comfortable, spacious
                chatPosition: 'bottom-right'
            },
            
            // Notification Settings
            notifications: {
                emailNotifications: true,
                pushNotifications: true,
                chatNotifications: true,
                leadNotifications: true,
                meetingReminders: true,
                soundEnabled: true,
                desktopNotifications: true,
                weeklyReports: true,
                notificationSound: 'default',
                quietHours: {
                    enabled: false,
                    start: '22:00',
                    end: '08:00'
                }
            },
            
            // Chat & AI Settings
            chat: {
                autoSave: true,
                messageHistory: 100,
                typingIndicators: true,
                readReceipts: true,
                aiResponseDelay: 0,
                contextMemory: true,
                smartSuggestions: true,
                voiceInput: false,
                autoTranslation: false,
                profanityFilter: false
            },
            
            // Privacy & Security
            security: {
                twoFactorAuth: false,
                sessionTimeout: 480, // minutes
                loginNotifications: true,
                dataSharing: false,
                analytics: true,
                cookieConsent: true,
                profileVisibility: 'team', // public, team, private
                activityTracking: true
            },
            
            // Data & Storage
            data: {
                autoBackup: true,
                backupFrequency: 'daily', // daily, weekly, monthly
                dataRetention: 365, // days
                exportFormat: 'json', // json, csv, xlsx
                cacheSize: '100MB',
                offlineMode: false,
                syncEnabled: true
            },
            
            // Integration Settings
            integrations: {
                googleCalendar: false,
                outlookCalendar: false,
                slackIntegration: false,
                teamsIntegration: false,
                zoomIntegration: false,
                salesforceSync: false,
                hubspotSync: false,
                webhooksEnabled: false
            },
            
            // Performance Settings
            performance: {
                loadImages: true,
                prefetchData: true,
                compressionEnabled: true,
                lowBandwidthMode: false,
                cacheStrategy: 'aggressive', // conservative, normal, aggressive
                backgroundSync: true
            }
        };
    });

    const [unsavedChanges, setUnsavedChanges] = useState(false);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('prelude-settings', JSON.stringify(settings));
    }, [settings]);

    // Apply theme settings to document
    useEffect(() => {
        const { theme, primaryColor, fontSize } = settings.appearance;
        
        // Apply theme
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else { // auto
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            
            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e) => {
                if (settings.appearance.theme === 'auto') {
                    if (e.matches) {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                }
            };
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }

        // Apply primary color
        document.documentElement.style.setProperty('--primary-color', primaryColor);

        // Apply font size
        document.documentElement.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
        document.documentElement.classList.add(`text-size-${fontSize}`);
    }, [settings.appearance]);

    const updateSetting = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
        setUnsavedChanges(true);
    };

    const updateNestedSetting = (section, parentKey, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [parentKey]: {
                    ...prev[section][parentKey],
                    [key]: value
                }
            }
        }));
        setUnsavedChanges(true);
    };

    const bulkUpdateSettings = (newSettings) => {
        setSettings(newSettings);
        setUnsavedChanges(true);
    };

    const resetSection = (section) => {
        // Reset specific section to defaults
        const defaultSettings = {
            profile: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                company: '',
                position: '',
                location: '',
                timezone: 'America/New_York',
                language: 'en',
                avatar: ''
            },
            appearance: {
                theme: 'light',
                primaryColor: '#3B82F6',
                fontSize: 'medium',
                sidebarCollapsed: false,
                animationsEnabled: true,
                densityMode: 'comfortable',
                chatPosition: 'bottom-right'
            },
            notifications: {
                emailNotifications: true,
                pushNotifications: true,
                chatNotifications: true,
                leadNotifications: true,
                meetingReminders: true,
                soundEnabled: true,
                desktopNotifications: true,
                weeklyReports: true,
                notificationSound: 'default',
                quietHours: {
                    enabled: false,
                    start: '22:00',
                    end: '08:00'
                }
            },
            chat: {
                autoSave: true,
                messageHistory: 100,
                typingIndicators: true,
                readReceipts: true,
                aiResponseDelay: 0,
                contextMemory: true,
                smartSuggestions: true,
                voiceInput: false,
                autoTranslation: false,
                profanityFilter: false
            },
            security: {
                twoFactorAuth: false,
                sessionTimeout: 480,
                loginNotifications: true,
                dataSharing: false,
                analytics: true,
                cookieConsent: true,
                profileVisibility: 'team',
                activityTracking: true
            },
            data: {
                autoBackup: true,
                backupFrequency: 'daily',
                dataRetention: 365,
                exportFormat: 'json',
                cacheSize: '100MB',
                offlineMode: false,
                syncEnabled: true
            },
            integrations: {
                googleCalendar: false,
                outlookCalendar: false,
                slackIntegration: false,
                teamsIntegration: false,
                zoomIntegration: false,
                salesforceSync: false,
                hubspotSync: false,
                webhooksEnabled: false
            },
            performance: {
                loadImages: true,
                prefetchData: true,
                compressionEnabled: true,
                lowBandwidthMode: false,
                cacheStrategy: 'aggressive',
                backgroundSync: true
            }
        };

        if (defaultSettings[section]) {
            setSettings(prev => ({
                ...prev,
                [section]: defaultSettings[section]
            }));
            setUnsavedChanges(true);
        }
    };

    const saveSettings = async () => {
        try {
            // Here you would typically save to backend
            console.log('Saving settings to backend:', settings);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setUnsavedChanges(false);
            return { success: true };
        } catch (error) {
            console.error('Error saving settings:', error);
            return { success: false, error };
        }
    };

    const exportSettings = () => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prelude-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importSettings = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target.result);
                    setSettings(importedSettings);
                    setUnsavedChanges(true);
                    resolve(importedSettings);
                } catch (_error) {
                    reject(new Error('Invalid settings file format'));
                }
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    };

    const value = {
        settings,
        unsavedChanges,
        updateSetting,
        updateNestedSetting,
        bulkUpdateSettings,
        resetSection,
        saveSettings,
        exportSettings,
        importSettings,
        setUnsavedChanges
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}; 