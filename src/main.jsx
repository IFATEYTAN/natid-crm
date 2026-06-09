import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// PWA stale-cache recovery. With skipWaiting + clientsClaim in the Workbox
// config (vite.config.js), a freshly deployed service worker activates and
// takes control immediately; reload once when that happens so the page runs
// the new assets instead of getting stuck on stale chunks. Guarded so the
// initial install (no prior controller) and reload loops are avoided.
if ('serviceWorker' in navigator) {
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });
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
