/**
 * Page-level permissions configuration.
 *
 * Roles: 'admin', 'operator', 'vendor', 'agent'
 * Admin always has access to all pages (enforced by RoleGuard).
 * Pages not listed here are accessible to all authenticated users.
 *
 * Key distinction:
 * - Admin (מנהל): Full access including financial reports, settings, user management
 * - Operator (מתפעל): Operational access - call management, vendor assignment, no financial reports
 */

export const PAGE_PERMISSIONS = {
  // Admin only - system management & financial
  AdminDisplaySettings: ['admin'],
  AuditLog: ['admin'],
  AutomationSettings: ['admin'],
  FleetManagement: ['admin'],
  ImportHistoricalData: ['admin'],
  IntegrationSettings: ['admin'],
  Invoices: ['admin'],
  OperationalRates: ['admin'],
  RoleManagement: ['admin'],
  Settings: ['admin'],
  UserManagement: ['admin'],
  // Admin + Operator - daily operations
  AdvancedExport: ['admin', 'operator'],
  Agents: ['admin', 'operator'],
  AllVendorsMap: ['admin', 'operator'],
  Calendar: ['admin', 'operator'],
  CallDetails: ['admin', 'operator'],
  Calls: ['admin', 'operator'],
  CoverageAreas: ['admin', 'operator'],
  CustomerDetails: ['admin', 'operator'],
  CustomerFeedback: ['admin', 'operator'],
  Customers: ['admin', 'operator'],
  Dashboard: ['admin', 'operator'],
  EditVendor: ['admin', 'operator'],
  FeedbackManagement: ['admin', 'operator'],
  HistoricalDataAnalysis: ['admin', 'operator'],
  MyQueue: ['admin', 'operator'],
  NewCase: ['admin', 'operator'],
  NewVendor: ['admin', 'operator'],
  NotificationSettings: ['admin', 'operator'],
  ProductCatalog: ['admin', 'operator'],
  QueueMonitor: ['admin', 'operator'],
  Reminders: ['admin', 'operator'],
  Reports: ['admin', 'operator'],
  ServiceProviders: ['admin', 'operator'],
  VendorContracts: ['admin', 'operator'],
  VendorDetails: ['admin', 'operator'],
  VendorTracking: ['admin', 'operator'],

  // Vendor only
  MyVendorProfile: ['vendor'],
  VendorCallManagement: ['vendor'],
  VendorGuide: ['vendor'],
  VendorPortal: ['vendor'],

  // All roles
  FormView: ['admin', 'operator', 'vendor', 'agent'],
  LandingPage: ['admin', 'operator', 'vendor', 'agent'],
  MyNotificationSettings: ['admin', 'operator', 'vendor', 'agent'],
  UserGuide: ['admin', 'operator', 'vendor', 'agent'],
  UserProfile: ['admin', 'operator', 'vendor', 'agent'],
};

/**
 * Valid roles in the system.
 * Used to validate role assignments and prevent unknown roles from getting default access.
 */
export const VALID_ROLES = ['admin', 'operator', 'vendor', 'agent'];

/**
 * Report-level permissions.
 * Some reports are restricted to admin only (financial reports).
 */
export const REPORT_PERMISSIONS = {
  // Admin only - financial reports
  invoices_report: ['admin'],
  vendor_pricing_report: ['admin'],
  financial_summary: ['admin'],

  // Admin + Operator - operational reports
  delays_report: ['admin', 'operator'],
  ratings_report: ['admin', 'operator'],
  performance_report: ['admin', 'operator'],
  vendor_delays_report: ['admin', 'operator'],
};

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

/**
 * Check if a role can access a specific report.
 */
export function canAccessReport(role, reportName) {
  const allowedRoles = REPORT_PERMISSIONS[reportName];
  if (!allowedRoles) return true; // No restriction
  return allowedRoles.includes(role) || role === 'admin';
}
