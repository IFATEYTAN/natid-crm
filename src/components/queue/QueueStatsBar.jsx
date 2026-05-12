import React from 'react';
import { Clock, Users, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

function formatMinutes(ms) {
  if (!ms || ms <= 0) return '0 דק׳';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} דק׳`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs} שע׳ ${remainMins > 0 ? `${remainMins} דק׳` : ''}`;
}

export default function QueueStatsBar({ queueItems, onFilterByStatus, activeFilter }) {
  const waiting = queueItems.filter((i) => i.queue_status === 'waiting_in_queue');
  const assigned = queueItems.filter((i) => i.queue_status === 'assigned_to_agent');
  const inProgress = queueItems.filter((i) => i.queue_status === 'in_progress');
  const completed = queueItems.filter((i) => i.queue_status === 'completed');
  const rejected = queueItems.filter((i) => i.queue_status === 'rejected');

  const now = Date.now();
  const avgWaitTime =
    waiting.length > 0
      ? waiting.reduce(
          (sum, i) =>
            sum + (i.added_to_queue_at ? now - new Date(i.added_to_queue_at).getTime() : 0),
          0
        ) / waiting.length
      : 0;

  const longestWait =
    waiting.length > 0
      ? Math.max(
          ...waiting.map((i) =>
            i.added_to_queue_at ? now - new Date(i.added_to_queue_at).getTime() : 0
          )
        )
      : 0;

  // Agent workload
  const agentLoad = {};
  [...assigned, ...inProgress].forEach((i) => {
    if (i.assigned_to_agent) {
      agentLoad[i.assigned_to_agent] = (agentLoad[i.assigned_to_agent] || 0) + 1;
    }
  });
  const overloadedAgents = Object.entries(agentLoad).filter(([, count]) => count >= 5);

  const stats = [
    {
      label: 'ממתינים בתור',
      value: waiting.length,
      icon: Clock,
      filterValue: 'waiting_in_queue',
      color:
        waiting.length > 5
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-yellow-600 bg-yellow-50 border-yellow-200',
    },
    {
      label: 'זמן המתנה ממוצע',
      value: formatMinutes(avgWaitTime),
      icon: Clock,
      filterValue: null,
      color:
        avgWaitTime > 1800000
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      label: 'משובצים לנציגים',
      value: assigned.length + inProgress.length,
      icon: Users,
      filterValue: 'assigned_to_agent',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      label: 'נסגרו',
      value: completed.length,
      icon: CheckCircle2,
      filterValue: 'completed',
      color: 'text-green-600 bg-green-50 border-green-200',
    },
    {
      label: 'נדחו',
      value: rejected.length,
      icon: XCircle,
      filterValue: 'rejected',
      color:
        rejected.length > 0
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-gray-600 bg-gray-50 border-gray-200',
    },
    {
      label: 'המתנה מקסימלית',
      value: formatMinutes(longestWait),
      icon: AlertTriangle,
      filterValue: null,
      color:
        longestWait > 3600000
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-gray-600 bg-gray-50 border-gray-200',
    },
  ];

  const handleCardClick = (filterValue) => {
    if (!onFilterByStatus) return;
    if (activeFilter === filterValue) {
      onFilterByStatus('all');
    } else if (filterValue) {
      onFilterByStatus(filterValue);
    }
  };

  return (
    <div dir="rtl" className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat, idx) => {
          const isActive = activeFilter && activeFilter === stat.filterValue;
          const isClickable = !!stat.filterValue && !!onFilterByStatus;
          return (
            <div
              key={idx}
              onClick={() => handleCardClick(stat.filterValue)}
              className={`rounded-lg border p-3 transition-all duration-200 ${stat.color} ${
                isClickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''
              } ${isActive ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md' : ''}`}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleCardClick(stat.filterValue);
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{stat.label}</span>
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
              {isClickable && (
                <div className="text-[10px] mt-1 opacity-60">
                  {isActive ? 'לחץ לביטול סינון' : 'לחץ לסינון'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {overloadedAgents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm text-red-700">
            <strong>התראת עומס:</strong>{' '}
            {overloadedAgents.map(([name, count]) => `${name} (${count} משימות)`).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
