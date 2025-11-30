import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/hooks/useAuth';
import { invitationsApi } from '../services/invitationsApi';

// Role configuration - this would ideally be loaded from the YAML file
// For now, we'll embed it as a JavaScript object for easier integration
const roleConfig = {
  roles: {
    admin: {
      description: "Full access to all features and tabs",
      permissions: [
        // "dashboard",  // Temporarily disabled
        "leads",
        // "employees",  // Temporarily disabled (Team Management)
        "sales-center",
        "crm",
        "deals",
        // "usage-analytics",  // Hidden from all users
        "user-onboarding"
        // "calendar"  // Temporarily disabled (Calendar & Scheduling)
      ]
    },
    manager: {
      description: "Full access to all features and tabs",
      permissions: [
        // "dashboard",  // Temporarily disabled
        "leads",
        // "employees",  // Temporarily disabled (Team Management)
        "sales-center",
        "crm",
        "deals",
        // "usage-analytics",  // Hidden from all users
        "user-onboarding"
        // "calendar"  // Temporarily disabled (Calendar & Scheduling)
      ]
    },
    employee: {
      description: "Full access to all features and tabs",
      permissions: [
        // "dashboard",  // Temporarily disabled
        "leads",
        "sales-center",
        "crm",
        "deals",
        // "usage-analytics",  // Hidden from all users
        "user-onboarding"
        // "calendar"  // Temporarily disabled (Calendar & Scheduling)
      ]
    }
  },
  user_roles: {
    // Admin users
    "mark.li@preludeos.com": "admin",
    "admin@prelude.com": "admin",
    "ceo@prelude.com": "admin", 
    "founder@prelude.com": "admin",
    "system@prelude.com": "admin",
    "aoxue@preludeos.com": "admin",
    "benjamin@preludeos.com": "admin",
    "bohan@preludeos.com": "admin",
    "bolin@preludeos.com": "admin",
    "james@preludeos.com": "admin",
    "prelude@preludeos.com": "admin",
    "vincent@preludeos.com": "admin",
    "mark@preludeos.com": "admin",
    "mark.hoshipu@example.com": "admin",
    
    // Manager users
    "manager@prelude.com": "manager",
    "sales.manager@prelude.com": "manager",
    "team.lead@prelude.com": "manager", 
    "supervisor@prelude.com": "manager",
    "sarah.manager@prelude.com": "manager",
    
    // Employee users
    "employee@prelude.com": "employee",
    "user@prelude.com": "employee",
    "sales@prelude.com": "employee",
    "support@prelude.com": "employee",
    "developer@prelude.com": "employee",
    "john.doe@prelude.com": "employee"
  },
  // Mapping database roles to system roles
  role_mapping: {
    "Admin": "admin",
    "Administrator": "admin", 
    "Project Manager": "manager",
    "Manager": "manager",
    "Developer": "employee",
    "Employee": "employee",
    "User": "employee"
  },
  default_role: "admin",
  available_tabs: {
    dashboard: {
      name: "Dashboard",
      icon: "LayoutDashboard",
      description: "Overview of metrics, tasks & AI agents"
    },
    calendar: {
      name: "Calendar",
      icon: "Calendar",
      description: "Schedule and meeting management"
    },
    leads: {
      name: "Lead Generation",
      icon: "Target",
      description: "Lead generation and management"
    },
    employees: {
      name: "Employee Profiles",
      icon: "Users",
      description: "Employee management and profiles"
    },
    "sales-center": {
      name: "Sales Center",
      icon: "BarChart2",
      description: "Sales analytics and reports"
    },
    crm: {
      name: "CRM",
      icon: "UserCheck",
      description: "Customer relationship management"
    },
    deals: {
      name: "Deals",
      icon: "DollarSign",
      description: "Deal pipeline & management"
    },
    "usage-analytics": {
      name: "Usage Analytics",
      icon: "BarChart2",
      description: "System usage and performance analytics"
    },
    "user-onboarding": {
      name: "User Onboarding",
      icon: "UserPlus",
      description: "Manage team organization and personal onboarding"
    }
  }
};

/**
 * Custom hook for managing user roles and permissions
 * @returns {Object} Role management functions and state
 */
// Function to fetch user role from database
const fetchUserRoleFromDatabase = async (email) => {
  try {
    console.log(`Fetching user role from database for email: ${email}`);
    const data = await invitationsApi.getUserInvitations(email);
    
    if (data.user && data.user.role) {
      const databaseRole = data.user.role;
      const systemRole = roleConfig.role_mapping[databaseRole] || roleConfig.default_role;
      console.log(`Database role: ${databaseRole} -> System role: ${systemRole}`);
      return { systemRole, userProfile: data.user };
    } else {
      console.log(`User ${email} not found in database, using fallback`);
      return { systemRole: null, userProfile: null };
    }
  } catch (error) {
    console.error('Error fetching user role from database:', error);
    return { systemRole: null, userProfile: null };
  }
};

export const useUserRole = () => {
  const { user, isAuthenticated } = useAuth();
  // Use a single state object to reduce re-renders
  const [roleState, setRoleState] = useState({
    userRole: null,
    userProfile: null,
    isLoading: true,
    roleSource: 'hardcoded' // 'hardcoded' or 'database'
  });

  // Determine user role - try database first, fallback to hardcoded
  useEffect(() => {
    // Skip if we're still in the initial loading state and authentication hasn't been determined
    if (isAuthenticated === null) {
      return;
    }

    const determineUserRole = async () => {
      if (isAuthenticated && user?.email) {
        const email = user.email.toLowerCase();
        
        // First try to fetch from database (but don't block on it)
        try {
          const { systemRole: dbRole, userProfile: profile } = await fetchUserRoleFromDatabase(email);
          
          if (dbRole) {
            // Successfully got role from database - single state update
            setRoleState({
              userRole: dbRole,
              userProfile: profile,
              roleSource: 'database',
              isLoading: false
            });
            console.log(`User role from database: ${dbRole} for email: ${email}`);
          } else {
            // Fallback to hardcoded roles - single state update
            const hardcodedRole = roleConfig.user_roles[email] || roleConfig.default_role;
            setRoleState({
              userRole: hardcodedRole,
              userProfile: null,
              roleSource: 'hardcoded',
              isLoading: false
            });
            console.log(`User role from hardcoded: ${hardcodedRole} for email: ${email}`);
          }
        } catch (error) {
          // Database fetch failed, use hardcoded roles - single state update
          console.warn('Database role fetch failed, using hardcoded roles:', error);
          const hardcodedRole = roleConfig.user_roles[email] || roleConfig.default_role;
          setRoleState({
            userRole: hardcodedRole,
            userProfile: null,
            roleSource: 'hardcoded',
            isLoading: false
          });
          console.log(`User role from hardcoded (fallback): ${hardcodedRole} for email: ${email}`);
        }
      } else {
        // Not authenticated - single state update
        setRoleState({
          userRole: null,
          userProfile: null,
          roleSource: 'hardcoded',
          isLoading: false
        });
      }
    };

    determineUserRole();
  }, [isAuthenticated, user?.email]);

  // Get user's permissions based on their role
  const permissions = useMemo(() => {
    if (!roleState.userRole || !roleConfig.roles[roleState.userRole]) {
      return [];
    }
    return roleConfig.roles[roleState.userRole].permissions || [];
  }, [roleState.userRole]);

  // Get role description
  const roleDescription = useMemo(() => {
    if (!roleState.userRole || !roleConfig.roles[roleState.userRole]) {
      return '';
    }
    return roleConfig.roles[roleState.userRole].description || '';
  }, [roleState.userRole]);

  // Check if user has permission for a specific tab/feature
  const hasPermission = (tabId) => {
    if (!isAuthenticated || !roleState.userRole) {
      return false;
    }
    return permissions.includes(tabId);
  };

  // Get all available tabs that user has access to
  const availableTabs = useMemo(() => {
    if (!isAuthenticated || !roleState.userRole) {
      return [];
    }
    
    return Object.entries(roleConfig.available_tabs)
      .filter(([tabId]) => hasPermission(tabId))
      .map(([tabId, tabInfo]) => ({
        id: tabId,
        ...tabInfo
      }));
  }, [isAuthenticated, roleState.userRole, permissions]);

  // Get filtered navigation items
  const getFilteredNavItems = (navItems) => {
    if (!isAuthenticated || !roleState.userRole) {
      return [];
    }
    
    return navItems.filter(item => hasPermission(item.id));
  };

  // Check if user is admin
  const isAdmin = roleState.userRole === 'admin';
  
  // Check if user is manager or above
  const isManager = roleState.userRole === 'admin' || roleState.userRole === 'manager';

  // Get role priority (higher number = higher priority)
  const getRolePriority = (role) => {
    const priorities = {
      'employee': 1,
      'manager': 2, 
      'admin': 3
    };
    return priorities[role] || 0;
  };

  const rolePriority = getRolePriority(roleState.userRole);

  return {
    // Current user role info
    userRole: roleState.userRole,
    roleDescription,
    permissions,
    rolePriority,
    isLoading: roleState.isLoading,
    userProfile: roleState.userProfile,
    roleSource: roleState.roleSource,
    
    // Permission checking functions
    hasPermission,
    isAdmin,
    isManager,
    
    // Tab and navigation helpers
    availableTabs,
    getFilteredNavItems,
    
    // Raw config for advanced usage
    roleConfig,
    
    // User info
    userEmail: user?.email || null,
    isAuthenticated
  };
};

export default useUserRole;