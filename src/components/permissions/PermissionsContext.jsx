import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { PAGE_PERMISSIONS } from '@/config/permissions';

const PermissionsContext = createContext(null);

// הגדרות הרשאות ברירת מחדל למוקדן
// חייב להתאים ל-PAGE_PERMISSIONS ב-src/config/permissions.js
const DEFAULT_OPERATOR_PERMISSIONS = {
  calls: { view: true, create: true, edit: true, delete: false, assign: true },
  vendors: { view: true, create: true, edit: true, delete: false, manage_contracts: true },
  customers: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, export: true, financial: false, performance: true, historical: true },
  system: {
    users: false,
    roles: false,
    settings: true,
    automations: true,
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
// שלב 2 בבדיקת canAccessPage - אחרי בדיקת תפקיד מ-PAGE_PERMISSIONS
// דפים ללא מיפוי כאן נשלטים רק ע"י בדיקת תפקיד (role-based)
const PAGE_GRANULAR_PERMISSIONS = {
  // קריאות
  Dashboard: { category: 'monitoring', permission: 'queue' },
  NewCase: { category: 'calls', permission: 'create' },
  CallDetails: { category: 'calls', permission: 'view' },
  Calls: { category: 'calls', permission: 'view' },
  Calendar: { category: 'calls', permission: 'view' },
  MyQueue: { category: 'monitoring', permission: 'queue' },

  // לקוחות
  Customers: { category: 'customers', permission: 'view' },
  CustomerDetails: { category: 'customers', permission: 'view' },
  CustomerFeedback: { category: 'customers', permission: 'view' },
  FeedbackManagement: { category: 'customers', permission: 'view' },

  // ספקים
  ServiceProviders: { category: 'vendors', permission: 'view' },
  VendorDetails: { category: 'vendors', permission: 'view' },
  NewVendor: { category: 'vendors', permission: 'create' },
  EditVendor: { category: 'vendors', permission: 'edit' },
  VendorContracts: { category: 'vendors', permission: 'manage_contracts' },
  VendorPricing: { category: 'vendors', permission: 'manage_contracts' },

  // ניטור
  AllVendorsMap: { category: 'monitoring', permission: 'live_map' },
  CoverageAreas: { category: 'monitoring', permission: 'live_map' },
  VendorTracking: { category: 'monitoring', permission: 'tracking' },
  QueueMonitor: { category: 'monitoring', permission: 'queue' },

  // דוחות
  Reports: { category: 'reports', permission: 'view' },
  HistoricalDataAnalysis: { category: 'reports', permission: 'historical' },
  AdvancedExport: { category: 'reports', permission: 'export' },
  Invoices: { category: 'reports', permission: 'financial' },

  // מערכת
  UserManagement: { category: 'system', permission: 'users' },
  RoleManagement: { category: 'system', permission: 'roles' },
  Settings: { category: 'system', permission: 'settings' },
  AdminDisplaySettings: { category: 'system', permission: 'settings' },
  AutomationSettings: { category: 'system', permission: 'automations' },
  IntegrationSettings: { category: 'system', permission: 'integrations' },
  AuditLog: { category: 'system', permission: 'audit_log' },
  NotificationSettings: { category: 'system', permission: 'settings' },
  ImportHistoricalData: { category: 'system', permission: 'settings' },
  Agents: { category: 'system', permission: 'automations' },
  FleetManagement: { category: 'system', permission: 'settings' },
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
          // חיפוש לפי user_id או לפי user_email
          let permissions = await base44.entities.UserPermission.filter({ user_id: user.id });
          if (permissions.length === 0 && user.email) {
            permissions = await base44.entities.UserPermission.filter({ user_email: user.email });
          }
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
  const hasPermission = useCallback(
    (category, permission) => {
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

      // ברירת מחדל לפי תפקיד
      if (currentUser?.role === 'agent') {
        return DEFAULT_AGENT_PERMISSIONS[category]?.[permission] ?? false;
      }
      if (currentUser?.role === 'vendor') {
        // ספקים - אין הרשאות ברירת מחדל (הכל דרך דפי vendor)
        return false;
      }
      // מוקדן - ברירת מחדל
      return DEFAULT_OPERATOR_PERMISSIONS[category]?.[permission] ?? false;
    },
    [currentUser, userPermissions]
  );

  // בדיקת גישה לדף - שילוב בדיקת תפקיד (PAGE_PERMISSIONS) + הרשאות גרנולריות
  const canAccessPage = useCallback(
    (pageName) => {
      if (currentUser?.role === 'admin') return true;

      // בדיקת דפים מוגבלים למשתמש ספציפי
      if (userPermissions?.restricted_pages?.includes(pageName)) {
        return false;
      }

      // שלב 1: בדיקת תפקיד - האם התפקיד מורשה לדף הזה?
      const allowedRoles = PAGE_PERMISSIONS[pageName];
      if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
        return false;
      }

      // שלב 2: בדיקת הרשאות גרנולריות (אם מוגדרות לדף)
      const pageConfig = PAGE_GRANULAR_PERMISSIONS[pageName];
      if (!pageConfig) return !!allowedRoles; // דפים ללא הגדרה בשום מערכת - חסומים

      return hasPermission(pageConfig.category, pageConfig.permission);
    },
    [currentUser, userPermissions, hasPermission]
  );

  // בדיקת גישה לדוח
  const canAccessReport = useCallback(
    (reportType) => {
      if (currentUser?.role === 'admin') return true;

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
    isAdmin: currentUser?.role === 'admin',
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
