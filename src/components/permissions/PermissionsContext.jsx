import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext(null);

// הגדרות הרשאות ברירת מחדל למוקדן
const DEFAULT_OPERATOR_PERMISSIONS = {
  calls: { view: true, create: true, edit: true, delete: false, assign: true },
  vendors: { view: true, create: false, edit: false, delete: false, manage_contracts: false },
  customers: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, export: false, financial: false, performance: true, historical: false },
  system: { users: false, roles: false, settings: false, automations: false, integrations: false, audit_log: false },
  monitoring: { live_map: true, tracking: true, queue: true }
};

// מיפוי דפים להרשאות
const PAGE_PERMISSIONS = {
  Dashboard: { category: 'monitoring', permission: 'queue' },
  NewCase: { category: 'calls', permission: 'create' },
  CallDetails: { category: 'calls', permission: 'view' },
  Calls: { category: 'calls', permission: 'view' },
  Customers: { category: 'customers', permission: 'view' },
  ServiceProviders: { category: 'vendors', permission: 'view' },
  NewVendor: { category: 'vendors', permission: 'create' },
  VendorContracts: { category: 'vendors', permission: 'manage_contracts' },
  Reports: { category: 'reports', permission: 'view' },
  HistoricalDataAnalysis: { category: 'reports', permission: 'historical' },
  AdvancedExport: { category: 'reports', permission: 'export' },
  UserManagement: { category: 'system', permission: 'users' },
  Settings: { category: 'system', permission: 'settings' },
  AutomationSettings: { category: 'system', permission: 'automations' },
  IntegrationSettings: { category: 'system', permission: 'integrations' },
  AuditLog: { category: 'system', permission: 'audit_log' },
  AllVendorsMap: { category: 'monitoring', permission: 'live_map' },
  VendorTracking: { category: 'monitoring', permission: 'tracking' },
  QueueMonitor: { category: 'monitoring', permission: 'queue' },
  RoleManagement: { category: 'system', permission: 'roles' },
  Calendar: { category: 'calls', permission: 'view' },
  CoverageAreas: { category: 'monitoring', permission: 'live_map' },
  NotificationSettings: { category: 'system', permission: 'settings' },
  ImportHistoricalData: { category: 'system', permission: 'settings' },
  Agents: { category: 'system', permission: 'automations' }
};

export function PermissionsProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // טעינת המשתמש הנוכחי והרשאות
  useEffect(() => {
    const loadUserAndPermissions = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (user?.id) {
          const permissions = await base44.entities.UserPermission.filter({ user_id: user.id });
          if (permissions.length > 0) {
            const perm = permissions[0];
            if (perm.role_id) {
              try {
                const roles = await base44.entities.Role.filter({ id: perm.role_id });
                if (roles.length > 0) {
                  setUserPermissions({ ...perm, roleData: roles[0] });
                } else {
                  setUserPermissions(perm);
                }
              } catch (e) {
                setUserPermissions(perm);
              }
            } else {
              setUserPermissions(perm);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load user:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserAndPermissions();
  }, []);

  // בדיקת הרשאה
  const hasPermission = useCallback((category, permission) => {
    // אדמינים מקבלים הכל
    if (currentUser?.role === 'admin') return true;
    
    // בדיקת הרשאות מותאמות אישית (עוקפות את התפקיד)
    if (userPermissions?.custom_permissions?.[category]?.[permission] !== undefined) {
      return userPermissions.custom_permissions[category][permission];
    }
    
    // בדיקת הרשאות מהתפקיד
    if (userPermissions?.roleData?.permissions?.[category]?.[permission] !== undefined) {
      return userPermissions.roleData.permissions[category][permission];
    }
    
    // ברירת מחדל - מוקדן
    return DEFAULT_OPERATOR_PERMISSIONS[category]?.[permission] ?? false;
  }, [currentUser, userPermissions]);

  // בדיקת גישה לדף
  const canAccessPage = useCallback((pageName) => {
    if (currentUser?.role === 'admin') return true;
    
    // בדיקת דפים מוגבלים למשתמש ספציפי
    if (userPermissions?.restricted_pages?.includes(pageName)) {
      return false;
    }
    
    const pageConfig = PAGE_PERMISSIONS[pageName];
    if (!pageConfig) return true; // דפים ללא הגדרה - מותרים לכולם
    
    return hasPermission(pageConfig.category, pageConfig.permission);
  }, [currentUser, userPermissions, hasPermission]);

  // בדיקת גישה לדוח
  const canAccessReport = useCallback((reportType) => {
    if (currentUser?.role === 'admin') return true;
    
    if (userPermissions?.allowed_reports?.length > 0) {
      return userPermissions.allowed_reports.includes(reportType);
    }
    
    return hasPermission('reports', reportType);
  }, [currentUser, userPermissions, hasPermission]);

  // בדיקת הרשאות מרובות בבת אחת
  const hasAnyPermission = useCallback((permissions) => {
    return permissions.some(({ category, permission }) => hasPermission(category, permission));
  }, [hasPermission]);

  // בדיקת כל ההרשאות
  const hasAllPermissions = useCallback((permissions) => {
    return permissions.every(({ category, permission }) => hasPermission(category, permission));
  }, [hasPermission]);

  const value = {
    currentUser,
    userPermissions,
    hasPermission,
    canAccessPage,
    canAccessReport,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: currentUser?.role === 'admin',
    isLoading
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
    // אם לא בתוך provider, מחזירים ערכי ברירת מחדל
    return {
      currentUser: null,
      userPermissions: null,
      hasPermission: () => false,
      canAccessPage: () => true,
      canAccessReport: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      isAdmin: false,
      isLoading: true
    };
  }
  return context;
}

// ייצוא קבועים לשימוש במקומות אחרים
export { PAGE_PERMISSIONS, DEFAULT_OPERATOR_PERMISSIONS };