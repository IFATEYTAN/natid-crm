import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !deferredPrompt) return null;

  const install = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome) {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-4 end-4 z-50 bg-white border border-gray-200 rounded-md shadow p-3 flex items-center gap-3">
      <span className="text-sm text-gray-700">להתקין את האפליקציה במכשיר?</span>
      <button
        onClick={install}
        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
      >
        התקנה
      </button>
      <button
        onClick={() => setShow(false)}
        className="text-sm text-gray-500 hover:text-gray-700 px-2"
      >
        סגור
      </button>
    </div>
  );
}
