import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { useAgentCalls } from '@/hooks/useAgentCalls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AgentCallCard from '@/components/agent/AgentCallCard';
import { openStatuses } from '@/config/labels';
import { RefreshCw, ListChecks, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIVE_STATUSES = openStatuses;

export default function AgentDashboardPage() {
  const { currentUser, hasPermission } = usePermissions();
  const canUpdateStatus = hasPermission('calls', 'update_status');
  const { calls, isLoading, isFetching, isError, error, refetch } = useAgentCalls(
    currentUser?.email
  );

  const activeCalls = useMemo(
    () => calls.filter((c) => ACTIVE_STATUSES.includes(c.call_status)),
    [calls]
  );
  const completedCalls = useMemo(
    () => calls.filter((c) => ['completed', 'cancelled'].includes(c.call_status)),
    [calls]
  );
  const urgentCount = useMemo(
    () =>
      activeCalls.filter((c) => c.call_priority === 'urgent' || c.call_priority === 'high').length,
    [activeCalls]
  );

  const stats = [
    { label: 'קריאות פעילות', value: activeCalls.length, icon: Clock, color: 'yellow' },
    { label: 'דחופות', value: urgentCount, icon: AlertTriangle, color: 'red' },
    { label: 'נסגרו', value: completedCalls.length, icon: CheckCircle, color: 'green' },
    { label: 'סה"כ', value: calls.length, icon: ListChecks, color: 'blue' },
  ];

  const colorMap = {
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">דשבורד טכנאי</h1>
          <p className="text-[#6B778C] text-sm">הקריאות שהוקצו לך</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('AgentCallManagement')}>
            <Button variant="outline" size="sm">
              כל הקריאות שלי
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2 w-fit">
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            רענן
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    colorMap[s.color]
                  )}
                >
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#172B4D]">{s.value}</div>
                  <div className="text-sm text-[#6B778C]">{s.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active calls */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[#172B4D]">קריאות פעילות</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : activeCalls.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-8 text-center text-[#6B778C]">
              אין כרגע קריאות פעילות שהוקצו לך
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCalls.map((call) => (
              <AgentCallCard key={call.id} call={call} canUpdateStatus={canUpdateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
