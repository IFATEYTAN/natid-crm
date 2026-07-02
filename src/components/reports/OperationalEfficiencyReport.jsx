import React, { useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users, Activity, Phone } from 'lucide-react';
import { OperatorLoadChart, OperatorHandlingTimeChart } from '@/components/reports/ReportsCharts';

export default function OperationalEfficiencyReport({ calls }) {
  // Stats calculation
  const stats = useMemo(() => {
    // Average handling time (creation to closed_at or completed status if we simulate time)
    // Using time_to_completion if available, otherwise estimating
    const completedCalls = calls.filter(
      (c) => c.call_status === 'completed' && typeof c.time_to_completion === 'number'
    );
    const avgTime =
      completedCalls.reduce((sum, c) => sum + (c.time_to_completion || 0), 0) /
      (completedCalls.length || 1);

    // Calls per day (average)
    // Group by date
    const callsByDate = {};
    calls.forEach((c) => {
      if (!c.created_date) return;
      const d = new Date(c.created_date);
      if (isNaN(d.getTime())) return;
      const date = d.toDateString();
      callsByDate[date] = (callsByDate[date] || 0) + 1;
    });
    const daysCount = Object.keys(callsByDate).length || 1;
    const avgCallsPerDay = calls.length / daysCount;

    return {
      avgHandlingTime: Math.round(avgTime),
      totalCalls: calls.length,
      avgCallsPerDay: Math.round(avgCallsPerDay * 10) / 10,
      activeOperators: new Set(calls.map((c) => c.created_by)).size,
    };
  }, [calls]);

  // Operator Load Data
  const operatorData = useMemo(() => {
    const counts = {};
    calls.forEach((call) => {
      // created_by is email, let's try to make it shorter or use a name map if available
      // For now using the email prefix
      const operator = call.created_by ? call.created_by.split('@')[0] : 'System';
      counts[operator] = (counts[operator] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, calls: count }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10); // Top 10
  }, [calls]);

  // Per-operator average handling time (completed calls only)
  const operatorHandlingTimeData = useMemo(() => {
    const byOperator = {};
    calls
      .filter((c) => c.call_status === 'completed' && typeof c.time_to_completion === 'number')
      .forEach((call) => {
        const operator = call.created_by ? call.created_by.split('@')[0] : 'System';
        if (!byOperator[operator]) byOperator[operator] = { sum: 0, count: 0 };
        byOperator[operator].sum += call.time_to_completion;
        byOperator[operator].count += 1;
      });

    return Object.entries(byOperator)
      .map(([name, { sum, count }]) => ({ name, avgMinutes: Math.round(sum / count) }))
      .sort((a, b) => b.avgMinutes - a.avgMinutes)
      .slice(0, 10);
  }, [calls]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgHandlingTime}</div>
                <div className="text-xs text-gray-500">דק' זמן טיפול ממוצע</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgCallsPerDay}</div>
                <div className="text-xs text-gray-500">קריאות ליום (ממוצע)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalCalls}</div>
                <div className="text-xs text-gray-500">סה"כ קריאות בתקופה</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.activeOperators}</div>
                <div className="text-xs text-gray-500">מוקדנים פעילים</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">עומס מוקדנים</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <OperatorLoadChart data={operatorData} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">זמן טיפול ממוצע למוקדן</CardTitle>
          </CardHeader>
          <CardContent>
            {operatorHandlingTimeData.length > 0 ? (
              <Suspense fallback={<Skeleton className="h-[300px]" />}>
                <OperatorHandlingTimeChart data={operatorHandlingTimeData} />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                אין מספיק נתונים (זמן טיפול) בתקופה זו
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
