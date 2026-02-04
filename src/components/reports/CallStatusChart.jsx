import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיוך',
  assigning: 'בשיוך',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

const statusColors = {
  waiting_treatment: '#F59E0B',
  awaiting_assignment: '#FF6B6B',
  assigning: '#8B5CF6',
  vendor_enroute: '#FFA07A',
  in_progress: '#0EA5E9',
  completed: '#4ECDC4',
  cancelled: '#A3A3A3',
};

export default function CallStatusChart({ calls }) {
  const data = useMemo(() => {
    const statusCounts = {};
    calls.forEach((call) => {
      const status = call.call_status || 'waiting_treatment';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status] || '#9E9E9E',
      status, // keep original status key for color mapping
    }));
  }, [calls]);

  return (
    <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <CardHeader>
        <CardTitle className="text-[20px] font-medium text-[#212121] text-right">
          התפלגות קריאות לפי סטטוס
        </CardTitle>
      </CardHeader>
      <CardContent dir="rtl">
        <div className="relative" style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontFamily: 'Heebo, sans-serif',
                  textAlign: 'right',
                }}
                formatter={(value, name, props) => {
                  const total = data.reduce((a, b) => a + b.value, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percent}%)`, name];
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontFamily: 'Heebo, sans-serif' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
