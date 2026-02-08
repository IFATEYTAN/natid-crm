import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, MapPin, Car, Clock } from 'lucide-react';
import { format, eachDayOfInterval, subDays } from 'date-fns';

const areaLabels = {
  center: 'מרכז', sharon: 'שרון', north: 'צפון', south: 'דרום', jerusalem: 'ירושלים', lowlands: 'שפלה',
};
const vehicleLabels = {
  private: 'פרטי', commercial_light: 'מסחרי קל', truck: 'משאית', motorcycle: 'אופנוע',
};
const issueLabels = {
  mechanical: 'מכנית', stopped_driving: 'לא נוסע', flat_tire: "פנצ'ר", stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה', no_fuel: 'דלק', dead_battery: 'מצבר', locked_keys: 'מפתחות', other: 'אחר',
};

export default function UsageReport({ calls }) {
  const byArea = useMemo(() => {
    const counts = {};
    calls.forEach(c => {
      const area = c.pickup_location_area || 'unknown';
      counts[area] = (counts[area] || 0) + 1;
    });
    return Object.entries(counts).map(([area, count]) => ({
      name: areaLabels[area] || area, value: count,
    })).sort((a, b) => b.value - a.value);
  }, [calls]);

  const byVehicle = useMemo(() => {
    const counts = {};
    calls.forEach(c => {
      const vt = c.vehicle_type || 'unknown';
      counts[vt] = (counts[vt] || 0) + 1;
    });
    return Object.entries(counts).map(([vt, count]) => ({
      name: vehicleLabels[vt] || vt, value: count,
    })).sort((a, b) => b.value - a.value);
  }, [calls]);

  const byHour = useMemo(() => {
    const hours = Array(24).fill(0);
    calls.forEach(c => {
      const h = new Date(c.created_date).getHours();
      hours[h]++;
    });
    return hours.map((count, h) => ({ hour: `${h}:00`, קריאות: count }));
  }, [calls]);

  const byIssue = useMemo(() => {
    const counts = {};
    calls.forEach(c => {
      const type = c.issue_type || 'other';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: issueLabels[type] || type, value: count,
    })).sort((a, b) => b.value - a.value);
  }, [calls]);

  const tollRoadCalls = calls.filter(c => c.is_toll_road).length;
  const avgDistance = calls.filter(c => c.estimated_distance_km).reduce((sum, c) => sum + c.estimated_distance_km, 0) / (calls.filter(c => c.estimated_distance_km).length || 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Activity className="w-5 h-5 text-blue-600" /></div>
            <div><div className="text-2xl font-bold">{calls.length}</div><div className="text-xs text-gray-500">קריאות בתקופה</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><MapPin className="w-5 h-5 text-green-600" /></div>
            <div><div className="text-2xl font-bold">{byArea.length}</div><div className="text-xs text-gray-500">אזורים פעילים</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Car className="w-5 h-5 text-purple-600" /></div>
            <div><div className="text-2xl font-bold">{tollRoadCalls}</div><div className="text-xs text-gray-500">כביש אגרה</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"><Clock className="w-5 h-5 text-orange-600" /></div>
            <div><div className="text-2xl font-bold">{Math.round(avgDistance)}</div><div className="text-xs text-gray-500">ק"מ ממוצע</div></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">קריאות לפי שעה ביום</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="קריאות" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">קריאות לפי אזור</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byArea} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">סוגי תקלות</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byIssue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#111827" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">סוגי רכב</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byVehicle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6b7280" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}