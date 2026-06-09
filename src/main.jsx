import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// When a new service worker takes control (a fresh deployment activated via
// skipWaiting/clientsClaim), reload once so the page runs the new assets
// instead of getting stuck on stale chunks. Guarded against reload loops.
// Skip the reload on first visit: with no prior controller, the initial SW
// install also fires controllerchange and a reload there would be needless.
if ('serviceWorker' in navigator) {
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
