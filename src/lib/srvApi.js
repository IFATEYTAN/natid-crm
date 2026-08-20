/**
 * Typed callers for srv.natid.co.il resource endpoints, built on srvFetch
 * (src/lib/srvClient.js). One function per endpoint — screens import these
 * instead of calling srvFetch directly, so the URL/param shape lives in one
 * place per resource.
 */
import { srvFetch } from '@/lib/srvClient';

// ---- Appeals (calls) ------------------------------------------------------

export function listAppeals(params = {}) {
  return srvFetch('/appeals', { params });
}

export function getAppeal(appealId, { isHistory = false, edit = false } = {}) {
  return srvFetch(`/appeals/${appealId}`, { params: { is_history: isHistory, edit } });
}

// ---- Appeal writes (Phase 2) -----------------------------------------------

export function lockAppeal(appealId, { continueId, departmentId } = {}) {
  return srvFetch(`/appeals/${appealId}/lock`, {
    method: 'POST',
    params: { continue_id: continueId, department_id: departmentId },
  });
}

export function unlockAppeal(appealId) {
  return srvFetch(`/appeals/${appealId}/unlock`, { method: 'POST' });
}

export function patchAppeal(appealId, body) {
  return srvFetch(`/appeals/${appealId}`, { method: 'PATCH', body });
}

export function assignSupplier(appealId, body) {
  return srvFetch(`/appeals/${appealId}/supplier`, { method: 'POST', body });
}

export function listAppealEvents(appealId) {
  return srvFetch(`/appeals/${appealId}/events`);
}

export function createAppealEvent(appealId, note) {
  return srvFetch(`/appeals/${appealId}/events`, { method: 'POST', body: { note } });
}

export function updateAppealReminder(appealId, body) {
  return srvFetch(`/appeals/${appealId}/reminder`, { method: 'PATCH', body });
}

// ---- Filter-dropdown lookups -----------------------------------------------

export function listCities(params = {}) {
  return srvFetch('/cities', { params });
}

export function listSuppliers(params = {}) {
  return srvFetch('/suppliers', { params });
}

export function getSupplier(kablanId) {
  return srvFetch(`/suppliers/${kablanId}`);
}

export function listRegions() {
  return srvFetch('/regions');
}

// ---- Clients / subscriptions ------------------------------------------------

export function searchClients(params) {
  return srvFetch('/clients', { params });
}

export function getClient(subId) {
  return srvFetch(`/clients/${subId}`);
}
