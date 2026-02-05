import React, { useState, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useCalls } from '@/components/hooks/useCalls';
import { useVendors } from '@/components/hooks/useVendors';
import { createPageUrl } from '@/components/utils';
const StatCard = lazy(() => import('@/components/ui/StatCard'));
import {
  Plus,
  ChevronLeft,
  Truck,
  AlertCircle,
  LayoutDashboard,
  Headphones,
  List,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { statusLabels, openStatuses } from '@/components/dashboard/dashboardConstants';
import { getCallColumns } from '@/components/dashboard/DashboardColumns';

// Lazy load sub-components
const CallsTrendChart = lazy(() =>
  import('@/components/dashboard/DashboardCharts').then((module) => ({
    default: module.CallsTrendChart,
  }))
);
const StatusDistributionChart = lazy(() =>
  import('@/components/dashboard/DashboardCharts').then((module) => ({
    default: module.StatusDistributionChart,
  }))
);
const WorkQueueOverview = lazy(() => import('@/components/dashboard/WorkQueueOverview'));
const DataTableLazy = lazy(() => import('@/components/ui/DataTable'));
const ExportMenu = lazy(() => import('@/components/ui/ExportMenu'));
const AIInsightsWidget = lazy(() => import('@/components/ai/AIInsightsWidget'));
const DashboardOperatorTab = lazy(() => import('@/components/dashboard/DashboardOperatorTab'));
const DashboardTotalsTab = lazy(() => import('@/components/dashboard/DashboardTotalsTab'));

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { currentUser, hasPermission, canAccessPage } = usePermissions();

  const today = new Date();

  const { data: workQueue = [] } = useQuery({
    queryKey: ['workQueue'],
    queryFn: () => base44.entities.WorkQueue.list(),
  });

  const { data: calls = [], isLoading: callsLoading } = useCalls();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();

  const { data: availableVendors = [] } = useQuery({
    queryKey: ['availableVendors'],
    queryFn: () =>
      base44.entities.Vendor.filter({
        is_active: true,
        availability_status: 'available',
      }),
    refetchInterval: 30000,
  });

  const isLoading = callsLoading || vendorsLoading;

  // Calculate stats
  const openCalls = calls.filter((c) => openStatuses.includes(c.call_status));
  const waitingCalls = calls.filter((c) => c.call_status === 'waiting_treatment');
  const completedToday = calls.filter((call) => {
    const callDate = new Date(call.created_date);
    return (
      call.call_status === 'completed' &&
      callDate >= startOfDay(today) &&
      callDate <= endOfDay(today)
    );
  });

  // Operator stats
  const myWorkItems = workQueue.filter((wq) => wq.assigned_to_agent === currentUser?.email);
  const myCallIds = myWorkItems.map((wq) => wq.call_id);
  const myOpenCalls = openCalls.filter((c) => myCallIds.includes(c.id));
  const myCompletedToday = calls.filter((call) => {
    const callDate = new Date(call.created_date);
    return (
      call.call_status === 'completed' &&
      myCallIds.includes(call.id) &&
      callDate >= startOfDay(today) &&
      callDate <= endOfDay(today)
    );
  });
  const myUrgentCalls = myOpenCalls.filter(
    (c) => c.call_priority === 'urgent' || c.call_priority === 'critical'
  );
  const unassignedCalls = openCalls.filter((c) => !c.assigned_vendor_id);
  const urgentCalls = openCalls.filter(
    (c) => c.call_priority === 'urgent' || c.call_priority === 'critical'
  );

  // KPI stats (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentRatedCalls = calls.filter(
    (c) => c.customer_rating && c.created_date && parseISO(c.created_date) >= sevenDaysAgo
  );
  const avgRating =
    recentRatedCalls.length > 0
      ? (
          recentRatedCalls.reduce((sum, c) => sum + c.customer_rating, 0) / recentRatedCalls.length
        ).toFixed(1)
      : '0.0';
  const recentCallsWithEta = calls.filter(
    (c) => c.vendor_eta && c.created_date && parseISO(c.created_date) >= sevenDaysAgo
  );
  const avgEta =
    recentCallsWithEta.length > 0
      ? Math.round(
          recentCallsWithEta.reduce((sum, c) => sum + c.vendor_eta, 0) / recentCallsWithEta.length
        )
      : 0;
  const recentCompleted = calls.filter(
    (c) =>
      c.call_status === 'completed' && c.created_date && parseISO(c.created_date) >= sevenDaysAgo
  );
  const resolvedInField = recentCompleted.filter((c) => c.resolution_type !== 'tow');
  const fieldResolutionRate =
    recentCompleted.length > 0
      ? Math.round((resolvedInField.length / recentCompleted.length) * 100)
      : 0;

  // Filtered calls for cases tab
  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      !searchQuery ||
      call.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.call_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.customer_phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || call.call_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Chart data
  const statusData = Object.keys(statusLabels)
    .map((status) => ({
      name: statusLabels[status],
      value: calls.filter((c) => c.call_status === status).length,
    }))
    .filter((d) => d.value > 0);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = calls.filter(
      (c) => c.created_date && format(parseISO(c.created_date), 'yyyy-MM-dd') === dateStr
    ).length;
    return {
      name: format(date, 'dd/MM', { locale: he }),
      value: count,
    };
  });

  const columns = getCallColumns();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {currentUser ? `שלום, ${currentUser.full_name}` : 'NatID 360 Control'}
          </h1>
          <p className="text-[#6b7280] text-sm mb-1">ברוכים הבאים ל-NatID 360 Control</p>
          <div className="flex items-center gap-2 text-gray-500 mt-1">
            <Calendar className="w-4 h-4" />
            <p className="text-sm">{format(today, 'EEEE, d בMMMM yyyy', { locale: he })}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <PermissionGuard category="calls" permission="create">
            <Link to={createPageUrl('NewCase')}>
              <Button className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 rounded-full px-6 transition-all transform hover:scale-105">
                <Plus className="w-5 h-5 ml-2" />
                קריאה חדשה
              </Button>
            </Link>
          </PermissionGuard>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-full md:w-auto grid grid-cols-3 md:inline-flex h-auto">
          <TabsTrigger
            value="dashboard"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">סקירה כללית</span>
            <span className="md:hidden">כללי</span>
          </TabsTrigger>
          <TabsTrigger
            value="operator"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none gap-2"
          >
            <Headphones className="w-4 h-4" />
            <span className="hidden md:inline">תפריט מוקדן</span>
            <span className="md:hidden">מוקדן</span>
          </TabsTrigger>
          <TabsTrigger
            value="cases"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none gap-2"
          >
            <List className="w-4 h-4" />
            <span className="hidden md:inline">קריאות שירות</span>
            <span className="md:hidden">קריאות</span>
          </TabsTrigger>
          <TabsTrigger
            value="totals"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">סה"כ קריאות</span>
            <span className="md:hidden">סה"כ</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Suspense fallback={<Skeleton className="h-24" />}>
              <StatCard
                title="קריאות פעילות"
                value={openCalls.length}
                subtitle="ממתינות לטיפול וסיום"
                icon={AlertCircle}
                variant="warning"
                to={createPageUrl('Calls') + '?status=active'}
                className="hover:border-orange-300 hover:shadow-md cursor-pointer"
              />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-24" />}>
              <StatCard
                title="ממתינות לשיוך"
                value={waitingCalls.length}
                subtitle="נדרשת פעולה מיידית"
                icon={Users}
                variant="danger"
                to={createPageUrl('Calls') + '?status=waiting_treatment'}
                className="hover:border-red-300 hover:shadow-md cursor-pointer"
              />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-24" />}>
              <StatCard
                title="הושלמו היום"
                value={completedToday.length}
                subtitle="ביצוע יומי"
                icon={CheckCircle2}
                variant="success"
                to={createPageUrl('Reports')}
                className="hover:border-green-300 hover:shadow-md cursor-pointer"
              />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-24" />}>
              <StatCard
                title="ספקים זמינים"
                value={availableVendors.length}
                subtitle="מוכנים לקבלת קריאה"
                icon={Truck}
                variant="info"
                to={createPageUrl('AllVendorsMap')}
                className="hover:border-blue-300 hover:shadow-md cursor-pointer"
              />
            </Suspense>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Suspense fallback={<Skeleton className="h-64" />}>
                <WorkQueueOverview calls={calls} isLoading={isLoading} />
              </Suspense>
            </div>
            <div className="space-y-4">
              <Link to={createPageUrl('CustomerFeedback')} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
              </Link>
              <Link to={createPageUrl('Reports')} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-600">זמן הגעה ממוצע (ETA)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-blue-500 opacity-80" />
                      <div>
                        <span className="text-3xl font-bold text-gray-900">{avgEta || '—'}</span>
                        <span className="text-sm text-gray-500 mr-1">דקות</span>
                      </div>
                    </div>
                    {recentCallsWithEta.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        מבוסס על {recentCallsWithEta.length} קריאות ב-7 ימים
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl('Reports')} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-600">אחוז פתרון בשטח</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-green-500 opacity-80" />
                      <div>
                        <span className="text-3xl font-bold text-gray-900">
                          {fieldResolutionRate || '—'}%
                        </span>
                        <span className="text-sm text-gray-500 mr-1">ללא גרירה</span>
                      </div>
                    </div>
                    {recentCompleted.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        מבוסס על {recentCompleted.length} קריאות ב-7 ימים
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          <PermissionGuard category="reports" permission="performance">
            <Suspense fallback={<Skeleton className="h-[120px]" />}>
              <AIInsightsWidget />
            </Suspense>
          </PermissionGuard>

          <div className="grid lg:grid-cols-2 gap-6">
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <CallsTrendChart data={trendData} isLoading={isLoading} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <StatusDistributionChart data={statusData} isLoading={isLoading} />
            </Suspense>
          </div>

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
              <Suspense fallback={<Skeleton className="h-40" />}>
                <DataTableLazy
                  columns={columns}
                  data={calls.slice(0, 10)}
                  isLoading={isLoading}
                  onRowClick={(row) =>
                    (window.location.href = createPageUrl(`CallDetails?id=${row.id}`))
                  }
                  emptyMessage="אין קריאות להצגה"
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operator Tab */}
        <TabsContent value="operator" className="space-y-6 mt-6 focus-visible:outline-none">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <DashboardOperatorTab
              myOpenCalls={myOpenCalls}
              myCompletedToday={myCompletedToday}
              unassignedCalls={unassignedCalls}
              myUrgentCalls={myUrgentCalls}
              urgentCalls={urgentCalls}
              availableVendors={availableVendors}
              callsLoading={callsLoading}
              vendorsLoading={vendorsLoading}
              setActiveTab={setActiveTab}
            />
          </Suspense>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-6 mt-6 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>ניהול קריאות שירות</CardTitle>
                  <CardDescription>צפייה וסינון כלל הקריאות במערכת</CardDescription>
                </div>
                <Suspense fallback={<Skeleton className="w-24 h-10" />}>
                  <ExportMenu 
                    data={filteredCalls} 
                    columns={columns} 
                    filename="dashboard_cases" 
                    title="דוח קריאות - לוח בקרה"
                  />
                </Suspense>
              </div>
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
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredCalls.filter((c) => openStatuses.includes(c.call_status)).length}
                  </div>
                  <div className="text-xs text-blue-500 uppercase tracking-wide">פתוחות</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredCalls.filter((c) => c.call_status === 'completed').length}
                  </div>
                  <div className="text-xs text-green-500 uppercase tracking-wide">הושלמו</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
                  <div className="text-2xl font-bold text-red-600">
                    {filteredCalls.filter((c) => c.call_status === 'cancelled').length}
                  </div>
                  <div className="text-xs text-red-500 uppercase tracking-wide">בוטלו</div>
                </div>
              </div>

              <Suspense fallback={<Skeleton className="h-40" />}>
                <DataTableLazy
                  columns={columns}
                  data={filteredCalls}
                  isLoading={callsLoading}
                  onRowClick={(row) =>
                    (window.location.href = createPageUrl('CallDetails') + '?id=' + row.id)
                  }
                  emptyMessage="לא נמצאו קריאות התואמות לחיפוש"
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Totals Tab */}
        <TabsContent value="totals" className="space-y-6 mt-6 focus-visible:outline-none">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <DashboardTotalsTab calls={calls} callsLoading={callsLoading} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}