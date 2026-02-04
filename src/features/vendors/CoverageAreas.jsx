import React from 'react';
import { MapPin } from 'lucide-react';

export default function CoverageAreas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#212121]">אזורי כיסוי</h1>
          <p className="text-[#616161] text-sm">ניהול אזורי שירות וגבולות גזרה</p>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-16 text-center">
        <MapPin className="w-16 h-16 text-[#9E9E9E] mx-auto mb-4" />
        <h3 className="text-xl font-medium text-[#212121]">מפת אזורי כיסוי</h3>
        <p className="text-[#616161] mt-2">כאן תוצג מפה לניהול פוליגונים ואזורי שירות של ספקים.</p>
      </div>
    </div>
  );
}
