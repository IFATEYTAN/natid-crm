import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtNum, fmtCurrency, fmtPct } from './ReportUtils';
import ExportMenu from './ExportMenu';

export default function TopVendorsDetailSection({ cases }) {
  const map = {};
  cases.forEach(c => {
    const key = c.assigned_provider_name || 'לא שובץ';
    if (!map[key]) map[key] = { total: 0, cost: 0, km: 0 };
    map[key].total++;
    map[key].cost += c.cost || 0;
    map[key].km += c.distance_km || 0;
  });

  const total = cases.length;
  const rows = Object.entries(map)
    .sort((a,b) => b[1].total - a[1].total)
    .slice(0, 15)
    .map(([name, v]) => ({
      name,
      total: v.total,
      pct: total > 0 ? (v.total/total*100).toFixed(1) : 0,
      avgCost: v.total > 0 ? (v.cost/v.total).toFixed(0) : 0,
      avgKm: v.total > 0 ? (v.km/v.total).toFixed(1) : 0,
    }));

  const exportData = rows.map((r, i) => ({
    '#': i+1, 'ספק': r.name, 'קריאות': r.total, '%': r.pct, 'עלות ממוצעת': r.avgCost, 'ק"מ ממוצע': r.avgKm,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">ספקים מובילים - פירוט (Top 15)</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(exportData, 'top-vendors-detail')}>
          <Download className="w-4 h-4 ms-1" /> Excel
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                {['#','ספק','קריאות','%','עלות ממוצעת','ק"מ ממוצע'].map(h => (
                  <th key={h} className="px-3 py-2 font-semibold text-gray-600 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 font-medium">{i+1}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{fmtNum(r.total)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{width:`${Math.min(100,r.pct*10)}%`}} />
                      </div>
                      {fmtPct(r.pct)}
                    </div>
                  </td>
                  <td className="px-3 py-2">{fmtCurrency(r.avgCost)}</td>
                  <td className="px-3 py-2">{r.avgKm} ק"מ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}