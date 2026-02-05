import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, Users, CheckCircle2 } from 'lucide-react';

export default function WorkQueueOverview({ calls, isLoading }) {
  const { data: queueItems = [] } = useQuery({
    queryKey: ['dashboardQueue'],
    queryFn: () => base44.entities.WorkQueue.list(),
    refetchInterval: 15000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter((u) => u.role === 'user');
    },
  });

  const waitingInQueue = queueItems.filter((q) => q.queue_status === 'waiting_in_queue').length;
  const assignedToAgents = queueItems.filter((q) => q.queue_status === 'assigned_to_agent').length;
  const inProgress = queueItems.filter((q) => q.queue_status === 'in_progress').length;

  const completed = queueItems.filter((q) => q.queue_status === 'completed' && q.time_to_complete);
  const avgTime =
    completed.length > 0
      ? Math.round(completed.reduce((sum, q) => sum + q.time_to_complete, 0) / completed.length)
      : 0;

  // Agent breakdown
  const agentStats = agents
    .map((agent) => {
      const count = queueItems.filter(
        (q) =>
          q.assigned_to_agent === agent.email &&
          ['assigned_to_agent', 'in_progress'].includes(q.queue_status)
      ).length;
      return { name: agent.full_name, count };
    })
    .filter((a) => a.count > 0);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card className="hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-800">תור מתפעל בזמן אמת</CardTitle>
            <CardDescription>מבט על עומסי העבודה במוקד</CardDescription>
          </div>
          <Link
            to={createPageUrl('MyQueue')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline flex items-center gap-1 transition-colors"
          >
            הצג תור מלא
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link to={createPageUrl('MyQueue')} className="block group">
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 group-hover:border-orange-300 transition-all text-center">
              <p className="text-3xl font-extrabold text-orange-600">{waitingInQueue}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">ממתינים בתור</p>
            </div>
          </Link>
          <Link to={createPageUrl('MyQueue')} className="block group">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 group-hover:border-blue-300 transition-all text-center">
              <p className="text-3xl font-extrabold text-blue-600">{assignedToAgents}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">משובץ לנציג</p>
            </div>
          </Link>
          <Link to={createPageUrl('Calls') + '?status=in_progress'} className="block group">
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 group-hover:border-indigo-300 transition-all text-center">
              <p className="text-3xl font-extrabold text-indigo-600">{inProgress}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">בטיפול פעיל</p>
            </div>
          </Link>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-3xl font-extrabold text-gray-700">{avgTime}'</p>
            <p className="text-sm font-medium text-gray-600 mt-1">זמן טיפול ממוצע</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">עומס נציגים פעיל</span>
          </div>
          {agentStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 opacity-50" />
              <p className="text-sm text-gray-500">אין עומס על הנציגים כרגע</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {agentStats.map((agent) => (
                <div key={agent.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                    {agent.name.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{agent.name}</span>
                      <span className="text-xs text-gray-500">{agent.count} קריאות</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden" dir="ltr">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${agent.count >= 5 ? 'bg-red-500' : agent.count >= 3 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, (agent.count / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}