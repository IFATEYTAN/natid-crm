import React, { useMemo, useState } from 'react';
import { formatWaitTime } from '@/components/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Clock, TrendingUp, TrendingDown, Timer, CheckCircle2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

// מקבל מילישניות ומחזיר תצוגה אחידה של שעות ודקות בלבד.
function formatMinutes(ms) {
  return formatWaitTime(Math.round((ms || 0) / 60000)) || '0 דק׳';
}

function getDelayCategory(mins) {
  if (mins <= 10) return { label: 'בזמן', color: 'bg-green-100 text-green-800' };
  if (mins <= 20) return { label: 'איחור קל', color: 'bg-yellow-100 text-yellow-800' };
  if (mins <= 40) return { label: 'איחור בינוני', color: 'bg-orange-100 text-orange-800' };
  return { label: 'איחור חמור', color: 'bg-red-100 text-red-800' };
}

export default function DelaysTab({ queueItems, calls }) {
  const [timeRange, setTimeRange] = useState('today');

  const enrichedData = useMemo(() => {
    const now = Date.now();
    const items = queueItems.map((item) => {
      const call = calls.find((c) => c.id === item.call_id);
      const waitTimeMs = item.added_to_queue_at
        ? now - new Date(item.added_to_queue_at).getTime()
        : 0;
      const waitMins = Math.round(waitTimeMs / 60000);

      let assignmentDelayMs = 0;
      if (item.assigned_at && item.added_to_queue_at) {
        assignmentDelayMs =
          new Date(item.assigned_at).getTime() - new Date(item.added_to_queue_at).getTime();
      }
      const assignmentDelayMins = Math.round(assignmentDelayMs / 60000);

      let completionTimeMs = 0;
      if (item.completed_at && item.added_to_queue_at) {
        completionTimeMs =
          new Date(item.completed_at).getTime() - new Date(item.added_to_queue_at).getTime();
      }
      const completionMins = Math.round(completionTimeMs / 60000);

      return {
        ...item,
        call,
        waitTimeMs,
        waitMins,
        assignmentDelayMs,
        assignmentDelayMins,
        completionTimeMs,
        completionMins,
        delayCategory: getDelayCategory(waitMins),
      };
    });

    // Filter by time range
    const rangeMs = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - (rangeMs[timeRange] || rangeMs.today);
    return items.filter(
      (i) => !i.added_to_queue_at || new Date(i.added_to_queue_at).getTime() >= cutoff
    );
  }, [queueItems, calls, timeRange]);

  // KPI calculations
  const kpiData = useMemo(() => {
    const active = enrichedData.filter((i) => i.queue_status !== 'completed');
    const completed = enrichedData.filter((i) => i.queue_status === 'completed');
    const delayed = enrichedData.filter((i) => i.waitMins > 10);

    const avgWaitTime =
      active.length > 0 ? active.reduce((sum, i) => sum + i.waitTimeMs, 0) / active.length : 0;

    const avgAssignmentDelay =
      enrichedData.filter((i) => i.assignmentDelayMs > 0).length > 0
        ? enrichedData
            .filter((i) => i.assignmentDelayMs > 0)
            .reduce((sum, i) => sum + i.assignmentDelayMs, 0) /
          enrichedData.filter((i) => i.assignmentDelayMs > 0).length
        : 0;

    const avgCompletionTime =
      completed.length > 0
        ? completed.reduce((sum, i) => sum + i.completionTimeMs, 0) / completed.length
        : 0;

    const delayRate = enrichedData.length > 0 ? (delayed.length / enrichedData.length) * 100 : 0;

    return {
      avgWaitTime,
      avgAssignmentDelay,
      avgCompletionTime,
      delayRate,
      totalDelayed: delayed.length,
      totalActive: active.length,
      totalCompleted: completed.length,
    };
  }, [enrichedData]);

  // Chart data: wait time distribution
  const waitTimeDistribution = useMemo(() => {
    const buckets = [
      { name: '0-5 דק׳', min: 0, max: 5, count: 0 },
      { name: '5-15 דק׳', min: 5, max: 15, count: 0 },
      { name: '15-30 דק׳', min: 15, max: 30, count: 0 },
      { name: '30-60 דק׳', min: 30, max: 60, count: 0 },
      { name: '60+ דק׳', min: 60, max: Infinity, count: 0 },
    ];
    enrichedData.forEach((item) => {
      const bucket = buckets.find((b) => item.waitMins >= b.min && item.waitMins < b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [enrichedData]);

  // Chart data: delay category pie
  const delayCategoryData = useMemo(() => {
    const cats = {};
    enrichedData.forEach((item) => {
      const label = item.delayCategory.label;
      cats[label] = (cats[label] || 0) + 1;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [enrichedData]);

  // Chart data: per-agent performance
  const agentPerformance = useMemo(() => {
    const agents = {};
    enrichedData
      .filter((i) => i.assigned_to_agent)
      .forEach((item) => {
        if (!agents[item.assigned_to_agent]) {
          agents[item.assigned_to_agent] = { totalWait: 0, count: 0, delayed: 0 };
        }
        agents[item.assigned_to_agent].totalWait += item.waitMins;
        agents[item.assigned_to_agent].count++;
        if (item.waitMins > 10) agents[item.assigned_to_agent].delayed++;
      });

    return Object.entries(agents)
      .map(([name, data]) => ({
        name,
        avgWait: Math.round(data.totalWait / data.count),
        totalCalls: data.count,
        delayedCalls: data.delayed,
      }))
      .sort((a, b) => b.avgWait - a.avgWait);
  }, [enrichedData]);

  // Top delayed calls table
  const topDelayed = useMemo(() => {
    return [...enrichedData].sort((a, b) => b.waitMins - a.waitMins).slice(0, 10);
  }, [enrichedData]);

  const kpiCards = [
    {
      label: 'זמן המתנה ממוצע',
      value: formatMinutes(kpiData.avgWaitTime),
      icon: Clock,
      color:
        kpiData.avgWaitTime > 1800000
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      label: 'זמן שיוך ממוצע',
      value: formatMinutes(kpiData.avgAssignmentDelay),
      icon: Timer,
      color:
        kpiData.avgAssignmentDelay > 600000
          ? 'text-orange-600 bg-orange-50 border-orange-200'
          : 'text-green-600 bg-green-50 border-green-200',
    },
    {
      label: 'אחוז איחורים',
      value: `${Math.round(kpiData.delayRate)}%`,
      icon: kpiData.delayRate > 30 ? TrendingUp : TrendingDown,
      color:
        kpiData.delayRate > 30
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-green-600 bg-green-50 border-green-200',
    },
    {
      label: 'קריאות באיחור',
      value: kpiData.totalDelayed,
      icon: AlertTriangle,
      color:
        kpiData.totalDelayed > 5
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-gray-600 bg-gray-50 border-gray-200',
    },
  ];

  return (
    <div dir="rtl" className="space-y-4">
      {/* Time range filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">ניתוח איחורים וביצועי זמן</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">היום</SelectItem>
            <SelectItem value="week">שבוע אחרון</SelectItem>
            <SelectItem value="month">חודש אחרון</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${card.color}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <card.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <div className="text-xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Wait Time Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">התפלגות זמני המתנה</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={waitTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value} קריאות`, 'כמות']}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delay Categories Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">סיווג איחורים</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={delayCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {delayCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} קריאות`, 'כמות']}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      {agentPerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ביצועי זמן לפי נציג</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => {
                    const labels = {
                      avgWait: 'המתנה ממוצעת (דק׳)',
                      totalCalls: 'סה"כ קריאות',
                      delayedCalls: 'קריאות באיחור',
                    };
                    return [value, labels[name] || name];
                  }}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Legend
                  formatter={(value) => {
                    const labels = {
                      avgWait: 'המתנה ממוצעת (דק׳)',
                      totalCalls: 'סה"כ קריאות',
                      delayedCalls: 'קריאות באיחור',
                    };
                    return labels[value] || value;
                  }}
                />
                <Bar dataKey="avgWait" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="delayedCalls" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Delayed Calls Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            קריאות עם זמן המתנה גבוה
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDelayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle2 className="w-8 h-8 mb-2" />
              <p>אין קריאות באיחור</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-end p-2 font-semibold text-gray-600">קריאה</th>
                    <th className="text-end p-2 font-semibold text-gray-600">לקוח</th>
                    <th className="text-end p-2 font-semibold text-gray-600">סטטוס</th>
                    <th className="text-end p-2 font-semibold text-gray-600">זמן בתור</th>
                    <th className="text-end p-2 font-semibold text-gray-600">נציג מטפל</th>
                    <th className="text-end p-2 font-semibold text-gray-600">סיווג</th>
                  </tr>
                </thead>
                <tbody>
                  {topDelayed.map((item) => {
                    const statusMap = {
                      waiting_in_queue: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-800' },
                      assigned_to_agent: { label: 'משובץ', color: 'bg-blue-100 text-blue-800' },
                      in_progress: { label: 'בטיפול', color: 'bg-indigo-100 text-indigo-800' },
                      completed: { label: 'סגור', color: 'bg-green-100 text-green-800' },
                    };
                    const statusConf = statusMap[item.queue_status] || {
                      label: item.queue_status,
                      color: 'bg-gray-100 text-gray-800',
                    };
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-blue-600">
                          {item.call?.call_number || `#${item.call_id?.slice(-6)}`}
                        </td>
                        <td className="p-2">{item.call?.customer_name || '-'}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}
                          >
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={`font-medium ${item.waitMins > 30 ? 'text-red-600' : item.waitMins > 10 ? 'text-orange-600' : ''}`}
                          >
                            {item.waitMins} דק׳
                          </span>
                        </td>
                        <td className="p-2">
                          {item.assigned_to_agent || (
                            <span className="text-gray-400">לא משובץ</span>
                          )}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.delayCategory.color}`}
                          >
                            {item.delayCategory.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
