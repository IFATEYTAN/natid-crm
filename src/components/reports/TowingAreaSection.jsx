import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COLORS, fmtNum, fmtCurrency, fmtPct } from './ReportUtils';
import ExportMenu from './ExportMenu';

export default function TowingAreaSection({ cases }) {
  const map = {};
  cases.forEach(c => {
    const key = c.towing_area || 'לא ידוע';
    if (!map[key]) map[key] = { total: 0, cost: 0, km: 0 };
    map[key].total++;
    map[key].cost += c.cost || 0;
    map[key].km += c.distance_km || 0;
  });

  const total = cases.length;
  const rows = Object.entries(map)
    .sort((a,b) => b[1].total - a[1].total)
    .map(([area, v]) => ({
      name: area,
      total: v.total,
      pct: total > 0 ? (v.total/total*100).toFixed(1) : 0,
      avgCost: v.total > 0 ? (v.cost/v.total).toFixed(0) : 0,
      avgKm: v.total > 0 ? (v.km/v.total).toFixed(1) : 0,
    }));

  const chartData = rows.slice(0, 15).map(r => ({
    ...r, name: r.name.length > 12 ? r.name.slice(0,12)+'…' : r.name,
  }));

  const exportData = rows.map(r => ({
    'אזור גרירה': r.name, 'סה"כ': r.total, '%': r.pct, 'עלות ממוצעת': r.avgCost, 'ק"מ ממוצע': r.avgKm,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">פילוח לפי אזור גרירה</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(exportData, 'towing-area')}>
          <Download className="w-4 h-4 ms-1" /> Excel
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total" name='קריאות' radius={[4,4,0,0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                {['אזור גרירה','סה"כ','%','עלות ממוצעת','ק"מ ממוצע'].map(h => (
                  <th key={h} className="px-3 py-2 font-semibold text-gray-600 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{fmtNum(r.total)}</td>
                  <td className="px-3 py-2">{fmtPct(r.pct)}</td>
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