/**
 * Test helpers for rendering components with mocked permissions context.
 * Simulates each user role (admin, operator, vendor, agent) without
 * needing a real Base44 backend.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PAGE_PERMISSIONS } from '@/config/permissions';
import {
  PAGE_GRANULAR_PERMISSIONS,
  DEFAULT_OPERATOR_PERMISSIONS,
  DEFAULT_AGENT_PERMISSIONS,
} from '@/components/permissions/PermissionsContext';

// ─── Pure logic helpers (match PermissionsContext exactly) ──

export function createHasPermission(effectiveRole, userPermissions = null) {
  return (category, permission) => {
    if (effectiveRole === 'admin') return true;

    if (userPermissions?.custom_permissions?.[category]?.[permission] !== undefined) {
      return userPermissions.custom_permissions[category][permission];
    }

    if (userPermissions?.roleData?.permissions?.[category]?.[permission] !== undefined) {
      return userPermissions.roleData.permissions[category][permission];
    }

    if (effectiveRole === 'agent') {
      return DEFAULT_AGENT_PERMISSIONS[category]?.[permission] ?? false;
    }
    if (effectiveRole === 'vendor') {
      return false;
    }
    return DEFAULT_OPERATOR_PERMISSIONS[category]?.[permission] ?? false;
  };
}

export function createCanAccessPage(effectiveRole, userPermissions = null) {
  const hasPermission = createHasPermission(effectiveRole, userPermissions);

  return (pageName) => {
    if (effectiveRole === 'admin') return true;

    if (userPermissions?.restricted_pages?.includes(pageName)) {
      return false;
    }

    const allowedRoles = PAGE_PERMISSIONS[pageName];
    if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
      return false;
    }

    const pageConfig = PAGE_GRANULAR_PERMISSIONS[pageName];
    if (!pageConfig) return !!allowedRoles;

    return hasPermission(pageConfig.category, pageConfig.permission);
  };
}

// ─── Mock user objects per role ────────────────────────────

export const MOCK_USERS = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@natid.co.il',
    name: 'מנהל מערכת',
    role: 'admin',
  },
  operator: {
    id: 'user-operator-001',
    email: 'operator@natid.co.il',
    name: 'ישראל כהן',
    role: 'user',
  },
  vendor: {
    id: 'user-vendor-001',
    email: 'vendor@natid.co.il',
    name: 'גרר הצפון',
    role: 'vendor',
  },
  agent: {
    id: 'user-agent-001',
    email: 'agent@natid.co.il',
    name: 'דוד לוי',
    role: 'user',
  },
};

// ─── Build full context value for a role ───────────────────

export function createPermissionsContextValue(role, overrides = {}) {
  const user = MOCK_USERS[role];
  const userPermissions = overrides.userPermissions || null;
  const hasPermission = createHasPermission(role, userPermissions);
  const canAccessPage = createCanAccessPage(role, userPermissions);

  return {
    currentUser: user,
    userPermissions,
    effectiveRole: role,
    isLoading: false,
    isAdmin: role === 'admin',
    hasPermission,
    canAccessPage,
    canAccessReport: (reportType) => {
      if (role === 'admin') return true;
      if (userPermissions?.allowed_reports?.length > 0) {
        return userPermissions.allowed_reports.includes(reportType);
      }
      return hasPermission('reports', reportType);
    },
    hasAnyPermission: (permissions) =>
      permissions.some(({ category, permission }) => hasPermission(category, permission)),
    hasAllPermissions: (permissions) =>
      permissions.every(({ category, permission }) => hasPermission(category, permission)),
    ...overrides,
  };
}

// ─── Mock PermissionsContext provider ──────────────────────

// We dynamically inject into React context using a wrapper
// that matches the shape of PermissionsContext.Provider
import { createContext, useContext } from 'react';

const MockPermissionsContext = createContext(null);

export function MockPermissionsProvider({ role, overrides = {}, children }) {
  const value = createPermissionsContextValue(role, overrides);
  return (
    <MockPermissionsContext.Provider value={value}>{children}</MockPermissionsContext.Provider>
  );
}

/**
 * Render a component wrapped in a mock permissions context + MemoryRouter.
 * @param {React.ReactElement} ui - Component to render
 * @param {string} role - The effective role: 'admin' | 'operator' | 'vendor' | 'agent'
 * @param {object} options - Additional options
 * @param {string} options.route - Initial route (default '/')
 * @param {object} options.permissionOverrides - Overrides for permissions context
 */
export function renderWithRole(ui, role, options = {}) {
  const { route = '/', permissionOverrides = {} } = options;

  return render(
    <MemoryRouter initialEntries={[route]}>
      <MockPermissionsProvider role={role} overrides={permissionOverrides}>
        {ui}
      </MockPermissionsProvider>
    </MemoryRouter>
  );
}

// ─── Navigation items (same as Layout.jsx) ─────────────────

export const NAVIGATION_GROUPS = [
  {
    title: 'תפעול יומי',
    items: [
      { name: 'מסך הבית', href: 'LandingPage' },
      { name: 'לוח בקרה', href: 'Dashboard' },
      { name: 'רשימת קריאות', href: 'Calls' },
      { name: 'לוח שנה', href: 'Calendar' },
      { name: 'ניטור תורים', href: 'QueueMonitor' },
    ],
  },
  {
    title: 'ניהול ספקים',
    items: [
      { name: 'נותני שירות', href: 'ServiceProviders' },
      { name: 'הסכמי תמחור', href: 'VendorPricing' },
      { name: 'חוזי ספקים', href: 'VendorContracts' },
      { name: 'מפת ספקים', href: 'AllVendorsMap' },
      { name: 'אזורי כיסוי', href: 'CoverageAreas' },
      { name: 'פורטל ספקים', href: 'VendorPortal' },
    ],
  },
  {
    title: 'צי רכב',
    items: [{ name: 'ניהול צי רכב', href: 'FleetManagement' }],
  },
  {
    title: 'כלכלה ותשלומים',
    items: [
      { name: 'תעריפון תפעול', href: 'OperationalRates' },
      { name: 'חשבוניות', href: 'Invoices' },
      { name: 'קטלוג מוצרים', href: 'ProductCatalog' },
      { name: 'תזכורות', href: 'Reminders' },
    ],
  },
  {
    title: 'ניהול ונתונים',
    items: [
      { name: 'דוחות', href: 'Reports' },
      { name: 'ניתוח נתונים היסטוריים', href: 'HistoricalDataAnalysis' },
      { name: 'ייצוא מתקדם', href: 'AdvancedExport' },
      { name: 'לקוחות', href: 'Customers' },
      { name: 'משובי לקוחות', href: 'FeedbackManagement' },
      { name: 'הפרופיל שלי', href: 'UserProfile' },
    ],
  },
  {
    title: 'כלים',
    items: [{ name: 'סוכנים', href: 'Agents' }],
  },
  {
    title: 'מערכת',
    items: [
      { name: 'ניהול משתמשים', href: 'UserManagement' },
      { name: 'ניהול תפקידים', href: 'RoleManagement' },
      { name: 'יומן פעולות', href: 'AuditLog' },
      { name: 'אוטומציה', href: 'AutomationSettings' },
      { name: 'אינטגרציות CRM', href: 'IntegrationSettings' },
      { name: 'הגדרות התראות', href: 'NotificationSettings' },
      { name: 'הגדרות תצוגה', href: 'AdminDisplaySettings' },
      { name: 'הגדרות מערכת', href: 'Settings' },
    ],
  },
];

/** Get all nav item names that a role should see in the sidebar */
export function getExpectedNavItems(role) {
  const canAccessPage = createCanAccessPage(role);
  const items = [];
  for (const group of NAVIGATION_GROUPS) {
    for (const item of group.items) {
      if (canAccessPage(item.href)) {
        items.push(item.name);
      }
    }
  }
  return items;
}

/** Get all nav item names that a role should NOT see */
export function getBlockedNavItems(role) {
  const canAccessPage = createCanAccessPage(role);
  const items = [];
  for (const group of NAVIGATION_GROUPS) {
    for (const item of group.items) {
      if (!canAccessPage(item.href)) {
        items.push(item.name);
      }
    }
  }
  return items;
}
