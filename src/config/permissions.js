/**
 * Page-level permissions configuration.
 *
 * Roles: 'admin', 'operator', 'vendor'
 * Admin always has access to all pages (enforced by RoleGuard).
 * Pages not listed here are accessible to all authenticated users.
 */

export const PAGE_PERMISSIONS = {
  // Admin only - system management
  AuditLog: ['admin'],
  AutomationSettings: ['admin'],
  UserManagement: ['admin'],
  RoleManagement: ['admin'],
  ImportHistoricalData: ['admin'],
  IntegrationSettings: ['admin'],
  Settings: ['admin'],

  // Admin + Operator - daily operations
  Dashboard: ['admin', 'operator'],
  Calls: ['admin', 'operator'],
  CallDetails: ['admin', 'operator'],
  NewCase: ['admin', 'operator'],
  Customers: ['admin', 'operator'],
  ServiceProviders: ['admin', 'operator'],
  NewVendor: ['admin', 'operator'],
  QueueMonitor: ['admin', 'operator'],
  MyQueue: ['admin', 'operator'],
  Reports: ['admin', 'operator'],
  AdvancedExport: ['admin', 'operator'],
  Calendar: ['admin', 'operator'],
  VendorTracking: ['admin', 'operator'],
  AllVendorsMap: ['admin', 'operator'],
  CoverageAreas: ['admin', 'operator'],
  VendorContracts: ['admin', 'operator'],
  HistoricalDataAnalysis: ['admin', 'operator'],
  NotificationSettings: ['admin', 'operator'],
  Agents: ['admin', 'operator'],
  CustomerFeedback: ['admin', 'operator'],

  // Vendor only
  VendorPortal: ['vendor'],
  VendorCallManagement: ['vendor'],
  MyVendorProfile: ['vendor'],

  // All roles
  MyNotificationSettings: ['admin', 'operator', 'vendor'],
  UserGuide: ['admin', 'operator', 'vendor'],
};

/**
 * Get allowed roles for a page.
 * Returns null if page has no restrictions (accessible to all authenticated users).
 */
export function getPageRoles(pageName) {
  return PAGE_PERMISSIONS[pageName] || null;
}
