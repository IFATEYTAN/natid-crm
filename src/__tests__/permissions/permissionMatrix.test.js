import { describe, it, expect } from 'vitest';
import { PAGE_PERMISSIONS, VALID_ROLES } from '@/config/permissions';
import {
  PAGE_GRANULAR_PERMISSIONS,
  DEFAULT_OPERATOR_PERMISSIONS,
  DEFAULT_AGENT_PERMISSIONS,
} from '@/components/permissions/PermissionsContext';

/**
 * Replicate the hasPermission and canAccessPage logic from PermissionsContext
 * to test the full permission matrix for each role WITHOUT requiring React rendering.
 */

function createHasPermission(effectiveRole, userPermissions = null) {
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

function createCanAccessPage(effectiveRole, userPermissions = null) {
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

// ─── Admin Tests ───────────────────────────────────────────

describe('Admin role - full access', () => {
  const canAccessPage = createCanAccessPage('admin');
  const hasPermission = createHasPermission('admin');

  it('can access ALL defined pages', () => {
    const allPages = Object.keys(PAGE_PERMISSIONS);
    for (const page of allPages) {
      expect(canAccessPage(page)).toBe(true);
    }
  });

  it('can access all granular pages', () => {
    const allPages = Object.keys(PAGE_GRANULAR_PERMISSIONS);
    for (const page of allPages) {
      expect(canAccessPage(page)).toBe(true);
    }
  });

  it('has all permissions in every category', () => {
    const categories = Object.keys(DEFAULT_OPERATOR_PERMISSIONS);
    for (const cat of categories) {
      const perms = Object.keys(DEFAULT_OPERATOR_PERMISSIONS[cat]);
      for (const perm of perms) {
        expect(hasPermission(cat, perm)).toBe(true);
      }
    }
  });

  it('has financial report access', () => {
    expect(hasPermission('reports', 'financial')).toBe(true);
  });

  it('has user management access', () => {
    expect(hasPermission('system', 'users')).toBe(true);
    expect(hasPermission('system', 'roles')).toBe(true);
  });
});

// ─── Operator Tests ────────────────────────────────────────

describe('Operator role - operational access', () => {
  const canAccessPage = createCanAccessPage('operator');
  const hasPermission = createHasPermission('operator');

  // Pages the operator SHOULD access
  const operatorPages = [
    'Dashboard',
    'Calls',
    'CallDetails',
    'NewCase',
    'Calendar',
    'MyQueue',
    'Customers',
    'CustomerDetails',
    'CustomerFeedback',
    'FeedbackManagement',
    'ServiceProviders',
    'VendorDetails',
    'NewVendor',
    'EditVendor',
    'VendorContracts',
    'VendorTracking',
    'AllVendorsMap',
    'CoverageAreas',
    'QueueMonitor',
    'Reports',
    'HistoricalDataAnalysis',
    'AdvancedExport',
    'NotificationSettings',
    'Agents',
  ];

  it.each(operatorPages)('can access "%s"', (page) => {
    expect(canAccessPage(page)).toBe(true);
  });

  // Pages the operator should NOT access
  const operatorBlockedPages = [
    'Settings',
    'UserManagement',
    'RoleManagement',
    'Invoices',
    'AuditLog',
    'VendorPricing',
    'FleetManagement',
    'AutomationSettings',
    'IntegrationSettings',
    'ImportHistoricalData',
    'AdminDisplaySettings',
    'OperationalRates',
  ];

  it.each(operatorBlockedPages)('cannot access admin page "%s"', (page) => {
    expect(canAccessPage(page)).toBe(false);
  });

  // Vendor-only pages should be blocked
  const vendorOnlyPages = ['MyVendorProfile', 'VendorCallManagement', 'VendorGuide'];

  it.each(vendorOnlyPages)('cannot access vendor page "%s"', (page) => {
    expect(canAccessPage(page)).toBe(false);
  });

  // VendorPortal is shared with operator for tracking continuity
  it('CAN access VendorPortal (tracking visibility)', () => {
    expect(canAccessPage('VendorPortal')).toBe(true);
  });

  // All-roles pages
  it.each(['FormView', 'LandingPage', 'MyNotificationSettings', 'UserGuide', 'UserProfile'])(
    'can access all-roles page "%s"',
    (page) => {
      expect(canAccessPage(page)).toBe(true);
    }
  );

  // Granular permissions
  it('can view, create, edit, assign calls', () => {
    expect(hasPermission('calls', 'view')).toBe(true);
    expect(hasPermission('calls', 'create')).toBe(true);
    expect(hasPermission('calls', 'edit')).toBe(true);
    expect(hasPermission('calls', 'assign')).toBe(true);
  });

  it('cannot delete calls', () => {
    expect(hasPermission('calls', 'delete')).toBe(false);
  });

  it('can view, create, edit vendors', () => {
    expect(hasPermission('vendors', 'view')).toBe(true);
    expect(hasPermission('vendors', 'create')).toBe(true);
    expect(hasPermission('vendors', 'edit')).toBe(true);
    expect(hasPermission('vendors', 'manage_contracts')).toBe(true);
  });

  it('cannot delete vendors', () => {
    expect(hasPermission('vendors', 'delete')).toBe(false);
  });

  it('can view, create, edit customers', () => {
    expect(hasPermission('customers', 'view')).toBe(true);
    expect(hasPermission('customers', 'create')).toBe(true);
    expect(hasPermission('customers', 'edit')).toBe(true);
  });

  it('cannot delete customers', () => {
    expect(hasPermission('customers', 'delete')).toBe(false);
  });

  it('can view reports and export but NOT financial', () => {
    expect(hasPermission('reports', 'view')).toBe(true);
    expect(hasPermission('reports', 'export')).toBe(true);
    expect(hasPermission('reports', 'performance')).toBe(true);
    expect(hasPermission('reports', 'historical')).toBe(true);
    expect(hasPermission('reports', 'financial')).toBe(false);
  });

  it('can access monitoring features', () => {
    expect(hasPermission('monitoring', 'live_map')).toBe(true);
    expect(hasPermission('monitoring', 'tracking')).toBe(true);
    expect(hasPermission('monitoring', 'queue')).toBe(true);
  });

  it('cannot manage users, roles, integrations, or audit log', () => {
    expect(hasPermission('system', 'users')).toBe(false);
    expect(hasPermission('system', 'roles')).toBe(false);
    expect(hasPermission('system', 'integrations')).toBe(false);
    expect(hasPermission('system', 'audit_log')).toBe(false);
  });

  it('can access settings and automations', () => {
    expect(hasPermission('system', 'settings')).toBe(true);
    expect(hasPermission('system', 'automations')).toBe(true);
  });
});

// ─── Vendor Tests ──────────────────────────────────────────

describe('Vendor role - restricted to vendor portal', () => {
  const canAccessPage = createCanAccessPage('vendor');
  const hasPermission = createHasPermission('vendor');

  // Vendor should access their own pages
  const vendorAccessiblePages = [
    'MyVendorProfile',
    'VendorCallManagement',
    'VendorGuide',
    'VendorPortal',
    'FormView',
    'LandingPage',
    'MyNotificationSettings',
    'UserGuide',
    'UserProfile',
  ];

  it.each(vendorAccessiblePages)('can access "%s"', (page) => {
    expect(canAccessPage(page)).toBe(true);
  });

  // Vendor should NOT access admin or operator pages
  const vendorBlockedPages = [
    'Dashboard',
    'Calls',
    'CallDetails',
    'NewCase',
    'Customers',
    'CustomerDetails',
    'Reports',
    'Settings',
    'UserManagement',
    'Invoices',
    'AuditLog',
    'ServiceProviders',
    'QueueMonitor',
    'Calendar',
    'MyQueue',
  ];

  it.each(vendorBlockedPages)('cannot access "%s"', (page) => {
    expect(canAccessPage(page)).toBe(false);
  });

  // Vendor has no granular permissions by default
  it('has no call permissions', () => {
    expect(hasPermission('calls', 'view')).toBe(false);
    expect(hasPermission('calls', 'create')).toBe(false);
    expect(hasPermission('calls', 'edit')).toBe(false);
    expect(hasPermission('calls', 'delete')).toBe(false);
    expect(hasPermission('calls', 'assign')).toBe(false);
  });

  it('has no vendor management permissions', () => {
    expect(hasPermission('vendors', 'view')).toBe(false);
    expect(hasPermission('vendors', 'create')).toBe(false);
    expect(hasPermission('vendors', 'edit')).toBe(false);
  });

  it('has no customer permissions', () => {
    expect(hasPermission('customers', 'view')).toBe(false);
  });

  it('has no report permissions', () => {
    expect(hasPermission('reports', 'view')).toBe(false);
    expect(hasPermission('reports', 'financial')).toBe(false);
  });

  it('has no system permissions', () => {
    expect(hasPermission('system', 'users')).toBe(false);
    expect(hasPermission('system', 'settings')).toBe(false);
  });

  it('has no monitoring permissions', () => {
    expect(hasPermission('monitoring', 'live_map')).toBe(false);
    expect(hasPermission('monitoring', 'tracking')).toBe(false);
    expect(hasPermission('monitoring', 'queue')).toBe(false);
  });
});

// ─── Agent Tests ───────────────────────────────────────────

describe('Agent role - minimal access', () => {
  const canAccessPage = createCanAccessPage('agent');
  const hasPermission = createHasPermission('agent');

  // Agent can access all-roles pages
  const agentAccessiblePages = [
    'FormView',
    'LandingPage',
    'MyNotificationSettings',
    'UserGuide',
    'UserProfile',
  ];

  it.each(agentAccessiblePages)('can access "%s"', (page) => {
    expect(canAccessPage(page)).toBe(true);
  });

  // Agent cannot access admin or operator pages
  const agentBlockedPages = [
    'Dashboard',
    'Calls',
    'CallDetails',
    'NewCase',
    'Customers',
    'Reports',
    'Settings',
    'UserManagement',
    'Invoices',
    'ServiceProviders',
    'QueueMonitor',
  ];

  it.each(agentBlockedPages)('cannot access "%s"', (page) => {
    expect(canAccessPage(page)).toBe(false);
  });

  // Agent cannot access vendor pages
  const vendorPages = ['MyVendorProfile', 'VendorCallManagement', 'VendorGuide', 'VendorPortal'];

  it.each(vendorPages)('cannot access vendor page "%s"', (page) => {
    expect(canAccessPage(page)).toBe(false);
  });

  // Agent can view calls but nothing else
  it('can view calls only', () => {
    expect(hasPermission('calls', 'view')).toBe(true);
    expect(hasPermission('calls', 'create')).toBe(false);
    expect(hasPermission('calls', 'edit')).toBe(false);
    expect(hasPermission('calls', 'delete')).toBe(false);
    expect(hasPermission('calls', 'assign')).toBe(false);
  });

  it('has no vendor permissions', () => {
    expect(hasPermission('vendors', 'view')).toBe(false);
  });

  it('has no customer permissions', () => {
    expect(hasPermission('customers', 'view')).toBe(false);
  });

  it('has no report permissions', () => {
    expect(hasPermission('reports', 'view')).toBe(false);
    expect(hasPermission('reports', 'export')).toBe(false);
    expect(hasPermission('reports', 'financial')).toBe(false);
  });

  it('has no system permissions', () => {
    expect(hasPermission('system', 'users')).toBe(false);
    expect(hasPermission('system', 'roles')).toBe(false);
    expect(hasPermission('system', 'settings')).toBe(false);
    expect(hasPermission('system', 'automations')).toBe(false);
  });

  it('has no monitoring permissions', () => {
    expect(hasPermission('monitoring', 'live_map')).toBe(false);
    expect(hasPermission('monitoring', 'tracking')).toBe(false);
    expect(hasPermission('monitoring', 'queue')).toBe(false);
  });
});

// ─── Custom Permissions Override Tests ─────────────────────

describe('Custom permissions override', () => {
  it('custom_permissions override default operator permissions', () => {
    const hasPermission = createHasPermission('operator', {
      custom_permissions: {
        calls: { delete: true },
        reports: { financial: true },
      },
    });

    expect(hasPermission('calls', 'delete')).toBe(true);
    expect(hasPermission('reports', 'financial')).toBe(true);
    // Non-overridden permissions still use defaults
    expect(hasPermission('calls', 'view')).toBe(true);
    expect(hasPermission('system', 'users')).toBe(false);
  });

  it('custom_permissions can restrict operator permissions', () => {
    const hasPermission = createHasPermission('operator', {
      custom_permissions: {
        calls: { create: false },
        monitoring: { queue: false },
      },
    });

    expect(hasPermission('calls', 'create')).toBe(false);
    expect(hasPermission('monitoring', 'queue')).toBe(false);
    // Other permissions unchanged
    expect(hasPermission('calls', 'view')).toBe(true);
  });

  it('roleData.permissions override defaults', () => {
    const hasPermission = createHasPermission('agent', {
      roleData: {
        permissions: {
          calls: { create: true, edit: true },
          customers: { view: true },
        },
      },
    });

    expect(hasPermission('calls', 'create')).toBe(true);
    expect(hasPermission('calls', 'edit')).toBe(true);
    expect(hasPermission('customers', 'view')).toBe(true);
    // Non-overridden still use agent defaults
    expect(hasPermission('calls', 'delete')).toBe(false);
    expect(hasPermission('vendors', 'view')).toBe(false);
  });

  it('custom_permissions take priority over roleData.permissions', () => {
    const hasPermission = createHasPermission('operator', {
      custom_permissions: {
        calls: { delete: true },
      },
      roleData: {
        permissions: {
          calls: { delete: false },
        },
      },
    });

    // custom_permissions wins
    expect(hasPermission('calls', 'delete')).toBe(true);
  });
});

// ─── Restricted Pages Tests ────────────────────────────────

describe('Restricted pages per user', () => {
  it('restricted_pages blocks access even for allowed role', () => {
    const canAccessPage = createCanAccessPage('operator', {
      restricted_pages: ['Dashboard', 'Reports'],
    });

    expect(canAccessPage('Dashboard')).toBe(false);
    expect(canAccessPage('Reports')).toBe(false);
    // Other pages still accessible
    expect(canAccessPage('Calls')).toBe(true);
    expect(canAccessPage('Customers')).toBe(true);
  });

  it('restricted_pages does not affect admin', () => {
    const canAccessPage = createCanAccessPage('admin', {
      restricted_pages: ['Dashboard', 'Reports'],
    });

    expect(canAccessPage('Dashboard')).toBe(true);
    expect(canAccessPage('Reports')).toBe(true);
  });
});

// ─── Cross-role isolation tests ────────────────────────────

describe('Cross-role isolation', () => {
  it('vendor cannot see operator pages even if trying to access them', () => {
    const canAccessPage = createCanAccessPage('vendor');
    const operatorPages = Object.entries(PAGE_PERMISSIONS)
      .filter(([, roles]) => roles.includes('operator') && !roles.includes('vendor'))
      .map(([page]) => page);

    for (const page of operatorPages) {
      expect(canAccessPage(page)).toBe(false);
    }
  });

  it('agent cannot see operator or vendor pages', () => {
    const canAccessPage = createCanAccessPage('agent');
    const nonAgentPages = Object.entries(PAGE_PERMISSIONS)
      .filter(([, roles]) => !roles.includes('agent'))
      .map(([page]) => page);

    for (const page of nonAgentPages) {
      expect(canAccessPage(page)).toBe(false);
    }
  });

  it('operator cannot see vendor-only pages', () => {
    const canAccessPage = createCanAccessPage('operator');
    const vendorOnlyPages = Object.entries(PAGE_PERMISSIONS)
      .filter(([, roles]) => roles.includes('vendor') && !roles.includes('operator'))
      .map(([page]) => page);

    for (const page of vendorOnlyPages) {
      expect(canAccessPage(page)).toBe(false);
    }
  });
});

// ─── Granular page permission consistency ──────────────────

describe('PAGE_GRANULAR_PERMISSIONS consistency', () => {
  it('all granular pages should reference valid permission categories', () => {
    const validCategories = Object.keys(DEFAULT_OPERATOR_PERMISSIONS);
    for (const [page, config] of Object.entries(PAGE_GRANULAR_PERMISSIONS)) {
      expect(validCategories).toContain(config.category);
    }
  });

  it('all granular pages should reference valid permissions within their category', () => {
    for (const [page, config] of Object.entries(PAGE_GRANULAR_PERMISSIONS)) {
      const categoryPerms = Object.keys(
        DEFAULT_OPERATOR_PERMISSIONS[config.category] ||
          DEFAULT_AGENT_PERMISSIONS[config.category] ||
          {}
      );
      expect(categoryPerms).toContain(config.permission);
    }
  });

  it('pages in both PAGE_PERMISSIONS and PAGE_GRANULAR_PERMISSIONS have dual protection', () => {
    const dualProtected = Object.keys(PAGE_GRANULAR_PERMISSIONS).filter(
      (page) => PAGE_PERMISSIONS[page]
    );
    // These pages have both role-based AND granular checks
    expect(dualProtected.length).toBeGreaterThan(0);

    // Verify they work correctly for operator
    const canAccessPage = createCanAccessPage('operator');
    for (const page of dualProtected) {
      const roles = PAGE_PERMISSIONS[page];
      const config = PAGE_GRANULAR_PERMISSIONS[page];
      const hasRole = roles.includes('operator');
      const hasGranular =
        DEFAULT_OPERATOR_PERMISSIONS[config.category]?.[config.permission] ?? false;

      // Operator access should be role AND granular combined
      if (hasRole && hasGranular) {
        expect(canAccessPage(page)).toBe(true);
      } else {
        expect(canAccessPage(page)).toBe(false);
      }
    }
  });
});
