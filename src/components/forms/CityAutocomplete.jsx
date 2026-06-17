import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { coverageAreas } from '@/config/coverageConstants';
import { sortedIsraelCities } from '@/config/israelCities';

// ===== CityAutocomplete =====
// רכיב חיפוש חי לבחירת עיר מתוך רשימה מלאה של ערים בישראל (לפי דרישת דורית נתי גרופ).
// כל עיר ממופה לאזור הכיסוי שלה (אם קיים) כדי להציג אותו לצד שם העיר.
// משותף לטופס קריאה חדשה ולדיאלוג שיבוץ הספק (שדות אחסנה / יעד).
const CITY_TO_AREA = coverageAreas.reduce((acc, area) => {
  area.cities.forEach((city) => {
    acc[city] = area.label;
  });
  return acc;
}, {});

const ALL_CITIES = sortedIsraelCities.map((city) => ({
  city,
  area: CITY_TO_AREA[city] || '',
}));

export default function CityAutocomplete({ value, onChange, placeholder = 'הקלד שם עיר...', id }) {
  const [cityQuery, setCityQuery] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [cityHighlighted, setCityHighlighted] = useState(0);

  const filteredCities =
    cityQuery.length > 0 ? ALL_CITIES.filter((c) => c.city.includes(cityQuery)).slice(0, 10) : [];

  const handleCitySelect = (cityObj) => {
    onChange(cityObj.city);
    setCityQuery('');
    setCityOpen(false);
  };

  const handleCityKeyDown = (e) => {
    if (!cityOpen || filteredCities.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCityHighlighted((h) => Math.min(h + 1, filteredCities.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCityHighlighted((h) => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCitySelect(filteredCities[cityHighlighted]);
    }
    if (e.key === 'Escape') {
      setCityOpen(false);
      setCityQuery('');
    }
  };

  return (
    <div className="relative" dir="rtl">
      {value ? (
        <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white">
          <span className="flex-1 text-sm">{value}</span>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setCityQuery('');
            }}
            className="text-gray-400 hover:text-red-500 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      ) : (
        <Input
          id={id}
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setCityOpen(true);
            setCityHighlighted(0);
          }}
          onFocus={() => {
            if (cityQuery) setCityOpen(true);
          }}
          onBlur={() => setTimeout(() => setCityOpen(false), 150)}
          onKeyDown={handleCityKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
      )}
      {cityOpen && filteredCities.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filteredCities.map((c, i) => (
            <div
              key={c.city}
              onMouseDown={() => handleCitySelect(c)}
              className={`px-3 py-2 cursor-pointer text-sm flex justify-between items-center ${
                i === cityHighlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              <span>{c.city}</span>
              <span className="text-xs text-gray-400">{c.area}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
