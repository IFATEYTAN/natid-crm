import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, Suspense, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
const StatCard = lazyRetry(() => import('@/components/ui/StatCard'));
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
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

// Lazy load sub-components
const CallsTrendChart = lazyRetry(() =>
  import('@/components/dashboard/DashboardCharts').then((module) => ({
    default: module.CallsTrendChart,
  }))
);
const StatusDistributionChart = lazyRetry(() =>
  import('@/components/dashboard/DashboardCharts').then((module) => ({
    default: module.StatusDistributionChart,
  }))
);
const WorkQueueOverview = lazyRetry(() => import('@/components/dashboard/WorkQueueOverview'));
const AIInsightsWidget = lazyRetry(() => import('@/components/ai/AIInsightsWidget'));
const DashboardOperatorTab = lazyRetry(() => import('@/components/dashboard/DashboardOperatorTab'));
const DashboardTotalsTab = lazyRetry(() => import('@/components/dashboard/DashboardTotalsTab'));
const SmartAlertsTab = lazyRetry(() => import('@/components/dashboard/SmartAlertsTab'));
const VendorMapWidget = lazyRetry(() => import('@/components/dashboard/VendorMapWidget'));
const TrackedCallsPanel = lazyRetry(() => import('@/components/dashboard/TrackedCallsPanel'));
const VendorDelaysWidget = lazyRetry(() => import('@/components/dashboard/VendorDelaysWidget'));
const EscalationPredictionWidget = lazyRetry(
  () => import('@/components/ai/EscalationPredictionWidget')
);
const RecurringPatternsWidget = lazyRetry(() => import('@/components/ai/RecurringPatternsWidget'));
const ProactiveRecommendationsWidget = lazyRetry(
  () => import('@/components/ai/ProactiveRecommendationsWidget')
);

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { currentUser, hasPermission, canAccessPage } = usePermissions();

  const [isSyncingNati, setIsSyncingNati] = useState(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setIsRefreshing(false);
  };

  const handleSyncFromNati = async () => {
    setIsSyncingNati(true);
    try {
      const res = await base44.functions.invoke('syncNatiData', {});
      const data = res?.data ?? res;
      if (data?.error) {
        toast.error(data.error);
      } else {
        const created = (data?.calls?.created ?? 0) + (data?.cases?.created ?? 0);
        const updated = (data?.calls?.updated ?? 0) + (data?.cases?.updated ?? 0);
        toast.success(`סנכרון סגור: ${created} נוצרו, ${updated} עודכנו`);
      }
      await queryClient.invalidateQueries();
    } catch (err) {
      console.error('Nati sync error:', err);
      toast.error(err?.response?.data?.error || err?.message || 'שגיאה בסנכרון מנתי');
    }
    setIsSyncingNati(false);
  };

  const today = new Date();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 18) return 'צהריים טובים';
    return 'ערב טוב';
  };

  // Read from Call entity (real data)
  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['dashboard-cases'],
    queryFn: () => base44.entities.Call.list('-created_date', 10000),
  });

  // Read from Vendor entity (real data)
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['dashboard-vendors'],
    queryFn: () => base44.entities.Vendor.list('-updated_date', 500),
  });

  const isLoading = casesLoading || vendorsLoading;

  // Use cases as "calls" for all downstream components that expect call data
  const calls = cases;

  const availableVendors = vendors.filter(
    (v) => v.is_active && v.availability_status === 'available'
  );

  // Calculate stats from Case entity
  const openCalls = useMemo(
    () => cases.filter((c) => c.call_status !== 'completed' && c.call_status !== 'cancelled'),
    [cases]
  );
  const waitingCalls = useMemo(
    () => cases.filter((c) => c.call_status === 'waiting_treatment'),
    [cases]
  );
  const completedToday = useMemo(
    () =>
      cases.filter((c) => {
        if (!c.created_date || c.call_status !== 'completed') return false;
        const d = new Date(c.created_date);
        if (isNaN(d.getTime())) return false;
        return d >= startOfDay(today) && d <= endOfDay(today);
      }),
    [cases]
  );

  // Operator stats (simplified - no work queue dependency)
  const myOpenCalls = [];
  const myCompletedToday = [];
  const myUrgentCalls = [];
  const unassignedCalls = openCalls.filter((c) => !c.assigned_vendor_id);
  const urgentCalls = openCalls.filter((c) => c.call_priority === 'urgent');

  // KPI stats (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentRatedCalls = cases.filter(
    (c) => c.customer_rating && c.created_date && new Date(c.created_date) >= sevenDaysAgo
  );

  const avgRating =
    recentRatedCalls.length > 0
      ? (
          recentRatedCalls.reduce((sum, c) => sum + c.customer_rating, 0) / recentRatedCalls.length
        ).toFixed(1)
      : '0.0';
  const avgEta = 0;
  const recentCompleted = cases.filter(
    (c) =>
      c.call_status === 'completed' && c.created_date && new Date(c.created_date) >= sevenDaysAgo
  );
  const fieldResolutionRate =
    recentCompleted.length > 0
      ? Math.round(
          (recentCompleted.filter((c) => c.service_category !== 'towing').length /
            recentCompleted.length) *
            100
        )
      : 0;

  // Chart data using Case entity fields
  const statusLabelsMap = {
    waiting_treatment: 'ממתין לטיפול',
    awaiting_assignment: 'ממתין לשיוך',
    assigning: 'ספק שובץ',
    vendor_enroute: 'ספק בדרך',
    in_progress: 'בטיפול',
    vendor_arrived: 'ספק הגיע',
    completed: 'סגור',
    cancelled: 'בוטל',
  };
  const statusData = Object.entries(statusLabelsMap)
    .map(([status, name]) => ({
      name,
      value: cases.filter((c) => c.call_status === status).length,
    }))
    .filter((d) => d.value > 0);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = cases.filter(
      (c) => c.created_date && format(new Date(c.created_date), 'yyyy-MM-dd') === dateStr
    ).length;
    return {
      name: format(date, 'dd/MM', { locale: he }),
      value: count,
    };
  });

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500 max-w-full" dir="rtl">
      {/* Header Section */}
      <div className="pb-4 sm:pb-6 border-b border-gray-200">
        {/* Row 1: Greeting (right-aligned) */}
        <div className="text-right mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#111827] tracking-tight">
            {currentUser ? `${getGreeting()}, ${currentUser.full_name}` : 'NatID 360 Control'}
          </h1>
          <p className="text-[#6b7280] text-xs sm:text-sm mb-1">ברוכים הבאים ל-NatID 360 Control</p>
          <div className="flex items-center gap-2 text-gray-500 mt-1 justify-end">
            <p className="text-sm">{format(today, 'EEEE, d בMMMM yyyy', { locale: he })}</p>
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        {/* Row 2: Action Buttons */}
        <div className="flex gap-2 sm:gap-3 justify-end flex-wrap">
          <PermissionGuard category="calls" permission="create">
            <Button
              variant="outline"
              onClick={handleSyncFromNati}
              disabled={isSyncingNati}
              className="rounded-full px-4 transition-all border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 me-2 ${isSyncingNati ? 'animate-spin' : ''}`} />
              {isSyncingNati ? 'מסנכרן...' : 'סנכרון מנתיד'}
            </Button>
          </PermissionGuard>
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="rounded-full px-4 transition-all"
          >
            <RefreshCw className={`w-4 h-4 me-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            רענן נתונים
          </Button>
          <PermissionGuard category="calls" permission="create">
            <Link to={createPageUrl('NewCase')}>
              <Button className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 rounded-full px-4 sm:px-6 h-10 sm:h-11 text-sm sm:text-base transition-all transform hover:scale-105">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
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
                title="נסגרו היום"
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
            <VendorDelaysWidget calls={cases} isLoading={isLoading} />
          </Suspense>

          {/* קריאות במעקב - פאנל קריאות פעילות מעל המפה */}
          <Suspense fallback={<Skeleton className="h-64" />}>
            <TrackedCallsPanel
              calls={cases}
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
            <WorkQueueOverview calls={cases} isLoading={isLoading} />
          </Suspense>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
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
                  {avgEta > 0 && (
                    <p className="text-xs text-gray-400 mt-2">מבוסס על 7 ימים אחרונים</p>
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
              callsLoading={casesLoading}
              vendorsLoading={vendorsLoading}
              allCalls={cases}
            />
          </Suspense>
        </TabsContent>

        {/* Totals Tab */}
        <TabsContent value="totals" className="space-y-6 mt-6 focus-visible:outline-none">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <DashboardTotalsTab calls={cases} callsLoading={casesLoading} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
