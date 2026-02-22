import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext(null);

// הגדרות הרשאות ברירת מחדל למוקדן
const DEFAULT_OPERATOR_PERMISSIONS = {
  calls: { view: true, create: true, edit: true, delete: false, assign: true },
  vendors: { view: true, create: false, edit: false, delete: false, manage_contracts: false },
  customers: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, export: false, financial: false, performance: true, historical: false },
  system: {
    users: false,
    roles: false,
    settings: false,
    automations: false,
    integrations: false,
    audit_log: false,
  },
  monitoring: { live_map: true, tracking: true, queue: true },
};

// הגדרות הרשאות ברירת מחדל לטכנאי (agent) - הרשאות מצומצמות
const DEFAULT_AGENT_PERMISSIONS = {
  calls: { view: true, create: false, edit: false, delete: false, assign: false },
  vendors: { view: false, create: false, edit: false, delete: false, manage_contracts: false },
  customers: { view: false, create: false, edit: false, delete: false },
  reports: { view: false, export: false, financial: false, performance: false, historical: false },
  system: {
    users: false,
    roles: false,
    settings: false,
    automations: false,
    integrations: false,
    audit_log: false,
  },
  monitoring: { live_map: false, tracking: false, queue: false },
};

// מיפוי דפים להרשאות גרנולריות (category/permission)
// הערה: הרשאות ברמת דף (role-based) מוגדרות ב-src/config/permissions.js
// המיפוי הזה משמש לבדיקות גרנולריות בתוך דפים שכבר עברו בדיקת role
const PAGE_GRANULAR_PERMISSIONS = {
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
  Agents: { category: 'system', permission: 'automations' },
  FleetManagement: { category: 'system', permission: 'settings' },
  VendorPricing: { category: 'vendors', permission: 'manage_contracts' },
  Invoices: { category: 'reports', permission: 'financial' },
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
          // Load roles first
          let allRoles = [];
          try {
            allRoles = await base44.entities.Role.list();
          } catch (e) {
            console.error('Failed to load roles:', e);
          }

          // חיפוש לפי user_id או לפי user_email
          let permissions = [];
          try {
            permissions = await base44.entities.UserPermission.filter({ user_id: user.id });
          } catch (e) {
            console.error('Failed to filter by user_id:', e);
          }
          if (permissions.length === 0 && user.email) {
            try {
              permissions = await base44.entities.UserPermission.filter({ user_email: user.email });
            } catch (e) {
              console.error('Failed to filter by user_email:', e);
            }
          }
          
          console.log('[Permissions] User:', user.email, 'role:', user.role, 'id:', user.id);
          console.log('[Permissions] Found permissions:', permissions.length, permissions.length > 0 ? JSON.stringify({role_id: permissions[0].role_id, role_name: permissions[0].role_name}) : 'none');
          console.log('[Permissions] Available roles:', allRoles.map(r => r.name + '/' + r.id).join(', '));
          
          if (permissions.length > 0) {
            const perm = permissions[0];
            let matchedRole = null;
            if (perm.role_id) {
              matchedRole = allRoles.find(r => r.id === perm.role_id);
            }
            if (!matchedRole && perm.role_name) {
              matchedRole = allRoles.find(r => r.display_name === perm.role_name || r.name === perm.role_name);
            }
            console.log('[Permissions] Matched role:', matchedRole ? matchedRole.name : 'NONE');
            if (matchedRole) {
              setUserPermissions({ ...perm, roleData: matchedRole });
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

  // זיהוי תפקיד אפקטיבי - מבוסס על UserPermission/Role ולא על role הפלטפורמה
  // IMPORTANT: userPermissions?.role_name may be a display_name like "נציג שטח", so prefer roleData.name
  const effectiveRoleName = userPermissions?.roleData?.name || currentUser?.role;
  const isEffectiveAdmin = effectiveRoleName === 'admin' || currentUser?.role === 'admin';
  
  console.log('[Permissions] effectiveRoleName:', effectiveRoleName, 'isAdmin:', isEffectiveAdmin, 'roleData:', userPermissions?.roleData?.name, 'platformRole:', currentUser?.role);

  // בדיקת הרשאה
  const hasPermission = useCallback(
    (category, permission) => {
      // אדמינים (לפי role של הפלטפורמה או לפי תפקיד מנהל מערכת) מקבלים הכל
      if (isEffectiveAdmin) return true;

      // בדיקת הרשאות מותאמות אישית (עוקפות את התפקיד)
      if (userPermissions?.custom_permissions?.[category]?.[permission] !== undefined) {
        return userPermissions.custom_permissions[category][permission];
      }

      // בדיקת הרשאות מהתפקיד (מה-Role entity) - this is the primary source of truth
      if (userPermissions?.roleData?.permissions?.[category]?.[permission] !== undefined) {
        return userPermissions.roleData.permissions[category][permission];
      }

      // Fallback: use roleData.name if available, otherwise use effectiveRoleName
      const roleName = userPermissions?.roleData?.name || effectiveRoleName;
      
      if (roleName === 'manager') {
        return DEFAULT_OPERATOR_PERMISSIONS[category]?.[permission] ?? false;
      }
      if (roleName === 'agent') {
        return DEFAULT_AGENT_PERMISSIONS[category]?.[permission] ?? false;
      }
      if (roleName === 'vendor') {
        return false;
      }
      if (roleName === 'operator') {
        return DEFAULT_OPERATOR_PERMISSIONS[category]?.[permission] ?? false;
      }
      
      // If platform role is 'user' but we have userPermissions, allow basic access
      // This handles the case where role_name is a Hebrew display name that doesn't match
      if (roleName === 'user' && userPermissions) {
        // User has a UserPermission record but role couldn't be matched - grant agent-level defaults
        return DEFAULT_AGENT_PERMISSIONS[category]?.[permission] ?? false;
      }
      
      // ברירת מחדל - אין גישה
      return false;
    },
    [isEffectiveAdmin, effectiveRoleName, userPermissions]
  );

  // בדיקת גישה לדף
  const canAccessPage = useCallback(
    (pageName) => {
      if (isEffectiveAdmin) return true;

      // בדיקת דפים מוגבלים למשתמש ספציפי
      if (userPermissions?.restricted_pages?.includes(pageName)) {
        return false;
      }

      const pageConfig = PAGE_GRANULAR_PERMISSIONS[pageName];
      if (!pageConfig) return true; // דפים ללא הגדרה - מותרים לכולם

      const result = hasPermission(pageConfig.category, pageConfig.permission);
      if (pageName === 'Dashboard' || !result) {
        console.log('[Permissions] canAccessPage:', pageName, '→', result, 'config:', pageConfig, 'effectiveRole:', effectiveRoleName);
      }
      return result;
    },
    [currentUser, userPermissions, hasPermission, isEffectiveAdmin, effectiveRoleName]
  );

  // בדיקת גישה לדוח
  const canAccessReport = useCallback(
    (reportType) => {
      if (isEffectiveAdmin) return true;

      if (userPermissions?.allowed_reports?.length > 0) {
        return userPermissions.allowed_reports.includes(reportType);
      }

      return hasPermission('reports', reportType);
    },
    [currentUser, userPermissions, hasPermission]
  );

  // בדיקת הרשאות מרובות בבת אחת
  const hasAnyPermission = useCallback(
    (permissions) => {
      return permissions.some(({ category, permission }) => hasPermission(category, permission));
    },
    [hasPermission]
  );

  // בדיקת כל ההרשאות
  const hasAllPermissions = useCallback(
    (permissions) => {
      return permissions.every(({ category, permission }) => hasPermission(category, permission));
    },
    [hasPermission]
  );

  const value = {
    currentUser,
    userPermissions,
    hasPermission,
    canAccessPage,
    canAccessReport,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: isEffectiveAdmin,
    effectiveRoleName,
    isLoading,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
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
      isLoading: true,
    };
  }
  return context;
}

// ייצוא קבועים לשימוש במקומות אחרים
export { PAGE_GRANULAR_PERMISSIONS, DEFAULT_OPERATOR_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS };