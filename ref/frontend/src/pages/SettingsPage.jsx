import React, { useState } from 'react';
import { motion as _motion, AnimatePresence } from 'framer-motion';
import {
    Settings, User, Bell, Palette, MessageSquare, Shield,
    Globe, Monitor, Moon, Sun, Volume2, VolumeX,
    Download, Upload, Trash2, Eye, EyeOff, Key,
    Database, Wifi, HardDrive, Clock, Calendar,
    Phone, MapPin, Building, CreditCard,
    Zap, BarChart3, Camera, Mic, Video, Gamepad2,
    RefreshCw, ChevronRight, ChevronDown,
    AlertTriangle, CheckCircle, X, Plus, Minus
} from 'lucide-react';
import { useAuth } from '../auth/hooks/useAuth';
import { Button } from '../components/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/primitives/card';
import { Input } from '../components/ui/primitives/input';
import AnimatedBackground from '../components/AnimatedBackground';

const SettingsPage = () => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('profile');

    const [settings, setSettings] = useState({
        // Profile Settings
        profile: {
            firstName: user?.name?.split(' ')[0] || '',
            lastName: user?.name?.split(' ')[1] || '',
            email: user?.email || '',
            phone: '',
            company: '',
            position: '',
            location: '',
            timezone: 'America/New_York',
            language: 'en',
            avatar: user?.picture || ''
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
    });


    const settingsSections = [
        {
            id: 'profile',
            title: 'Profile & Account',
            icon: User,
            description: 'Manage your personal information and account details'
        },
        {
            id: 'appearance',
            title: 'Appearance & UI',
            icon: Palette,
            description: 'Customize the look and feel of your workspace'
        },
        {
            id: 'notifications',
            title: 'Notifications',
            icon: Bell,
            description: 'Control how and when you receive notifications'
        },
        {
            id: 'chat',
            title: 'Chat & AI',
            icon: MessageSquare,
            description: 'Configure AI assistant and chat preferences'
        },
        {
            id: 'security',
            title: 'Privacy & Security',
            icon: Shield,
            description: 'Manage your privacy and security settings'
        },
        {
            id: 'data',
            title: 'Data & Storage',
            icon: Database,
            description: 'Control data backup, storage, and retention'
        },
        {
            id: 'integrations',
            title: 'Integrations',
            icon: Zap,
            description: 'Connect with third-party services and tools'
        },
        {
            id: 'performance',
            title: 'Performance',
            icon: BarChart3,
            description: 'Optimize app performance and resource usage'
        }
    ];

    const updateSetting = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
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
    };

    const _resetSection = () => {
        // Reset current section to defaults
        // Individual sections can implement their own reset logic
    };

    const exportSettings = () => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'prelude-settings.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const importSettings = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target.result);
                    setSettings(importedSettings);
                } catch (_error) {
                    console.error('Invalid settings file');
                }
            };
            reader.readAsText(file);
        }
    };

    const renderProfileSettings = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <Input
                        value={settings.profile.firstName}
                        onChange={(e) => updateSetting('profile', 'firstName', e.target.value)}
                        placeholder="Enter your first name"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <Input
                        value={settings.profile.lastName}
                        onChange={(e) => updateSetting('profile', 'lastName', e.target.value)}
                        placeholder="Enter your last name"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <Input
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => updateSetting('profile', 'email', e.target.value)}
                    placeholder="Enter your email"
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <Input
                        value={settings.profile.phone}
                        onChange={(e) => updateSetting('profile', 'phone', e.target.value)}
                        placeholder="Enter your phone number"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <Input
                        value={settings.profile.company}
                        onChange={(e) => updateSetting('profile', 'company', e.target.value)}
                        placeholder="Enter your company"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <Input
                        value={settings.profile.position}
                        onChange={(e) => updateSetting('profile', 'position', e.target.value)}
                        placeholder="Enter your position"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <Input
                        value={settings.profile.location}
                        onChange={(e) => updateSetting('profile', 'location', e.target.value)}
                        placeholder="Enter your location"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.profile.timezone}
                        onChange={(e) => updateSetting('profile', 'timezone', e.target.value)}
                    >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.profile.language}
                        onChange={(e) => updateSetting('profile', 'language', e.target.value)}
                    >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="zh">Chinese</option>
                        <option value="ja">Japanese</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderAppearanceSettings = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-4 text-gray-700">Theme</label>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: 'light', icon: Sun, label: 'Light', desc: 'Light mode for daytime use' },
                        { id: 'dark', icon: Moon, label: 'Dark', desc: 'Dark mode for low-light conditions' },
                        { id: 'auto', icon: Monitor, label: 'Auto', desc: 'Follow system preferences' }
                    ].map((theme) => {
                        const Icon = theme.icon;
                        const isActive = settings.appearance.theme === theme.id;
                        return (
                            <button
                                key={theme.id}
                                onClick={() => updateSetting('appearance', 'theme', theme.id)}
                                className={`
                                    p-4 border-2 rounded-lg text-center transition-all
                                    ${isActive ? 'border-gray-400 bg-gray-100 shadow-md' : 'border-gray-200 hover:border-gray-300'}
                                    bg-white hover:bg-gray-50
                                `}
                            >
                                <Icon className={`h-8 w-8 mx-auto mb-3 ${isActive ? 'text-gray-700' : 'text-gray-500'}`} />
                                <div className="space-y-1">
                                    <div className="font-medium text-gray-900">{theme.label}</div>
                                    <div className="text-xs text-gray-500">{theme.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-4 text-gray-700">Font Size</label>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: 'small', label: 'Small', desc: 'Compact view', size: 'text-sm' },
                        { id: 'medium', label: 'Medium', desc: 'Default size', size: 'text-base' },
                        { id: 'large', label: 'Large', desc: 'Enhanced readability', size: 'text-lg' }
                    ].map((size) => {
                        const isActive = settings.appearance.fontSize === size.id;
                        return (
                            <button
                                key={size.id}
                                onClick={() => updateSetting('appearance', 'fontSize', size.id)}
                                className={`
                                    p-4 border-2 rounded-lg text-center transition-all
                                    ${isActive ? 'border-gray-400 bg-gray-100 shadow-md' : 'border-gray-200 hover:border-gray-300'}
                                    bg-white hover:bg-gray-50
                                `}
                            >
                                <div className={`space-y-1 ${size.size}`}>
                                    <div className="font-medium text-gray-900">{size.label}</div>
                                    <div className="text-xs text-gray-500">{size.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <div className="font-medium text-gray-900">Enable Animations</div>
                        <div className="text-sm text-gray-500">Turn off to improve performance</div>
                    </div>
                    <button
                        onClick={() => updateSetting('appearance', 'animationsEnabled', !settings.appearance.animationsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.appearance.animationsEnabled ? 'bg-gray-900' : 'bg-gray-200'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.appearance.animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <div className="font-medium text-gray-900">Collapsed Sidebar by Default</div>
                        <div className="text-sm text-gray-500">Start with sidebar minimized</div>
                    </div>
                    <button
                        onClick={() => updateSetting('appearance', 'sidebarCollapsed', !settings.appearance.sidebarCollapsed)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.appearance.sidebarCollapsed ? 'bg-gray-900' : 'bg-gray-200'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.appearance.sidebarCollapsed ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderNotificationSettings = () => (
        <div className="space-y-6">
            <div className="space-y-4">
                {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
                    { key: 'chatNotifications', label: 'Chat Notifications', desc: 'Notifications for new messages' },
                    { key: 'leadNotifications', label: 'Lead Notifications', desc: 'Alerts for new leads' },
                    { key: 'meetingReminders', label: 'Meeting Reminders', desc: 'Reminders before meetings' },
                    { key: 'soundEnabled', label: 'Sound Notifications', desc: 'Play sounds for notifications' },
                    { key: 'desktopNotifications', label: 'Desktop Notifications', desc: 'Show desktop notifications' },
                    { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly summary reports' }
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-gray-500">{item.desc}</div>
                        </div>
                        <button
                            onClick={() => updateSetting('notifications', item.key, !settings.notifications[item.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.notifications[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                ))}
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification Sound</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.notifications.notificationSound}
                    onChange={(e) => updateSetting('notifications', 'notificationSound', e.target.value)}
                >
                    <option value="default">Default</option>
                    <option value="chime">Chime</option>
                    <option value="ding">Ding</option>
                    <option value="bell">Bell</option>
                    <option value="none">None</option>
                </select>
            </div>
            
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="font-medium">Quiet Hours</div>
                        <div className="text-sm text-gray-500">Disable notifications during specific hours</div>
                    </div>
                    <button
                        onClick={() => updateNestedSetting('notifications', 'quietHours', 'enabled', !settings.notifications.quietHours.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.notifications.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notifications.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
                
                {settings.notifications.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                            <input
                                type="time"
                                value={settings.notifications.quietHours.start}
                                onChange={(e) => updateNestedSetting('notifications', 'quietHours', 'start', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">End Time</label>
                            <input
                                type="time"
                                value={settings.notifications.quietHours.end}
                                onChange={(e) => updateNestedSetting('notifications', 'quietHours', 'end', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderChatSettings = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message History Limit</label>
                <Input
                    type="number"
                    value={settings.chat.messageHistory}
                    onChange={(e) => updateSetting('chat', 'messageHistory', parseInt(e.target.value))}
                    placeholder="Number of messages to keep"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI Response Delay (seconds)</label>
                <Input
                    type="number"
                    step="0.1"
                    value={settings.chat.aiResponseDelay}
                    onChange={(e) => updateSetting('chat', 'aiResponseDelay', parseFloat(e.target.value))}
                    placeholder="Delay before AI responds"
                />
            </div>
            
            <div className="space-y-4">
                {[
                    { key: 'autoSave', label: 'Auto-save Conversations', desc: 'Automatically save chat history' },
                    { key: 'typingIndicators', label: 'Typing Indicators', desc: 'Show when AI is typing' },
                    { key: 'readReceipts', label: 'Read Receipts', desc: 'Show message read status' },
                    { key: 'contextMemory', label: 'Context Memory', desc: 'AI remembers conversation context' },
                    { key: 'smartSuggestions', label: 'Smart Suggestions', desc: 'AI suggests relevant actions' },
                    { key: 'voiceInput', label: 'Voice Input', desc: 'Enable voice-to-text input' },
                    { key: 'autoTranslation', label: 'Auto Translation', desc: 'Translate messages automatically' },
                    { key: 'profanityFilter', label: 'Profanity Filter', desc: 'Filter inappropriate content' }
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-gray-500">{item.desc}</div>
                        </div>
                        <button
                            onClick={() => updateSetting('chat', item.key, !settings.chat[item.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.chat[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.chat[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSecuritySettings = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <Input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                    placeholder="Session timeout duration"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.security.profileVisibility}
                    onChange={(e) => updateSetting('security', 'profileVisibility', e.target.value)}
                >
                    <option value="public">Public</option>
                    <option value="team">Team Only</option>
                    <option value="private">Private</option>
                </select>
            </div>
            
            <div className="space-y-4">
                {[
                    { key: 'twoFactorAuth', label: 'Two-Factor Authentication', desc: 'Add extra security to your account' },
                    { key: 'loginNotifications', label: 'Login Notifications', desc: 'Get notified of new logins' },
                    { key: 'dataSharing', label: 'Data Sharing', desc: 'Share anonymized data for improvements' },
                    { key: 'analytics', label: 'Usage Analytics', desc: 'Help improve the platform' },
                    { key: 'cookieConsent', label: 'Cookie Consent', desc: 'Allow tracking cookies' },
                    { key: 'activityTracking', label: 'Activity Tracking', desc: 'Track your activity for insights' }
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-gray-500">{item.desc}</div>
                        </div>
                        <button
                            onClick={() => updateSetting('security', item.key, !settings.security[item.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.security[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.security[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderDataSettings = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention (days)</label>
                <Input
                    type="number"
                    value={settings.data.dataRetention}
                    onChange={(e) => updateSetting('data', 'dataRetention', parseInt(e.target.value))}
                    placeholder="Days to retain data"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.data.backupFrequency}
                    onChange={(e) => updateSetting('data', 'backupFrequency', e.target.value)}
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.data.exportFormat}
                    onChange={(e) => updateSetting('data', 'exportFormat', e.target.value)}
                >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                </select>
            </div>
            
            <div className="space-y-4">
                {[
                    { key: 'autoBackup', label: 'Auto Backup', desc: 'Automatically backup your data' },
                    { key: 'offlineMode', label: 'Offline Mode', desc: 'Enable offline functionality' },
                    { key: 'syncEnabled', label: 'Sync Enabled', desc: 'Sync data across devices' }
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-gray-500">{item.desc}</div>
                        </div>
                        <button
                            onClick={() => updateSetting('data', item.key, !settings.data[item.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.data[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.data[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                ))}
            </div>
            
            <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Data Management</h4>
                <div className="space-y-3">
                    <Button variant="outline" onClick={exportSettings} className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export Settings
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".json"
                            onChange={importSettings}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" className="w-full justify-start">
                            <Upload className="h-4 w-4 mr-2" />
                            Import Settings
                        </Button>
                    </div>
                    <Button variant="destructive" className="w-full justify-start">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Data
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderIntegrationsSettings = () => (
        <div className="space-y-6">
            <div className="space-y-4">
                {[
                    { key: 'googleCalendar', label: 'Google Calendar', desc: 'Sync with Google Calendar', icon: Calendar },
                    { key: 'outlookCalendar', label: 'Outlook Calendar', desc: 'Sync with Outlook Calendar', icon: Calendar },
                    { key: 'slackIntegration', label: 'Slack Integration', desc: 'Connect with Slack workspace', icon: MessageSquare },
                    { key: 'teamsIntegration', label: 'Microsoft Teams', desc: 'Connect with Teams', icon: MessageSquare },
                    { key: 'zoomIntegration', label: 'Zoom Integration', desc: 'Schedule Zoom meetings', icon: Video },
                    { key: 'salesforceSync', label: 'Salesforce Sync', desc: 'Sync with Salesforce CRM', icon: Database },
                    { key: 'hubspotSync', label: 'HubSpot Sync', desc: 'Sync with HubSpot CRM', icon: Database },
                    { key: 'webhooksEnabled', label: 'Webhooks', desc: 'Enable webhook notifications', icon: Zap }
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Icon className="h-5 w-5 text-gray-400" />
                                <div>
                                    <div className="font-medium">{item.label}</div>
                                    <div className="text-sm text-gray-500">{item.desc}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSetting('integrations', item.key, !settings.integrations[item.key])}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings.integrations[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    settings.integrations[item.key] ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );


    const renderPerformanceSettings = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cache Strategy</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.performance.cacheStrategy}
                    onChange={(e) => updateSetting('performance', 'cacheStrategy', e.target.value)}
                >
                    <option value="conservative">Conservative</option>
                    <option value="normal">Normal</option>
                    <option value="aggressive">Aggressive</option>
                </select>
            </div>
            
            <div className="space-y-4">
                {[
                    { key: 'loadImages', label: 'Load Images', desc: 'Display images in the interface' },
                    { key: 'prefetchData', label: 'Prefetch Data', desc: 'Load data in advance for faster access' },
                    { key: 'compressionEnabled', label: 'Enable Compression', desc: 'Compress data to save bandwidth' },
                    { key: 'lowBandwidthMode', label: 'Low Bandwidth Mode', desc: 'Optimize for slow connections' },
                    { key: 'backgroundSync', label: 'Background Sync', desc: 'Sync data in the background' }
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-gray-500">{item.desc}</div>
                        </div>
                        <button
                            onClick={() => updateSetting('performance', item.key, !settings.performance[item.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.performance[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.performance[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSettingsContent = () => {
        switch (activeSection) {
            case 'profile': return renderProfileSettings();
            case 'appearance': return renderAppearanceSettings();
            case 'notifications': return renderNotificationSettings();
            case 'chat': return renderChatSettings();
            case 'security': return renderSecuritySettings();
            case 'data': return renderDataSettings();
            case 'integrations': return renderIntegrationsSettings();
            case 'performance': return renderPerformanceSettings();
            default: return renderProfileSettings();
        }
    };

    return (
        <div className="dashboard-container min-h-screen">
            <AnimatedBackground className="min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
                    <_motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="mb-8">
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
                            <p className="text-base text-gray-600 mt-2">Manage your account preferences and application settings</p>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Settings Navigation */}
                            <div className="lg:w-1/4">
                                <Card className="bg-white shadow-sm border border-gray-200">
                                    <CardContent className="p-0">
                                        <div className="space-y-1 p-4">
                                            {settingsSections.map((section) => {
                                                const Icon = section.icon;
                                                return (
                                                    <button
                                                        key={section.id}
                                                        onClick={() => setActiveSection(section.id)}
                                                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                                                            activeSection === section.id
                                                                ? 'bg-gray-100 border border-gray-300 text-gray-900'
                                                                : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <Icon className="h-5 w-5" />
                                                            <div>
                                                                <div className="font-medium text-sm">{section.title}</div>
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    {section.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Settings Content */}
                            <div className="lg:w-3/4">
                                <Card className="bg-white shadow-sm border border-gray-200">
                                    <CardHeader className="border-b border-gray-200 bg-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="flex items-center space-x-2 text-gray-900">
                                                    {React.createElement(
                                                        settingsSections.find(s => s.id === activeSection)?.icon || Settings,
                                                        { className: "h-5 w-5" }
                                                    )}
                                                    <span>{settingsSections.find(s => s.id === activeSection)?.title}</span>
                                                </CardTitle>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {settingsSections.find(s => s.id === activeSection)?.description}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 bg-white">
                                        <AnimatePresence mode="wait">
                                            <_motion.div
                                                key={activeSection}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {renderSettingsContent()}
                                            </_motion.div>
                                        </AnimatePresence>
                                    </CardContent>
                                </Card>


                            </div>
                        </div>
                    </_motion.div>
                </div>
            </AnimatedBackground>
        </div>
    );
};

export default SettingsPage; 