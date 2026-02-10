/**
 * Page-level permissions configuration.
 *
 * Roles: 'admin', 'operator', 'vendor', 'agent'
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

  // Agent (טכנאי) - field technician with limited access
  AgentDashboard: ['agent'],
  AgentCallManagement: ['agent'],

  // Vendor only
  VendorPortal: ['vendor'],
  VendorCallManagement: ['vendor'],
  MyVendorProfile: ['vendor'],
  VendorGuide: ['vendor'],

  // All roles
  MyNotificationSettings: ['admin', 'operator', 'vendor', 'agent'],
  UserGuide: ['admin', 'operator', 'vendor', 'agent'],
};

/**
 * Valid roles in the system.
 * Used to validate role assignments and prevent unknown roles from getting default access.
 */
export const VALID_ROLES = ['admin', 'operator', 'vendor', 'agent'];

/**
 * Get allowed roles for a page.
 * Returns null if page has no restrictions (accessible to all authenticated users).
 */
export function getPageRoles(pageName) {
  return PAGE_PERMISSIONS[pageName] || null;
}

/**
 * Check if a role is valid.
 */
export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}
