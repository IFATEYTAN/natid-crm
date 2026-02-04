import React from 'react';
import { useAuth } from '@/providers/AuthProvider';

const AppAccessDeniedError = () => {
  const { logout, authError } = useAuth();

  const handleLogout = async () => {
    // Unregister service worker before logout
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (e) {
        /* ignore */
      }
    }
    logout(true);
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50"
      dir="rtl"
    >
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">הגישה נדחתה</h1>
          <p className="text-slate-600 mb-6">
            {authError?.message || 'אפליקציה זו פרטית. אין לך הרשאת גישה.'}
          </p>
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 mb-6">
            <p>ייתכן שהסיבה היא:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-right">
              <li>האפליקציה פרטית ודורשת הרשאות מיוחדות</li>
              <li>לחשבון שלך אין את רמת הגישה הנדרשת</li>
              <li>הקישור שבו השתמשת שגוי</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              נסה חשבון אחר
            </button>
            <a
              href="/"
              className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors inline-block"
            >
              חזרה לדף הבית
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppAccessDeniedError;
