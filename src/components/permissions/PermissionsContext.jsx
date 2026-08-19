import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { PAGE_PERMISSIONS } from '@/components/config/permissions';

const PermissionsContext = createContext(null);

// הגדרות הרשאות ברירת מחדל למוקדן
// חייב להתאים ל-PAGE_PERMISSIONS ב-src/config/permissions.js
const DEFAULT_OPERATOR_PERMISSIONS = {
  calls: {
    view: true,
    create: true,
    edit: true,
    delete: false,
    assign: true,
    update_status: false,
  },
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
  calls: {
    view: true,
    create: false,
    edit: false,
    delete: false,
    assign: false,
    update_status: false,
  },
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
  DepartmentView: { category: 'calls', permission: 'view' },
  PrivateService: { category: 'calls', permission: 'view' },
  SpecialCaseForm: { category: 'calls', permission: 'create' },

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
  // Role is now single-source-of-truth: users.role in the Nati DB, verified
  // fresh by srv on every request and carried on the session user object.
  // No more Base44 UserPermission/Role lookup, no platform-role mapping —
  // the value here already is the app role (admin/operator/agent/vendor).
  const { user: currentUser, isLoadingAuth: isLoading, refreshUser } = useAuth();
  const effectiveRole = currentUser?.role ?? null;

  const hasPermission = useCallback(
    (category, permission) => {
      if (effectiveRole === 'admin') return true;
      if (effectiveRole === 'agent') {
        return DEFAULT_AGENT_PERMISSIONS[category]?.[permission] ?? false;
      }
      if (effectiveRole === 'vendor') {
        return false;
      }
      // מוקדן - ברירת מחדל
      return DEFAULT_OPERATOR_PERMISSIONS[category]?.[permission] ?? false;
    },
    [effectiveRole]
  );

  // בדיקת גישה לדף - שילוב בדיקת תפקיד (PAGE_PERMISSIONS) + הרשאות גרנולריות
  const canAccessPage = useCallback(
    (pageName) => {
      if (effectiveRole === 'admin') return true;

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
    [effectiveRole, hasPermission]
  );

  // בדיקת גישה לדוח
  const canAccessReport = useCallback(
    (reportType) => {
      if (effectiveRole === 'admin') return true;
      return hasPermission('reports', reportType);
    },
    [effectiveRole, hasPermission]
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
    effectiveRole,
    hasPermission,
    canAccessPage,
    canAccessReport,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: effectiveRole === 'admin',
    isLoading,
    refreshCurrentUser: refreshUser,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    // אם לא בתוך provider, מחזירים ערכי ברירת מחדל
    return {
      currentUser: null,
      effectiveRole: null,
      hasPermission: () => false,
      canAccessPage: () => true,
      canAccessReport: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      isAdmin: false,
      isLoading: true,
      refreshCurrentUser: () => {},
    };
  }
  return context;
}

// ייצוא קבועים לשימוש במקומות אחרים
export { PAGE_GRANULAR_PERMISSIONS, DEFAULT_OPERATOR_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS };
