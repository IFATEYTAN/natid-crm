import React, { useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users, Activity, Phone } from 'lucide-react';
import { OperatorLoadChart } from '@/components/reports/ReportsCharts';

export default function OperationalEfficiencyReport({ calls }) {
  // Stats calculation
  const stats = useMemo(() => {
    // Average handling time (creation to closed_at or completed status if we simulate time)
    // Using time_to_completion if available, otherwise estimating
    const completedCalls = calls.filter(
      (c) => c.call_status === 'completed' && c.time_to_completion
    );
    const avgTime =
      completedCalls.reduce((sum, c) => sum + (c.time_to_completion || 0), 0) /
      (completedCalls.length || 1);

    // Calls per day (average)
    // Group by date
    const callsByDate = {};
    calls.forEach((c) => {
      const date = new Date(c.created_date).toDateString();
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

        {/* We can add another chart here later, e.g., calls by hour of day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">התפלגות זמני טיפול</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px] text-gray-400">
            בקרוב...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
