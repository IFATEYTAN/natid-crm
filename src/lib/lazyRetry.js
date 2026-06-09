import { lazy } from 'react';

/**
 * Wraps a dynamic import with retry logic for chunk loading failures.
 * On failure, retries once with a cache-busting query param.
 * If still failing, forces a page reload (likely a new deployment).
 */
/**
 * Clears the Service Worker and Cache Storage so the next load fetches fresh
 * assets. A plain reload() is served by the SW from its (stale) cache, so the
 * chunk error would just repeat — we must evict the cache first.
 */
async function evictStaleCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch (e) {
    // ignore - still attempt cache cleanup + reload
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    // ignore - still reload
  }
}

export function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch(async (error) => {
      const isChunkError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Loading CSS chunk') ||
        error?.name === 'ChunkLoadError';

      if (!isChunkError) {
        throw error;
      }

      // Check if we already tried reloading for this session
      const reloadKey = 'chunk-reload-' + window.location.pathname;
      const alreadyReloaded = sessionStorage.getItem(reloadKey);

      if (alreadyReloaded) {
        sessionStorage.removeItem(reloadKey);
        throw error;
      }

      // Mark that we're about to reload, evict stale caches, then reload so the
      // fresh deployment's chunks are actually fetched from the network.
      sessionStorage.setItem(reloadKey, '1');
      await evictStaleCaches();
      window.location.reload();

      // Return a never-resolving promise to prevent rendering while reloading
      return new Promise(() => {});
    })
  );
}
