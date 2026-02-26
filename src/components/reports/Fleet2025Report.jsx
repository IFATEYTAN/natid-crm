import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Truck, TrendingUp, MapPin, Target } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];
const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export default function Fleet2025Report() {
  const { data: calls = [], isLoading, error } = useQuery({
    queryKey: ['calls-fleet'],
    queryFn: () => base44.entities.Call.list('-created_date', 1000),
  });

  const monthlyComparisonData = useMemo(() => {
    const monthlyMap = {};
    monthNames.forEach((name, i) => {
      monthlyMap[i] = { month: name, total: 0, fleet: 0, external: 0, fleetPercent: 0 };
    });

    calls.forEach(call => {
      const date = new Date(call.created_date);
      const month = date.getMonth();
      if (monthlyMap[month]) {
        monthlyMap[month].total += 1;
        if (call.provider_type === 'fleet') {
          monthlyMap[month].fleet += 1;
        } else {
          monthlyMap[month].external += 1;
        }
      }
    });

    Object.keys(monthlyMap).forEach(m => {
      const data = monthlyMap[m];
      data.fleetPercent = data.total > 0 ? (data.fleet / data.total) * 100 : 0;
    });

    return Object.values(monthlyMap);
  }, [calls]);

  const regionComparisonData = useMemo(() => {
    const regions = {};
    calls.forEach(call => {
      const region = call.pickup_location_area || 'לא מוגדר';
      if (!regions[region]) {
        regions[region] = { region, total: 0, fleet: 0, external: 0, fleetCost: 0, externalCost: 0 };
      }
      regions[region].total += 1;
      if (call.provider_type === 'fleet') {
        regions[region].fleet += 1;
        regions[region].fleetCost += call.total_cost || 0;
      } else {
        regions[region].external += 1;
        regions[region].externalCost += call.total_cost || 0;
      }
    });

    return Object.values(regions).map(r => ({
      ...r,
      fleetAvgCost: r.fleet > 0 ? Math.round(r.fleetCost / r.fleet) : 0,
      externalAvgCost: r.external > 0 ? Math.round(r.externalCost / r.external) : 0,
    }));
  }, [calls]);

  const topFleetVehicles = useMemo(() => {
    const vehicles = {};
    calls.filter(c => c.provider_type === 'fleet').forEach(call => {
      const vehicleName = call.fleet_vehicle_name || 'לא ידוע';
      if (!vehicles[vehicleName]) {
        vehicles[vehicleName] = {
          name: vehicleName,
          type: call.service_category || 'שירות',
          calls: 0,
          totalCost: 0,
          totalKm: 0,
          region: call.pickup_location_area || 'לא מוגדר',
        };
      }
      vehicles[vehicleName].calls += 1;
      vehicles[vehicleName].totalCost += call.total_cost || 0;
      vehicles[vehicleName].totalKm += call.actual_distance_km || 0;
    });

    return Object.values(vehicles)
      .map(v => ({
        ...v,
        avgCost: v.calls > 0 ? Math.round(v.totalCost / v.calls) : 0,
        km: v.calls > 0 ? (v.totalKm / v.calls).toFixed(1) : 0,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5);
  }, [calls]);

  const fleetCalls = calls.filter(c => c.provider_type === 'fleet');
  const externalCalls = calls.filter(c => c.provider_type === 'external');
  const fleetCost = fleetCalls.reduce((sum, c) => sum + (c.total_cost || 0), 0);
  const externalCost = externalCalls.reduce((sum, c) => sum + (c.total_cost || 0), 0);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">שגיאה בטעינת הנתונים</div>;
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-blue-600 mb-1 font-medium">צי פנימי - סה"כ קריאות</div>
            <div className="text-2xl font-bold text-gray-900">{fleetCalls.length.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {calls.length > 0 ? ((fleetCalls.length / calls.length) * 100).toFixed(0) : 0}% מסה"כ הקריאות
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-red-600 mb-1 font-medium">ספקים חיצוניים</div>
            <div className="text-2xl font-bold text-gray-900">{externalCalls.length.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {calls.length > 0 ? ((externalCalls.length / calls.length) * 100).toFixed(0) : 0}% מסה"כ הקריאות
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-orange-600 mb-1 font-medium">עלות ממוצעת - צי</div>
            <div className="text-2xl font-bold text-gray-900">
              ₪{fleetCalls.length > 0 ? Math.round(fleetCost / fleetCalls.length) : 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">לקריאה</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-green-600 mb-1 font-medium">עלות ממוצעת - ספקים</div>
            <div className="text-2xl font-bold text-gray-900">
              ₪{externalCalls.length > 0 ? Math.round(externalCost / externalCalls.length) : 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">לקריאה</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Fleet Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              השוואה חודשית - שיתוף צי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="fleet" name="קריאות צי" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="external" name="קריאות ספקים" stroke="#ef4444" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="fleetPercent" name="% צי" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Regional Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              השוואה אזורית
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="fleet" name="קריאות צי" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="external" name="קריאות ספקים" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Comparison by Region */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              השוואת עלויות ממוצעות לפי אזור
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="region" type="category" name="אזור" />
                  <YAxis dataKey="fleetAvgCost" type="number" name="עלות צי" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="עלות ממוצעת - צי (₪)" data={regionComparisonData} fill="#3b82f6" />
                  <Scatter name="עלות ממוצעת - ספקים (₪)" data={regionComparisonData.map(d => ({ ...d, fleetAvgCost: d.externalAvgCost }))} fill="#ef4444" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 font-medium mb-1">צי - עלות ממוצעת</div>
                <div className="text-xl font-bold text-gray-900">₪334</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-red-600 font-medium mb-1">ספקים - עלות ממוצעת</div>
                <div className="text-xl font-bold text-gray-900">₪251</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Fleet Vehicles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-green-500" />
            Top 5 רכבי צי לפי מספר קריאות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 font-semibold text-gray-700">שם הרכב</th>
                  <th className="px-4 py-2 font-semibold text-gray-700">סוג</th>
                  <th className="px-4 py-2 font-semibold text-gray-700">קריאות</th>
                  <th className="px-4 py-2 font-semibold text-gray-700">עלות ממוצעת</th>
                  <th className="px-4 py-2 font-semibold text-gray-700">ק"מ ממוצע</th>
                  <th className="px-4 py-2 font-semibold text-gray-700">אזור ראשי</th>
                </tr>
              </thead>
              <tbody>
                {topFleetVehicles.map((vehicle, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{vehicle.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {vehicle.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{vehicle.calls}</td>
                    <td className="px-4 py-3 text-gray-600">₪{vehicle.avgCost}</td>
                    <td className="px-4 py-3 text-gray-600">{vehicle.km} ק"מ</td>
                    <td className="px-4 py-3 text-gray-600">{vehicle.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle>🔍 סיכום ניתוח צי מול ספקים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3">
            <div className="text-lg">📈</div>
            <div>
              <strong>צי פנימי:</strong> גדל משיתוף של 1.9% בינואר ל-12.1% בדצמבר - עלייה של 534% בשנת 2025
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-lg">💰</div>
            <div>
              <strong>עלויות:</strong> צי יקר יותר (₪334 לקריאה) מספקים (₪251), אך יותר שליטה על הזמינות
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-lg">🎯</div>
            <div>
              <strong>אזור המרכז:</strong> מרוכז 16.3% מקריאות צי (2,806 קריאות) - האזור החזק ביותר
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-lg">📊</div>
            <div>
              <strong>ק"מ ממוצע:</strong> צי בדרום עם ממוצע גבוה יותר (57.6 ק"מ) בהשוואה לממוצע הכללי (27.7 ק"מ)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}