import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, CreditCard, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const COLORS = ['#3b82f6', '#111827', '#6b7280', '#ef4444', '#10b981'];

export default function FinancialReport({ calls }) {
  const { data: deposits = [] } = useQuery({
    queryKey: ['deposits-report'],
    queryFn: () => base44.entities.Deposit.list(),
  });

  const { data: callProducts = [] } = useQuery({
    queryKey: ['callProducts-report'],
    queryFn: () => base44.entities.CallProduct.list(),
  });

  const { data: vendorPayments = [] } = useQuery({
    queryKey: ['vendorPayments-report'],
    queryFn: () => base44.entities.VendorPayment.list(),
  });

  const stats = useMemo(() => {
    const totalRevenue = calls.reduce((sum, c) => sum + (c.payment_amount_customer || 0), 0);
    const totalCost = calls.reduce((sum, c) => sum + (c.cost_to_vendor || 0), 0);
    const totalProducts = callProducts.reduce((sum, cp) => sum + (cp.total_price || 0), 0);
    const totalDeposits = deposits.filter(d => d.status === 'active').reduce((sum, d) => sum + (d.amount || 0), 0);
    const chargedDeposits = deposits.filter(d => d.status === 'charged').reduce((sum, d) => sum + (d.charged_amount || 0), 0);
    const vendorTotal = vendorPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return { totalRevenue, totalCost, totalProducts, totalDeposits, chargedDeposits, vendorTotal, profit: totalRevenue - totalCost };
  }, [calls, deposits, callProducts, vendorPayments]);

  const depositStatusData = useMemo(() => {
    const counts = {};
    const labels = { active: 'פעיל', charged: 'חויב', refunded: 'הוחזר', cancelled: 'בוטל', expired: 'פג תוקף' };
    deposits.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: labels[status] || status, value: count }));
  }, [deposits]);

  const paymentMethodData = useMemo(() => {
    const counts = {};
    const labels = { credit_card: 'אשראי', cash: 'מזומן', bank_transfer: 'העברה', check: "צ'ק", none: 'ללא' };
    calls.forEach(c => { if (c.payment_type) counts[c.payment_type] = (counts[c.payment_type] || 0) + 1; });
    return Object.entries(counts).map(([method, count]) => ({ name: labels[method] || method, value: count }));
  }, [calls]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div><div className="text-2xl font-bold">₪{stats.totalRevenue.toLocaleString()}</div><div className="text-xs text-gray-500">הכנסות</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-red-600" /></div>
            <div><div className="text-2xl font-bold">₪{stats.totalCost.toLocaleString()}</div><div className="text-xs text-gray-500">עלויות ספקים</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div><div className="text-2xl font-bold">₪{stats.profit.toLocaleString()}</div><div className="text-xs text-gray-500">רווח גולמי</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Wallet className="w-5 h-5 text-purple-600" /></div>
            <div><div className="text-2xl font-bold">₪{stats.totalProducts.toLocaleString()}</div><div className="text-xs text-gray-500">מכירת מוצרים</div></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">עירבונות פעילים</div>
          <div className="text-2xl font-bold text-blue-600">₪{stats.totalDeposits.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">עירבונות שחויבו</div>
          <div className="text-2xl font-bold text-red-600">₪{stats.chargedDeposits.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">תשלומים לספקים</div>
          <div className="text-2xl font-bold text-gray-800">₪{stats.vendorTotal.toLocaleString()}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">סטטוס עירבונות</CardTitle></CardHeader>
          <CardContent>
            {depositStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={depositStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {depositStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-400 py-8">אין עירבונות</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">אמצעי תשלום</CardTitle></CardHeader>
          <CardContent>
            {paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-400 py-8">אין נתוני תשלום</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}