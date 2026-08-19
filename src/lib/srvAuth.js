/**
 * Client for srv.natid.co.il's Nati-credential auth — replaces the Base44
 * platform login. The browser holds only this JWT; entity/data access still
 * goes through Base44 until it's migrated (see the workspace migration plan).
 */

import { srvFetch, SrvError, getStoredToken, setStoredToken, clearStoredToken } from './srvClient';

export { getStoredToken, setStoredToken, clearStoredToken };

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
  let body;
  try {
    body = await srvFetch('/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    });
  } catch (error) {
    if (error instanceof SrvError && error.status === 0) {
      throw new Error('לא ניתן להתחבר לשרת. בדוק את החיבור לרשת');
    }
    if (error instanceof SrvError) {
      throw new Error(messageForStatus(error.status));
    }
    throw error;
  }

  return { ...body, user: withFullName(body.user) };
}

/** @returns {Promise<object>} the current user, re-verified fresh by srv on every call */
export async function fetchMe() {
  const body = await srvFetch('/me');
  return withFullName(body.user);
}
