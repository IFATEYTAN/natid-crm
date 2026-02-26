import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Truck, TrendingUp, MapPin, Target } from 'lucide-react';

// === Fleet vs External Data ===

const monthlyComparisonData = [
  { month: 'ינואר', total: 3535, fleet: 68, external: 2743, fleetPercent: 1.92 },
  { month: 'פברואר', total: 3269, fleet: 136, external: 2385, fleetPercent: 4.16 },
  { month: 'מרץ', total: 3852, fleet: 197, external: 2936, fleetPercent: 5.11 },
  { month: 'אפריל', total: 3679, fleet: 298, external: 2792, fleetPercent: 8.10 },
  { month: 'מאי', total: 3846, fleet: 418, external: 3083, fleetPercent: 10.87 },
  { month: 'יוני', total: 3555, fleet: 407, external: 2848, fleetPercent: 11.45 },
  { month: 'יולי', total: 4793, fleet: 652, external: 3787, fleetPercent: 13.61 },
  { month: 'אוגוסט', total: 4655, fleet: 588, external: 3907, fleetPercent: 12.63 },
  { month: 'ספטמבר', total: 4329, fleet: 486, external: 3425, fleetPercent: 11.23 },
  { month: 'אוקטובר', total: 4146, fleet: 420, external: 3287, fleetPercent: 10.13 },
  { month: 'נובמבר', total: 3923, fleet: 368, external: 3076, fleetPercent: 9.38 },
  { month: 'דצמבר', total: 4356, fleet: 528, external: 3431, fleetPercent: 12.12 },
];

const regionComparisonData = [
  { region: 'המרכז', total: 17251, fleet: 2806, external: 13076, fleetAvgCost: 259, externalAvgCost: 215 },
  { region: 'לא מוגדר', total: 10051, fleet: 1175, external: 7509, fleetAvgCost: 326, externalAvgCost: 254 },
  { region: 'צפון', total: 5593, fleet: 920, external: 4214, fleetAvgCost: 435, externalAvgCost: 271 },
  { region: 'דרום', total: 4802, fleet: 296, external: 4108, fleetAvgCost: 457, externalAvgCost: 285 },
];

const topFleetVehicles = [
  { name: 'גרר נתי-מרכז-אדי', type: 'גרר', calls: 1629, avgCost: 357, km: 27.6, region: 'המרכז' },
  { name: 'ניידת נתי-יבגני-חדרה', type: 'ניידת', calls: 1454, avgCost: 106, km: 11.5, region: 'המרכז' },
  { name: 'גרר נתי-ראיד-15 טון מרכז', type: 'גרר', calls: 1084, avgCost: 473, km: 57.6, region: 'המרכז' },
  { name: 'ניידת נתי-אברי-צפון מערבי', type: 'ניידת', calls: 878, avgCost: 87, km: 9.2, region: 'צפון' },
  { name: 'גרר נתי-צפון-יואל', type: 'גרר', calls: 756, avgCost: 512, km: 48.3, region: 'צפון' },
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];

export default function Fleet2025Report() {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-blue-600 mb-1 font-medium">צי פנימי - סה"כ קריאות</div>
            <div className="text-2xl font-bold text-gray-900">6,267</div>
            <div className="text-xs text-gray-500 mt-1">13% מסה"כ הקריאות</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-red-600 mb-1 font-medium">ספקים חיצוניים</div>
            <div className="text-2xl font-bold text-gray-900">41,671</div>
            <div className="text-xs text-gray-500 mt-1">87% מסה"כ הקריאות</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-orange-600 mb-1 font-medium">עלות ממוצעת - צי</div>
            <div className="text-2xl font-bold text-gray-900">₪334</div>
            <div className="text-xs text-gray-500 mt-1">לקריאה</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-green-600 mb-1 font-medium">עלות ממוצעת - ספקים</div>
            <div className="text-2xl font-bold text-gray-900">₪251</div>
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