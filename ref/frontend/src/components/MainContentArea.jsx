import React from 'react';
import FunLoadingScreen from './FunLoadingScreen';
import DashboardContent from './DashboardContent';
import logoImage from '../data/prelude logo transparent.png';

const MainContentArea = React.memo(({ 
    currentView, 
    isTabLoading, 
    targetView, 
    isContentReady, 
    onLoadingComplete, 
    isWsConnected,
    isInitialLoading = false,
    onInitialLoadComplete = null,
    loadingEnabled = true
}) => {
    return (
        <div className="flex-1 flex flex-col overflow-hidden main-content transition-all duration-200 ease-in-out bg-white relative">
            {/* Fun Loading Screen - Shows for initial loading OR tab loading (only if enabled) */}
            {loadingEnabled && (
                <FunLoadingScreen 
                    isLoading={isInitialLoading || isTabLoading} 
                    targetView={isInitialLoading ? "dashboard" : targetView}
                    isContentReady={isContentReady}
                    onComplete={isInitialLoading ? onInitialLoadComplete : onLoadingComplete}
                />
            )}
            
            {/* Main Content - Show after initial loading is complete OR if loading is disabled */}
            {(!isInitialLoading || !loadingEnabled) && (
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="min-h-full">
                        <DashboardContent
                            currentView={currentView}
                            wsConnection={{
                                isConnected: isWsConnected,
                                onRetry: () => window.location.reload()
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

MainContentArea.displayName = 'MainContentArea';

export default MainContentArea;