import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function ServeTypePie({ data, colors }) {
  const total = Array.isArray(data) ? data.reduce((s, i) => s + (i?.value || 0), 0) : 0;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={40}
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const pct = total ? Math.round((value / total) * 100) : 0;
            return [`${Number(value).toLocaleString()} (${pct}%)`, name];
          }}
          contentStyle={{ direction: 'rtl', textAlign: 'right' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
