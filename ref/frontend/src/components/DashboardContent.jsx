import React, { Suspense, lazy } from 'react';
import { CalendarIntegration } from './calendar';
import LeadGenerationHub from './lead-gen/LeadGenerationHub';
import SalesCenter from './sales-center/SalesCenter';
import CRMWrapper from './crm/CRMWrapper';
import DealsWrapper from './crm/deals/DealsWrapper';
import UsageAnalytics from './analytics/UsageAnalyticsRedesigned';
import UserOnboardingPage from './invitations/UserOnboardingPage';

// Note: Dashboard component removed - using LeadGenerationHub as default dashboard
import FunLoadingScreen from './FunLoadingScreen';

// Lazy load settings and profile pages
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

// Import profile tab components
import { EmailTemplatesTab } from '../components/email-settings/EmailTemplatesTab';
import EmailSettingsTab from '../components/email-settings/EmailSettingsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/primitives/tabs';
import { Mail, FileText } from 'lucide-react';

import { useUserRole } from '../hooks/useUserRole';

const DashboardContent = ({ currentView, wsConnection, className = "" }) => {
    const { hasPermission, userRole, isAuthenticated, isLoading } = useUserRole();

    // Profile view component
    const ProfileView = () => (
        <div className="h-full overflow-auto bg-white">
            <div className="w-[95%] max-w-[1800px] mx-auto px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                </div>

                <Tabs defaultValue="preferences" className="bg-white">
                    <TabsList className="mb-6">
                        <TabsTrigger value="preferences" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Preferences
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Email Templates
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="preferences" className="pt-0">
                        <EmailSettingsTab />
                    </TabsContent>

                    <TabsContent value="templates" className="pt-0">
                        <EmailTemplatesTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );

    // Show loading state while authentication and roles are being determined
    if (isLoading || isAuthenticated === null) {
        return null; // Return null and let the parent handle loading
    }

    // If user is not authenticated after loading is complete
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Denied</h2>
                    <p className="text-gray-500">Please log in to access this content.</p>
                </div>
            </div>
        );
    }

    // Define all views - render all but only show the active one
    // This keeps components mounted and preserves their state
    const views = {
        'dashboard': <LeadGenerationHub wsConnection={wsConnection} />,
        'calendar': <CalendarIntegration />,
        'leads': <LeadGenerationHub wsConnection={wsConnection} />,
        'crm': <CRMWrapper wsConnection={wsConnection} />,
        'deals': <DealsWrapper wsConnection={wsConnection} />,
        'sales-center': <SalesCenter wsConnection={wsConnection} />,
        'usage-analytics': <UsageAnalytics wsConnection={wsConnection} />,
        'user-onboarding': <UserOnboardingPage wsConnection={wsConnection} />,
        'settings': <Suspense fallback={<div className="flex items-center justify-center h-full"><div>Loading...</div></div>}><SettingsPage /></Suspense>,
        'profiles': <ProfileView />,
    };

    return (
        <div className={`h-full main-content overflow-hidden ${className}`}>
            {Object.entries(views).map(([viewKey, component]) => {
                // Check permissions for each view
                const hasAccess = viewKey === 'settings' || viewKey === 'profiles' || hasPermission(viewKey);
                const isActive = currentView === viewKey;

                return (
                    <div
                        key={viewKey}
                        className="h-full"
                        style={{
                            display: isActive && hasAccess ? 'block' : 'none'
                        }}
                    >
                        {component}
                    </div>
                );
            })}

            {/* Show access restricted message if needed */}
            {!hasPermission(currentView) && currentView !== 'settings' && currentView !== 'profiles' && (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Restricted</h2>
                        <p className="text-gray-500 mb-1">
                            You don't have permission to access the "{currentView}" section.
                        </p>
                        <p className="text-sm text-gray-400">
                            Current role: <span className="font-medium">{userRole}</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardContent; 
