/**
 * Apply Demo Mode - Mocks the Base44 SDK client with demo data.
 *
 * When demo mode is active, all entity CRUD operations return demo data
 * instead of making real API calls. This allows the app to run fully
 * without a backend connection.
 *
 * The proxy is ALWAYS installed so that demo mode can be toggled at any time.
 * Each call checks isDemoMode() dynamically — if inactive, the real client is used.
 */
import { isDemoMode } from './demoMode';
import { demoData, demoUser } from './demoData';

// In-memory store for demo data (mutable copies)
let demoStore = null;

function getDemoStore() {
  if (!demoStore) {
    // Deep clone the demo data so mutations don't affect the original
    demoStore = {};
    for (const [key, value] of Object.entries(demoData)) {
      demoStore[key] = Array.isArray(value) ? [...value.map((item) => ({ ...item }))] : value;
    }
  }
  return demoStore;
}

/**
 * Match an item against filter criteria.
 * Supports: direct equality, $in operator, $gte, $lte, $ne
 */
function matchesFilter(item, filters) {
  return Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === null) return true;

    // Handle MongoDB-style operators
    if (typeof value === 'object' && !Array.isArray(value)) {
      if ('$in' in value) {
        return value.$in.includes(item[key]);
      }
      if ('$gte' in value && item[key] < value.$gte) return false;
      if ('$lte' in value && item[key] > value.$lte) return false;
      if ('$ne' in value && item[key] === value.$ne) return false;
      return true;
    }

    return item[key] === value;
  });
}

/**
 * Apply sorting to an array.
 * Sort string format: '-field' for descending, 'field' for ascending.
 */
function applySorting(data, sort) {
  if (!sort) return data;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...data].sort((a, b) => {
    const aVal = a[field] ?? '';
    const bVal = b[field] ?? '';
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return desc ? -cmp : cmp;
  });
}

/**
 * Generate a unique demo ID.
 */
function generateDemoId() {
  return `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a mock entity handler for a given entity type.
 */
function createMockEntity(entityName) {
  const store = getDemoStore();
  const storeKey = entityName;

  // Ensure the store key exists
  if (!store[storeKey]) {
    store[storeKey] = [];
  }

  return {
    list: (sort, limit) => {
      let result = applySorting([...store[storeKey]], sort);
      if (limit) result = result.slice(0, limit);
      return Promise.resolve(result);
    },

    filter: (filters, sort, limit, skip) => {
      let result = store[storeKey].filter((item) => matchesFilter(item, filters));
      result = applySorting(result, sort);
      if (skip) result = result.slice(skip);
      if (limit) result = result.slice(0, limit);
      return Promise.resolve(result);
    },

    create: (data) => {
      const created = {
        ...data,
        id: generateDemoId(),
        created_date: new Date().toISOString(),
      };
      store[storeKey].push(created);
      return Promise.resolve(created);
    },

    update: (id, updateData) => {
      const idx = store[storeKey].findIndex((item) => item.id === id);
      if (idx >= 0) {
        store[storeKey][idx] = {
          ...store[storeKey][idx],
          ...updateData,
          updated_date: new Date().toISOString(),
        };
        return Promise.resolve(store[storeKey][idx]);
      }
      return Promise.resolve({ id, ...updateData });
    },

    delete: (id) => {
      const idx = store[storeKey].findIndex((item) => item.id === id);
      if (idx >= 0) store[storeKey].splice(idx, 1);
      return Promise.resolve();
    },
  };
}

/**
 * Mock backend function invocations.
 */
function createMockFunctions(realFunctions) {
  return {
    invoke: (functionName, params) => {
      if (!isDemoMode()) return realFunctions.invoke(functionName, params);

      // Return sensible defaults for common functions
      switch (functionName) {
        case 'seedDemoData':
          return Promise.resolve({
            success: true,
            message: 'מצב דמו - נתונים כבר טעונים',
            results: {},
          });
        case 'generateCallSummary':
          return Promise.resolve({
            success: true,
            data: { summary: 'סיכום קריאה אוטומטי — טיפול סגור בהצלחה' },
          });
        case 'autoAssignVendor':
          return Promise.resolve({
            success: true,
            data: { vendor_id: 'demo_vendor_1', vendor_name: 'גרר המרכז — יוסי כהן' },
          });
        case 'logAuditAction':
          return Promise.resolve({ success: true });
        case 'getVendorScopedData':
          return Promise.resolve({ success: true, data: { data: [] } });
        case 'detectSmartAlerts':
          return Promise.resolve({
            success: true,
            data: {
              alerts: [
                {
                  type: 'sla_warning',
                  message: 'קריאה C-2026020115 קרובה לחריגת SLA',
                  severity: 'warning',
                },
                {
                  type: 'vendor_busy',
                  message: 'ספק מנעולן 24/7 עמוס — 3 קריאות פתוחות',
                  severity: 'info',
                },
              ],
            },
          });
        case 'analyzeCallPatterns':
          return Promise.resolve({
            success: true,
            data: {
              patterns: [
                { pattern: 'עלייה בתקלות מצבר בשעות הבוקר', confidence: 0.85 },
                { pattern: 'ביקוש גבוה לגרירות באזור המרכז', confidence: 0.92 },
              ],
            },
          });
        case 'recommendVendor':
          return Promise.resolve({
            success: true,
            data: {
              recommendations: [
                { vendor_id: 'demo_vendor_1', score: 95, reason: 'הכי קרוב, זמין, דירוג גבוה' },
                {
                  vendor_id: 'demo_vendor_8',
                  score: 88,
                  reason: 'רב-תחומי, ביצועים מצוינים',
                },
              ],
            },
          });
        case 'predictCallTimes':
          return Promise.resolve({
            success: true,
            data: { estimated_arrival: 18, estimated_completion: 45 },
          });
        case 'sendNotification':
        case 'createNotification':
        case 'sendSMS':
        case 'sendFeedbackSMS':
        case 'sendCallStatusUpdate':
          return Promise.resolve({ success: true });
        case 'createFeedbackToken':
          return Promise.resolve({ success: true, data: { token: 'demo-feedback-token-123' } });
        case 'validateAndSubmitFeedback':
          return Promise.resolve({ success: true });
        case 'checkContractExpiry':
          return Promise.resolve({ success: true, data: { expiring_soon: 1 } });
        default:
          return Promise.resolve({ success: true, data: {} });
      }
    },
  };
}

/**
 * Create mock auth object.
 */
function createMockAuth(realAuth) {
  return {
    me: () => {
      if (!isDemoMode()) return realAuth.me();
      return Promise.resolve({ ...demoUser });
    },
    logout: (...args) => {
      if (isDemoMode()) {
        localStorage.removeItem('natid_demo_mode');
        window.location.href = window.location.origin;
        return;
      }
      return realAuth.logout(...args);
    },
    redirectToLogin: (...args) => {
      if (isDemoMode()) {
        window.location.href = window.location.origin;
        return;
      }
      return realAuth.redirectToLogin(...args);
    },
  };
}

/**
 * Apply demo mode to a Base44 client instance.
 *
 * Always installs proxies that check isDemoMode() dynamically on each call.
 * When demo mode is active → returns mock data.
 * When demo mode is inactive → delegates to the real client.
 */
export function applyDemoMode(client) {
  // Save references to original client methods
  const realEntities = client.entities;
  const realAuth = client.auth;
  const realFunctions = client.functions;

  // Create entities proxy that checks isDemoMode() on every access
  const entitiesProxy = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (!isDemoMode()) {
          return realEntities[prop];
        }
        return createMockEntity(prop);
      },
    }
  );

  // Override client properties with dynamic proxies
  client.entities = entitiesProxy;
  client.auth = createMockAuth(realAuth);
  client.functions = createMockFunctions(realFunctions);

  // Proxy asServiceRole to also route through demo when active
  // Note: reading client.asServiceRole may throw if no service token is set,
  // so we use a lazy getter that only accesses the real property when needed.
  const origAsServiceRoleDesc = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(client) || client,
    'asServiceRole'
  );
  Object.defineProperty(client, 'asServiceRole', {
    get: () => {
      if (isDemoMode()) {
        return { entities: entitiesProxy };
      }
      // Delegate to original getter/value
      if (origAsServiceRoleDesc?.get) {
        return origAsServiceRoleDesc.get.call(client);
      }
      return origAsServiceRoleDesc?.value;
    },
    configurable: true,
  });

  // Proxy users API (capture lazily to avoid accessing before it's available)
  const origUsersDesc =
    Object.getOwnPropertyDescriptor(client, 'users') ||
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(client) || {}, 'users');
  const realUsersRef = { current: client.users };
  Object.defineProperty(client, 'users', {
    get: () => {
      if (isDemoMode()) {
        return { inviteUser: () => Promise.resolve({ success: true }) };
      }
      if (origUsersDesc?.get) {
        return origUsersDesc.get.call(client);
      }
      return realUsersRef.current;
    },
    set: (val) => {
      realUsersRef.current = val;
    },
    configurable: true,
  });

  // Mock appLogs API (used by NavigationTracker)
  const realAppLogs = client.appLogs;
  Object.defineProperty(client, 'appLogs', {
    get: () => {
      if (isDemoMode()) {
        return { logUserInApp: () => Promise.resolve() };
      }
      return realAppLogs;
    },
    configurable: true,
  });

  // Set demo CRM URL for Invoices page when demo mode is active
  if (isDemoMode() && !localStorage.getItem('invoices_crm_url')) {
    localStorage.setItem('invoices_crm_url', 'https://example.com/demo-crm-invoices');
  }

  return client;
}
