import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Users, Phone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const customerTypeLabels = {
  insurance_company: 'חברת ביטוח',
  fleet: 'צי רכב',
  individual: 'פרטי',
  garage: 'מוסך',
  other: 'אחר',
};

export default function CompanyReport({ calls }) {
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-report'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const companyStats = useMemo(() => {
    // Group calls by insurance_company
    const byCompany = {};
    calls.forEach(c => {
      const company = c.insurance_company || 'ללא חברה';
      if (!byCompany[company]) byCompany[company] = { name: company, total: 0, completed: 0, cancelled: 0 };
      byCompany[company].total++;
      if (c.call_status === 'completed') byCompany[company].completed++;
      if (c.call_status === 'cancelled') byCompany[company].cancelled++;
    });
    return Object.values(byCompany).sort((a, b) => b.total - a.total);
  }, [calls]);

  const customerStats = useMemo(() => {
    return customers.map(c => ({
      ...c,
      callCount: calls.filter(call => call.insurance_company === c.name || call.customer_name === c.name).length,
    })).sort((a, b) => b.callCount - a.callCount).slice(0, 15);
  }, [customers, calls]);

  const chartData = companyStats.slice(0, 10).map(s => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + '...' : s.name,
    קריאות: s.total,
    הושלמו: s.completed,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
            <div><div className="text-2xl font-bold">{customers.length}</div><div className="text-xs text-gray-500">לקוחות רשומים</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
            <div><div className="text-2xl font-bold">{customers.filter(c => c.status === 'active').length}</div><div className="text-xs text-gray-500">פעילים</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Phone className="w-5 h-5 text-purple-600" /></div>
            <div><div className="text-2xl font-bold">{companyStats.length}</div><div className="text-xs text-gray-500">חברות עם קריאות</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-orange-600" /></div>
            <div><div className="text-2xl font-bold">{customers.filter(c => c.customer_type === 'insurance_company').length}</div><div className="text-xs text-gray-500">חברות ביטוח</div></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">קריאות לפי חברה</CardTitle></CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="קריאות" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="הושלמו" fill="#111827" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-8">אין נתונים להצגה</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">טבלת לקוחות</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-xs text-gray-500 font-medium px-2 pb-2 border-b">
              <div className="col-span-3">שם</div>
              <div className="col-span-2">סוג</div>
              <div className="col-span-2">סטטוס</div>
              <div className="col-span-2 text-center">קריאות</div>
              <div className="col-span-3">SLA</div>
            </div>
            {customerStats.map(c => (
              <div key={c.id} className="grid grid-cols-12 items-center text-sm px-2 py-2 hover:bg-gray-50 rounded">
                <div className="col-span-3 font-medium truncate">{c.name}</div>
                <div className="col-span-2"><Badge variant="outline" className="text-xs">{customerTypeLabels[c.customer_type] || c.customer_type}</Badge></div>
                <div className="col-span-2"><Badge className={c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{c.status === 'active' ? 'פעיל' : 'לא פעיל'}</Badge></div>
                <div className="col-span-2 text-center font-medium">{c.callCount}</div>
                <div className="col-span-3 text-xs text-gray-500">{c.sla_response_minutes ? `תגובה: ${c.sla_response_minutes} דק'` : '-'}</div>
              </div>
            ))}
            {customerStats.length === 0 && <p className="text-center text-gray-400 py-4">אין לקוחות</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}