import React from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, ArrowRight, MapPin, Users, Truck, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';

// Dedicated, prominent demo landing screen. Lives on its own route (/Demo)
// instead of being a small button buried on the login form — operators kept
// missing it there. Reached from the Dashboard's "מצב הדגמה" action.
const FEATURES = [
  { icon: Truck, label: 'ניהול קריאות שירות מקצה לקצה' },
  { icon: Users, label: 'שיבוץ ספקים וטכנאים' },
  { icon: MapPin, label: 'מעקב GPS ומפות בזמן אמת' },
  { icon: BarChart3, label: 'דוחות, KPI ותובנות AI' },
];

export default function Demo() {
  // Full page reload is required so AuthProvider re-reads demo mode on boot
  // and swaps in the mock user + data before the dashboard renders.
  const enterDemo = () => {
    window.location.href = '/Dashboard?demo=true';
  };

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-4 animate-in fade-in duration-500"
      dir="rtl"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-600 to-purple-600 px-8 py-10 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-4">
            <PlayCircle className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">מצב הדגמה</h1>
          <p className="text-indigo-100 text-sm sm:text-base max-w-md mx-auto">
            סיור אינטראקטיבי במערכת עם נתונים לדוגמה — בלי צורך בחשבון או בחיבור לשרת.
            כל הנתונים מדומים ואינם משפיעים על המערכת האמיתית.
          </p>
        </div>

        <div className="px-8 py-8">
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={enterDemo}
            className="w-full h-14 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 gap-2 transition-transform hover:scale-[1.01]"
          >
            <PlayCircle className="w-5 h-5" />
            כניסה להדגמה
          </Button>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4" />
            יציאה ממצב ההדגמה זמינה בכל רגע מהבאנר העליון
          </div>

          <div className="text-center mt-6">
            <Link
              to={createPageUrl('Dashboard')}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              חזרה ללוח הבקרה
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
