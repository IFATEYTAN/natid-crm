import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wallet, FileText, TrendingUp, Clock } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ImportExport from '@/components/ImportExport';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'כבה בנסיעה',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'סוללה ריקה',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר',
};

const monthNames = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export default function VendorPayments() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const tableRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const currentVendor = vendors.find((v) => v.email === user?.email);

  const { data: allCalls = [], isLoading } = useQuery({
    queryKey: ['vendorPayments', currentVendor?.id],
    queryFn: () => base44.entities.Call.list('-closed_at', 1000),
    enabled: !!currentVendor,
  });

  // Filter vendor's completed calls
  const vendorCalls = allCalls.filter(
    (c) =>
      c.assigned_vendor_id === currentVendor?.id &&
      c.call_status === 'completed' &&
      c.cost_to_vendor
  );

  // Current month calls
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  const monthCalls = vendorCalls.filter((c) => {
    if (!c.closed_at) return false;
    const callDate = parseISO(c.closed_at);
    return callDate >= monthStart && callDate <= monthEnd;
  });

  // Calculate KPIs
  const monthTotal = monthCalls.reduce((sum, c) => sum + (c.cost_to_vendor || 0), 0);
  const monthCount = monthCalls.length;
  const monthAvg = monthCount > 0 ? monthTotal / monthCount : 0;
  const pendingPayment = vendorCalls
    .filter((c) => c.payment_status === 'pending')
    .reduce((sum, c) => sum + (c.cost_to_vendor || 0), 0);

  // Last 6 months chart data
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const calls = vendorCalls.filter((c) => {
      if (!c.closed_at) return false;
      const callDate = parseISO(c.closed_at);
      return callDate >= start && callDate <= end;
    });

    const total = calls.reduce((sum, c) => sum + (c.cost_to_vendor || 0), 0);

    chartData.push({
      month: monthNames[date.getMonth()],
      total: total,
    });
  }

  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <span className="font-semibold text-[#0078D4]">
          {row.call_number || `#${row.id?.slice(-6)}`}
        </span>
      ),
    },
    {
      header: 'תאריך סגירה',
      accessor: 'closed_at',
      cell: (row) =>
        row.closed_at ? (
          <span className="text-[#616161] text-sm">
            {format(parseISO(row.closed_at), 'dd/MM/yy', { locale: he })}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => <span className="font-medium">{row.customer_name}</span>,
    },
    {
      header: 'סוג שירות',
      accessor: 'issue_type',
      cell: (row) => issueTypeLabels[row.issue_type] || row.issue_type || '-',
    },
    {
      header: 'עיר',
      accessor: 'pickup_location_city',
      cell: (row) => row.pickup_location_city || '-',
    },
    {
      header: 'סכום',
      accessor: 'cost_to_vendor',
      cell: (row) => (
        <span className="font-bold text-[#2E7D32]">
          ₪{(row.cost_to_vendor || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'סטטוס תשלום',
      accessor: 'payment_status',
      cell: (row) => <StatusBadge status={row.payment_status || 'pending'} />,
    },
    {
      header: 'תאריך תשלום',
      accessor: 'payment_date',
      cell: (row) =>
        row.payment_date ? (
          <span className="text-sm text-[#616161]">
            {format(parseISO(row.payment_date), 'dd/MM/yy', { locale: he })}
          </span>
        ) : (
          '-'
        ),
    },
  ];

  const exportToExcel = () => {
    // Simple CSV export
    const headers = ['מספר קריאה', 'תאריך', 'לקוח', 'שירות', 'עיר', 'סכום', 'סטטוס'];
    const rows = monthCalls.map((c) => [
      c.call_number,
      c.closed_at ? format(parseISO(c.closed_at), 'dd/MM/yy') : '',
      c.customer_name,
      issueTypeLabels[c.issue_type] || c.issue_type,
      c.pickup_location_city || '',
      c.cost_to_vendor || 0,
      c.payment_status || 'pending',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `תשלומים_${monthNames[selectedMonth]}_${selectedYear}.csv`;
    link.click();
  };

  if (!currentVendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#616161]">לא נמצא ספק מקושר</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>דוח תשלומים</h1>
        <p className="text-[var(--color-text-secondary)]">מעקב אחר הכנסות ותשלומים</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="סה״כ החודש"
          value={`₪${monthTotal.toLocaleString()}`}
          subtitle={monthNames[selectedMonth]}
          icon={Wallet}
          variant="primary"
          onClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="cursor-pointer hover:border-[#0078D4]"
        />
        <StatCard
          title="קריאות החודש"
          value={monthCount}
          subtitle="קריאות שהושלמו"
          icon={FileText}
          variant="success"
          onClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="cursor-pointer hover:border-[#2E7D32]"
        />
        <StatCard
          title="ממוצע לקריאה"
          value={`₪${Math.round(monthAvg).toLocaleString()}`}
          subtitle="ממוצע רווח"
          icon={TrendingUp}
          variant="info"
          onClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="cursor-pointer hover:border-[#0288D1]"
        />
        <StatCard
          title="ממתין לתשלום"
          value={`₪${pendingPayment.toLocaleString()}`}
          subtitle="טרם שולם"
          icon={Clock}
          variant="warning"
          onClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="cursor-pointer hover:border-[#ED6C02]"
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-[#6B7280] text-sm mb-1.5 block">חודש</Label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#6B7280] text-sm mb-1.5 block">שנה</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ImportExport
            entityName="VendorPayment"
            data={monthCalls.map((c) => ({
              call_number: c.call_number,
              closed_at: c.closed_at ? format(parseISO(c.closed_at), 'dd/MM/yy') : '',
              customer_name: c.customer_name,
              issue_type: issueTypeLabels[c.issue_type] || c.issue_type,
              pickup_location_city: c.pickup_location_city || '',
              cost_to_vendor: c.cost_to_vendor || 0,
              payment_status: c.payment_status || 'pending',
            }))}
            columns={[
              { header: 'מספר קריאה', accessor: 'call_number' },
              { header: 'תאריך סגירה', accessor: 'closed_at' },
              { header: 'לקוח', accessor: 'customer_name' },
              { header: 'סוג שירות', accessor: 'issue_type' },
              { header: 'עיר', accessor: 'pickup_location_city' },
              { header: 'סכום', accessor: 'cost_to_vendor' },
              { header: 'סטטוס תשלום', accessor: 'payment_status' },
            ]}
            title={`דוח תשלומים - ${monthNames[selectedMonth]} ${selectedYear}`}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="text-[15px] font-semibold text-[#111827] mb-4">סיכום 6 חודשים אחרונים</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              stroke="#E5E7EB"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              stroke="#E5E7EB"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [`₪${value.toLocaleString()}`, 'סה״כ']}
              labelStyle={{ direction: 'rtl' }}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: 14,
                padding: '8px 12px',
              }}
            />
            <Bar dataKey="total" fill="#111827" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5" ref={tableRef}>
        <h3 className="text-[15px] font-semibold text-[#111827] mb-4">פירוט תשלומים</h3>
        <DataTable
          columns={columns}
          data={monthCalls}
          isLoading={isLoading}
          emptyMessage="לא נמצאו תשלומים"
        />

        {monthCalls.length > 0 && (
          <div className="bg-[#F9FAFB] rounded-b-lg p-4 border-t border-[#E5E7EB] mt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-[#111827]">סה״כ:</span>
              <span className="font-bold text-2xl text-[#059669]">
                ₪{monthTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
