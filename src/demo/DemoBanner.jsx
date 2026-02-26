import React from 'react';
import { isDemoMode, deactivateDemoMode } from './demoMode';
import { X } from 'lucide-react';

/**
 * Demo mode banner displayed at the top of the screen.
 * Shows only when demo mode is active.
 */
export default function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white py-1.5 px-4 flex items-center justify-center gap-3 text-sm z-[9999] relative">
      <span className="font-medium">מצב הדגמה — נתונים לדוגמה בלבד</span>
      <button
        onClick={deactivateDemoMode}
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 text-xs transition-colors"
      >
        <X className="w-3 h-3" />
        יציאה
      </button>
    </div>
  );
}
