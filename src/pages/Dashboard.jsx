import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import AvatarStack from '@/components/ui/AvatarStack';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Truck,
  AlertCircle,
  Eye,
  MapPin,
  LayoutDashboard,
  Headphones,
  List
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AIInsightsWidget from '@/components/ai/AIInsightsWidget';
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
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
    <div className="card-base card-body">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-3">תור העבודה</h3>
        <Link to={createPageUrl('MyQueue')} className="text-primary-soft-600 hover:text-primary-soft-700 text-sm font-medium hover:underline flex items-center gap-1">
          הצג תור מלא
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link to={createPageUrl('MyQueue')} className="block">
          <div className="card-interactive p-5 text-center">
            <p className="text-3xl font-bold text-primary-soft-600">{waitingInQueue}</p>
            <p className="text-secondary mt-2">בתור</p>
          </div>
        </Link>
        <Link to={createPageUrl('MyQueue')} className="block">
          <div className="card-interactive p-5 text-center">
            <p className="text-3xl font-bold text-secondary-soft-600">{assignedToAgents}</p>
            <p className="text-secondary mt-2">משובץ</p>
          </div>
        </Link>
        <Link to={createPageUrl('Calls') + '?status=in_progress'} className="block">
          <div className="card-interactive p-5 text-center">
            <p className="text-3xl font-bold text-warning-soft-600">{inProgress}</p>
            <p className="text-secondary mt-2">בטיפול</p>
          </div>
        </Link>
        <div className="card-base p-5 text-center bg-neutral-soft-50">
          <p className="text-3xl font-bold text-neutral-soft-700">{avgTime}'</p>
          <p className="text-secondary mt-2">זמן טיפול ממוצע</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-secondary mb-3">פילוח לפי נציגים:</p>
        {agentStats.length === 0 ? (
          <p className="text-center text-muted py-4">אין קריאות פעילות</p>
        ) : (
          agentStats.map(agent => (
            <div key={agent.name} className="flex items-center gap-3">
              <span className="text-sm font-medium text-neutral-soft-800 w-32 truncate">{agent.name}</span>
              <div className="flex-1 bg-neutral-soft-200 rounded-full h-2 overflow-hidden" dir="ltr">
                <div
                  className={`h-full ${agent.count >= 5 ? 'bg-warning-soft-500' : 'bg-success-soft-500'}`}
                  style={{ width: `${Math.min(100, (agent.count / 5) * 100)}%` }}
                />
              </div>
              <span className="text-secondary w-24 text-left">
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const today = new Date();

  const { data: workQueue = [] } = useQuery({
    queryKey: ['workQueue'],
    queryFn: () => base44.entities.WorkQueue.list(),
  });

  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: () => base44.entities.Call.list('-created_date', 500),
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  // Fetch available vendors for operator view
  const { data: availableVendors = [] } = useQuery({
    queryKey: ['availableVendors'],
    queryFn: () => base44.entities.Vendor.filter({
      is_active: true,
      availability_status: 'available'
    }),
    refetchInterval: 30000,
  });

  const isLoading = callsLoading || vendorsLoading;

  // Calculate stats
  const openStatuses = ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress'];
  const openCalls = calls.filter(c => openStatuses.includes(c.call_status));
  const waitingCalls = calls.filter(c => c.call_status === 'waiting_treatment');

  // Operator stats
  const myWorkItems = workQueue.filter(wq => wq.assigned_to_agent === currentUser?.email);
  const myCallIds = myWorkItems.map(wq => wq.call_id);

  // Filter calls assigned to this operator
  const myOpenCalls = openCalls.filter(c => myCallIds.includes(c.id));
  const myCompletedToday = calls.filter(call => {
    const callDate = new Date(call.created_date);
    return call.call_status === 'completed' &&
           myCallIds.includes(call.id) &&
           callDate >= startOfDay(today) &&
           callDate <= endOfDay(today);
  });
  const myUrgentCalls = myOpenCalls.filter(c => c.call_priority === 'urgent' || c.call_priority === 'critical');

  const unassignedCalls = openCalls.filter(c => !c.assigned_vendor_id);
  const urgentCalls = openCalls.filter(c => c.call_priority === 'urgent' || c.call_priority === 'critical');

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

  // Filtered calls for cases tab
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchQuery ||
      call.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.call_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.customer_phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || call.call_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  // Table columns for dashboard
  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link
          to={createPageUrl(`CaseDetails?id=${row.id}`)}
          className="font-semibold text-neutral-soft-800 hover:text-primary-soft-600"
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
        <span className="text-secondary">
          {format(parseISO(row.created_date), 'dd/MM HH:mm', { locale: he })}
        </span>
      ) : '-'
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (row) => row.assigned_vendor_name || <span className="text-error-soft-600 font-medium">טרם שובץ</span>
    },
  ];

  // Operator call columns
  const operatorCallColumns = [
    {
      header: 'קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id} className="font-semibold text-neutral-soft-800 hover:text-primary-soft-600">
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-neutral-soft-800">{row.customer_name}</div>
          <a href={`tel:${row.customer_phone}`} className="text-secondary flex items-center gap-1 hover:text-primary-soft-600">
            <Phone className="w-3 h-3" />
            {row.customer_phone}
          </a>
        </div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => (
        <span className="text-secondary">{issueTypeLabels[row.issue_type] || row.issue_type}</span>
      )
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_city',
      cell: (row) => (
        <span className="text-secondary">{row.pickup_location_city || row.pickup_location_address?.substring(0, 30)}</span>
      )
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} size="sm" />
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (row) => row.assigned_vendor_name ? (
        <span className="text-sm text-success-soft-600 font-medium">{row.assigned_vendor_name}</span>
      ) : (
        <span className="text-xs text-error-soft-600 font-medium">לא שובץ</span>
      )
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id}>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      )
    },
  ];

  // Vendor columns for operator view
  const vendorColumns = [
    {
      header: 'ספק',
      accessor: 'vendor_name',
      cell: (row) => (
        <Link to={createPageUrl('VendorProfile') + '?id=' + row.id} className="font-medium text-neutral-soft-800 hover:text-primary-soft-600 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          {row.vendor_name}
        </Link>
      )
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <a href={`tel:${row.phone}`} className="text-secondary flex items-center gap-1 hover:text-primary-soft-600">
          <Phone className="w-3 h-3" />
          {row.phone}
        </a>
      )
    },
    {
      header: 'אזורים',
      accessor: 'coverage_areas',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.coverage_areas || []).slice(0, 2).map((area, idx) => (
            <span key={idx} className="badge-base bg-neutral-soft-100 text-neutral-soft-700">
              {area}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'קריאות',
      accessor: 'total_calls_completed',
      cell: (row) => (
        <div className="text-center">
          <div className="font-medium text-neutral-soft-800">{row.total_calls_completed || 0}</div>
          <div className="text-xs text-neutral-soft-600">
            {row.average_rating ? `⭐ ${row.average_rating.toFixed(1)}` : '-'}
          </div>
        </div>
      )
    },
  ];

  // Cases table columns (full)
  const casesColumns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id} className="font-semibold text-neutral-soft-800 hover:text-primary-soft-600">
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (row) => row.created_date ? (
        <span className="text-secondary">
          {format(parseISO(row.created_date), 'dd/MM/yy HH:mm', { locale: he })}
        </span>
      ) : '-'
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-neutral-soft-800">{row.customer_name}</div>
          <div className="text-secondary">{row.customer_phone}</div>
        </div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => issueTypeLabels[row.issue_type] || row.issue_type || '-'
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_city',
      cell: (row) => row.pickup_location_city || '-'
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} />
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (row) => row.assigned_vendor_name || <span className="text-error-soft-600 font-medium">טרם שובץ</span>
    },
    {
      header: '',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id}>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-1">לוח בקרה</h1>
          <p className="text-secondary mt-2">סקירת מצב מערכת וניהול קריאות</p>
        </div>
        <Link to={createPageUrl('NewCase')}>
          <Button className="bg-primary-soft-600 hover:bg-primary-soft-700 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" />
            קריאה חדשה
          </Button>
        </Link>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="card-base p-1">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            סקירה כללית
          </TabsTrigger>
          <TabsTrigger value="operator" className="gap-2">
            <Headphones className="w-4 h-4" />
            תפריט מוקדן
          </TabsTrigger>
          <TabsTrigger value="cases" className="gap-2">
            <List className="w-4 h-4" />
            קריאות שירות
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))
            ) : (
              <>
                <StatCard title="זמן הגעה משוער (ETA)" value="32" subtitle="דקות ממוצע" />
                <StatCard title="זמן תגובה ראשוני" value="1:45" subtitle="דקות" />
                <StatCard title="אחוז פתרון בשטח" value="68%" subtitle="ללא גרירה" />
                <StatCard title="ציון שביעות רצון (CSAT)" value={`${avgRating}/5.0`} />
              </>
            )}
          </div>

          {/* Work Queue Section */}
          <WorkQueueOverview calls={calls} isLoading={isLoading} />

          {/* AI Insights */}
          <AIInsightsWidget />

          {/* Charts Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card-base card-body">
              <h3 className="heading-4 mb-4">קריאות לפי סטטוס</h3>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="h-[280px] w-full" style={{ direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 12 }} stroke="#E5E5E5" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#737373', fontSize: 12 }} stroke="#E5E5E5" tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#FAFAFA' }} contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', fontSize: 14, padding: '8px 12px' }} />
                      <Bar dataKey="value" fill="#FF6B6B" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card-base card-body">
              <h3 className="heading-4 mb-4">מגמת קריאות - 7 ימים אחרונים</h3>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="h-[280px] w-full" style={{ direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 12 }} stroke="#E5E5E5" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#737373', fontSize: 12 }} stroke="#E5E5E5" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', fontSize: 14, padding: '8px 12px' }} />
                      <Line type="monotone" dataKey="value" stroke="#FF6B6B" strokeWidth={3} dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Recent Calls Table */}
          <div className="card-base card-body">
            <h3 className="heading-4 mb-4">10 קריאות אחרונות</h3>
            {isLoading ? (
              <Skeleton className="h-96" />
            ) : (
              <DataTable
                columns={columns}
                data={calls.slice(0, 10)}
                onRowClick={(row) => window.location.href = createPageUrl(`CaseDetails?id=${row.id}`)}
                emptyMessage="אין קריאות להצגה"
              />
            )}
          </div>
        </TabsContent>

        {/* Operator Tab */}
        <TabsContent value="operator" className="space-y-6 mt-6">
          {/* Operator Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="הקריאות שלי"
              value={myOpenCalls.length}
              to={createPageUrl('MyQueue')}
              className="cursor-pointer"
            />
            <StatCard
              title="הושלמו היום"
              value={myCompletedToday.length}
              className="cursor-pointer"
            />
            <StatCard
              title="ממתינות לשיוך"
              value={unassignedCalls.length}
              to={createPageUrl('Calls') + '?status=waiting_treatment'}
              className="cursor-pointer"
            />
            <StatCard
              title="דחופות שלי"
              value={myUrgentCalls.length}
              className="cursor-pointer"
            />
            <StatCard
              title="ספקים זמינים"
              value={availableVendors.length}
              to={createPageUrl('AllVendorsMap')}
              className="cursor-pointer"
            />
          </div>

          {/* Quick Actions */}
          <div className="card-base card-body">
            <h3 className="heading-4 mb-4">קיצורי דרך</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to={createPageUrl('NewCase')}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-neutral-soft-50">
                  <Plus className="w-6 h-6 text-neutral-soft-700" />
                  <span className="text-sm font-medium text-neutral-soft-700">קריאה חדשה</span>
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setActiveTab('cases')} className="w-full h-20 flex flex-col gap-2 hover:bg-neutral-soft-50">
                <AlertCircle className="w-6 h-6 text-neutral-soft-700" />
                <span className="text-sm font-medium text-neutral-soft-700">קריאות פתוחות</span>
              </Button>
              <Link to={createPageUrl('ServiceProviders')}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-neutral-soft-50">
                  <Truck className="w-6 h-6 text-neutral-soft-700" />
                  <span className="text-sm font-medium text-neutral-soft-700">ספקים</span>
                </Button>
              </Link>
              <Link to={createPageUrl('AllVendorsMap')}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-neutral-soft-50">
                  <MapPin className="w-6 h-6 text-neutral-soft-700" />
                  <span className="text-sm font-medium text-neutral-soft-700">מפת ספקים</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Urgent Calls Alert */}
          {urgentCalls.length > 0 && (
            <div className="card-base card-body border-r-4 border-r-error-soft-600">
              <h3 className="heading-4 mb-4">קריאות דחופות ({urgentCalls.length})</h3>
              <div className="space-y-3">
                {urgentCalls.slice(0, 5).map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-3 bg-neutral-soft-50 rounded-lg border border-neutral-soft-200">
                    <div className="flex-1">
                      <Link to={createPageUrl('CaseDetails') + '?id=' + call.id} className="font-medium text-neutral-soft-800 hover:text-primary-soft-600">
                        {call.call_number || `#${call.id?.slice(-6)}`}
                      </Link>
                      <p className="text-secondary">{call.customer_name} - {call.pickup_location_city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={call.call_status} size="sm" />
                      <Link to={createPageUrl('CaseDetails') + '?id=' + call.id}>
                        <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Calls Table */}
          <div className="card-base card-body">
            <h3 className="heading-4 mb-4">הקריאות שלי בטיפול ({myOpenCalls.length})</h3>
            <DataTable
              columns={operatorCallColumns}
              data={myOpenCalls}
              isLoading={callsLoading}
              onRowClick={(row) => window.location.href = createPageUrl('CaseDetails') + '?id=' + row.id}
              emptyMessage="אין קריאות משויכות אליך"
            />
          </div>

          {/* Available Vendors */}
          <div className="card-base card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-4">ספקים זמינים ({availableVendors.length})</h3>
              <AvatarStack users={availableVendors} max={8} size="md" />
            </div>
            <DataTable
              columns={vendorColumns}
              data={availableVendors}
              isLoading={vendorsLoading}
              onRowClick={(row) => window.location.href = createPageUrl('VendorProfile') + '?id=' + row.id}
              emptyMessage="אין ספקים זמינים כרגע"
            />
          </div>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="card-base card-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="חיפוש לפי שם, מספר קריאה או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="waiting_treatment">ממתין לטיפול</SelectItem>
                  <SelectItem value="awaiting_assignment">ממתין לשיוך</SelectItem>
                  <SelectItem value="assigning">בשיוך</SelectItem>
                  <SelectItem value="vendor_enroute">ספק בדרך</SelectItem>
                  <SelectItem value="in_progress">בטיפול</SelectItem>
                  <SelectItem value="completed">הושלם</SelectItem>
                  <SelectItem value="cancelled">בוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cases Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="סה״כ קריאות" value={filteredCalls.length} />
            <StatCard title="פתוחות" value={filteredCalls.filter(c => openStatuses.includes(c.call_status)).length} />
            <StatCard title="הושלמו" value={filteredCalls.filter(c => c.call_status === 'completed').length} />
            <StatCard title="בוטלו" value={filteredCalls.filter(c => c.call_status === 'cancelled').length} />
          </div>

          {/* Cases Table */}
          <div className="card-base card-body">
            <h3 className="heading-4 mb-4">קריאות שירות ({filteredCalls.length})</h3>
            <DataTable
              columns={casesColumns}
              data={filteredCalls}
              isLoading={callsLoading}
              onRowClick={(row) => window.location.href = createPageUrl('CaseDetails') + '?id=' + row.id}
              emptyMessage="לא נמצאו קריאות"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
