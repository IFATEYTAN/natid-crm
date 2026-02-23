import { describe, it, expect } from 'vitest';
import {
  createPermissionsContextValue,
  createCanAccessPage,
  createHasPermission,
  MOCK_USERS,
} from './testHelpers.jsx';

/**
 * End-to-end user scenario tests.
 * Simulates realistic user flows for each role:
 * - What pages they see on login
 * - What actions they can perform
 * - What they are blocked from
 * - Edge cases (custom overrides, restricted pages)
 */

// ─── Scenario 1: Admin (מנהל מערכת) ───────────────────────

describe('Scenario: Admin logs in and manages the system', () => {
  const ctx = createPermissionsContextValue('admin');

  it('admin identity is correct', () => {
    expect(ctx.currentUser.email).toBe('admin@natid.co.il');
    expect(ctx.effectiveRole).toBe('admin');
    expect(ctx.isAdmin).toBe(true);
  });

  it('admin sees Dashboard as landing page', () => {
    expect(ctx.canAccessPage('Dashboard')).toBe(true);
  });

  it('admin can navigate to call management', () => {
    expect(ctx.canAccessPage('Calls')).toBe(true);
    expect(ctx.canAccessPage('CallDetails')).toBe(true);
    expect(ctx.canAccessPage('NewCase')).toBe(true);
    expect(ctx.canAccessPage('Calendar')).toBe(true);
  });

  it('admin can manage all call actions', () => {
    expect(ctx.hasPermission('calls', 'view')).toBe(true);
    expect(ctx.hasPermission('calls', 'create')).toBe(true);
    expect(ctx.hasPermission('calls', 'edit')).toBe(true);
    expect(ctx.hasPermission('calls', 'delete')).toBe(true);
    expect(ctx.hasPermission('calls', 'assign')).toBe(true);
  });

  it('admin can view financial reports', () => {
    expect(ctx.canAccessPage('Invoices')).toBe(true);
    expect(ctx.hasPermission('reports', 'financial')).toBe(true);
    expect(ctx.canAccessReport('invoices_report')).toBe(true);
    expect(ctx.canAccessReport('financial_summary')).toBe(true);
  });

  it('admin can manage users and roles', () => {
    expect(ctx.canAccessPage('UserManagement')).toBe(true);
    expect(ctx.canAccessPage('RoleManagement')).toBe(true);
    expect(ctx.hasPermission('system', 'users')).toBe(true);
    expect(ctx.hasPermission('system', 'roles')).toBe(true);
  });

  it('admin can access system settings', () => {
    expect(ctx.canAccessPage('Settings')).toBe(true);
    expect(ctx.canAccessPage('AutomationSettings')).toBe(true);
    expect(ctx.canAccessPage('IntegrationSettings')).toBe(true);
    expect(ctx.canAccessPage('AuditLog')).toBe(true);
    expect(ctx.canAccessPage('AdminDisplaySettings')).toBe(true);
  });

  it('admin can access vendor portal (to check vendor view)', () => {
    expect(ctx.canAccessPage('VendorPortal')).toBe(true);
  });
});

// ─── Scenario 2: Operator (מוקדן) ─────────────────────────

describe('Scenario: Operator handles daily call center operations', () => {
  const ctx = createPermissionsContextValue('operator');

  it('operator identity is correct', () => {
    expect(ctx.currentUser.email).toBe('operator@natid.co.il');
    expect(ctx.effectiveRole).toBe('operator');
    expect(ctx.isAdmin).toBe(false);
  });

  describe('workflow: receiving and dispatching a call', () => {
    it('can view the dashboard', () => {
      expect(ctx.canAccessPage('Dashboard')).toBe(true);
    });

    it('can open the calls list', () => {
      expect(ctx.canAccessPage('Calls')).toBe(true);
      expect(ctx.hasPermission('calls', 'view')).toBe(true);
    });

    it('can create a new service call', () => {
      expect(ctx.canAccessPage('NewCase')).toBe(true);
      expect(ctx.hasPermission('calls', 'create')).toBe(true);
    });

    it('can edit an existing call', () => {
      expect(ctx.canAccessPage('CallDetails')).toBe(true);
      expect(ctx.hasPermission('calls', 'edit')).toBe(true);
    });

    it('can assign a call to a vendor', () => {
      expect(ctx.hasPermission('calls', 'assign')).toBe(true);
    });

    it('CANNOT delete a call (destructive action, admin-only)', () => {
      expect(ctx.hasPermission('calls', 'delete')).toBe(false);
    });
  });

  describe('workflow: managing vendors and customers', () => {
    it('can view vendor list', () => {
      expect(ctx.canAccessPage('ServiceProviders')).toBe(true);
      expect(ctx.hasPermission('vendors', 'view')).toBe(true);
    });

    it('can add a new vendor', () => {
      expect(ctx.canAccessPage('NewVendor')).toBe(true);
      expect(ctx.hasPermission('vendors', 'create')).toBe(true);
    });

    it('can edit vendor details', () => {
      expect(ctx.canAccessPage('EditVendor')).toBe(true);
      expect(ctx.hasPermission('vendors', 'edit')).toBe(true);
    });

    it('CANNOT delete a vendor', () => {
      expect(ctx.hasPermission('vendors', 'delete')).toBe(false);
    });

    it('can view customers', () => {
      expect(ctx.canAccessPage('Customers')).toBe(true);
      expect(ctx.hasPermission('customers', 'view')).toBe(true);
    });

    it('can create/edit customers', () => {
      expect(ctx.hasPermission('customers', 'create')).toBe(true);
      expect(ctx.hasPermission('customers', 'edit')).toBe(true);
    });
  });

  describe('workflow: monitoring and reports', () => {
    it('can use queue monitor', () => {
      expect(ctx.canAccessPage('QueueMonitor')).toBe(true);
      expect(ctx.hasPermission('monitoring', 'queue')).toBe(true);
    });

    it('can view the live map', () => {
      expect(ctx.canAccessPage('AllVendorsMap')).toBe(true);
      expect(ctx.hasPermission('monitoring', 'live_map')).toBe(true);
    });

    it('can track vendors', () => {
      expect(ctx.canAccessPage('VendorTracking')).toBe(true);
      expect(ctx.hasPermission('monitoring', 'tracking')).toBe(true);
    });

    it('can view operational reports', () => {
      expect(ctx.canAccessPage('Reports')).toBe(true);
      expect(ctx.hasPermission('reports', 'view')).toBe(true);
      expect(ctx.hasPermission('reports', 'performance')).toBe(true);
    });

    it('can export data', () => {
      expect(ctx.canAccessPage('AdvancedExport')).toBe(true);
      expect(ctx.hasPermission('reports', 'export')).toBe(true);
    });

    it('CANNOT view financial reports', () => {
      expect(ctx.canAccessPage('Invoices')).toBe(false);
      expect(ctx.hasPermission('reports', 'financial')).toBe(false);
    });
  });

  describe('restricted areas', () => {
    it('CANNOT access system settings', () => {
      expect(ctx.canAccessPage('Settings')).toBe(false);
      expect(ctx.canAccessPage('AdminDisplaySettings')).toBe(false);
    });

    it('CANNOT manage users or roles', () => {
      expect(ctx.canAccessPage('UserManagement')).toBe(false);
      expect(ctx.canAccessPage('RoleManagement')).toBe(false);
    });

    it('CANNOT access vendor portal (vendor-only)', () => {
      expect(ctx.canAccessPage('VendorPortal')).toBe(false);
    });

    it('CANNOT access audit log', () => {
      expect(ctx.canAccessPage('AuditLog')).toBe(false);
    });
  });
});

// ─── Scenario 3: Vendor (ספק שירות) ───────────────────────

describe('Scenario: Vendor manages their own calls through portal', () => {
  const ctx = createPermissionsContextValue('vendor');

  it('vendor identity is correct', () => {
    expect(ctx.currentUser.email).toBe('vendor@natid.co.il');
    expect(ctx.effectiveRole).toBe('vendor');
    expect(ctx.isAdmin).toBe(false);
  });

  describe('workflow: vendor accesses their portal', () => {
    it('can access the vendor portal', () => {
      expect(ctx.canAccessPage('VendorPortal')).toBe(true);
    });

    it('can manage their assigned calls', () => {
      expect(ctx.canAccessPage('VendorCallManagement')).toBe(true);
    });

    it('can view their own profile', () => {
      expect(ctx.canAccessPage('MyVendorProfile')).toBe(true);
    });

    it('can access the vendor guide', () => {
      expect(ctx.canAccessPage('VendorGuide')).toBe(true);
    });

    it('can access user profile page', () => {
      expect(ctx.canAccessPage('UserProfile')).toBe(true);
    });
  });

  describe('restricted: vendor isolation', () => {
    it('CANNOT see the main dashboard', () => {
      expect(ctx.canAccessPage('Dashboard')).toBe(false);
    });

    it('CANNOT access call management (operator function)', () => {
      expect(ctx.canAccessPage('Calls')).toBe(false);
      expect(ctx.canAccessPage('NewCase')).toBe(false);
      expect(ctx.canAccessPage('CallDetails')).toBe(false);
    });

    it('CANNOT view other vendors', () => {
      expect(ctx.canAccessPage('ServiceProviders')).toBe(false);
      expect(ctx.canAccessPage('VendorDetails')).toBe(false);
    });

    it('CANNOT see customers', () => {
      expect(ctx.canAccessPage('Customers')).toBe(false);
      expect(ctx.canAccessPage('CustomerDetails')).toBe(false);
    });

    it('CANNOT access reports', () => {
      expect(ctx.canAccessPage('Reports')).toBe(false);
    });

    it('CANNOT access system settings', () => {
      expect(ctx.canAccessPage('Settings')).toBe(false);
      expect(ctx.canAccessPage('UserManagement')).toBe(false);
    });

    it('has no granular permissions (all return false)', () => {
      expect(ctx.hasPermission('calls', 'view')).toBe(false);
      expect(ctx.hasPermission('vendors', 'view')).toBe(false);
      expect(ctx.hasPermission('customers', 'view')).toBe(false);
      expect(ctx.hasPermission('reports', 'view')).toBe(false);
      expect(ctx.hasPermission('system', 'settings')).toBe(false);
      expect(ctx.hasPermission('monitoring', 'queue')).toBe(false);
    });
  });
});

// ─── Scenario 4: Agent (טכנאי) ────────────────────────────

describe('Scenario: Agent (field technician) uses the mobile app', () => {
  const ctx = createPermissionsContextValue('agent');

  it('agent identity is correct', () => {
    expect(ctx.currentUser.email).toBe('agent@natid.co.il');
    expect(ctx.effectiveRole).toBe('agent');
    expect(ctx.isAdmin).toBe(false);
  });

  describe('workflow: agent views assigned calls', () => {
    it('can view calls (read-only)', () => {
      expect(ctx.hasPermission('calls', 'view')).toBe(true);
    });

    it('CANNOT create new calls', () => {
      expect(ctx.hasPermission('calls', 'create')).toBe(false);
    });

    it('CANNOT edit calls', () => {
      expect(ctx.hasPermission('calls', 'edit')).toBe(false);
    });

    it('CANNOT assign calls', () => {
      expect(ctx.hasPermission('calls', 'assign')).toBe(false);
    });
  });

  describe('accessible pages', () => {
    it('can access profile and guides', () => {
      expect(ctx.canAccessPage('UserProfile')).toBe(true);
      expect(ctx.canAccessPage('UserGuide')).toBe(true);
      expect(ctx.canAccessPage('FormView')).toBe(true);
    });

    it('can access landing page', () => {
      expect(ctx.canAccessPage('LandingPage')).toBe(true);
    });

    it('can access notification settings', () => {
      expect(ctx.canAccessPage('MyNotificationSettings')).toBe(true);
    });
  });

  describe('restricted: agent isolation', () => {
    it('CANNOT access the dashboard', () => {
      expect(ctx.canAccessPage('Dashboard')).toBe(false);
    });

    it('CANNOT access the calls list page', () => {
      expect(ctx.canAccessPage('Calls')).toBe(false);
    });

    it('CANNOT access customer data', () => {
      expect(ctx.canAccessPage('Customers')).toBe(false);
      expect(ctx.hasPermission('customers', 'view')).toBe(false);
    });

    it('CANNOT see vendors', () => {
      expect(ctx.canAccessPage('ServiceProviders')).toBe(false);
      expect(ctx.hasPermission('vendors', 'view')).toBe(false);
    });

    it('CANNOT access reports', () => {
      expect(ctx.canAccessPage('Reports')).toBe(false);
      expect(ctx.hasPermission('reports', 'view')).toBe(false);
    });

    it('CANNOT access system settings', () => {
      expect(ctx.canAccessPage('Settings')).toBe(false);
    });

    it('CANNOT access vendor portal', () => {
      expect(ctx.canAccessPage('VendorPortal')).toBe(false);
    });

    it('CANNOT access monitoring', () => {
      expect(ctx.hasPermission('monitoring', 'queue')).toBe(false);
      expect(ctx.hasPermission('monitoring', 'live_map')).toBe(false);
      expect(ctx.hasPermission('monitoring', 'tracking')).toBe(false);
    });
  });
});

// ─── Scenario 5: Operator with custom permissions ─────────

describe('Scenario: Operator with custom permission overrides', () => {
  describe('operator granted financial report access', () => {
    const ctx = createPermissionsContextValue('operator', {
      userPermissions: {
        custom_permissions: {
          reports: { financial: true },
        },
      },
    });

    it('can now access financial reports', () => {
      expect(ctx.hasPermission('reports', 'financial')).toBe(true);
    });

    it('still has regular operator permissions', () => {
      expect(ctx.hasPermission('calls', 'view')).toBe(true);
      expect(ctx.hasPermission('calls', 'create')).toBe(true);
      expect(ctx.hasPermission('vendors', 'view')).toBe(true);
    });

    it('still cannot access system management', () => {
      expect(ctx.hasPermission('system', 'users')).toBe(false);
      expect(ctx.hasPermission('system', 'roles')).toBe(false);
    });
  });

  describe('operator with restricted pages', () => {
    const ctx = createPermissionsContextValue('operator', {
      userPermissions: {
        restricted_pages: ['Reports', 'AdvancedExport'],
      },
    });

    it('cannot access specifically restricted pages', () => {
      expect(ctx.canAccessPage('Reports')).toBe(false);
      expect(ctx.canAccessPage('AdvancedExport')).toBe(false);
    });

    it('can still access other operator pages', () => {
      expect(ctx.canAccessPage('Dashboard')).toBe(true);
      expect(ctx.canAccessPage('Calls')).toBe(true);
      expect(ctx.canAccessPage('Customers')).toBe(true);
    });
  });

  describe('operator with create permission removed', () => {
    const ctx = createPermissionsContextValue('operator', {
      userPermissions: {
        custom_permissions: {
          calls: { create: false },
          vendors: { create: false },
        },
      },
    });

    it('cannot create calls anymore', () => {
      expect(ctx.hasPermission('calls', 'create')).toBe(false);
    });

    it('cannot create vendors anymore', () => {
      expect(ctx.hasPermission('vendors', 'create')).toBe(false);
    });

    it('can still view and edit', () => {
      expect(ctx.hasPermission('calls', 'view')).toBe(true);
      expect(ctx.hasPermission('calls', 'edit')).toBe(true);
      expect(ctx.hasPermission('vendors', 'view')).toBe(true);
    });
  });
});

// ─── Scenario 6: Agent with expanded permissions via roleData ─

describe('Scenario: Agent with expanded role permissions', () => {
  const ctx = createPermissionsContextValue('agent', {
    userPermissions: {
      roleData: {
        permissions: {
          calls: { view: true, edit: true },
          customers: { view: true },
        },
      },
    },
  });

  it('can now edit calls (upgraded from default)', () => {
    expect(ctx.hasPermission('calls', 'edit')).toBe(true);
  });

  it('can now view customers (upgraded from default)', () => {
    expect(ctx.hasPermission('customers', 'view')).toBe(true);
  });

  it('still cannot create or delete calls', () => {
    expect(ctx.hasPermission('calls', 'create')).toBe(false);
    expect(ctx.hasPermission('calls', 'delete')).toBe(false);
  });

  it('still has no system permissions', () => {
    expect(ctx.hasPermission('system', 'users')).toBe(false);
    expect(ctx.hasPermission('system', 'settings')).toBe(false);
  });
});

// ─── Scenario 7: hasAnyPermission / hasAllPermissions ─────

describe('Scenario: Multiple permission checks', () => {
  const operatorCtx = createPermissionsContextValue('operator');
  const agentCtx = createPermissionsContextValue('agent');

  describe('hasAnyPermission', () => {
    it('operator has ANY of [calls.view, reports.financial]', () => {
      expect(
        operatorCtx.hasAnyPermission([
          { category: 'calls', permission: 'view' },
          { category: 'reports', permission: 'financial' },
        ])
      ).toBe(true);
    });

    it('agent does NOT have ANY of [calls.create, vendors.view]', () => {
      expect(
        agentCtx.hasAnyPermission([
          { category: 'calls', permission: 'create' },
          { category: 'vendors', permission: 'view' },
        ])
      ).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('operator has ALL of [calls.view, calls.create, calls.edit]', () => {
      expect(
        operatorCtx.hasAllPermissions([
          { category: 'calls', permission: 'view' },
          { category: 'calls', permission: 'create' },
          { category: 'calls', permission: 'edit' },
        ])
      ).toBe(true);
    });

    it('operator does NOT have ALL of [calls.view, calls.delete]', () => {
      expect(
        operatorCtx.hasAllPermissions([
          { category: 'calls', permission: 'view' },
          { category: 'calls', permission: 'delete' },
        ])
      ).toBe(false);
    });
  });
});

// ─── Scenario 8: canAccessReport ──────────────────────────

describe('Scenario: Report access per role', () => {
  const adminCtx = createPermissionsContextValue('admin');
  const operatorCtx = createPermissionsContextValue('operator');
  const vendorCtx = createPermissionsContextValue('vendor');
  const agentCtx = createPermissionsContextValue('agent');

  it('admin can access all report types', () => {
    expect(adminCtx.canAccessReport('invoices_report')).toBe(true);
    expect(adminCtx.canAccessReport('financial_summary')).toBe(true);
    expect(adminCtx.canAccessReport('performance')).toBe(true);
  });

  it('operator can access operational reports via hasPermission', () => {
    expect(operatorCtx.canAccessReport('performance')).toBe(true);
    expect(operatorCtx.canAccessReport('historical')).toBe(true);
    expect(operatorCtx.canAccessReport('export')).toBe(true);
  });

  it('operator cannot access financial reports', () => {
    expect(operatorCtx.canAccessReport('financial')).toBe(false);
  });

  it('vendor cannot access any reports', () => {
    expect(vendorCtx.canAccessReport('performance')).toBe(false);
    expect(vendorCtx.canAccessReport('financial')).toBe(false);
  });

  it('agent cannot access any reports', () => {
    expect(agentCtx.canAccessReport('performance')).toBe(false);
    expect(agentCtx.canAccessReport('financial')).toBe(false);
  });

  it('operator with allowed_reports override can only access specific reports', () => {
    const ctx = createPermissionsContextValue('operator', {
      userPermissions: {
        allowed_reports: ['performance', 'historical'],
      },
    });

    expect(ctx.canAccessReport('performance')).toBe(true);
    expect(ctx.canAccessReport('historical')).toBe(true);
    expect(ctx.canAccessReport('export')).toBe(false);
    expect(ctx.canAccessReport('financial')).toBe(false);
  });
});
