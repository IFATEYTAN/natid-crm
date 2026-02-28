import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CarTypeBar({ data }) {
  const total = Array.isArray(data) ? data.reduce((s, i) => s + (i?.value || 0), 0) : 0;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ right: 20, left: 10, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
        <XAxis type="number" tickFormatter={(v) => Number(v).toLocaleString()} />
        <YAxis
          dataKey="name"
          type="category"
          width={120}
          tick={{ fontSize: 12, fill: '#374151' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => {
            const pct = total ? Math.round((value / total) * 100) : 0;
            return [`${Number(value).toLocaleString()} (${pct}%)`, 'קריאות'];
          }}
          contentStyle={{ direction: 'rtl', textAlign: 'right' }}
        />
        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
