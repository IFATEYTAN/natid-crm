import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// When a new service worker takes control (a fresh deployment activated via
// skipWaiting/clientsClaim), reload once so the page runs the new assets
// instead of getting stuck on stale chunks. Guarded against reload loops.
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
