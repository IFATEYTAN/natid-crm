/**
 * Shared HTTP layer for srv.natid.co.il — the chokepoint every srv caller
 * (auth today, entities as they migrate) goes through instead of reimplementing
 * base URL, token attachment, and error handling per call site. Re-earns what
 * `@base44/sdk`'s axios client used to give every `base44.entities.*` call for free.
 */

const SRV_BASE_URL = import.meta.env.VITE_SRV_BASE_URL || 'http://localhost:8000';
const TOKEN_STORAGE_KEY = 'srv_access_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class SrvError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'SrvError';
    this.status = status;
    this.data = data;
  }
}

// Registered by AuthProvider on mount (srvClient can't import it directly —
// AuthProvider imports srvClient, and that would be a cycle). Fired on any
// 401 from an authenticated request so a mid-session token expiry or role
// revocation logs the user out instead of just failing requests silently.
let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

function buildQueryString(params) {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.append(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/**
 * @param {string} path - e.g. '/appeals'
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.params] - serialized onto the query string; falsy/empty values dropped
 * @param {*} [options.body] - JSON-serialized as the request body
 * @param {boolean} [options.auth=true] - attach the stored bearer token; set false for /login
 * @param {object} [options.headers] - extra/overriding headers
 * @returns {Promise<*>} the parsed JSON payload (not a Response)
 * @throws {SrvError}
 */
export async function srvFetch(path, options = {}) {
  const { method = 'GET', params, body, auth = true, headers = {} } = options;

  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (auth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(`${SRV_BASE_URL}${path}${buildQueryString(params)}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch itself rejected — server down, DNS, CORS refusal. Normalize to
    // the same error type callers handle for HTTP failures, rather than a
    // second error shape they'd also need to catch.
    throw new SrvError('Network request failed', 0, null);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // No/non-JSON body (e.g. 204) — leave data null rather than failing the request.
  }

  if (!response.ok) {
    if (response.status === 401 && auth && unauthorizedHandler) {
      unauthorizedHandler();
    }
    const message = data?.detail || data?.message || response.statusText || 'Request failed';
    throw new SrvError(message, response.status, data);
  }

  return data;
}
