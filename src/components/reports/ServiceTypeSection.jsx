import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { SERVICE_TYPE_HE, COLORS, fmtNum, fmtCurrency, fmtPct } from './ReportUtils';
import ExportMenu from './ExportMenu';

export default function ServiceTypeSection({ cases }) {
  const map = {};
  cases.forEach((c) => {
    const key = c.service_type || 'other';
    if (!map[key]) map[key] = { total: 0, revenue: 0, cost: 0 };
    map[key].total++;
    map[key].revenue += c.price || 0;
    map[key].cost += c.cost || 0;
  });

  const total = cases.length;
  const rows = Object.entries(map)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([type, v]) => ({
      name: SERVICE_TYPE_HE[type] || type,
      type,
      total: v.total,
      pct: total > 0 ? ((v.total / total) * 100).toFixed(1) : 0,
      revenue: v.revenue,
      avgCost: v.total > 0 ? (v.cost / v.total).toFixed(0) : 0,
    }));

  const exportData = rows.map((r) => ({
    'סוג שירות': r.name,
    'סה"כ': r.total,
    '%': r.pct,
    הכנסות: r.revenue,
    'עלות ממוצעת': r.avgCost,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">פילוח לפי סוג שירות</CardTitle>
        <ExportMenu data={exportData} filename="service-type" title="פילוח לפי סוג שירות" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, pct }) => `${name} ${pct}%`}
                labelLine={false}
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50">
                <tr>
                  {['סוג שירות', 'סה"כ', '%', 'הכנסות', 'עלות ממוצעת'].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold text-gray-600 border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.type} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      {r.name}
                    </td>
                    <td className="px-3 py-2">{fmtNum(r.total)}</td>
                    <td className="px-3 py-2">{fmtPct(r.pct)}</td>
                    <td className="px-3 py-2">{fmtCurrency(r.revenue)}</td>
                    <td className="px-3 py-2">{fmtCurrency(r.avgCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
