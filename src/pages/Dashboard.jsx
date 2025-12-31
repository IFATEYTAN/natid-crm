import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { 
  FileText, 
  Clock,
  Timer,
  Star,
  Phone,
  Plus,
  ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, subDays, differenceInMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'כבה בנסיעה',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'סוללה ריקה',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר'
};

const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיוך',
  assigning: 'בשיוך',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל'
};

export default function Dashboard() {
  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: () => base44.entities.Call.list('-created_date', 100),
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const isLoading = callsLoading || vendorsLoading;

  // Calculate stats
  const openStatuses = ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress'];
  const openCalls = calls.filter(c => openStatuses.includes(c.call_status));
  const waitingCalls = calls.filter(c => c.call_status === 'waiting_treatment');
  
  // Average time to completion (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentCompletedCalls = calls.filter(c => 
    c.call_status === 'completed' && 
    c.time_to_completion && 
    c.created_date &&
    parseISO(c.created_date) >= sevenDaysAgo
  );
  const avgCompletion = recentCompletedCalls.length > 0
    ? Math.round(recentCompletedCalls.reduce((sum, c) => sum + c.time_to_completion, 0) / recentCompletedCalls.length)
    : 0;
  
  // Average satisfaction (last 7 days)
  const recentRatedCalls = calls.filter(c => 
    c.customer_rating && 
    c.created_date &&
    parseISO(c.created_date) >= sevenDaysAgo
  );
  const avgRating = recentRatedCalls.length > 0
    ? (recentRatedCalls.reduce((sum, c) => sum + c.customer_rating, 0) / recentRatedCalls.length).toFixed(1)
    : '0.0';

  // Chart data - calls by status
  const statusData = Object.keys(statusLabels).map(status => ({
    name: statusLabels[status],
    value: calls.filter(c => c.call_status === status).length
  })).filter(d => d.value > 0);

  // Chart data - trend last 7 days
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = calls.filter(c => 
      c.created_date && format(parseISO(c.created_date), 'yyyy-MM-dd') === dateStr
    ).length;
    return {
      name: format(date, 'dd/MM', { locale: he }),
      value: count
    };
  });

  // Table columns
  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link 
          to={createPageUrl(`CallDetails?id=${row.id}`)}
          className="font-semibold text-[#0D47A1] hover:underline"
        >
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'שם לקוח',
      accessor: 'customer_name',
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => issueTypeLabels[row.issue_type] || row.issue_type || '-'
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} />
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (row) => row.created_date ? (
        <span className="text-[#616161] caption">
          {format(parseISO(row.created_date), 'dd/MM HH:mm', { locale: he })}
        </span>
      ) : '-'
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (row) => row.assigned_vendor_name || 'טרם שובץ'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#0D47A1] leading-tight">לוח בקרה</h1>
          <p className="text-[#616161] text-sm body-2 mt-1">סקירת מצב מערכת</p>
        </div>
        <Link to={createPageUrl('NewCall')}>
          <Button className="bg-[#0D47A1] hover:bg-[#1565C0] text-white gap-2 rounded-[4px]">
            <Plus className="w-5 h-5" strokeWidth={2} />
            קריאה חדשה
          </Button>
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-[8px]" />
          ))
        ) : (
          <>
            <Link to={createPageUrl('Calls?status=open')}>
              <StatCard
                title="קריאות פתוחות"
                value={openCalls.length}
                icon={FileText}
                variant="primary"
              />
            </Link>
            <Link to={createPageUrl('Calls?status=waiting_treatment')}>
              <StatCard
                title="ממתינות לשיוך"
                value={waitingCalls.length}
                icon={Clock}
                variant="warning"
              />
            </Link>
            <StatCard
              title="זמן ממוצע לטיפול"
              value={avgCompletion}
              subtitle="דקות"
              icon={Timer}
            />
            <StatCard
              title="שביעות רצון"
              value={`${avgRating}/5.0`}
              icon={Star}
              variant="success"
            />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart - Calls by Status */}
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h3 className="text-[20px] font-medium text-[#212121] mb-4">קריאות לפי סטטוס</h3>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 12 }}
                  stroke="#E0E0E0"
                />
                <YAxis 
                  tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 12 }}
                  stroke="#E0E0E0"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontFamily: 'Heebo',
                    fontSize: 14,
                    direction: 'rtl'
                  }}
                  labelStyle={{ fontWeight: 500 }}
                />
                <Bar dataKey="value" fill="#0D47A1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line Chart - Trend */}
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h3 className="text-[20px] font-medium text-[#212121] mb-4">מגמת קריאות - 7 ימים אחרונים</h3>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D47A1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0D47A1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 12 }}
                  stroke="#E0E0E0"
                />
                <YAxis 
                  tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 12 }}
                  stroke="#E0E0E0"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontFamily: 'Heebo',
                    fontSize: 14,
                    direction: 'rtl'
                  }}
                  labelStyle={{ fontWeight: 500 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0D47A1" 
                  strokeWidth={2}
                  fill="url(#colorValue)"
                  dot={{ fill: '#0D47A1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[20px] font-medium text-[#212121]">10 קריאות אחרונות</h3>
          <Link to={createPageUrl('Calls')} className="text-[#0D47A1] text-sm hover:underline flex items-center gap-1">
            הצג הכל
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
        {isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <DataTable
            columns={columns}
            data={calls.slice(0, 10)}
            onRowClick={(row) => window.location.href = createPageUrl(`CallDetails?id=${row.id}`)}
            emptyMessage="אין קריאות להצגה"
          />
        )}
      </div>
    </div>
  );
}