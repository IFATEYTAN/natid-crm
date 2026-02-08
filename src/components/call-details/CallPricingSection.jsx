import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CallPricingSection({ call, callId }) {
  const [calculating, setCalculating] = useState(false);
  const [breakdown, setBreakdown] = useState(null);

  const { data: rates = [] } = useQuery({
    queryKey: ['operationalRates'],
    queryFn: () => base44.entities.OperationalRate.filter({ is_active: true }),
  });

  const { data: callProducts = [] } = useQuery({
    queryKey: ['callProducts', callId],
    queryFn: () => base44.entities.CallProduct.filter({ call_id: callId }),
    enabled: !!callId,
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['deposits', callId],
    queryFn: () => base44.entities.Deposit.filter({ call_id: callId }),
    enabled: !!callId,
  });

  const calculatePricing = () => {
    setCalculating(true);
    const items = [];
    let total = 0;

    // 1. Base rate
    const baseRate = rates.find((r) => r.rate_type === 'base');
    if (baseRate) {
      items.push({ label: 'תעריף בסיס', amount: baseRate.amount, type: 'base' });
      total += baseRate.amount;
    }

    // 2. Time surcharge (morning/night)
    const callHour = call?.created_date
      ? new Date(call.created_date).getHours()
      : new Date().getHours();
    const timeRates = rates.filter((r) => r.rate_type === 'time_surcharge');
    for (const tr of timeRates) {
      const from = tr.applies_from_hour ?? 0;
      const to = tr.applies_to_hour ?? 24;
      let matches = false;
      if (from < to) {
        matches = callHour >= from && callHour < to;
      } else {
        matches = callHour >= from || callHour < to;
      }
      if (matches) {
        const surcharge = tr.is_percentage ? (total * tr.amount) / 100 : tr.amount;
        items.push({ label: tr.condition_label || tr.name, amount: surcharge, type: 'surcharge' });
        total += surcharge;
      }
    }

    // 3. Area surcharge
    const area = call?.pickup_location_area;
    if (area) {
      const areaRates = rates.filter(
        (r) => r.rate_type === 'area_surcharge' && (r.applies_to_areas || []).includes(area)
      );
      for (const ar of areaRates) {
        const surcharge = ar.is_percentage ? (total * ar.amount) / 100 : ar.amount;
        items.push({ label: ar.condition_label || ar.name, amount: surcharge, type: 'surcharge' });
        total += surcharge;
      }
    }

    // 4. Toll road (kvish 6)
    if (call?.is_toll_road) {
      const tollRates = rates.filter((r) => r.rate_type === 'toll_road');
      for (const tr of tollRates) {
        const surcharge = tr.is_percentage ? (total * tr.amount) / 100 : tr.amount;
        items.push({
          label: tr.condition_label || 'תוספת כביש אגרה',
          amount: surcharge,
          type: 'surcharge',
        });
        total += surcharge;
      }
    }

    // 5. Vehicle type surcharge
    if (call?.vehicle_type) {
      const vehicleRates = rates.filter(
        (r) =>
          r.rate_type === 'vehicle_type' &&
          (r.applies_to_vehicle_types || []).includes(call.vehicle_type)
      );
      for (const vr of vehicleRates) {
        const surcharge = vr.is_percentage ? (total * vr.amount) / 100 : vr.amount;
        items.push({ label: vr.condition_label || vr.name, amount: surcharge, type: 'surcharge' });
        total += surcharge;
      }
    }

    // 6. KM charge
    if (call?.estimated_distance_km) {
      const kmRate = rates.find(
        (r) => r.rate_type === 'service_type' && r.condition_key === 'per_km'
      );
      if (kmRate) {
        const kmCharge = call.estimated_distance_km * kmRate.amount;
        items.push({
          label: `${call.estimated_distance_km} ק"מ × ₪${kmRate.amount}`,
          amount: kmCharge,
          type: 'km',
        });
        total += kmCharge;
      }
    }

    // 7. Products
    const productsTotal = callProducts.reduce((sum, cp) => sum + (cp.total_price || 0), 0);
    if (productsTotal > 0) {
      items.push({
        label: `מוצרים (${callProducts.length} פריטים)`,
        amount: productsTotal,
        type: 'products',
      });
      total += productsTotal;
    }

    // 8. Deposits
    const activeDeposits = deposits.filter((d) => d.status === 'active' || d.status === 'charged');
    const depositTotal = activeDeposits.reduce(
      (sum, d) => sum + (d.charged_amount || d.amount || 0),
      0
    );

    setBreakdown({ items, total: Math.round(total), productsTotal, depositTotal });
    setCalculating(false);
  };

  const handleSaveToCall = async () => {
    if (!breakdown) return;
    await base44.entities.Call.update(callId, {
      payment_amount_customer: breakdown.total,
      cost_to_vendor: breakdown.total, // Can be overridden separately
    });
    toast.success('המחיר עודכן בקריאה');
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#3b82f6]" />
            תעריפון תפעול
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={calculatePricing}
            isLoading={calculating}
            className="gap-1"
          >
            <RefreshCw className="w-3 h-3" /> חשב תעריף
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!breakdown ? (
          <div className="text-center py-6">
            <Calculator className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">לחץ "חשב תעריף" לחישוב אוטומטי</p>
            <p className="text-xs text-gray-300 mt-1">לפי שעה, אזור, כביש 6, סוג רכב ומרחק</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Breakdown */}
            <div className="space-y-1.5">
              {breakdown.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm py-1 px-2 rounded hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.type === 'base'
                        ? 'בסיס'
                        : item.type === 'surcharge'
                          ? 'תוספת'
                          : item.type === 'km'
                            ? 'ק"מ'
                            : item.type === 'products'
                              ? 'מוצרים'
                              : ''}
                    </Badge>
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium">₪{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold">סה"כ לחיוב:</span>
                <span className="font-bold text-2xl text-[#111827]">
                  ₪{breakdown.total.toLocaleString()}
                </span>
              </div>
              {breakdown.depositTotal > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                  <span>עירבונות:</span>
                  <span>-₪{breakdown.depositTotal.toLocaleString()}</span>
                </div>
              )}
              {breakdown.depositTotal > 0 && (
                <div className="flex justify-between items-center text-sm font-medium mt-1">
                  <span>יתרה לגבייה:</span>
                  <span className="text-green-700">
                    ₪{Math.max(0, breakdown.total - breakdown.depositTotal).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <Button onClick={handleSaveToCall} className="w-full gap-2 mt-2">
              <Check className="w-4 h-4" /> שמור מחיר בקריאה
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
