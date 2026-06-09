import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// Recover clients trapped on a stale PWA/Service Worker build.
// Old service workers can serve outdated module URLs and cause
// "Failed to fetch dynamically imported module" errors after a deploy.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    })
    .catch(() => {});

  if (typeof caches !== 'undefined') {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  }
}

// One-time hard reload when a dynamic import fails due to a stale chunk.
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('reloaded_after_preload_error')) {
    sessionStorage.setItem('reloaded_after_preload_error', '1');
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);