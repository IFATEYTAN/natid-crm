import React, { useState, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCalls } from '@/features/calls/hooks/useCalls';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { useWorkQueue } from '@/features/queue/hooks/useQueue';
import { createPageUrl } from '@/components/utils';
const StatCard = lazy(() => import('@/components/ui/StatCard'));
import {
  Plus,
  Truck,
  AlertCircle,
  LayoutDashboard,
  Headphones,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { statusLabels, openStatuses } from '@/components/dashboard/dashboardConstants';

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
const AIInsightsWidget = lazy(() => import('@/components/ai/AIInsightsWidget'));
const DashboardOperatorTab = lazy(() => import('@/components/dashboard/DashboardOperatorTab'));
const DashboardTotalsTab = lazy(() => import('@/components/dashboard/DashboardTotalsTab'));
const SmartAlertsTab = lazy(() => import('@/components/dashboard/SmartAlertsTab'));
const VendorMapWidget = lazy(() => import('@/components/dashboard/VendorMapWidget'));
const TrackedCallsPanel = lazy(() => import('@/components/dashboard/TrackedCallsPanel'));
const VendorDelaysWidget = lazy(() => import('@/components/dashboard/VendorDelaysWidget'));
const EscalationPredictionWidget = lazy(() => import('@/components/ai/EscalationPredictionWidget'));
const RecurringPatternsWidget = lazy(() => import('@/components/ai/RecurringPatternsWidget'));
const ProactiveRecommendationsWidget = lazy(
  () => import('@/components/ai/ProactiveRecommendationsWidget')
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { currentUser, hasPermission, canAccessPage } = usePermissions();

  const today = new Date();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 18) return 'צהריים טובים';
    return 'ערב טוב';
  };

  const { data: workQueue = [] } = useWorkQueue();

  const {
    data: calls = [],
    isLoading: callsLoading,
    isError: callsError,
    error: callsErrorData,
  } = useCalls();
  const {
    data: vendors = [],
    isLoading: vendorsLoading,
    isError: vendorsError,
    error: vendorsErrorData,
  } = useVendors();

  const availableVendors = vendors.filter(
    (v) => v.is_active && v.availability_status === 'available'
  );

  const isLoading = callsLoading || vendorsLoading;

  if (callsError || vendorsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">
          {callsErrorData?.message || vendorsErrorData?.message || 'נסה לרענן את הדף'}
        </p>
      </div>
    );
  }

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {currentUser ? `${getGreeting()}, ${currentUser.full_name}` : 'NatID 360 Control'}
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
                <Plus className="w-5 h-5 me-2" />
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

          {/* ניהול איחורים */}
          <Suspense fallback={<Skeleton className="h-48" />}>
            <VendorDelaysWidget calls={calls} isLoading={isLoading} />
          </Suspense>

          {/* קריאות במעקב - פאנל קריאות פעילות מעל המפה */}
          <Suspense fallback={<Skeleton className="h-64" />}>
            <TrackedCallsPanel
              calls={calls}
              isLoading={isLoading}
              onCallClick={(callId) => navigate(createPageUrl(`CallDetails?id=${callId}`))}
            />
          </Suspense>

          {/* מעקב GPS ספקים */}
          <Suspense fallback={<Skeleton className="h-[350px]" />}>
            <VendorMapWidget />
          </Suspense>

          {/* תור מתפעל בזמן אמת */}
          <Suspense fallback={<Skeleton className="h-64" />}>
            <WorkQueueOverview calls={calls} isLoading={isLoading} />
          </Suspense>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Link to={createPageUrl('CustomerFeedback')} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">שביעות רצון (CSAT)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-gray-900">{avgRating}</span>
                    <span className="text-base text-gray-400 mb-0.5">/ 5.0</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all"
                      style={{ width: `${(parseFloat(avgRating) / 5) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Reports')} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">זמן הגעה ממוצע (ETA)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Clock className="w-7 h-7 text-blue-500 opacity-80" />
                    <div>
                      <span className="text-3xl font-bold text-gray-900">{avgEta || '—'}</span>
                      <span className="text-sm text-gray-500 ms-1">דקות</span>
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
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">אחוז פתרון בשטח</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-7 h-7 text-green-500 opacity-80" />
                    <div>
                      <span className="text-3xl font-bold text-gray-900">
                        {fieldResolutionRate || '—'}%
                      </span>
                      <span className="text-sm text-gray-500 ms-1">ללא גרירה</span>
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

          {/* AI Analysis Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Suspense fallback={<Skeleton className="h-[200px]" />}>
              <EscalationPredictionWidget />
            </Suspense>
            <PermissionGuard category="reports" permission="performance">
              <Suspense fallback={<Skeleton className="h-[200px]" />}>
                <AIInsightsWidget />
              </Suspense>
            </PermissionGuard>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <RecurringPatternsWidget />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <ProactiveRecommendationsWidget />
            </Suspense>
          </div>

          <Suspense fallback={<Skeleton className="h-64" />}>
            <SmartAlertsTab currentUser={currentUser} />
          </Suspense>

          <div className="grid lg:grid-cols-2 gap-6">
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <CallsTrendChart data={trendData} isLoading={isLoading} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <StatusDistributionChart data={statusData} isLoading={isLoading} />
            </Suspense>
          </div>
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
              allCalls={calls}
            />
          </Suspense>
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
