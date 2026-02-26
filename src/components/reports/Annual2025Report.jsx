import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Truck, MapPin, Wrench, Settings } from 'lucide-react';

// === Static Data from 2025 Excel Files ===

const monthlyTrendData = [
  { name: 'ינואר', calls: 3535, cost: 824585 },
  { name: 'פברואר', calls: 3269, cost: 760196 },
  { name: 'מרץ', calls: 3852, cost: 928487 },
  { name: 'אפריל', calls: 3679, cost: 894427 },
  { name: 'מאי', calls: 3846, cost: 935000 },
  { name: 'יוני', calls: 3555, cost: 855000 },
  { name: 'יולי', calls: 4793, cost: 1150000 },
  { name: 'אוגוסט', calls: 4655, cost: 1110000 },
  { name: 'ספטמבר', calls: 4329, cost: 1050000 },
  { name: 'אוקטובר', calls: 4146, cost: 1010000 },
  { name: 'נובמבר', calls: 3923, cost: 960000 },
  { name: 'דצמבר', calls: 4356, cost: 1060000 },
];

const regionData = [
  { name: 'המרכז', value: 17251 },
  { name: 'לא מוגדר', value: 10051 },
  { name: 'צפון', value: 5593 },
  { name: 'דרום', value: 4802 },
  { name: 'ירושלים', value: 3543 },
  { name: 'חיפה והקריות', value: 2007 },
  { name: 'השרון', value: 1967 },
  { name: 'אחר', value: 2724 },
];

const issueData = [
  { name: 'אין סטארטר', value: 7832 },
  { name: 'תאונה', value: 7117 },
  { name: 'כבה בנסיעה', value: 2983 },
  { name: 'יש סטארטר', value: 2534 },
  { name: 'אחר', value: 27472 },
];

const serviceTypeData = [
  { name: 'גרירה', value: 26254 },
  { name: 'ניידת שירות', value: 8074 },
  { name: 'אחסנה + גרירה', value: 8028 },
  { name: 'גרירה + ניידת', value: 1092 },
  { name: 'אחר', value: 2490 },
];

const fleetVsExternalData = [
  { name: 'צי פנימי', calls: 6267, cost: 2093776, avgCost: 334 },
  { name: 'ספקים חיצוניים', calls: 41671, cost: 9845440, avgCost: 251 },
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];

export default function Annual2025Report() {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-blue-600 mb-1 font-medium">סה"כ קריאות</div>
            <div className="text-2xl font-bold text-gray-900">47,938</div>
            <div className="text-xs text-gray-500 mt-1">שנת 2025</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-green-600 mb-1 font-medium">ממוצע חודשי</div>
            <div className="text-2xl font-bold text-gray-900">3,994</div>
            <div className="text-xs text-gray-500 mt-1">קריאות לחודש</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-red-600 mb-1 font-medium">עלות שנתית</div>
            <div className="text-2xl font-bold text-gray-900">₪11.9M</div>
            <div className="text-xs text-gray-500 mt-1">סה"כ הוצאות</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-orange-600 mb-1 font-medium">עלות ממוצעת לקריאה</div>
            <div className="text-2xl font-bold text-gray-900">₪262.7</div>
            <div className="text-xs text-gray-500 mt-1">משוקלל</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm text-purple-600 mb-1 font-medium">ק"מ ממוצע לקריאה</div>
            <div className="text-2xl font-bold text-gray-900">27.7</div>
            <div className="text-xs text-gray-500 mt-1">קילומטרים</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              מגמות חודשיות - כמות קריאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="calls" name="קריאות" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm text-gray-500 text-center mt-2">
              יולי הוא חודש השיא עם 4,793 קריאות (עלייה של 34.8% מיוני)
            </div>
          </CardContent>
        </Card>

        {/* Region Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              התפלגות לפי אזור
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name="קריאות" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-500" />
              ניתוח לפי סוג שירות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {serviceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fleet vs External */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-500" />
              השוואת צי רכב מול ספקים חיצוניים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg text-center border-t-4 border-blue-500">
                <div className="text-lg font-bold text-gray-900">13%</div>
                <div className="text-sm text-gray-500">צי פנימי (6,267 קריאות)</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center border-t-4 border-red-500">
                <div className="text-lg font-bold text-gray-900">87%</div>
                <div className="text-sm text-gray-500">ספקים חיצוניים (41,671 קריאות)</div>
              </div>
            </div>
            
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fleetVsExternalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgCost" name="עלות ממוצעת לקריאה (₪)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}