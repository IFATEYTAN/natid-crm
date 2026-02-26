/**
 * Demo Mode Utility
 *
 * Activates demo mode via URL parameter: ?demo=true
 * Deactivates via: ?demo=false
 * Persists in localStorage across navigations.
 */

const DEMO_STORAGE_KEY = 'natid_demo_mode';

/**
 * Check if demo mode is currently active.
 * On first load, checks URL params and persists to localStorage.
 */
export function isDemoMode() {
  // Check URL param first (takes priority)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
      localStorage.setItem(DEMO_STORAGE_KEY, 'true');
      return true;
    }
    if (urlParams.get('demo') === 'false') {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      return false;
    }
  }
  // Fallback to localStorage
  return typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
}

/**
 * Deactivate demo mode and reload.
 */
export function deactivateDemoMode() {
  localStorage.removeItem(DEMO_STORAGE_KEY);
  window.location.href = window.location.origin + window.location.pathname;
}
