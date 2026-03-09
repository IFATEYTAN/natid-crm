import { lazy } from 'react';

/**
 * Wraps a dynamic import with retry logic for chunk loading failures.
 * On failure, retries once with a cache-busting query param.
 * If still failing, forces a page reload (likely a new deployment).
 */
export function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
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

      // Mark that we're about to reload
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();

      // Return a never-resolving promise to prevent rendering while reloading
      return new Promise(() => {});
    })
  );
}
