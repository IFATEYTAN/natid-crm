import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { fmtNum, fmtCurrency } from './ReportUtils';

export default function ReportKPICards({ cases }) {
  const total = cases.length;
  const monthly = total > 0 ? (total / 12).toFixed(1) : 0;
  const totalRevenue = cases.reduce((s, c) => s + (c.price || 0), 0);
  const avgCost = total > 0 ? (cases.reduce((s, c) => s + (c.cost || 0), 0) / total) : 0;
  const avgKm = total > 0 ? (cases.reduce((s, c) => s + (c.distance_km || 0), 0) / total) : 0;

  const kpis = [
    { label: 'סה"כ קריאות', value: fmtNum(total), color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { label: 'ממוצע חודשי', value: fmtNum(parseFloat(monthly).toFixed(0)), color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
    { label: 'מחזור כולל', value: fmtCurrency(totalRevenue), color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    { label: 'עלות ממוצעת לקריאה', value: fmtCurrency(avgCost.toFixed(0)), color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-700' },
    { label: 'ק"מ ממוצע לקריאה', value: `${avgKm.toFixed(1)} ק"מ`, color: 'bg-pink-50 border-pink-200', textColor: 'text-pink-700' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((k) => (
        <Card key={k.label} className={`border ${k.color}`}>
          <CardContent className="p-4 text-right">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.textColor}`}>{k.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}