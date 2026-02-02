import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Truck,
  Calendar,
  Download,
  Lock
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useAuditLog } from '@/components/hooks/useAuditLog';

const COLORS = ['#3b82f6', '#111827', '#6b7280', '#ef4444'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('30');
  const { hasPermission, canAccessReport } = usePermissions();
  const { logExport, logSensitiveAccess } = useAuditLog();
  
  const canViewFinancial = hasPermission('reports', 'financial');
  const canExport = hasPermission('reports', 'export');

  // Fetch calls
  const callsQuery = useQuery({
    queryKey: ['reportCalls'],
    queryFn: () => base44.entities.Call.filter({}, '-created_date', 500),
  });

  // Fetch vendors
  const vendorsQuery = useQuery({
    queryKey: ['reportVendors'],
    queryFn: () => base44.entities.Vendor.filter({}),
  });

  const calls = callsQuery.data || [];
  const vendors = vendorsQuery.data || [];

  // Filter calls by date range
  const filteredCalls = useMemo(() => {
    const days = parseInt(dateRange);
    const cutoffDate = subDays(new Date(), days);
    return calls.filter(call => new Date(call.created_date) >= cutoffDate);
  }, [calls, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const completed = filteredCalls.filter(c => c.call_status === 'completed').length;
    const cancelled = filteredCalls.filter(c => c.call_status === 'cancelled').length;
    const avgTime = filteredCalls
      .filter(c => c.time_to_completion)
      .reduce((sum, c) => sum + c.time_to_completion, 0) / 
      (filteredCalls.filter(c => c.time_to_completion).length || 1);

    return {
      total: filteredCalls.length,
      completed,
      cancelled,
      completionRate: filteredCalls.length ? Math.round((completed / filteredCalls.length) * 100) : 0,
      avgCompletionTime: Math.round(avgTime)
    };
  }, [filteredCalls]);

  // Calls by status chart data
  const statusChartData = useMemo(() => {
    const statusCounts = {};
    filteredCalls.forEach(call => {
      const status = call.call_status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusLabels = {
      waiting_treatment: 'ממתין',
      awaiting_assignment: 'לשיוך',
      vendor_enroute: 'בדרך',
      in_progress: 'בטיפול',
      completed: 'הושלם',
      cancelled: 'בוטל'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count
    }));
  }, [filteredCalls]);

  // Calls by day chart data
  const dailyChartData = useMemo(() => {
    const days = parseInt(dateRange);
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days),
      end: new Date()
    });

    return interval.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayCount = filteredCalls.filter(call => 
        format(new Date(call.created_date), 'yyyy-MM-dd') === dayStr
      ).length;

      return {
        date: format(day, 'dd/MM'),
        קריאות: dayCount
      };
    });
  }, [filteredCalls, dateRange]);

  // Vendor performance
  const vendorPerformance = useMemo(() => {
    const vendorStats = {};
    
    filteredCalls.forEach(call => {
      if (call.assigned_vendor_id) {
        if (!vendorStats[call.assigned_vendor_id]) {
          vendorStats[call.assigned_vendor_id] = {
            name: call.assigned_vendor_name || 'לא ידוע',
            total: 0,
            completed: 0
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
      flat_tire: 'פנצ\'ר',
      accident: 'תאונה',
      no_fuel: 'אין דלק',
      dead_battery: 'מצבר',
      locked_keys: 'מפתחות',
      other: 'אחר'
    };

    filteredCalls.forEach(call => {
      const type = call.issue_type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        name: typeLabels[type] || type,
        value: count
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCalls]);

  const isLoading = callsQuery.isLoading || vendorsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">דוחות וסטטיסטיקות</h1>
          <p className="text-[#6b7280] text-sm">ניתוח ביצועים ומגמות</p>
        </div>
        <div className="flex gap-3">
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
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                logExport('Reports', `ייצוא דוח - ${dateRange} ימים`);
                // Export logic here
              }}
            >
              <Download className="w-4 h-4" />
              ייצוא
            </Button>
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
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="קריאות" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg text-[#111827]">התפלגות סטטוסים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Issue Types */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg text-[#111827]">סוגי תקלות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Performance - requires performance permission */}
        <PermissionGuard category="reports" permission="performance" showMessage>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardHeader>
              <CardTitle className="text-lg text-[#111827]">ביצועי ספקים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="סה״כ" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="הושלמו" fill="#111827" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
            <p className="text-sm text-[#6b7280] mb-4">
              מידע פיננסי רגיש - נגיש למורשים בלבד
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">₪{(stats.total * 150).toLocaleString()}</div>
                <div className="text-xs text-[#6b7280]">הכנסות משוערות</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">₪{(stats.completed * 80).toLocaleString()}</div>
                <div className="text-xs text-[#6b7280]">עלויות ספקים</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">₪{((stats.total * 150) - (stats.completed * 80)).toLocaleString()}</div>
                <div className="text-xs text-[#6b7280]">רווח גולמי</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#111827]">{Math.round(((stats.total * 150 - stats.completed * 80) / (stats.total * 150)) * 100) || 0}%</div>
                <div className="text-xs text-[#6b7280]">מרווח רווחיות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
}