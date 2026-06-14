import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// One-time aggressive cleanup of any legacy service worker + caches.
// An older PWA build is still serving stale assets (e.g. the removed manual
// email/password login form) on some devices because its service worker keeps
// control and controllerchange never fires. Unregister every service worker
// and delete every cache once, then hard-reload to fetch the current build.
if ('serviceWorker' in navigator) {
  const CLEANUP_FLAG = 'sw_cleanup_v2';
  if (!sessionStorage.getItem(CLEANUP_FLAG)) {
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      const hadServiceWorker = registrations.length > 0;
      for (const registration of registrations) {
        await registration.unregister();
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      sessionStorage.setItem(CLEANUP_FLAG, '1');
      // Only reload if there was actually a stale SW to clear, to avoid loops.
      if (hadServiceWorker) {
        window.location.reload();
      }
    });
  }
}

// Native Vite signal that a dynamic import failed because its chunk is stale.
// One-time hard reload to fetch the fresh chunk (complements lazyRetry).
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('reloaded_after_preload_error')) {
    sessionStorage.setItem('reloaded_after_preload_error', '1');
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);