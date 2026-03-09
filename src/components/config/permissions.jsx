/**
 * PAGE_PERMISSIONS
 * Maps page names to arrays of allowed effective roles.
 * Roles: 'admin' | 'operator' | 'agent' | 'vendor'
 */
export const PAGE_PERMISSIONS = {
  // Public / all authenticated users
  LandingPage: ['admin', 'operator', 'agent', 'vendor'],
  UserProfile: ['admin', 'operator', 'agent', 'vendor'],
  FormView: ['admin', 'operator', 'agent', 'vendor'],
  CustomerFeedback: ['admin', 'operator', 'agent', 'vendor'],
  MyNotificationSettings: ['admin', 'operator', 'agent', 'vendor'],

  // Operator + Admin
  Dashboard: ['admin', 'operator'],
  Calls: ['admin', 'operator', 'agent'],
  CallDetails: ['admin', 'operator', 'agent'],
  NewCase: ['admin', 'operator'],
  QueueMonitor: ['admin', 'operator'],
  Calendar: ['admin', 'operator', 'agent'],
  MyQueue: ['admin', 'operator', 'agent'],
  Reminders: ['admin', 'operator'],

  // Vendors
  ServiceProviders: ['admin', 'operator'],
  VendorDetails: ['admin', 'operator'],
  NewVendor: ['admin', 'operator'],
  EditVendor: ['admin', 'operator'],
  VendorContracts: ['admin', 'operator'],
  AllVendorsMap: ['admin', 'operator'],
  CoverageAreas: ['admin', 'operator'],
  VendorTracking: ['admin', 'operator'],

  // Vendor portal (vendor role)
  VendorPortal: ['admin', 'operator', 'vendor'],
  VendorCallManagement: ['admin', 'operator', 'vendor'],
  MyVendorProfile: ['admin', 'vendor'],
  VendorGuide: ['admin', 'vendor'],

  // Fleet
  FleetManagement: ['admin', 'operator'],

  // Finance
  Invoices: ['admin', 'operator'],
  ProductCatalog: ['admin', 'operator'],
  OperationalRates: ['admin', 'operator'],

  // Customers
  Customers: ['admin', 'operator'],
  CustomerDetails: ['admin', 'operator'],
  FeedbackManagement: ['admin', 'operator'],

  // Reports
  Reports: ['admin', 'operator'],
  HistoricalDataAnalysis: ['admin', 'operator'],
  AdvancedExport: ['admin', 'operator'],

  // System - admin only
  UserManagement: ['admin'],
  RoleManagement: ['admin'],
  AuditLog: ['admin'],
  IntegrationSettings: ['admin'],
  AdminDisplaySettings: ['admin'],
  ImportHistoricalData: ['admin'],

  // System - operator + admin
  AutomationSettings: ['admin', 'operator'],
  NotificationSettings: ['admin', 'operator'],
  Settings: ['admin', 'operator'],
  Agents: ['admin', 'operator'],
};