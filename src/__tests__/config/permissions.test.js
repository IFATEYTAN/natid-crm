import { describe, it, expect } from 'vitest';
import {
  PAGE_PERMISSIONS,
  REPORT_PERMISSIONS,
  VALID_ROLES,
  getPageRoles,
  isValidRole,
  canAccessReport,
} from '@/config/permissions';

describe('VALID_ROLES', () => {
  it('should contain exactly 4 roles', () => {
    expect(VALID_ROLES).toHaveLength(4);
  });

  it('should include admin, operator, vendor, agent', () => {
    expect(VALID_ROLES).toContain('admin');
    expect(VALID_ROLES).toContain('operator');
    expect(VALID_ROLES).toContain('vendor');
    expect(VALID_ROLES).toContain('agent');
  });
});

describe('isValidRole', () => {
  it.each(['admin', 'operator', 'vendor', 'agent'])('should return true for "%s"', (role) => {
    expect(isValidRole(role)).toBe(true);
  });

  it.each(['user', 'manager', 'superadmin', '', null, undefined])(
    'should return false for "%s"',
    (role) => {
      expect(isValidRole(role)).toBe(false);
    }
  );
});

describe('PAGE_PERMISSIONS structure', () => {
  it('should only reference valid roles in all page entries', () => {
    for (const [page, roles] of Object.entries(PAGE_PERMISSIONS)) {
      for (const role of roles) {
        expect(VALID_ROLES).toContain(role);
      }
    }
  });

  // Admin-only pages
  const adminOnlyPages = [
    'AdminDisplaySettings',
    'AuditLog',
    'AutomationSettings',
    'FleetManagement',
    'ImportHistoricalData',
    'IntegrationSettings',
    'Invoices',
    'OperationalRates',
    'RoleManagement',
    'Settings',
    'UserManagement',
    'VendorPricing',
  ];

  it.each(adminOnlyPages)('"%s" should be admin-only', (page) => {
    expect(PAGE_PERMISSIONS[page]).toEqual(['admin']);
  });

  // Admin + Operator pages
  const adminOperatorPages = [
    'AdvancedExport',
    'Agents',
    'AllVendorsMap',
    'Calendar',
    'CallDetails',
    'Calls',
    'CoverageAreas',
    'CustomerDetails',
    'CustomerFeedback',
    'Customers',
    'Dashboard',
    'EditVendor',
    'FeedbackManagement',
    'HistoricalDataAnalysis',
    'MyQueue',
    'NewCase',
    'NewVendor',
    'NotificationSettings',
    'ProductCatalog',
    'QueueMonitor',
    'Reminders',
    'Reports',
    'ServiceProviders',
    'VendorContracts',
    'VendorDetails',
    'VendorTracking',
  ];

  it.each(adminOperatorPages)('"%s" should allow admin + operator', (page) => {
    expect(PAGE_PERMISSIONS[page]).toEqual(['admin', 'operator']);
  });

  // Vendor-only pages
  const vendorPages = ['MyVendorProfile', 'VendorCallManagement', 'VendorGuide'];

  it.each(vendorPages)('"%s" should allow vendor only', (page) => {
    expect(PAGE_PERMISSIONS[page]).toEqual(['vendor']);
  });

  // Shared with operator/admin for tracking continuity (call → vendor → customer record)
  it('"VendorPortal" should allow admin, operator, and vendor', () => {
    expect(PAGE_PERMISSIONS.VendorPortal).toEqual(['admin', 'operator', 'vendor']);
  });

  // All-roles pages
  const allRolesPages = [
    'FormView',
    'LandingPage',
    'MyNotificationSettings',
    'UserGuide',
    'UserProfile',
  ];

  it.each(allRolesPages)('"%s" should allow all roles', (page) => {
    expect(PAGE_PERMISSIONS[page]).toEqual(['admin', 'operator', 'vendor', 'agent']);
  });
});

describe('getPageRoles', () => {
  it('should return roles array for a defined page', () => {
    expect(getPageRoles('Dashboard')).toEqual(['admin', 'operator']);
  });

  it('should return null for undefined pages (no restriction)', () => {
    expect(getPageRoles('SomeUnknownPage')).toBeNull();
  });

  it('should return admin-only for Settings page', () => {
    expect(getPageRoles('Settings')).toEqual(['admin']);
  });

  it('should return admin/operator/vendor roles for VendorPortal', () => {
    expect(getPageRoles('VendorPortal')).toEqual(['admin', 'operator', 'vendor']);
  });
});

describe('REPORT_PERMISSIONS', () => {
  const adminOnlyReports = ['invoices_report', 'vendor_pricing_report', 'financial_summary'];

  it.each(adminOnlyReports)('"%s" should be admin-only', (report) => {
    expect(REPORT_PERMISSIONS[report]).toEqual(['admin']);
  });

  const operationalReports = [
    'delays_report',
    'ratings_report',
    'performance_report',
    'vendor_delays_report',
  ];

  it.each(operationalReports)('"%s" should allow admin + operator', (report) => {
    expect(REPORT_PERMISSIONS[report]).toEqual(['admin', 'operator']);
  });
});

describe('canAccessReport', () => {
  // Admin can access everything
  it('admin can access all reports', () => {
    const allReports = Object.keys(REPORT_PERMISSIONS);
    for (const report of allReports) {
      expect(canAccessReport('admin', report)).toBe(true);
    }
  });

  // Operator can access operational reports but not financial
  it('operator can access operational reports', () => {
    expect(canAccessReport('operator', 'delays_report')).toBe(true);
    expect(canAccessReport('operator', 'ratings_report')).toBe(true);
    expect(canAccessReport('operator', 'performance_report')).toBe(true);
    expect(canAccessReport('operator', 'vendor_delays_report')).toBe(true);
  });

  it('operator cannot access financial reports', () => {
    expect(canAccessReport('operator', 'invoices_report')).toBe(false);
    expect(canAccessReport('operator', 'vendor_pricing_report')).toBe(false);
    expect(canAccessReport('operator', 'financial_summary')).toBe(false);
  });

  // Vendor and Agent cannot access any restricted reports
  it.each(['vendor', 'agent'])('%s cannot access any restricted reports', (role) => {
    const allReports = Object.keys(REPORT_PERMISSIONS);
    for (const report of allReports) {
      expect(canAccessReport(role, report)).toBe(false);
    }
  });

  // Unrestricted reports are accessible to all
  it('all roles can access unrestricted reports', () => {
    for (const role of VALID_ROLES) {
      expect(canAccessReport(role, 'some_custom_report')).toBe(true);
    }
  });
});
