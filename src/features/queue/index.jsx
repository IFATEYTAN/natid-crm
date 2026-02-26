import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListTodo, Clock, CheckCircle2, Timer, Phone, Play, X } from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';
import { issueTypeLabels } from '@/config/labels';

export default function MyQueue() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('my-queue');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ['myQueue', user?.email],
    queryFn: () => base44.entities.WorkQueue.list('-priority_score'),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: calls = [] } = useQuery({
    queryKey: ['queueCalls'],
    queryFn: () => base44.entities.Call.list('-created_date', 500),
  });

  // Filter queues
  const myQueue = queueItems.filter(
    (q) => q.assigned_to_agent === user?.email && q.queue_status === 'assigned_to_agent'
  );

  const inProgress = queueItems.filter(
    (q) => q.assigned_to_agent === user?.email && q.queue_status === 'in_progress'
  );

  const completed = queueItems.filter(
    (q) => q.assigned_to_agent === user?.email && q.queue_status === 'completed'
  );

  // Join with calls data
  const enrichQueue = (queue) => {
    return queue
      .map((q) => {
        const call = calls.find((c) => c.id === q.call_id);
        return { ...q, call };
      })
      .filter((q) => q.call);
  };

  const myQueueEnriched = enrichQueue(myQueue);
  const inProgressEnriched = enrichQueue(inProgress);
  const completedEnriched = enrichQueue(completed);

  // Calculate stats
  const avgCompleteTime =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, q) => sum + (q.time_to_complete || 0), 0) / completed.length
        )
      : 0;

  const startWorkMutation = useMutation({
    mutationFn: async (queueId) => {
      const now = new Date().toISOString();
      await base44.entities.WorkQueue.update(queueId, {
        queue_status: 'in_progress',
        started_work_at: now,
      });
    },
    onSuccess: (_, queueId) => {
      queryClient.invalidateQueries({ queryKey: ['myQueue'] });
      const queue = queueItems.find((q) => q.id === queueId);
      if (queue?.call_id) {
        navigate(createPageUrl(`CaseDetails?id=${queue.call_id}`));
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (queueId) => {
      await base44.entities.WorkQueue.update(queueId, {
        queue_status: 'rejected',
        assigned_to_agent: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myQueue'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (queueId) => {
      const queue = queueItems.find((q) => q.id === queueId);
      const now = new Date();
      const timeInQueue = queue.added_to_queue_at
        ? differenceInMinutes(now, parseISO(queue.added_to_queue_at))
        : 0;
      const timeToComplete = queue.started_work_at
        ? differenceInMinutes(now, parseISO(queue.started_work_at))
        : 0;

      await base44.entities.WorkQueue.update(queueId, {
        queue_status: 'completed',
        completed_at: now.toISOString(),
        time_in_queue: timeInQueue,
        time_to_complete: timeToComplete,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myQueue'] });
    },
  });

  const getPriorityStars = (score) => {
    const stars = Math.min(5, Math.max(1, Math.ceil(score / 20)));
    return '⭐'.repeat(stars);
  };

  const getTimeInQueue = (addedAt) => {
    if (!addedAt) return '-';
    const minutes = differenceInMinutes(new Date(), parseISO(addedAt));
    if (minutes < 60) return `${minutes} דק'`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')} שעות`;
  };

  const myQueueColumns = [
    {
      header: 'עדיפות',
      accessor: 'priority_score',
      cell: (row) => (
        <span className="text-xl" title={`${row.priority_score} נקודות`}>
          {getPriorityStars(row.priority_score)}
        </span>
      ),
    },
    {
      header: 'מספר קריאה',
      accessor: 'call.call_number',
      cell: (row) => (
        <span className="font-semibold text-[#0078D4]">
          {row.call?.call_number || `#${row.call_id?.slice(-6)}`}
        </span>
      ),
    },
    {
      header: 'זמן בתור',
      accessor: 'added_to_queue_at',
      cell: (row) => {
        const minutes = row.added_to_queue_at
          ? differenceInMinutes(new Date(), parseISO(row.added_to_queue_at))
          : 0;
        const isWarning = minutes > 10;
        const isDanger = minutes > 20;

        return (
          <span
            className={
              isDanger
                ? 'text-[#D32F2F] font-bold'
                : isWarning
                  ? 'text-[#ED6C02] font-semibold'
                  : 'text-[#616161]'
            }
          >
            {getTimeInQueue(row.added_to_queue_at)}
          </span>
        );
      },
    },
    {
      header: 'לקוח',
      accessor: 'call.customer_name',
      cell: (row) => <span className="font-medium">{row.call?.customer_name}</span>,
    },
    {
      header: 'טלפון',
      accessor: 'call.customer_phone',
      cell: (row) => (
        <a
          href={`tel:${row.call?.customer_phone}`}
          className="flex items-center gap-1 text-[#0078D4] hover:underline"
        >
          <Phone className="w-3 h-3" />
          {row.call?.customer_phone}
        </a>
      ),
    },
    {
      header: 'רכב',
      accessor: 'call.vehicle_plate',
      cell: (row) => row.call?.vehicle_plate || '-',
    },
    {
      header: 'תקלה',
      accessor: 'call.issue_type',
      cell: (row) => issueTypeLabels[row.call?.issue_type] || row.call?.issue_type || '-',
    },
    {
      header: 'עיר',
      accessor: 'call.pickup_location_city',
      cell: (row) => row.call?.pickup_location_city || '-',
    },
    {
      header: 'פעולות',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#2E7D32] hover:bg-[#388E3C] text-white gap-1"
            onClick={() => startWorkMutation.mutate(row.id)}
            disabled={startWorkMutation.isPending}
          >
            <Play className="w-3 h-3" />
            התחל
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => rejectMutation.mutate(row.id)}
            disabled={rejectMutation.isPending}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  const inProgressColumns = [
    {
      header: 'מספר קריאה',
      accessor: 'call.call_number',
      cell: (row) => (
        <span className="font-semibold text-[#0078D4]">
          {row.call?.call_number || `#${row.call_id?.slice(-6)}`}
        </span>
      ),
    },
    {
      header: 'זמן טיפול',
      accessor: 'started_work_at',
      cell: (row) => (
        <span className="text-[#0288D1] font-medium">{getTimeInQueue(row.started_work_at)}</span>
      ),
    },
    {
      header: 'לקוח',
      accessor: 'call.customer_name',
      cell: (row) => row.call?.customer_name,
    },
    {
      header: 'טלפון',
      accessor: 'call.customer_phone',
      cell: (row) => (
        <a href={`tel:${row.call?.customer_phone}`} className="text-[#0078D4]">
          {row.call?.customer_phone}
        </a>
      ),
    },
    {
      header: 'תקלה',
      accessor: 'call.issue_type',
      cell: (row) => issueTypeLabels[row.call?.issue_type] || '-',
    },
    {
      header: 'פעולות',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(createPageUrl(`CaseDetails?id=${row.call_id}`))}
          >
            המשך
          </Button>
          <Button
            size="sm"
            className="bg-[#388E3C]"
            onClick={() => completeMutation.mutate(row.id)}
          >
            סיימתי
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1>תור העבודה שלי</h1>
        <p className="text-[var(--color-text-secondary)]">ניהול קריאות בתור</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="בתור שלי"
          value={myQueue.length}
          subtitle="ממתינות"
          icon={ListTodo}
          variant="warning"
          onClick={() => setActiveTab('my-queue')}
          className="cursor-pointer hover:border-[#ED6C02]"
        />
        <StatCard
          title="בטיפול"
          value={inProgress.length}
          subtitle="עכשיו"
          icon={Clock}
          variant="info"
          onClick={() => setActiveTab('in-progress')}
          className="cursor-pointer hover:border-[#0288D1]"
        />
        <StatCard
          title="הושלמו היום"
          value={completed.length}
          subtitle="קריאות"
          icon={CheckCircle2}
          variant="success"
          onClick={() => setActiveTab('completed')}
          className="cursor-pointer hover:border-[#2E7D32]"
        />
        <StatCard
          title="ממוצע זמן"
          value={`${avgCompleteTime}'`}
          subtitle="טיפול ממוצע"
          icon={Timer}
          variant="default"
          to={createPageUrl('Reports')}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-queue">התור שלי ({myQueue.length})</TabsTrigger>
          <TabsTrigger value="in-progress">בטיפול ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">הושלמו ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-queue">
          <DataTable
            columns={myQueueColumns}
            data={myQueueEnriched}
            isLoading={isLoading}
            emptyMessage="אין קריאות בתור שלך כרגע"
          />
        </TabsContent>

        <TabsContent value="in-progress">
          <DataTable
            columns={inProgressColumns}
            data={inProgressEnriched}
            isLoading={isLoading}
            emptyMessage="אין קריאות בטיפול"
          />
        </TabsContent>

        <TabsContent value="completed">
          <DataTable
            columns={inProgressColumns.filter((c) => c.accessor !== 'actions')}
            data={completedEnriched}
            isLoading={isLoading}
            emptyMessage="עדיין לא השלמת קריאות היום"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
