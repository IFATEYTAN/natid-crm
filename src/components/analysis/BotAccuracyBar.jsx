import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BotAccuracyBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }}
          height={70}
          interval={0}
        />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          formatter={(value) => [`${value}%`, 'דיוק']}
          labelFormatter={(label) => `${label}`}
        />
        <Bar dataKey="accuracy" fill="#10b981" radius={[4, 4, 0, 0]} name="דיוק (%)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
