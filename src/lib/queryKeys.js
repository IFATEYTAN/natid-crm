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
    list: (filters) => ['calls', { filters }],
    byVendor: (vendorId) => ['calls', 'vendor', vendorId],
    byCustomer: (customerId) => ['calls', 'customer', customerId],
  },

  // Cases feature
  cases: {
    all: () => ['cases'],
    detail: (id) => ['cases', id],
    list: (filters) => ['cases', { filters }],
  },

  // Customers feature
  customers: {
    all: () => ['customers'],
    detail: (id) => ['customers', id],
    list: (filters) => ['customers', { filters }],
    interactions: (customerId) => ['customers', customerId, 'interactions'],
  },

  // Vendors feature
  vendors: {
    all: () => ['vendors'],
    detail: (id) => ['vendors', id],
    list: (filters) => ['vendors', { filters }],
    available: () => ['vendors', 'available'],
    ratings: (vendorId) => ['vendors', vendorId, 'ratings'],
    payments: (vendorId) => ['vendors', vendorId, 'payments'],
    contracts: (vendorId) => ['vendors', vendorId, 'contracts'],
    locations: (vendorId) => ['vendors', vendorId, 'locations'],
    allLocations: () => ['vendors', 'locations', 'all'],
    profile: (email) => ['vendors', 'profile', email],
    scoped: (entityType) => ['vendors', 'scoped', entityType],
  },

  // Users/Agents feature
  users: {
    all: () => ['users'],
    detail: (id) => ['users', id],
    agents: () => ['users', 'agents'],
  },

  // Queue feature
  queue: {
    all: () => ['workQueue'],
    detail: (id) => ['workQueue', id],
    list: (filters) => ['workQueue', { filters }],
  },

  // Notifications feature
  notifications: {
    all: () => ['notifications'],
    byUser: (userId) => ['notifications', 'user', userId],
    settings: () => ['notificationSettings'],
  },

  // Messages/Chat feature
  messages: {
    byCall: (callId) => ['messages', 'call', callId],
  },

  // Activities feature
  activities: {
    byCase: (caseId) => ['activities', 'case', caseId],
    byCall: (callId) => ['activities', 'call', callId],
  },

  // Call Photos
  callPhotos: {
    byCall: (callId) => ['callPhotos', callId],
  },

  // Call Assignment Attempts
  assignmentAttempts: {
    byVendor: (vendorId) => ['assignmentAttempts', 'vendor', vendorId],
  },

  // Reports
  reports: {
    vendorRatings: () => ['reports', 'vendorRatings'],
    vendorPayments: () => ['reports', 'vendorPayments'],
  },

  // Service Providers (legacy/alias)
  serviceProviders: {
    available: () => ['serviceProviders', 'available'],
  },

  // Products feature
  products: {
    all: () => ['products'],
    detail: (id) => ['products', id],
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
    automation: () => ['settings', 'automation'],
    notifications: () => ['settings', 'notifications'],
    display: (userId, page) => ['settings', 'display', userId, page],
  },

  // Auth
  auth: {
    me: () => ['auth', 'me'],
  },

  // Audit Log
  auditLog: {
    all: () => ['auditLog'],
  },

  // Historical Data
  historicalData: {
    all: () => ['historicalData'],
  },
};

export default queryKeys;
