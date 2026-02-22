import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { PAGE_PERMISSIONS } from '@/config/permissions';

const PermissionsContext = createContext(null);

// מיפוי שמות תפקידים (עברית/אנגלית) לתפקידי אפליקציה
const APP_ROLE_MAP = {
  // אנגלית (מ-Role.name או מ-Base44 platform)
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  // עברית (מ-UserPermission.role_name או מ-Role.display_name)
  מנהל: 'admin',
  'מנהל מערכת': 'admin',
  מוקדן: 'operator',
  מתפעל: 'operator',
  'מנהל תפעול': 'operator',
  טכנאי: 'agent',
  'נציג שטח': 'agent',
  ספק: 'vendor',
  'ספק שירות': 'vendor',
};

/**
 * קובע את התפקיד האפקטיבי של המשתמש באפליקציה.
 * Base44 מחזיר role: "user" לרוב המשתמשים שאינם admin.
 * הפונקציה ממפה את ה-role של Base44 + UserPermission לתפקיד אפליקטיבי.
 */
function resolveEffectiveRole(platformRole, userPermission) {
  // admin ו-vendor מהפלטפורמה - מיפוי ישיר
  if (platformRole === 'admin') return 'admin';
  if (platformRole === 'vendor') return 'vendor';

  // בדיקת Role entity (name ואז display_name)
  if (userPermission?.roleData?.name) {
    const mapped = APP_ROLE_MAP[userPermission.roleData.name];
    if (mapped) return mapped;
  }
  if (userPermission?.roleData?.display_name) {
    const mapped = APP_ROLE_MAP[userPermission.roleData.display_name];
    if (mapped) return mapped;
  }

  // בדיקת role_name מ-UserPermission
  if (userPermission?.role_name) {
    const mapped = APP_ROLE_MAP[userPermission.role_name];
    if (mapped) return mapped;
  }

  // מיפוי ישיר של role מהפלטפורמה (אם Base44 מחזיר 'operator'/'agent')
  if (APP_ROLE_MAP[platformRole]) return APP_ROLE_MAP[platformRole];

  // ברירת מחדל: 'user' ותפקידים לא מוכרים → operator
  return 'operator';
}

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
  const [effectiveRole, setEffectiveRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // טעינת המשתמש הנוכחי, הרשאות, וקביעת תפקיד אפקטיבי
  useEffect(() => {
    const loadUserAndPermissions = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        let perm = null;
        if (user?.id) {
          // טעינה מקבילית של תפקידים והרשאות
          let allRoles = [];
          let permissions = [];

          const [rolesResult, permByIdResult] = await Promise.allSettled([
            base44.entities.Role.list(),
            base44.entities.UserPermission.filter({ user_id: user.id }),
          ]);

          if (rolesResult.status === 'fulfilled') allRoles = rolesResult.value;
          if (permByIdResult.status === 'fulfilled') permissions = permByIdResult.value;

          // חיפוש חלופי לפי email
          if (permissions.length === 0 && user.email) {
            try {
              permissions = await base44.entities.UserPermission.filter({
                user_email: user.email,
              });
            } catch (e) {
              // silently ignore
            }
          }

          if (permissions.length > 0) {
            perm = permissions[0];
            // חיפוש Role תואם - לפי role_id או לפי role_name
            let matchedRole = null;
            if (perm.role_id) {
              matchedRole = allRoles.find((r) => r.id === perm.role_id);
            }
            if (!matchedRole && perm.role_name) {
              matchedRole = allRoles.find(
                (r) => r.display_name === perm.role_name || r.name === perm.role_name
              );
            }
            if (matchedRole) {
              perm = { ...perm, roleData: matchedRole };
            }
          } else if (allRoles.length > 0 && user.role === 'user') {
            // אין UserPermission אבל המשתמש קיים - יצירת הרשאה סינתטית
            const defaultRole =
              allRoles.find((r) => r.name === 'agent') ||
              allRoles.find((r) => r.name === 'operator');
            if (defaultRole) {
              perm = {
                user_id: user.id,
                user_email: user.email,
                role_name: defaultRole.display_name,
                roleData: defaultRole,
              };
            }
          }
          setUserPermissions(perm);
        }

        // קביעת תפקיד אפקטיבי - גישור בין role של Base44 לתפקידי האפליקציה
        const resolved = resolveEffectiveRole(user?.role, perm);
        setEffectiveRole(resolved);
      } catch (e) {
        console.error('Failed to load user:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserAndPermissions();
  }, []);

  // בדיקת הרשאה - משתמש ב-effectiveRole במקום ב-currentUser.role
  const hasPermission = useCallback(
    (category, permission) => {
      if (effectiveRole === 'admin') return true;

      // בדיקת הרשאות מותאמות אישית (עוקפות את התפקיד)
      if (userPermissions?.custom_permissions?.[category]?.[permission] !== undefined) {
        return userPermissions.custom_permissions[category][permission];
      }

      // בדיקת הרשאות מהתפקיד (מה-Role entity)
      if (userPermissions?.roleData?.permissions?.[category]?.[permission] !== undefined) {
        return userPermissions.roleData.permissions[category][permission];
      }

      // ברירת מחדל לפי תפקיד אפקטיבי
      if (effectiveRole === 'agent') {
        return DEFAULT_AGENT_PERMISSIONS[category]?.[permission] ?? false;
      }
      if (effectiveRole === 'vendor') {
        return false;
      }
      // מוקדן - ברירת מחדל
      return DEFAULT_OPERATOR_PERMISSIONS[category]?.[permission] ?? false;
    },
    [effectiveRole, userPermissions]
  );

  // בדיקת גישה לדף - שילוב בדיקת תפקיד (PAGE_PERMISSIONS) + הרשאות גרנולריות
  const canAccessPage = useCallback(
    (pageName) => {
      if (effectiveRole === 'admin') return true;

      // בדיקת דפים מוגבלים למשתמש ספציפי
      if (userPermissions?.restricted_pages?.includes(pageName)) {
        return false;
      }

      // שלב 1: בדיקת תפקיד - האם התפקיד האפקטיבי מורשה לדף הזה?
      const allowedRoles = PAGE_PERMISSIONS[pageName];
      if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
        return false;
      }

      // שלב 2: בדיקת הרשאות גרנולריות (אם מוגדרות לדף)
      const pageConfig = PAGE_GRANULAR_PERMISSIONS[pageName];
      if (!pageConfig) return !!allowedRoles; // דפים ללא הגדרה בשום מערכת - חסומים

      return hasPermission(pageConfig.category, pageConfig.permission);
    },
    [effectiveRole, userPermissions, hasPermission]
  );

  // בדיקת גישה לדוח
  const canAccessReport = useCallback(
    (reportType) => {
      if (effectiveRole === 'admin') return true;

      if (userPermissions?.allowed_reports?.length > 0) {
        return userPermissions.allowed_reports.includes(reportType);
      }

      return hasPermission('reports', reportType);
    },
    [effectiveRole, userPermissions, hasPermission]
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
    effectiveRole,
    hasPermission,
    canAccessPage,
    canAccessReport,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: effectiveRole === 'admin',
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
      effectiveRole: null,
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
