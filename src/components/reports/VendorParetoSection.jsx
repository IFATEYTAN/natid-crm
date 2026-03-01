import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { COLORS, fmtNum, fmtPct, exportToExcel } from './ReportUtils';

export default function VendorParetoSection({ cases }) {
  const map = {};
  cases.forEach(c => {
    const key = c.assigned_provider_name || 'לא שובץ';
    if (!map[key]) map[key] = 0;
    map[key]++;
  });

  const total = cases.length;
  const sorted = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 20);
  let cumulative = 0;
  const rows = sorted.map(([name, count]) => {
    cumulative += count;
    return {
      name: name.length > 12 ? name.slice(0,12)+'…' : name,
      fullName: name,
      total: count,
      pct: total > 0 ? (count/total*100).toFixed(1) : 0,
      cumPct: total > 0 ? (cumulative/total*100).toFixed(1) : 0,
    };
  });

  const exportData = rows.map(r => ({
    'ספק': r.fullName, 'סה"כ קריאות': r.total, '%': r.pct, 'מצטבר %': r.cumPct,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">ספקים מובילים - פארטו (Top 20)</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(exportData, 'vendor-pareto')}>
          <Download className="w-4 h-4 ms-1" /> Excel
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={rows} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} domain={[0,100]} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="total" name='קריאות' fill="#3b82f6" radius={[4,4,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumPct" name="% מצטבר" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                {['#','ספק','סה"כ קריאות','%','% מצטבר'].map(h => (
                  <th key={h} className="px-3 py-2 font-semibold text-gray-600 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.fullName} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{i+1}</td>
                  <td className="px-3 py-2 font-medium">{r.fullName}</td>
                  <td className="px-3 py-2">{fmtNum(r.total)}</td>
                  <td className="px-3 py-2">{fmtPct(r.pct)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{width:`${r.cumPct}%`}} />
                      </div>
                      {fmtPct(r.cumPct)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}