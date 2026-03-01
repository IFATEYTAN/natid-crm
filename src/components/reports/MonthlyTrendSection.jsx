import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MONTHS_HE, fmtNum, fmtCurrency, fmtPct, getMonth } from './ReportUtils';
import ExportMenu from './ExportMenu';

export default function MonthlyTrendSection({ cases }) {
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const mCases = cases.filter(c => getMonth(c.created_date) === i);
    const completed = mCases.filter(c => c.status === 'completed').length;
    const revenue = mCases.reduce((s, c) => s + (c.price || 0), 0);
    const avgCost = mCases.length > 0 ? mCases.reduce((s, c) => s + (c.cost || 0), 0) / mCases.length : 0;
    const avgKm = mCases.length > 0 ? mCases.reduce((s, c) => s + (c.distance_km || 0), 0) / mCases.length : 0;
    return { month: MONTHS_HE[i], monthIdx: i, total: mCases.length, completed, revenue, avgCost, avgKm };
  });

  // MoM % change
  const withMom = byMonth.map((m, i) => {
    const prev = i > 0 ? byMonth[i - 1].total : null;
    const mom = prev != null && prev > 0 ? ((m.total - prev) / prev * 100).toFixed(1) : null;
    // 3-month moving avg
    const vals = byMonth.slice(Math.max(0, i - 2), i + 1).map(x => x.total);
    const ma3 = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    return { ...m, mom, ma3: parseFloat(ma3) };
  });

  // Quarterly
  const quarters = [0, 1, 2, 3].map(q => {
    const months = byMonth.slice(q * 3, q * 3 + 3);
    return {
      quarter: `Q${q + 1}`,
      total: months.reduce((s, m) => s + m.total, 0),
      revenue: months.reduce((s, m) => s + m.revenue, 0),
    };
  });

  const exportData = withMom.map(m => ({
    'חודש': m.month, 'סה"כ': m.total, 'הושלמו': m.completed,
    'שינוי MoM%': m.mom ?? '—', 'ממוצע נע 3M': m.ma3,
    'הכנסות': m.revenue, 'עלות ממוצעת': m.avgCost.toFixed(0), 'ק"מ ממוצע': m.avgKm.toFixed(1),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">מגמה חודשית</CardTitle>
        <ExportMenu data={exportData} filename="monthly-trend" title="מגמה חודשית" />
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={withMom} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" name='סה"כ קריאות' stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="ma3" name="ממוצע נע 3M" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                {['חודש','סה"כ','הושלמו','MoM%','ממוצע נע 3M','הכנסות','עלות ממוצעת','ק"מ ממוצע'].map(h => (
                  <th key={h} className="px-3 py-2 font-semibold text-gray-600 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withMom.map((m) => (
                <tr key={m.month} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{m.month}</td>
                  <td className="px-3 py-2">{fmtNum(m.total)}</td>
                  <td className="px-3 py-2">{fmtNum(m.completed)}</td>
                  <td className={`px-3 py-2 ${m.mom > 0 ? 'text-green-600' : m.mom < 0 ? 'text-red-600' : ''}`}>
                    {m.mom != null ? `${m.mom > 0 ? '+' : ''}${m.mom}%` : '—'}
                  </td>
                  <td className="px-3 py-2">{m.ma3}</td>
                  <td className="px-3 py-2">{fmtCurrency(m.revenue)}</td>
                  <td className="px-3 py-2">{fmtCurrency(m.avgCost.toFixed(0))}</td>
                  <td className="px-3 py-2">{m.avgKm.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-4 gap-3 pt-2">
          {quarters.map(q => (
            <Card key={q.quarter} className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-right">
                <p className="text-xs text-gray-500">{q.quarter}</p>
                <p className="text-xl font-bold text-blue-700">{fmtNum(q.total)}</p>
                <p className="text-xs text-gray-500">{fmtCurrency(q.revenue)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}