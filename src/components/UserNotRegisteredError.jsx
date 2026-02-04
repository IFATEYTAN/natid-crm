import React from 'react';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  const handleLogin = async () => {
    // Unregister service worker before redirecting
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (e) {
        console.warn('Failed to unregister service worker:', e);
      }
    }

    // Clear stored token and redirect to platform login
    localStorage.removeItem('base44_access_token');
    localStorage.removeItem('token');
    sessionStorage.clear();

    try {
      base44.auth.redirectToLogin('/Dashboard');
    } catch (e) {
      console.error('redirectToLogin failed:', e);
      const appBaseUrl = localStorage.getItem('base44_app_base_url') || '';
      window.location.href = `${appBaseUrl}/login?from_url=${encodeURIComponent(window.location.origin)}`;
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50"
      dir="rtl"
    >
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
            <svg
              className="w-8 h-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">הגישה מוגבלת</h1>
          <p className="text-slate-600 mb-6">
            המשתמש שלך אינו רשום לאפליקציה זו. ניתן לפנות למנהל המערכת לקבלת גישה.
          </p>
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 mb-6">
            <p>אם אתה חושב שזו טעות:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-right">
              <li>ודא שאתה מחובר עם החשבון הנכון</li>
              <li>פנה למנהל המערכת לקבלת גישה</li>
              <li>נסה להתנתק ולהתחבר מחדש</li>
            </ul>
          </div>
          <button
            onClick={handleLogin}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            התחבר עם חשבון אחר
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;