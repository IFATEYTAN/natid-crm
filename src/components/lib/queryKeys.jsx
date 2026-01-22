/**
 * Centralized Query Keys for React Query
 * 
 * This file defines all query keys used throughout the application.
 * Using a centralized location prevents typos and makes it easy to manage cache invalidation.
 */

export const queryKeys = {
  // Calls
  calls: {
    all: () => ['calls'],
    list: (filters) => ['calls', { filters }],
    detail: (id) => ['calls', id],
    byStatus: (status) => ['calls', { status }],
  },

  // Cases (Legacy)
  cases: {
    all: () => ['cases'],
    list: (filters) => ['cases', { filters }],
    detail: (id) => ['cases', id],
  },

  // Customers
  customers: {
    all: () => ['customers'],
    list: (filters) => ['customers', { filters }],
    detail: (id) => ['customers', id],
  },

  // Vendors (Service Providers)
  vendors: {
    all: () => ['vendors'],
    list: (filters) => ['vendors', { filters }],
    detail: (id) => ['vendors', id],
    byArea: (area) => ['vendors', { area }],
  },

  // Work Queue
  queue: {
    all: () => ['queue'],
    list: (filters) => ['queue', { filters }],
  },

  // Dashboard
  dashboard: {
    stats: () => ['dashboard', 'stats'],
    workQueue: () => ['dashboard', 'workQueue'],
    recentCalls: () => ['dashboard', 'recentCalls'],
  },

  // Reports
  reports: {
    all: () => ['reports'],
    calls: (filters) => ['reports', 'calls', { filters }],
    vendors: (filters) => ['reports', 'vendors', { filters }],
  },

  // Auth
  auth: {
    me: () => ['auth', 'me'],
    user: (id) => ['auth', 'user', id],
  },

  // Notifications
  notifications: {
    all: () => ['notifications'],
    unread: () => ['notifications', 'unread'],
  },

  // Call History
  callHistory: {
    all: () => ['callHistory'],
    byCall: (callId) => ['callHistory', callId],
  },

  // Messages
  messages: {
    all: () => ['messages'],
    byCall: (callId) => ['messages', callId],
  },
};