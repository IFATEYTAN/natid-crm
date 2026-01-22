import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useCalls } from '@/components/hooks/useCalls';
import { useVendors } from '@/components/hooks/useVendors';
import { createPageUrl } from '@/components/utils';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import AvatarStack from '@/components/ui/AvatarStack';
import {
  Plus,
  ChevronLeft,
  Phone,
  Truck,
  AlertCircle,
  Eye,
  MapPin,
  LayoutDashboard,
  Headphones,
  List,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Calendar
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AIInsightsWidget from '@/components/ai/AIInsightsWidget';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
    <Card className="hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-800">תור עבודה בזמן אמת</CardTitle>
            <CardDescription>מבט על עומסי העבודה במוקד</CardDescription>
          </div>
          <Link to={createPageUrl('MyQueue')} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline flex items-center gap-1 transition-colors">
            הצג תור מלא
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link to={createPageUrl('MyQueue')} className="block group">
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 group-hover:border-orange-300 transition-all text-center">
              <p className="text-3xl font-extrabold text-orange-600">{waitingInQueue}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">ממתינים בתור</p>
            </div>
          </Link>
          <Link to={createPageUrl('MyQueue')} className="block group">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 group-hover:border-blue-300 transition-all text-center">
              <p className="text-3xl font-extrabold text-blue-600">{assignedToAgents}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">משובץ לנציג</p>
            </div>
          </Link>
          <Link to={createPageUrl('Calls') + '?status=in_progress'} className="block group">
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 group-hover:border-indigo-300 transition-all text-center">
              <p className="text-3xl font-extrabold text-indigo-600">{inProgress}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">בטיפול פעיל</p>
            </div>
          </Link>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-3xl font-extrabold text-gray-700">{avgTime}'</p>
            <p className="text-sm font-medium text-gray-600 mt-1">זמן טיפול ממוצע</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">עומס נציגים פעיל</span>
          </div>
          {agentStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 opacity-50" />
              <p className="text-sm text-gray-500">אין עומס על הנציגים כרגע</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {agentStats.map(agent => (
                <div key={agent.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                    {agent.name.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{agent.name}</span>
                      <span className="text-xs text-gray-500">{agent.count} קריאות</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden" dir="ltr">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${agent.count >= 5 ? 'bg-red-500' : agent.count >= 3 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, (agent.count / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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

  const { data: calls = [], isLoading: callsLoading } = useCalls();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();

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
  const completedToday = calls.filter(call => {
    const callDate = new Date(call.created_date);
    return call.call_status === 'completed' &&
           callDate >= startOfDay(today) &&
           callDate <= endOfDay(today);
  });

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
          className="font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'שם לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div className="font-medium text-gray-800">{row.customer_name}</div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => (
        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">
          {issueTypeLabels[row.issue_type] || row.issue_type || '-'}
        </span>
      )
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} size="sm" />
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (row) => row.created_date ? (
        <span className="text-gray-500 text-sm">
          {format(parseISO(row.created_date), 'dd/MM HH:mm', { locale: he })}
        </span>
      ) : '-'
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (row) => row.assigned_vendor_name ? (
        <span className="text-green-700 font-medium text-sm">{row.assigned_vendor_name}</span>
      ) : (
        <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-full">טרם שובץ</span>
      )
    },
  ];

  // Operator call columns
  const operatorCallColumns = [
    {
      header: 'קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id} className="font-bold text-blue-600 hover:text-blue-800">
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-800">{row.customer_name}</div>
          <a href={`tel:${row.customer_phone}`} className="text-gray-500 text-xs flex items-center gap-1 hover:text-blue-600">
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
        <span className="text-gray-600">{issueTypeLabels[row.issue_type] || row.issue_type}</span>
      )
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_city',
      cell: (row) => (
        <div className="flex items-center gap-1 text-gray-600">
          <MapPin className="w-3 h-3" />
          <span>{row.pickup_location_city || row.pickup_location_address?.substring(0, 20) + '...'}</span>
        </div>
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
        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">{row.assigned_vendor_name}</span>
      ) : (
        <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">לא שובץ</span>
      )
    },
    {
      header: '',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
        <Link to={createPageUrl('VendorProfile') + '?id=' + row.id} className="font-medium text-gray-800 hover:text-blue-600 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Truck className="w-4 h-4" />
          </div>
          {row.vendor_name}
        </Link>
      )
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <a href={`tel:${row.phone}`} className="text-gray-600 flex items-center gap-1 hover:text-blue-600">
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
            <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">
              {area}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'דירוג',
      accessor: 'average_rating',
      cell: (row) => (
        <div className="flex items-center gap-1 text-amber-500 font-medium">
          <span>{row.average_rating ? row.average_rating.toFixed(1) : '-'}</span>
          <span className="text-xs">⭐</span>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {currentUser ? `שלום, ${currentUser.full_name}` : 'לוח בקרה'}
          </h1>
          <div className="flex items-center gap-2 text-gray-500 mt-1">
            <Calendar className="w-4 h-4" />
            <p className="text-sm">
              {format(today, 'EEEE, d בMMMM yyyy', { locale: he })}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl('NewCase')}>
            <Button className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 rounded-full px-6 transition-all transform hover:scale-105">
              <Plus className="w-5 h-5 ml-2" />
              קריאה חדשה
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-full md:w-auto grid grid-cols-3 md:inline-flex h-auto">
          <TabsTrigger value="dashboard" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">סקירה כללית</span>
            <span className="md:hidden">כללי</span>
          </TabsTrigger>
          <TabsTrigger value="operator" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none gap-2">
            <Headphones className="w-4 h-4" />
            <span className="hidden md:inline">תפריט מוקדן</span>
            <span className="md:hidden">מוקדן</span>
          </TabsTrigger>
          <TabsTrigger value="cases" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none gap-2">
            <List className="w-4 h-4" />
            <span className="hidden md:inline">קריאות שירות</span>
            <span className="md:hidden">קריאות</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6 focus-visible:outline-none">
          {/* Main Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard 
              title="קריאות פעילות" 
              value={openCalls.length} 
              subtitle="ממתינות לטיפול וסיום"
              icon={AlertCircle}
              variant="warning"
              to={createPageUrl('Calls') + '?status=active'}
              className="hover:border-orange-300 hover:shadow-md cursor-pointer"
            />
            <StatCard 
              title="ממתינות לשיוך" 
              value={waitingCalls.length} 
              subtitle="נדרשת פעולה מיידית"
              icon={Users}
              variant="danger"
              to={createPageUrl('Calls') + '?status=waiting_treatment'}
              className="hover:border-red-300 hover:shadow-md cursor-pointer"
            />
            <StatCard 
              title="הושלמו היום" 
              value={completedToday.length} 
              subtitle="ביצוע יומי"
              icon={CheckCircle2}
              variant="success"
              to={createPageUrl('Reports')}
              className="hover:border-green-300 hover:shadow-md cursor-pointer"
            />
            <StatCard 
              title="ספקים זמינים" 
              value={availableVendors.length} 
              subtitle="מוכנים לקבלת קריאה"
              icon={Truck}
              variant="info"
              to={createPageUrl('AllVendorsMap')}
              className="hover:border-blue-300 hover:shadow-md cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Work Queue - Takes up 2/3 */}
            <div className="xl:col-span-2">
              <WorkQueueOverview calls={calls} isLoading={isLoading} />
            </div>
            
            {/* KPI Column - Takes up 1/3 */}
            <div className="space-y-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-600">שביעות רצון (CSAT)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-gray-900">{avgRating}</span>
                    <span className="text-lg text-gray-500 mb-1">/ 5.0</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                    <div 
                      className="bg-yellow-400 h-full rounded-full" 
                      style={{ width: `${(parseFloat(avgRating) / 5) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-600">זמן הגעה ממוצע (ETA)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-blue-500 opacity-80" />
                    <div>
                      <span className="text-3xl font-bold text-gray-900">32</span>
                      <span className="text-sm text-gray-500 mr-1">דקות</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-600">אחוז פתרון בשטח</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-green-500 opacity-80" />
                    <div>
                      <span className="text-3xl font-bold text-gray-900">68%</span>
                      <span className="text-sm text-gray-500 mr-1">ללא גרירה</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Insights Widget */}
          <AIInsightsWidget />

          {/* Charts Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>מגמת קריאות</CardTitle>
                <CardDescription>כמות קריאות ב-7 הימים האחרונים</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        labelStyle={{ color: '#111827', fontWeight: 600 }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>התפלגות סטטוסים</CardTitle>
                <CardDescription>סטטוס נוכחי של כלל הקריאות</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Calls Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>קריאות אחרונות</CardTitle>
              <Link to={createPageUrl('Calls')}>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                  לכל הקריאות <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={calls.slice(0, 10)}
                isLoading={isLoading}
                onRowClick={(row) => window.location.href = createPageUrl(`CaseDetails?id=${row.id}`)}
                emptyMessage="אין קריאות להצגה"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operator Tab */}
        <TabsContent value="operator" className="space-y-6 mt-6 focus-visible:outline-none">
          {/* Operator Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="הקריאות שלי"
              value={myOpenCalls.length}
              subtitle="בטיפול פעיל"
              icon={Headphones}
              variant="primary"
              to={createPageUrl('MyQueue')}
              className="hover:border-blue-300 cursor-pointer"
            />
            <StatCard
              title="הושלמו היום"
              value={myCompletedToday.length}
              subtitle="ביצוע אישי"
              icon={CheckCircle2}
              variant="success"
              className="hover:border-green-300 cursor-pointer"
            />
            <StatCard
              title="ממתינות לשיוך"
              value={unassignedCalls.length}
              subtitle="כללי במערכת"
              icon={Users}
              variant="warning"
              to={createPageUrl('Calls') + '?status=waiting_treatment'}
              className="hover:border-orange-300 cursor-pointer"
            />
            <StatCard
              title="דחופות שלי"
              value={myUrgentCalls.length}
              subtitle="נדרש טיפול"
              icon={AlertCircle}
              variant="danger"
              className="hover:border-red-300 cursor-pointer"
            />
            <StatCard
              title="ספקים זמינים"
              value={availableVendors.length}
              subtitle="בזמן אמת"
              icon={Truck}
              variant="default"
              to={createPageUrl('AllVendorsMap')}
              className="hover:border-gray-300 cursor-pointer"
            />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">פעולות מהירות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl('NewCase')} className="group">
                  <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100 group-hover:border-red-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6 text-red-600" />
                    </div>
                    <span className="font-semibold text-gray-800">קריאה חדשה</span>
                  </div>
                </Link>
                <Button variant="ghost" onClick={() => setActiveTab('cases')} className="h-auto p-0 group">
                  <div className="w-full flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-100 group-hover:border-gray-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <List className="w-6 h-6 text-gray-600" />
                    </div>
                    <span className="font-semibold text-gray-800">רשימת קריאות</span>
                  </div>
                </Button>
                <Link to={createPageUrl('ServiceProviders')} className="group">
                  <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-xl border border-blue-100 group-hover:border-blue-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-800">ניהול ספקים</span>
                  </div>
                </Link>
                <Link to={createPageUrl('AllVendorsMap')} className="group">
                  <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl border border-green-100 group-hover:border-green-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <MapPin className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="font-semibold text-gray-800">מפת ספקים</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Urgent Calls Alert */}
          {urgentCalls.length > 0 && (
            <Card className="border-r-4 border-r-red-500 bg-red-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  קריאות דחופות בטיפול ({urgentCalls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urgentCalls.slice(0, 5).map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={createPageUrl('CaseDetails') + '?id=' + call.id} className="font-bold text-gray-900 hover:text-blue-600 hover:underline">
                            {call.call_number || `#${call.id?.slice(-6)}`}
                          </Link>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">דחוף</span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="font-medium">{call.customer_name}</span>
                          <span>•</span>
                          <span>{call.pickup_location_city}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={call.call_status} size="sm" />
                        <Link to={createPageUrl('CaseDetails') + '?id=' + call.id}>
                          <Button size="sm" variant="outline" className="border-gray-200 hover:bg-gray-50">
                            <Eye className="w-4 h-4 ml-1" />
                            צפה
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Open Calls Table */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>הקריאות שלי בטיפול</CardTitle>
                <CardDescription>קריאות המשויכות אליך וממתינות לטיפול</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={operatorCallColumns}
                  data={myOpenCalls}
                  isLoading={callsLoading}
                  onRowClick={(row) => window.location.href = createPageUrl('CaseDetails') + '?id=' + row.id}
                  emptyMessage="אין קריאות משויכות אליך כרגע"
                />
              </CardContent>
            </Card>

            {/* Available Vendors */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>ספקים זמינים</CardTitle>
                <AvatarStack users={availableVendors} max={5} size="sm" />
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={vendorColumns}
                  data={availableVendors}
                  isLoading={vendorsLoading}
                  onRowClick={(row) => window.location.href = createPageUrl('VendorProfile') + '?id=' + row.id}
                  emptyMessage="אין ספקים זמינים כרגע"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-6 mt-6 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle>ניהול קריאות שירות</CardTitle>
              <CardDescription>צפייה וסינון כלל הקריאות במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Input
                    placeholder="חיפוש לפי שם, מספר קריאה או טלפון..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {/* Search icon could be added here absolutely positioned */}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="סינון לפי סטטוס" />
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900">{filteredCalls.length}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">סה״כ רשומות</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                  <div className="text-2xl font-bold text-blue-600">{filteredCalls.filter(c => openStatuses.includes(c.call_status)).length}</div>
                  <div className="text-xs text-blue-500 uppercase tracking-wide">פתוחות</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                  <div className="text-2xl font-bold text-green-600">{filteredCalls.filter(c => c.call_status === 'completed').length}</div>
                  <div className="text-xs text-green-500 uppercase tracking-wide">הושלמו</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
                  <div className="text-2xl font-bold text-red-600">{filteredCalls.filter(c => c.call_status === 'cancelled').length}</div>
                  <div className="text-xs text-red-500 uppercase tracking-wide">בוטלו</div>
                </div>
              </div>

              <DataTable
                columns={columns}
                data={filteredCalls}
                isLoading={callsLoading}
                onRowClick={(row) => window.location.href = createPageUrl('CaseDetails') + '?id=' + row.id}
                emptyMessage="לא נמצאו קריאות התואמות לחיפוש"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}