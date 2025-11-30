import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Calendar, Users, UserCheck, UserPlus, Target, Heart, LayoutDashboard, User, LogOut, Settings, ChevronDown, Bot, DollarSign, PanelLeftClose } from 'lucide-react';

import { useUserRole } from '../hooks/useUserRole';
import { useAuth } from '../auth/hooks/useAuth';
import logoSmall from '../data/prelude logo transparent.png';
import NotificationBell from './NotificationBell';

// Move viewConfigs outside component to prevent recreation on each render
const viewConfigs = {
        dashboard: {
            label: 'Dashboard',
            color: 'blue',
            gradient: 'from-blue-600 via-blue-700 to-blue-800',
            shadow: 'shadow-blue-600/40',
            hoverShadow: 'hover:shadow-blue-700/60',
            hoverBg: 'hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-200',
            description: 'Overview of metrics, tasks & AI agents'
        },
        leads: {
            label: 'Lead Generation',
            color: 'blue',
            gradient: 'from-blue-500 to-cyan-500',
            shadow: 'shadow-blue-500/25',
            hoverShadow: 'hover:shadow-blue-500/40',
            description: 'Manage and generate new leads'
        },
        'sales-center': { 
            label: 'Sales Center', 
            color: 'purple',
            gradient: 'from-purple-500 to-pink-500',
            shadow: 'shadow-purple-500/25',
            hoverShadow: 'hover:shadow-purple-500/40',
            description: 'Sales training, CRM & analytics hub'
        },
        crm: {
            label: 'Customer Relations',
            color: 'pink',
            gradient: 'from-pink-500 to-rose-500',
            shadow: 'shadow-pink-500/25',
            hoverShadow: 'hover:shadow-pink-500/40',
            description: 'Customer relationship management'
        },
        deals: {
            label: 'Deals',
            color: 'indigo',
            gradient: 'from-indigo-500 to-purple-500',
            shadow: 'shadow-indigo-500/25',
            hoverShadow: 'hover:shadow-indigo-500/40',
            description: 'Deal pipeline & management'
        },
        calendar: { 
            label: 'Calendar & Scheduling', 
            color: 'orange',
            gradient: 'from-orange-500 to-red-500',
            shadow: 'shadow-orange-500/25',
            hoverShadow: 'hover:shadow-orange-500/40',
            description: 'Calendar integration & scheduling'
        },
        'user-onboarding': {
            label: 'User Onboarding',
            color: 'teal',
            gradient: 'from-teal-500 to-cyan-500',
            shadow: 'shadow-teal-500/25',
            hoverShadow: 'hover:shadow-teal-500/40',
            description: 'Manage team organization and personal onboarding'
        },
        'usage-analytics': {
            label: 'Usage Analytics',
            color: 'indigo',
            gradient: 'from-indigo-500 to-violet-500',
            shadow: 'shadow-indigo-500/25',
            hoverShadow: 'hover:shadow-indigo-500/40',
            description: 'Track and analyze platform usage'
        }
    };

// Move navigationItems outside component to prevent recreation on each render
const navigationItems = [
    {
        group: 'Overview',
        items: [
            {
                id: 'dashboard',
                icon: LayoutDashboard,
                config: viewConfigs.dashboard
            }
        ]
    },
    {
        group: '',
        items: [
            {
                id: 'leads',
                icon: Users,
                config: viewConfigs.leads
            },
            {
                id: 'crm',
                icon: Heart,
                config: viewConfigs.crm
            },
            {
                id: 'deals',
                icon: DollarSign,
                config: viewConfigs.deals
            },
            {
                id: 'sales-center',
                icon: Target,
                config: viewConfigs['sales-center']
            }
        ]
    },
    {
        group: 'Team & Calendar',
        items: [
            {
                id: 'calendar',
                icon: Calendar,
                config: viewConfigs.calendar
            },
            {
                id: 'user-onboarding',
                icon: UserPlus,
                config: viewConfigs['user-onboarding']
            },
            {
                id: 'usage-analytics',
                icon: Target,
                config: viewConfigs['usage-analytics']
            }
        ]
    }
];

// Memoized NavigationItem component to prevent unnecessary re-renders
const NavigationItem = React.memo(({ item, currentView, isCollapsed, setCurrentView, onTabClick }) => {
    const { hasPermission, isLoading } = useUserRole();
    const { id, icon: Icon, config } = item;
    const isActive = currentView === id;

    // All hooks must be called before any conditional returns
    const handleClick = useCallback(() => {
        setCurrentView(id); // Switch tab immediately in sidebar
        onTabClick?.(id); // Trigger loading for the content
    }, [id, setCurrentView, onTabClick]);

    // During loading, hide all items for cleaner appearance
    // After loading is complete, check permissions
    if (isLoading || !hasPermission(id)) {
        return null;
    }

    return (
        <motion.div
            key={id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
                duration: 0.3,
                delay: navigationItems.flatMap(g => g.items).findIndex(i => i.id === id) * 0.1,
                ease: "easeOut"
            }}
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
            whileTap={{
                scale: 0.98,
                transition: { duration: 0.1 }
            }}
        >
            <div
                onClick={handleClick}
                data-view={id}
                title={isCollapsed ? config.label : ''}
                className={`
                    group cursor-pointer rounded-lg transition-all duration-300
                    ${isActive ?
                        `bg-gradient-to-r ${config.gradient} text-white ${config.shadow} shadow-xl transform scale-105` :
                        config.hoverBg || 'hover:bg-blue-200'
                    }
                    ${config.hoverShadow} hover:shadow-lg
                    p-3
                `}
                style={isActive ? {} : {backgroundColor: 'rgb(217, 239, 243)'}}
            >
                <div className="relative z-10 flex items-center w-full">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white drop-shadow-sm' : 'text-gray-600'}`} />
                    {!isCollapsed && (
                        <div className="ml-3 flex-1 overflow-hidden transition-opacity duration-200 delay-150">
                            <div className="flex items-center justify-between whitespace-nowrap">
                                <div className="min-w-0">
                                    <div className={`font-semibold text-xs leading-tight ${isActive ? 'text-white drop-shadow-sm' : 'text-gray-900'}`}>
                                        {config.label}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

NavigationItem.displayName = 'NavigationItem';

const SidebarMenu = React.memo(({
    currentView,
    setCurrentView,
    onTabClick
}) => {
    const { hasPermission, isLoading } = useUserRole();
    const { user, logout, isAuthenticated } = useAuth();
    const { userRole } = useUserRole();
    const navigate = useNavigate();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const userMenuRef = useRef(null);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = useCallback(() => {
        logout();
        setUserMenuOpen(false);
    }, [logout]);

    const handleSettingsClick = useCallback(() => {
        // Use setCurrentView to switch views without unmounting other components
        setCurrentView('settings');
        setUserMenuOpen(false);
    }, [setCurrentView]);

    const handleProfilesClick = useCallback(() => {
        // Use setCurrentView to switch views without unmounting other components
        setCurrentView('profiles');
        setUserMenuOpen(false);
    }, [setCurrentView]);

    const handleToggleCollapse = useCallback(() => {
        setIsTransitioning(true);
        setIsCollapsed(prev => !prev);

        // Reset transitioning state after animation completes (300ms)
        setTimeout(() => {
            setIsTransitioning(false);
        }, 300);
    }, []);

    // Memoize filtered navigation groups to prevent unnecessary recalculation
    const filteredNavigationGroups = useMemo(() => {
        return navigationItems
            .map((group) => ({
                ...group,
                // Filter items by permissions
                items: group.items.filter(item => hasPermission(item.id))
            }))
            .filter(group => group.items.length > 0);
    }, [hasPermission]);

    return (
        <div className={`sidebar-menu h-full flex flex-col overflow-hidden relative z-20 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-56'}`}>
            {/* Collapse Toggle Button - ChatGPT style in top right when expanded */}
            {!isCollapsed && (
                <button
                    onClick={handleToggleCollapse}
                    className={`absolute top-4 right-4 z-30 p-2 rounded-lg bg-white hover:bg-gray-100 transition-all duration-200 shadow-md border border-gray-200 ${
                        isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    title="Collapse sidebar"
                >
                    <PanelLeftClose className="h-4 w-4 text-gray-600" />
                </button>
            )}

            {/* Navigation Groups */}
            <div className={`flex-1 overflow-y-auto space-y-2 ${isCollapsed ? 'px-2 py-5' : 'p-5'}`}>
                {/* Header with Logo */}
                {!isCollapsed ? (
                    <div className="-mt-4 mb-0 flex items-center justify-start h-16 transition-opacity duration-200 delay-100">
                        <img
                            src={logoSmall}
                            alt="Prelude Logo"
                            className="h-12 w-12 object-contain"
                        />
                    </div>
                ) : (
                    <div className="-mt-4 mb-0 flex items-center justify-center h-16 transition-opacity duration-200 delay-100">
                        <button
                            onClick={handleToggleCollapse}
                            className="flex items-center justify-center transition-all duration-200 hover:bg-gray-100 rounded-lg p-2"
                            title="Expand sidebar"
                        >
                            <img
                                src={logoSmall}
                                alt="Prelude Logo"
                                className="h-10 w-10 object-contain"
                            />
                        </button>
                    </div>
                )}

                {/* Notification Bell */}
                <div className={isCollapsed ? 'flex justify-center mb-4' : 'mb-4'}>
                    <NotificationBell isCollapsed={isCollapsed} />
                </div>

                {/* Loading indicator - shows when permissions are being loaded */}
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-pulse text-gray-400">
                            <div className="space-y-3">
                                <div className={`h-10 bg-gray-200 rounded-lg ${isCollapsed ? 'w-10' : 'w-full'}`}></div>
                                <div className={`h-10 bg-gray-200 rounded-lg ${isCollapsed ? 'w-10' : 'w-full'}`}></div>
                                <div className={`h-10 bg-gray-200 rounded-lg ${isCollapsed ? 'w-10' : 'w-full'}`}></div>
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && filteredNavigationGroups.map((group) => (
                        <div key={group.group}>
                            <div className="space-y-2">
                                {group.items.map((item) => (
                                    <NavigationItem
                                        key={item.id}
                                        item={item}
                                        currentView={currentView}
                                        isCollapsed={isCollapsed}
                                        setCurrentView={setCurrentView}
                                        onTabClick={onTabClick}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                }
            </div>

            {/* Bottom Section - AI Assistant and User Profile */}
            <div className={`border-t border-gray-200 space-y-3 bg-white/50 ${isCollapsed ? 'px-2 py-4' : 'p-4'}`}>
                {/* AI Assistant Status */}
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200`} title={isCollapsed ? 'AI Assistant Online' : ''}>
                    <Bot className="h-5 w-5 text-green-600 flex-shrink-0" />
                    {!isCollapsed && (
                        <div className="flex flex-col flex-1 min-w-0 transition-opacity duration-200 delay-150">
                            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">AI Assistant</span>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-600 whitespace-nowrap">Online & Ready</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile */}
                {isAuthenticated && (
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors`}
                            title={isCollapsed ? user?.email?.split('@')[0] || 'User' : ''}
                        >
                            <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold transition-all">
                                    {user?.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                                {!isCollapsed && (
                                    <div className="flex flex-col items-start transition-opacity duration-200 delay-150">
                                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                                            {user?.email?.split('@')[0] || 'User'}
                                        </span>
                                        <span className="text-xs text-gray-500 capitalize whitespace-nowrap">{userRole || 'User'}</span>
                                    </div>
                                )}
                            </div>
                            {!isCollapsed && (
                                <ChevronDown className={`h-4 w-4 text-gray-500 transition-all duration-200 delay-150 ${userMenuOpen ? 'rotate-180' : ''}`} />
                            )}
                        </button>

                        {/* User Dropdown Menu */}
                        <AnimatePresence>
                            {userMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className={`absolute bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 ${
                                        isCollapsed
                                            ? 'bottom-0 left-full ml-2 w-48'
                                            : 'bottom-full left-0 right-0 mb-2'
                                    }`}
                                >
                                    <button
                                        onClick={handleProfilesClick}
                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <User className="h-4 w-4 mr-3 text-gray-600" />
                                        <span className="text-sm text-gray-700">Profile</span>
                                    </button>
                                    <button
                                        onClick={handleSettingsClick}
                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <Settings className="h-4 w-4 mr-3 text-gray-600" />
                                        <span className="text-sm text-gray-700">Settings</span>
                                    </button>
                                    <div className="border-t border-gray-200"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center px-4 py-3 hover:bg-red-50 transition-colors text-left"
                                    >
                                        <LogOut className="h-4 w-4 mr-3 text-red-600" />
                                        <span className="text-sm text-red-600">Logout</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
});

SidebarMenu.displayName = 'SidebarMenu';

export default SidebarMenu;