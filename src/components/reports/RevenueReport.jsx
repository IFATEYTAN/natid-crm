import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/DataTable';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const issueLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'רכב עצר',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אזל דלק',
  dead_battery: 'מצבר ריק',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר',
};

export default function RevenueReport({ payments, vendors, calls }) {
  // Group by vendor
  const byVendor = {};
  payments.forEach((payment) => {
    if (!byVendor[payment.vendor_id]) {
      byVendor[payment.vendor_id] = {
        vendor_id: payment.vendor_id,
        vendor_name: payment.vendor_name,
        total_revenue: 0,
        paid: 0,
        pending: 0,
        payments_count: 0,
      };
    }
    byVendor[payment.vendor_id].total_revenue += payment.amount;
    byVendor[payment.vendor_id].payments_count++;

    if (payment.status === 'paid') {
      byVendor[payment.vendor_id].paid += payment.amount;
    } else if (payment.status === 'pending') {
      byVendor[payment.vendor_id].pending += payment.amount;
    }
  });

  const vendorStats = Object.values(byVendor).sort((a, b) => b.total_revenue - a.total_revenue);

  // Group by issue type
  const byIssueType = {};
  calls.forEach((call) => {
    const issueType = call.issue_type || 'other';
    if (!byIssueType[issueType]) {
      byIssueType[issueType] = {
        issue_type: issueLabels[issueType] || issueType,
        total_calls: 0,
        total_revenue: 0,
      };
    }
    byIssueType[issueType].total_calls++;
    if (call.cost_to_vendor) {
      byIssueType[issueType].total_revenue += call.cost_to_vendor;
    }
  });

  const issueStats = Object.values(byIssueType).sort((a, b) => b.total_revenue - a.total_revenue);

  // Monthly trend
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  const monthlyData = months.map((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthPayments = payments.filter((p) => {
      const paymentDate = new Date(p.created_date);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    });

    const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      month: format(month, 'MMM', { locale: he }),
      revenue,
    };
  });

  const vendorColumns = [
    {
      header: 'ספק',
      cell: (row) => (
        <Link
          to={createPageUrl('VendorProfile') + '?id=' + row.vendor_id}
          className="text-[#FF6B6B] hover:text-[#E85555] hover:underline font-medium"
        >
          {row.vendor_name}
        </Link>
      ),
    },
    {
      header: 'סה"כ הכנסות',
      cell: (row) => (
        <span className="font-bold text-[#22C55E]">₪{row.total_revenue.toLocaleString()}</span>
      ),
    },
    {
      header: 'שולם',
      cell: (row) => `₪${row.paid.toLocaleString()}`,
    },
    {
      header: 'ממתין',
      cell: (row) =>
        row.pending > 0 ? (
          <span className="text-[#F59E0B] font-medium">₪{row.pending.toLocaleString()}</span>
        ) : (
          '₪0'
        ),
    },
    {
      header: 'תשלומים',
      accessor: 'payments_count',
    },
  ];

  const issueColumns = [
    { header: 'סוג שירות', accessor: 'issue_type' },
    { header: 'קריאות', accessor: 'total_calls' },
    {
      header: 'הכנסות',
      cell: (row) => `₪${row.total_revenue.toLocaleString()}`,
    },
    {
      header: 'ממוצע לקריאה',
      cell: (row) => `₪${Math.round(row.total_revenue / row.total_calls).toLocaleString()}`,
    },
  ];

  const totalRevenue = vendorStats.reduce((sum, v) => sum + v.total_revenue, 0);
  const totalPaid = vendorStats.reduce((sum, v) => sum + v.paid, 0);
  const totalPending = vendorStats.reduce((sum, v) => sum + v.pending, 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right" dir="rtl">
            <div className="text-sm text-[#616161]">סה"כ הכנסות</div>
            <div className="text-2xl font-bold text-[#22C55E] mt-1">
              ₪{totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right" dir="rtl">
            <div className="text-sm text-[#616161]">שולם</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">
              ₪{totalPaid.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right" dir="rtl">
            <div className="text-sm text-[#616161]">ממתין לתשלום</div>
            <div className="text-2xl font-bold text-[#F59E0B] mt-1">
              ₪{totalPending.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right" dir="rtl">
            <div className="text-sm text-[#616161]">ממוצע לספק</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">
              ₪
              {vendorStats.length > 0
                ? Math.round(totalRevenue / vendorStats.length).toLocaleString()
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader>
          <CardTitle className="text-[20px] font-medium text-[#212121] text-right">
            מגמת הכנסות חודשית
          </CardTitle>
        </CardHeader>
        <CardContent dir="rtl">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData} margin={{ right: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#525252', fontFamily: 'Heebo', fontSize: 12 }}
                stroke="#E5E5E5"
                reversed={true}
              />
              <YAxis
                tick={{ fill: '#525252', fontFamily: 'Heebo', fontSize: 12 }}
                stroke="#E5E5E5"
                orientation="right"
              />
              <Tooltip
                formatter={(value) => `₪${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontFamily: 'Heebo',
                  fontSize: 14,
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                labelStyle={{ fontWeight: 500, direction: 'rtl' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FF6B6B"
                strokeWidth={3}
                name="הכנסות"
                dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tables */}
      <div className="space-y-6" dir="rtl">
        <div>
          <h3 className="text-[20px] font-medium text-[#212121] mb-4 text-right">הכנסות לפי ספק</h3>
          <DataTable columns={vendorColumns} data={vendorStats} emptyMessage="אין נתוני הכנסות" />
        </div>

        <div>
          <h3 className="text-[20px] font-medium text-[#212121] mb-4 text-right">
            הכנסות לפי סוג שירות
          </h3>
          <DataTable columns={issueColumns} data={issueStats} emptyMessage="אין נתונים" />
        </div>
      </div>
    </div>
  );
}
