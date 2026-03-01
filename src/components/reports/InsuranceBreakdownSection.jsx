import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MONTHS_HE, COLORS, fmtNum, fmtCurrency, fmtPct, getMonth } from './ReportUtils';
import ExportMenu from './ExportMenu';

export default function InsuranceBreakdownSection({ cases }) {
  const map = {};
  cases.forEach(c => {
    const key = c.insurance_company || 'לא ידוע';
    if (!map[key]) map[key] = { name: key, total: 0, completed: 0, revenue: 0, cost: 0, km: 0 };
    map[key].total++;
    if (c.status === 'completed') map[key].completed++;
    map[key].revenue += c.price || 0;
    map[key].cost += c.cost || 0;
    map[key].km += c.distance_km || 0;
  });

  const total = cases.length;
  const rows = Object.values(map)
    .sort((a, b) => b.total - a.total)
    .map(r => ({
      ...r,
      pct: total > 0 ? (r.total / total * 100).toFixed(1) : 0,
      monthlyAvg: (r.total / 12).toFixed(1),
      avgCost: r.total > 0 ? (r.cost / r.total).toFixed(0) : 0,
      avgKm: r.total > 0 ? (r.km / r.total).toFixed(1) : 0,
    }));

  const chartData = rows.slice(0, 15);

  const exportData = rows.map(r => ({
    'חברת ביטוח': r.name, 'סה"כ': r.total, '%': r.pct, 'הושלמו': r.completed,
    'ממוצע חודשי': r.monthlyAvg, 'הכנסות': r.revenue, 'עלות ממוצעת': r.avgCost, 'ק"מ ממוצע': r.avgKm,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">פילוח לפי חברת ביטוח</CardTitle>
        <ExportMenu data={exportData} filename="insurance-breakdown" title="פילוח לפי חברת ביטוח" />
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total" name='סה"כ קריאות' radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                {['חברת ביטוח','סה"כ','%','הושלמו','ממוצע חודשי','הכנסות','עלות ממוצעת','ק"מ ממוצע'].map(h => (
                  <th key={h} className="px-3 py-2 font-semibold text-gray-600 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{fmtNum(r.total)}</td>
                  <td className="px-3 py-2">{fmtPct(r.pct)}</td>
                  <td className="px-3 py-2">{fmtNum(r.completed)}</td>
                  <td className="px-3 py-2">{r.monthlyAvg}</td>
                  <td className="px-3 py-2">{fmtCurrency(r.revenue)}</td>
                  <td className="px-3 py-2">{fmtCurrency(r.avgCost)}</td>
                  <td className="px-3 py-2">{r.avgKm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}