import React, { createContext, useContext } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';

const DashboardStateContext = createContext(null);

export const DashboardStateProvider = ({ children }) => {
    const dashboardState = useDashboardState();

    return (
        <DashboardStateContext.Provider value={dashboardState}>
            {children}
        </DashboardStateContext.Provider>
    );
};

export const useDashboardContext = () => {
    const context = useContext(DashboardStateContext);
    if (!context) {
        throw new Error('useDashboardContext must be used within DashboardStateProvider');
    }
    return context;
};
