import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, Lock } from 'lucide-react';

// Surcharge columns shown per row (percentage values). Label + entity field.
const surcharges = [
  { key: 'evening_extra_pct', label: 'ערב' },
  { key: 'night_extra_pct', label: 'לילה' },
  { key: 'holiday_extra_pct', label: 'חג' },
  { key: 'commercial_extra_pct', label: 'מסחרי' },
  { key: 'truck_extra_pct', label: 'משאית' },
  { key: 'territories_extra_pct', label: 'שטחים' },
];

const money = (v) => (v != null ? `₪${v}` : '—');
const pct = (v) => (v != null && v !== 0 ? `${v}%` : null);

// Read-only view of pricing mirrored from Nati (source of truth). No create/edit
// here on purpose — records carry is_managed_externally and are overwritten on
// each sync, so editing them would be lost.
export default function VendorPricingTab() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pricing = [], isLoading } = useQuery({
    queryKey: queryKeys.vendorPricing.all(),
    queryFn: () => base44.entities.VendorPricing.list('vendor_name'),
  });

  const filtered = pricing.filter(
    (p) => p.vendor_name?.includes(searchTerm) || p.vendor_id?.includes(searchTerm)
  );

  const lastSynced = pricing.find((p) => p.last_synced_at)?.last_synced_at;

  return (
    <div className="space-y-4 text-end" dir="rtl">
      <div className="flex flex-col sm:flex-row-reverse justify-between gap-4 items-center">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם ספק..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="text-end">
          <h2 className="text-xl font-bold text-gray-900 flex items-center justify-end gap-2">
            תעריפי ספקים (נתי)
            <Truck className="w-5 h-5 text-[#3b82f6]" />
          </h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center justify-end gap-1">
            <Lock className="w-3 h-3" />
            ממורר מנתי (קריאה בלבד)
            {lastSynced && ` · עודכן: ${new Date(lastSynced).toLocaleDateString('he-IL')}`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 py-6 text-center">טוען…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-400">
            אין תעריפי ספקים. הריצו את הסנכרון מנתי (importNatiPricing) כדי לטעון אותם.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{p.vendor_name}</span>
                  <Badge className="bg-gray-100 text-gray-600">ספק #{p.vendor_id}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 justify-start text-xs">
                  <Badge className="bg-blue-100 text-blue-800">
                    בסיס: {money(p.base_price)} ({p.base_distance_km || 0} ק"מ)
                  </Badge>
                  <Badge className="bg-blue-50 text-blue-700">
                    ק"מ נוסף: {money(p.extra_km_price)}
                  </Badge>
                  <Badge className="bg-blue-50 text-blue-700">
                    ק"מ סרק: {money(p.futile_km_price)}
                  </Badge>
                  {p.road6_price ? (
                    <Badge className="bg-amber-50 text-amber-700">
                      כביש 6: {money(p.road6_price)}
                    </Badge>
                  ) : null}
                  {surcharges
                    .map((s) => ({ label: s.label, val: pct(p[s.key]) }))
                    .filter((s) => s.val)
                    .map((s) => (
                      <Badge key={s.label} className="bg-purple-50 text-purple-700">
                        {s.label} +{s.val}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}