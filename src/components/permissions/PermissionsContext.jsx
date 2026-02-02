import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext(null);

// הגדרות הרשאות ברירת מחדל
export const DEFAULT_PERMISSIONS = {
  // ניהול קריאות
  calls: {
    view: true,
    create: true,
    edit: true,
    delete: false,
    assign: true
  },
  // ניהול ספקים
  vendors: {
    view: true,
    create: false,
    edit: false,
    delete: false,
    manage_contracts: false
  },
  // ניהול לקוחות
  customers: {
    view: true,
    create: false,
    edit: false,
    delete: false
  },
  // דוחות
  reports: {
    view: false,
    export: false,
    financial: false,
    performance: false,
    historical: false
  },
  // הגדרות מערכת
  system: {
    users: false,
    roles: false,
    settings: false,
    automations: false,
    integrations: false,
    audit_log: false
  },
  // מפות וניטור
  monitoring: {
    live_map: true,
    tracking: true,
    queue: true
  }
};

// תפקידי ברירת מחדל
export const DEFAULT_ROLES = {
  admin: {
    name: 'admin',
    display_name: 'מנהל מערכת',
    description: 'גישה מלאה לכל הפונקציות',
    permissions: {
      calls: { view: true, create: true, edit: true, delete: true, assign: true },
      vendors: { view: true, create: true, edit: true, delete: true, manage_contracts: true },
      customers: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, export: true, financial: true, performance: true, historical: true },
      system: { users: true, roles: true, settings: true, automations: true, integrations: true, audit_log: true },
      monitoring: { live_map: true, tracking: true, queue: true }
    }
  },
  operator: {
    name: 'operator',
    display_name: 'מוקדן',
    description: 'ניהול קריאות ותפעול יומיומי',
    permissions: {
      calls: { view: true, create: true, edit: true, delete: false, assign: true },
      vendors: { view: true, create: false, edit: false, delete: false, manage_contracts: false },
      customers: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, export: false, financial: false, performance: true, historical: false },
      system: { users: false, roles: false, settings: false, automations: false, integrations: false, audit_log: false },
      monitoring: { live_map: true, tracking: true, queue: true }
    }
  },
  viewer: {
    name: 'viewer',
    display_name: 'צפייה בלבד',
    description: 'צפייה בנתונים ללא יכולת עריכה',
    permissions: {
      calls: { view: true, create: false, edit: false, delete: false, assign: false },
      vendors: { view: true, create: false, edit: false, delete: false, manage_contracts: false },
      customers: { view: true, create: false, edit: false, delete: false },
      reports: { view: true, export: false, financial: false, performance: false, historical: false },
      system: { users: false, roles: false, settings: false, automations: false, integrations: false, audit_log: false },
      monitoring: { live_map: true, tracking: false, queue: true }
    }
  },
  manager: {
    name: 'manager',
    display_name: 'מנהל תפעול',
    description: 'ניהול תפעול ודוחות',
    permissions: {
      calls: { view: true, create: true, edit: true, delete: true, assign: true },
      vendors: { view: true, create: true, edit: true, delete: false, manage_contracts: true },
      customers: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, export: true, financial: false, performance: true, historical: true },
      system: { users: false, roles: false, settings: false, automations: true, integrations: false, audit_log: true },
      monitoring: { live_map: true, tracking: true, queue: true }
    }
  }
};

// מיפוי דפים להרשאות
export const PAGE_PERMISSIONS = {
  Dashboard: { category: 'monitoring', permission: 'queue' },
  NewCase: { category: 'calls', permission: 'create' },
  CallDetails: { category: 'calls', permission: 'view' },
  Calls: { category: 'calls', permission: 'view' },
  Customers: { category: 'customers', permission: 'view' },
  ServiceProviders: { category: 'vendors', permission: 'view' },
  VendorContracts: { category: 'vendors', permission: 'manage_contracts' },
  Reports: { category: 'reports', permission: 'view' },
  HistoricalDataAnalysis: { category: 'reports', permission: 'historical' },
  UserManagement: { category: 'system', permission: 'users' },
  Settings: { category: 'system', permission: 'settings' },
  AutomationSettings: { category: 'system', permission: 'automations' },
  IntegrationSettings: { category: 'system', permission: 'integrations' },
  AuditLog: { category: 'system', permission: 'audit_log' },
  AllVendorsMap: { category: 'monitoring', permission: 'live_map' },
  VendorTracking: { category: 'monitoring', permission: 'tracking' },
  QueueMonitor: { category: 'monitoring', permission: 'queue' },
  RoleManagement: { category: 'system', permission: 'roles' }
};

export function PermissionsProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);

  // טעינת המשתמש הנוכחי
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to load user:', e);
      }
    };
    loadUser();
  }, []);

  // טעינת הרשאות המשתמש
  const { data: permissionData } = useQuery({
    queryKey: ['userPermissions', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      
      const permissions = await base44.entities.UserPermission.filter({ user_id: currentUser.id });
      if (permissions.length > 0) {
        // אם יש הרשאות מותאמות, טען את התפקיד
        const perm = permissions[0];
        if (perm.role_id) {
          const roles = await base44.entities.Role.filter({ id: perm.role_id });
          if (roles.length > 0) {
            return {
              ...perm,
              roleData: roles[0]
            };
          }
        }
        return perm;
      }
      return null;
    },
    enabled: !!currentUser?.id
  });

  useEffect(() => {
    if (permissionData) {
      setUserPermissions(permissionData);
    }
  }, [permissionData]);

  // בדיקת הרשאה
  const hasPermission = (category, permission) => {
    // אדמינים מקבלים הכל
    if (currentUser?.role === 'admin') return true;
    
    // בדיקת הרשאות מותאמות אישית
    if (userPermissions?.custom_permissions?.[category]?.[permission] !== undefined) {
      return userPermissions.custom_permissions[category][permission];
    }
    
    // בדיקת הרשאות מהתפקיד
    if (userPermissions?.roleData?.permissions?.[category]?.[permission] !== undefined) {
      return userPermissions.roleData.permissions[category][permission];
    }
    
    // ברירת מחדל - מוקדן
    return DEFAULT_ROLES.operator.permissions[category]?.[permission] ?? false;
  };

  // בדיקת גישה לדף
  const canAccessPage = (pageName) => {
    if (currentUser?.role === 'admin') return true;
    
    // בדיקת דפים מוגבלים
    if (userPermissions?.restricted_pages?.includes(pageName)) {
      return false;
    }
    
    const pageConfig = PAGE_PERMISSIONS[pageName];
    if (!pageConfig) return true; // דפים ללא הגדרה - מותרים לכולם
    
    return hasPermission(pageConfig.category, pageConfig.permission);
  };

  // בדיקת גישה לדוח
  const canAccessReport = (reportType) => {
    if (currentUser?.role === 'admin') return true;
    
    if (userPermissions?.allowed_reports?.length > 0) {
      return userPermissions.allowed_reports.includes(reportType);
    }
    
    return hasPermission('reports', reportType);
  };

  const value = {
    currentUser,
    userPermissions,
    hasPermission,
    canAccessPage,
    canAccessReport,
    isAdmin: currentUser?.role === 'admin',
    isLoading: !currentUser
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

// HOC לבדיקת הרשאות
export function withPermission(WrappedComponent, category, permission) {
  return function PermissionWrapper(props) {
    const { hasPermission, isLoading } = usePermissions();
    
    if (isLoading) return null;
    
    if (!hasPermission(category, permission)) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-500 text-xl mb-2">⛔</div>
          <h2 className="text-lg font-bold text-gray-700">אין לך הרשאה לצפות בתוכן זה</h2>
          <p className="text-gray-500 text-sm mt-1">פנה למנהל המערכת לקבלת גישה</p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}