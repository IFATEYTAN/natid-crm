/**
 * Centralized Query Keys for React Query
 *
 * Structure:
 * - all: () => [feature] - for listing all items
 * - detail: (id) => [feature, id] - for single item
 * - list: (filters) => [feature, { filters }] - for filtered lists
 */

export const queryKeys = {
  // Calls feature
  calls: {
    all: () => ['calls'],
    detail: (id) => ['calls', id],
    single: (id) => ['call', id],
    list: (filters) => ['calls', { filters }],
    byVendor: (vendorId) => ['calls', 'vendor', vendorId],
    byCustomer: (customerId) => ['calls', 'customer', customerId],
    open: () => ['openCalls'],
    completedToday: () => ['completedToday'],
    forVendors: () => ['calls-for-vendors'],
  },

  // Call Details & Related
  callHistory: {
    byCall: (callId) => ['callHistory', callId],
  },

  callMessages: {
    byCall: (callId) => ['callMessages', callId],
  },

  callProducts: {
    byCall: (callId) => ['callProducts', callId],
  },

  // Call Photos
  callPhotos: {
    byCall: (callId) => ['callPhotos', callId],
  },

  // Deposits
  deposits: {
    byCall: (callId) => ['deposits', callId],
  },

  // Eligibility Checks
  eligibilityChecks: {
    byCall: (callId) => ['eligibilityChecks', callId],
  },

  // Cases feature
  cases: {
    all: () => ['cases'],
    detail: (id) => ['cases', id],
    single: (id) => ['case', id],
    list: (filters) => ['cases', { filters }],
    activities: (caseId) => ['case-activities', caseId],
  },

  // Customers feature
  customers: {
    all: () => ['customers'],
    detail: (id) => ['customers', id],
    single: (id) => ['customer', id],
    list: (filters) => ['customers', { filters }],
    interactions: (customerId) => ['customer-interactions', customerId],
    calls: (customerId) => ['customer-calls', customerId],
  },

  // Vendors feature
  vendors: {
    all: () => ['vendors'],
    allList: () => ['allVendors'],
    detail: (id) => ['vendors', id],
    single: (id) => ['vendor', id],
    list: (filters) => ['vendors', { filters }],
    available: () => ['availableVendors'],
    ratings: (vendorId) => ['vendors', vendorId, 'ratings'],
    payments: (vendorId) => ['vendors', vendorId, 'payments'],
    contracts: (vendorId) => ['vendors', vendorId, 'contracts'],
    locations: (vendorId) => ['vendors', vendorId, 'locations'],
    allLocations: () => ['vendorLocations'],
    profile: (email) => ['vendorProfile', email],
    scoped: (entityType) => ['vendors', 'scoped', entityType],
    byEmail: (email) => ['vendors', 'email', email],
    coverage: () => ['vendors-coverage'],
    map: () => ['vendors-map'],
    calls: (vendorId) => ['vendorCalls', vendorId],
    mapCalls: (vendorId) => ['vendorMapCalls', vendorId],
    contractHistory: (vendorId) => ['vendorContractHistory', vendorId],
    call: (callId, vendorId) => ['vendorCall', callId, vendorId],
    // VendorProfile page keys (legacy singular format)
    singleCalls: (vendorId) => ['vendor-calls', vendorId],
    singleRatings: (vendorId) => ['vendor-ratings', vendorId],
    singlePayments: (vendorId) => ['vendor-payments', vendorId],
    singleContracts: (vendorId) => ['vendor-contracts', vendorId],
    singleLocation: (vendorId) => ['vendor-location', vendorId],
    // MyVendorProfile page keys
    myProfile: (email) => ['my-vendor-profile', email],
    myCalls: (vendorId) => ['my-vendor-calls', vendorId],
    myRatings: (vendorId) => ['my-vendor-ratings', vendorId],
    myPayments: (vendorId) => ['my-vendor-payments', vendorId],
    myLocation: (vendorId) => ['my-vendor-location', vendorId],
    // VendorPayments page key
    vendorPayments: (vendorId) => ['vendorPayments', vendorId],
  },

  // Vendor Contracts (general tab)
  vendorContracts: {
    all: () => ['vendorContracts'],
  },

  // Assignment Requests
  assignmentRequests: {
    byVendor: (vendorId) => ['pendingAssignments', vendorId],
    byVendorPortal: (vendorId) => ['assignmentRequests', vendorId],
  },

  // Call Assignment Attempts
  assignmentAttempts: {
    byVendor: (vendorId) => ['assignmentAttempts', 'vendor', vendorId],
  },

  // Users/Agents feature
  users: {
    all: () => ['users'],
    detail: (id) => ['users', id],
    agents: () => ['agents'],
    permissions: () => ['userPermissions'],
    allPermissions: () => ['allUserPermissions'],
  },

  // Auth
  auth: {
    me: () => ['currentUser'],
  },

  // Queue feature
  queue: {
    all: () => ['workQueue'],
    allQueues: () => ['allQueues'],
    detail: (id) => ['workQueue', id],
    list: (filters) => ['workQueue', { filters }],
    my: (email) => ['myQueue', email],
    calls: () => ['queueCalls'],
    monitor: () => ['queueMonitor'],
    dashboard: () => ['dashboardQueue'],
  },

  // Agent Shifts
  agentShifts: {
    all: () => ['agentShifts'],
  },

  // Notifications feature
  notifications: {
    all: () => ['notifications'],
    byUser: (userId) => ['notifications', userId],
    settings: (userId) => ['notification-settings', userId],
    userSettings: (userId) => ['notificationSettings', 'user', userId],
  },

  // Activities feature
  activities: {
    byCase: (caseId) => ['case-activities', caseId],
    byCall: (callId) => ['activities', 'call', callId],
  },

  // Reports
  reports: {
    vendorRatings: () => ['reports', 'vendorRatings'],
    vendorPayments: () => ['reports', 'vendorPayments'],
    vendors: () => ['reports', 'vendors'],
    customers: () => ['reports', 'customers'],
    calls: () => ['reports', 'calls'],
    // Page-level report keys (used in reports/index.jsx)
    vendorsPage: () => ['vendors-report'],
    customersPage: () => ['customers-report'],
    callsPage: () => ['calls-report'],
    ratingsPage: () => ['ratings-report'],
    paymentsPage: () => ['payments-report'],
  },

  // Service Providers (legacy/alias)
  serviceProviders: {
    all: () => ['service-providers'],
    available: () => ['providers-available'],
  },

  // Products feature
  products: {
    all: () => ['products'],
    detail: (id) => ['products', id],
    catalog: () => ['allProducts'],
  },

  // Contracts feature
  contracts: {
    all: () => ['contracts'],
    detail: (id) => ['contracts', id],
  },

  // Roles & Permissions
  roles: {
    all: () => ['roles'],
    detail: (id) => ['roles', id],
    permissions: () => ['roles', 'permissions'],
  },

  // Settings feature
  settings: {
    automation: () => ['automationSettings'],
    notifications: () => ['settings', 'notifications'],
    display: (userId, page) => ['userDisplayPref', userId, page],
  },

  // Operational Rates
  operationalRates: {
    all: () => ['operationalRates'],
  },

  // Audit Log
  auditLog: {
    all: () => ['auditLog'],
  },

  // Historical Data
  historicalData: {
    all: () => ['historicalCallData'],
  },

  // Fleet Management
  fleet: {
    all: () => ['fleet'],
    detail: (id) => ['fleet', id],
    list: (filters) => ['fleet', { filters }],
    active: () => ['fleet', 'active'],
  },

  // Vendor Pricing
  vendorPricing: {
    all: () => ['vendorPricing'],
    detail: (id) => ['vendorPricing', id],
    byVendor: (vendorId) => ['vendorPricing', 'vendor', vendorId],
  },

  // Technical Questionnaires
  questionnaires: {
    all: () => ['questionnaires'],
    byServiceType: (serviceType) => ['questionnaires', serviceType],
  },

  // Smart Alerts & AI
  smartAlerts: {
    byUser: (userId) => ['smartAlerts', userId],
  },

  predictions: {
    byCall: (callId) => ['prediction', callId],
  },

  // Feedback
  feedbacks: {
    all: () => ['feedbacks'],
  },

  // Maps
  mapCalls: {
    all: () => ['mapCalls'],
  },

  dashboardVendorLocations: {
    all: () => ['dashboardVendorLocations'],
  },

  // Exports
  exports: {
    customers: (dateRange, status) => ['customers-export-preview', dateRange, status],
    calls: (dateRange, status) => ['calls-export-preview', dateRange, status],
  },
};

export default queryKeys;
