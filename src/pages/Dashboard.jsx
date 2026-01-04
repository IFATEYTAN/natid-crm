import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { 
  Plus,
  ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import AIInsightsWidget from '@/components/ai/AIInsightsWidget';
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, subDays, differenceInMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Work Queue Overview Component
function WorkQueueOverview({ calls, isLoading }) {
  const { data: queueItems = [] } = useQuery({
    queryKey: ['dashboardQueue'],
    queryFn: () => base44.entities.WorkQueue.list(),
    refetchInterval: 15000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'user');
    },
  });

  const waitingInQueue = queueItems.filter(q => q.queue_status === 'waiting_in_queue').length;
  const assignedToAgents = queueItems.filter(q => q.queue_status === 'assigned_to_agent').length;
  const inProgress = queueItems.filter(q => q.queue_status === 'in_progress').length;
  
  const completed = queueItems.filter(q => q.queue_status === 'completed' && q.time_to_complete);
  const avgTime = completed.length > 0
    ? Math.round(completed.reduce((sum, q) => sum + q.time_to_complete, 0) / completed.length)
    : 0;

  // Agent breakdown
  const agentStats = agents.map(agent => {
    const count = queueItems.filter(q => 
      q.assigned_to_agent === agent.email &&
      ['assigned_to_agent', 'in_progress'].includes(q.queue_status)
    ).length;
    return { name: agent.full_name, count };
  }).filter(a => a.count > 0);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-4 flex-row-reverse">
        <h3 className="text-[20px] font-medium text-neutral-soft-800">תור העבודה</h3>
        <Link to={createPageUrl('MyQueue')} className="text-primary-soft-600 hover:text-primary-soft-700 text-sm hover:underline">
          ← הצג תור מלא
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link to={createPageUrl('MyQueue')} className="block">
          <div className="card-base p-4 text-center hover:border-gray-300 transition-colors">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{waitingInQueue}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">בתור</p>
          </div>
        </Link>
        <Link to={createPageUrl('MyQueue')} className="block">
          <div className="card-base p-4 text-center hover:border-gray-300 transition-colors">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{assignedToAgents}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">משובץ</p>
          </div>
        </Link>
        <Link to={createPageUrl('Calls') + '?status=in_progress'} className="block">
          <div className="card-base p-4 text-center hover:border-gray-300 transition-colors">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{inProgress}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">בטיפול</p>
          </div>
        </Link>
        <div className="card-base p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{avgTime}'</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">זמן טיפול ממוצע</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-neutral-soft-600 mb-2">פילוח לפי נציגים:</p>
        {agentStats.length === 0 ? (
          <p className="text-center text-neutral-soft-400 py-4">אין קריאות פעילות</p>
        ) : (
          agentStats.map(agent => (
            <div key={agent.name} className="flex items-center gap-3 flex-row-reverse">
              <span className="text-sm font-medium w-32 truncate text-right">{agent.name}</span>
              <div className="flex-1 bg-neutral-soft-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${agent.count >= 5 ? 'bg-warning-soft-500' : 'bg-success-soft-500'}`}
                  style={{ width: `${Math.min(100, (agent.count / 5) * 100)}%` }}
                />
              </div>
              <span className="text-sm text-neutral-soft-600 w-20 text-right">
                {agent.count} קריאות {agent.count >= 5 && '⚠️'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
          className="font-semibold text-[#FF0000] hover:underline"
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
          <h1>לוח בקרה</h1>
          <p className="text-[var(--color-text-secondary)]">סקירת מצב מערכת בזמן אמת</p>
        </div>
        <Link to={createPageUrl('NewCall')}>
          <Button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            קריאה חדשה
          </Button>
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[8px]" />
          ))
        ) : (
          <>
            <StatCard
              title="זמן הגעה משוער (ETA)"
              value="32"
              subtitle="דקות ממוצע"
            />
            <StatCard
              title="זמן תגובה ראשוני"
              value="1:45"
              subtitle="דקות"
            />
            <StatCard
              title="אחוז פתרון בשטח"
              value="68%"
              subtitle="ללא גרירה"
            />
            <StatCard
              title="ציון שביעות רצון (CSAT)"
              value={`${avgRating}/5.0`}
            />
          </>
        )}
      </div>

      {/* Work Queue Section */}
      <WorkQueueOverview calls={calls} isLoading={isLoading} />

      {/* AI Insights */}
      <div className="w-full">
        <AIInsightsWidget />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart - Calls by Status */}
        <div className="card-base p-6">
          <h3 className="mb-6">קריאות לפי סטטוס</h3>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="h-[300px] w-full" style={{ direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
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
                    cursor={{ fill: '#F9FAFB' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: 14,
                      padding: '8px 12px'
                    }}
                  />
                  <Bar dataKey="value" fill="#212121" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Line Chart - Trend */}
        <div className="card-base p-6">
          <h3 className="mb-6">מגמת קריאות - 7 ימים אחרונים</h3>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="h-[300px] w-full" style={{ direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#212121" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#212121" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
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
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: 14,
                      padding: '8px 12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#212121" 
                    strokeWidth={3}
                    dot={{ fill: '#212121', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    fill="url(#colorValue)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="card-base">
        <div className="flex items-center justify-between mb-4">
          <h3>10 קריאות אחרונות</h3>
          <Link to={createPageUrl('Calls')} className="text-[var(--color-primary)] text-sm hover:underline flex items-center gap-1">
            הצג הכל
            <ChevronLeft className="w-4 h-4" />
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