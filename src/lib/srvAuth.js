/**
 * Client for srv.natid.co.il's Nati-credential auth — replaces the Base44
 * platform login. The browser holds only this JWT; entity/data access still
 * goes through Base44 until it's migrated (see the workspace migration plan).
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

// srv returns one generic 401 for every credential failure (unknown user,
// wrong password, no CRM role) — deliberately, so the message never
// discloses which reason applies. Mirror that here rather than trying to
// distinguish cases we're not told apart.
function messageForStatus(status) {
  if (status === 401) return 'שם משתמש או סיסמה שגויים';
  if (status === 429) return 'יותר מדי ניסיונות התחברות. נסה שוב בעוד כמה דקות';
  return 'שגיאה בהתחברות. נסה שוב מאוחר יותר';
}

// srv returns fname/lname (from the Nati users table), not full_name — many
// components across the app already read user.full_name (a Base44
// convention). Deriving it here, at the boundary, keeps that compatibility
// without touching every consumer.
function withFullName(user) {
  if (!user || user.full_name) return user;
  const full_name = [user.fname, user.lname].filter(Boolean).join(' ').trim();
  return full_name ? { ...user, full_name } : user;
}

/**
 * @returns {Promise<{access_token: string, expires_in: number, user: object}>}
 */
export async function login(username, password) {
  let response;
  try {
    response = await fetch(`${SRV_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error('לא ניתן להתחבר לשרת. בדוק את החיבור לרשת');
  }

  if (!response.ok) {
    throw new Error(messageForStatus(response.status));
  }

  const body = await response.json();
  return { ...body, user: withFullName(body.user) };
}

/** @returns {Promise<object>} the current user, re-verified fresh by srv on every call */
export async function fetchMe(token) {
  const response = await fetch(`${SRV_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Session invalid');
  }
  const body = await response.json();
  return withFullName(body.user);
}
