import React, { useState, useMemo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { useCalls } from '@/features/calls/hooks/useCalls';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Replaced by lazy-loaded charts to reduce bundle size
const DailyCallsChart = React.lazy(() =>
  import('@/components/reports/ReportsCharts').then((m) => ({ default: m.DailyCallsChart }))
);
const StatusDistributionChart = React.lazy(() =>
  import('@/components/reports/ReportsCharts').then((m) => ({ default: m.StatusDistributionChart }))
);
const IssueTypesChart = React.lazy(() =>
  import('@/components/reports/ReportsCharts').then((m) => ({ default: m.IssueTypesChart }))
);
const VendorPerformanceChart = React.lazy(() =>
  import('@/components/reports/ReportsCharts').then((m) => ({ default: m.VendorPerformanceChart }))
);

const OperationalEfficiencyReport = React.lazy(
  () => import('@/components/reports/OperationalEfficiencyReport.jsx')
);
const CustomerAnalysisReport = React.lazy(
  () => import('@/components/reports/CustomerAnalysisReport.jsx')
);
const VendorPerformanceReport = React.lazy(
  () => import('@/components/reports/VendorPerformanceReport.jsx')
);
const CompanyReport = React.lazy(() => import('@/components/reports/CompanyReport'));
const FinancialReport = React.lazy(() => import('@/components/reports/FinancialReport'));
const UsageReport = React.lazy(() => import('@/components/reports/UsageReport'));
const Annual2025Report = React.lazy(() => import('@/components/reports/Annual2025Report'));
const Fleet2025Report = React.lazy(() => import('@/components/reports/Fleet2025Report'));

import ExportMenu from '@/components/ui/ExportMenu';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Truck,
  Calendar,
  Download,
  Lock,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useAuditLog } from '@/hooks/useAuditLog';

const COLORS = ['#3b82f6', '#111827', '#6b7280', '#ef4444'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('30');
  const [seeding, setSeeding] = useState(false);
  const { hasPermission, canAccessReport } = usePermissions();
  const { logExport, logSensitiveAccess } = useAuditLog();

  const canViewFinancial = hasPermission('reports', 'financial');
  const canExport = hasPermission('reports', 'export');

  // Fetch calls - using shared hook for sync across screens
  const callsQuery = useCalls();

  // Fetch vendors - using shared hook for sync across screens
  const vendorsQuery = useVendors();

  // Fetch ratings
  const ratingsQuery = useQuery({
    queryKey: queryKeys.reports.vendorRatings(),
    queryFn: () => base44.entities.VendorRating.filter({}, '-created_date', 200),
  });

  const calls = callsQuery.data || [];
  const vendors = vendorsQuery.data || [];
  const ratings = ratingsQuery.data || [];

  const seedDemoData = async () => {
    try {
      setSeeding(true);
      // Vendors
      const demoVendors = await base44.entities.Vendor.bulkCreate([
        { vendor_name: 'גרר מהיר תל אביב', phone: '03-1111111', availability_status: 'available' },
        { vendor_name: 'חשמלאי רכב המרכז', phone: '03-2222222', availability_status: 'busy' },
        { vendor_name: 'מנעולן על הכביש', phone: '03-3333333', availability_status: 'available' },
      ]);

      const vA = demoVendors?.[0];
      const vB = demoVendors?.[1];

      // Calls
      await base44.entities.Call.bulkCreate([
        {
          call_number: 'R-2001',
          customer_name: 'רות כהן',
          customer_phone: '052-1234567',
          pickup_location_address: 'תל אביב',
          issue_type: 'flat_tire',
          call_status: 'completed',
          time_to_completion: 35,
          assigned_vendor_id: vA?.id,
          assigned_vendor_name: vA?.vendor_name,
        },
        {
          call_number: 'R-2002',
          customer_name: 'משה ישראלי',
          customer_phone: '052-7654321',
          pickup_location_address: 'הרצליה',
          issue_type: 'dead_battery',
          call_status: 'in_progress',
          assigned_vendor_id: vB?.id,
          assigned_vendor_name: vB?.vendor_name,
        },
        {
          call_number: 'R-2003',
          customer_name: 'נועה בר',
          customer_phone: '050-9999999',
          pickup_location_address: 'חולון',
          issue_type: 'mechanical',
          call_status: 'vendor_enroute',
          assigned_vendor_id: vA?.id,
          assigned_vendor_name: vA?.vendor_name,
        },
        {
          call_number: 'R-2004',
          customer_name: 'דוד לוי',
          customer_phone: '050-8888888',
          pickup_location_address: 'חיפה',
          issue_type: 'no_fuel',
          call_status: 'cancelled',
        },
        {
          call_number: 'R-2005',
          customer_name: 'עדי שלו',
          customer_phone: '050-7777777',
          pickup_location_address: 'ירושלים',
          issue_type: 'locked_keys',
          call_status: 'completed',
          time_to_completion: 28,
          assigned_vendor_id: vB?.id,
          assigned_vendor_name: vB?.vendor_name,
        },
        {
          call_number: 'R-2006',
          customer_name: 'אופיר גיל',
          customer_phone: '050-6666666',
          pickup_location_address: 'פתח תקווה',
          issue_type: 'stopped_driving',
          call_status: 'awaiting_assignment',
        },
      ]);

      await callsQuery.refetch();
      await vendorsQuery.refetch();
    } finally {
      setSeeding(false);
    }
  };

  // Filter calls by date range
  const filteredCalls = useMemo(() => {
    const days = parseInt(dateRange);
    const cutoffDate = subDays(new Date(), days);
    return calls.filter((call) => new Date(call.created_date) >= cutoffDate);
  }, [calls, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const completed = filteredCalls.filter((c) => c.call_status === 'completed').length;
    const cancelled = filteredCalls.filter((c) => c.call_status === 'cancelled').length;
    const avgTime =
      filteredCalls
        .filter((c) => c.time_to_completion)
        .reduce((sum, c) => sum + c.time_to_completion, 0) /
      (filteredCalls.filter((c) => c.time_to_completion).length || 1);

    return {
      total: filteredCalls.length,
      completed,
      cancelled,
      completionRate: filteredCalls.length
        ? Math.round((completed / filteredCalls.length) * 100)
        : 0,
      avgCompletionTime: Math.round(avgTime),
    };
  }, [filteredCalls]);

  // Calls by status chart data
  const statusChartData = useMemo(() => {
    const statusCounts = {};
    filteredCalls.forEach((call) => {
      const status = call.call_status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusLabels = {
      waiting_treatment: 'ממתין',
      awaiting_assignment: 'לשיוך',
      vendor_enroute: 'בדרך',
      in_progress: 'בטיפול',
      completed: 'הושלם',
      cancelled: 'בוטל',
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
    }));
  }, [filteredCalls]);

  // Calls by day chart data
  const dailyChartData = useMemo(() => {
    const days = parseInt(dateRange);
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days),
      end: new Date(),
    });

    return interval.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayCount = filteredCalls.filter(
        (call) => format(new Date(call.created_date), 'yyyy-MM-dd') === dayStr
      ).length;

      return {
        date: format(day, 'dd/MM'),
        קריאות: dayCount,
      };
    });
  }, [filteredCalls, dateRange]);

  // Vendor performance
  const vendorPerformance = useMemo(() => {
    const vendorStats = {};

    filteredCalls.forEach((call) => {
      if (call.assigned_vendor_id) {
        if (!vendorStats[call.assigned_vendor_id]) {
          vendorStats[call.assigned_vendor_id] = {
            name: call.assigned_vendor_name || 'לא ידוע',
            total: 0,
            completed: 0,
          };
        }
        vendorStats[call.assigned_vendor_id].total++;
        if (call.call_status === 'completed') {
          vendorStats[call.assigned_vendor_id].completed++;
        }
      }
    });

    return Object.values(vendorStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredCalls]);

  // Issue types distribution
  const issueTypeData = useMemo(() => {
    const typeCounts = {};
    const typeLabels = {
      mechanical: 'תקלה מכנית',
      stopped_driving: 'רכב לא נוסע',
      flat_tire: "פנצ'ר",
      accident: 'תאונה',
      no_fuel: 'אין דלק',
      dead_battery: 'מצבר',
      locked_keys: 'מפתחות',
      other: 'אחר',
    };

    filteredCalls.forEach((call) => {
      const type = call.issue_type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        name: typeLabels[type] || type,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCalls]);

  const isLoading = callsQuery.isLoading || vendorsQuery.isLoading;

  if (callsQuery.isError || vendorsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">
          {callsQuery.error?.message || vendorsQuery.error?.message || 'נסה לרענן את הדף'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">דוחות וסטטיסטיקות</h1>
          <p className="text-[#6b7280] text-sm">ניתוח ביצועים ומגמות</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={seedDemoData} isLoading={seeding} className="gap-2">
            טען נתוני הדגמה
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ימים אחרונים</SelectItem>
              <SelectItem value="30">30 ימים אחרונים</SelectItem>
              <SelectItem value="90">90 ימים אחרונים</SelectItem>
            </SelectContent>
          </Select>
          <PermissionGuard category="reports" permission="export">
            <ExportMenu
              data={filteredCalls}
              columns={[
                { header: 'מספר קריאה', accessor: 'call_number' },
                { header: 'לקוח', accessor: 'customer_name' },
                { header: 'טלפון', accessor: 'customer_phone' },
                { header: 'מיקום', accessor: 'pickup_location_address' },
                { header: 'סוג תקלה', accessor: 'issue_type' },
                { header: 'סטטוס', accessor: 'call_status' },
                { header: 'תאריך', accessor: 'created_date' },
                { header: 'זמן טיפול (דק)', accessor: 'time_to_completion' },
              ]}
              filename={`reports_${dateRange}days`}
              title={`דוח ביצועים - ${dateRange} ימים אחרונים`}
            />
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#3b82f6]/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.total}</div>
                <div className="text-xs text-[#6b7280]">סה"כ קריאות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#111827]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#111827]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.completed}</div>
                <div className="text-xs text-[#6b7280]">הושלמו</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#3b82f6]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.completionRate}%</div>
                <div className="text-xs text-[#6b7280]">אחוז השלמה</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#6b7280]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#6b7280]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.avgCompletionTime}</div>
                <div className="text-xs text-[#6b7280]">דקות ממוצע</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Calls Chart */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg text-[#111827]">קריאות לפי יום</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <DailyCallsChart data={dailyChartData} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg text-[#111827]">התפלגות סטטוסים</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <StatusDistributionChart data={statusChartData} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Issue Types */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg text-[#111827]">סוגי תקלות</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <IssueTypesChart data={issueTypeData} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Vendor Performance - requires performance permission */}
        <PermissionGuard category="reports" permission="performance" showMessage>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardHeader>
              <CardTitle className="text-lg text-[#111827]">ביצועי ספקים</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-[300px]" />}>
                <VendorPerformanceChart data={vendorPerformance} />
              </Suspense>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Financial Reports Section - Only for authorized users */}
      <PermissionGuard category="reports" permission="financial" showMessage>
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg text-[#111827] flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-600" />
              דוחות פיננסיים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#6b7280] mb-4">מידע פיננסי רגיש - נגיש למורשים בלבד</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">
                  ₪{(stats.total * 150).toLocaleString()}
                </div>
                <div className="text-xs text-[#6b7280]">הכנסות משוערות</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">
                  ₪{(stats.completed * 80).toLocaleString()}
                </div>
                <div className="text-xs text-[#6b7280]">עלויות ספקים</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">
                  ₪{(stats.total * 150 - stats.completed * 80).toLocaleString()}
                </div>
                <div className="text-xs text-[#6b7280]">רווח גולמי</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">
                  {Math.round(
                    ((stats.total * 150 - stats.completed * 80) / (stats.total * 150)) * 100
                  ) || 0}
                  %
                </div>
                <div className="text-xs text-[#6b7280]">מרווח רווחיות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Advanced Reports Tabs */}
      <Tabs defaultValue="annual2025" className="mt-8">
        <TabsList className="w-full justify-start bg-white p-1 border border-[#e5e7eb] rounded-lg flex-wrap">
          <TabsTrigger value="annual2025">דוח 2025 - סיכום</TabsTrigger>
          <TabsTrigger value="fleet2025">דוח 2025 - צי וספקים</TabsTrigger>
          <TabsTrigger value="operational">יעילות תפעולית</TabsTrigger>
          <TabsTrigger value="vendors">ביצועי ספקים</TabsTrigger>
          <TabsTrigger value="customers">ניתוח לקוחות</TabsTrigger>
          <TabsTrigger value="companies">מרכז חברות</TabsTrigger>
          <TabsTrigger value="financial">פיננסי</TabsTrigger>
          <TabsTrigger value="usage">שימושים</TabsTrigger>
        </TabsList>

        <TabsContent value="annual2025" className="mt-4">
           <Suspense fallback={<Skeleton className="h-[400px]" />}>
             <Annual2025Report />
           </Suspense>
         </TabsContent>

         <TabsContent value="fleet2025" className="mt-4">
           <Suspense fallback={<Skeleton className="h-[400px]" />}>
             <Fleet2025Report />
           </Suspense>
         </TabsContent>

         <TabsContent value="operational" className="mt-4">
           <Suspense fallback={<Skeleton className="h-[400px]" />}>
             <OperationalEfficiencyReport calls={filteredCalls} />
           </Suspense>
         </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <VendorPerformanceReport vendors={vendors} calls={filteredCalls} ratings={ratings} />
          </Suspense>
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <CustomerAnalysisReport calls={filteredCalls} />
          </Suspense>
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <CompanyReport calls={filteredCalls} />
          </Suspense>
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          <PermissionGuard category="reports" permission="financial" showMessage>
            <Suspense fallback={<Skeleton className="h-[400px]" />}>
              <FinancialReport calls={filteredCalls} />
            </Suspense>
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <UsageReport calls={filteredCalls} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}