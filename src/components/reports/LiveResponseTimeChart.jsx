import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function LiveResponseTimeChart({ calls, vendors }) {
  const data = useMemo(() => {
    if (vendors.length === 0) return [];

    const vendorResponseTimes = vendors
      .map((vendor) => {
        const vendorCalls = calls.filter(
          (c) => c.assigned_vendor_id === vendor.id && c.time_to_vendor_assignment !== null
        );

        if (vendorCalls.length === 0) return null;

        const avgTime =
          vendorCalls.reduce((sum, c) => sum + c.time_to_vendor_assignment, 0) / vendorCalls.length;

        return {
          name: vendor.vendor_name,
          avgTime: Math.round(avgTime),
          callCount: vendorCalls.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10);

    return vendorResponseTimes;
  }, [calls, vendors]);

  const getColor = (time) => {
    if (time <= 20) return '#22C55E';
    if (time <= 30) return '#0EA5E9';
    if (time <= 40) return '#F59E0B';
    return '#FF6B6B';
  };

  if (data.length === 0) return null;

  return (
    <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle className="text-[20px] font-medium text-[#212121] text-right">
            זמני תגובה ממוצעים - 10 ספקים מובילים
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-[#2E7D32]">
            <TrendingUp className="w-4 h-4" />
            <span>עדכון בזמן אמת</span>
          </div>
        </div>
      </CardHeader>
      <CardContent dir="rtl">
        <div className="relative" style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'Heebo' }} unit=" דק'" />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 12, fontFamily: 'Heebo' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontFamily: 'Heebo, sans-serif',
                  textAlign: 'right',
                  direction: 'rtl',
                }}
                formatter={(value, name, props) => {
                  return [`${value} דקות (${props.payload.callCount} קריאות)`, 'זמן תגובה'];
                }}
              />
              <Bar dataKey="avgTime" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.avgTime)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 justify-end text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">מצוין (≤20 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">טוב (21-30 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#0EA5E9]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">סביר (31-40 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">דורש שיפור ({'>'}40 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
