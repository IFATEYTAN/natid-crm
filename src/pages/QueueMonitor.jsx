import React, { useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl, cn, formatDate, formatDateTime } from '@/components/utils';
import { useWorkQueue } from '@/components/hooks/useWorkQueue';
import { useCalls } from '@/components/hooks/useCalls';
import { useQueryClient } from '@tanstack/react-query';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import {
  ArrowRight,
  Search,
  Filter,
  User,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  CalendarDays,
  ListChecks,
  UserPlus,
  ArrowLeftRight,
  Trash2,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const ShiftScheduleTab = lazy(() => import('@/components/queue/ShiftScheduleTab'));
const QueueStatsBar = lazy(() => import('@/components/queue/QueueStatsBar'));
const AssignAgentDialog = lazy(() => import('@/components/queue/AssignAgentDialog'));
const ChangePriorityDialog = lazy(() => import('@/components/queue/ChangePriorityDialog'));

const statusOptions = [
  { value: 'all', label: 'הכל' },
  { value: 'waiting_in_queue', label: 'ממתין בתור' },
  { value: 'assigned_to_agent', label: 'משובץ לנציג' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'הושלם' },
  { value: 'transferred', label: 'הועבר' },
  { value: 'rejected', label: 'נדחה' },
];

export default function QueueMonitor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [assignDialog, setAssignDialog] = useState({ open: false, item: null, mode: 'assign' });
  const [priorityDialog, setPriorityDialog] = useState({ open: false, item: null });

  const workQueueQuery = useWorkQueue();
  const callsQuery = useCalls();

  const queueItems = workQueueQuery.data || [];
  const calls = callsQuery.data || [];
  const isLoading = workQueueQuery.isLoading;

  // Enrich queue items with call details
  const enrichedItems = queueItems.map((item) => {
    const call = calls.find((c) => c.id === item.call_id);
    return { ...item, call };
  });

  const filteredItems = enrichedItems.filter((item) => {
    const matchesStatus = filterStatus === 'all' || item.queue_status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      item.call?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.call?.call_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const seedDemoData = async () => {
    try {
      setSeeding(true);
      // Create demo calls
      const demoCalls = await base44.entities.Call.bulkCreate([
        {
          call_number: 'C-1001',
          customer_name: 'דנה כהן',
          customer_phone: '050-1111111',
          pickup_location_address: 'דיזנגוף 100, תל אביב',
          issue_type: 'flat_tire',
          call_status: 'waiting_treatment',
        },
        {
          call_number: 'C-1002',
          customer_name: 'יואב לוי',
          customer_phone: '050-2222222',
          pickup_location_address: 'הרצל 5, רמת גן',
          issue_type: 'dead_battery',
          call_status: 'awaiting_assignment',
        },
        {
          call_number: 'C-1003',
          customer_name: 'אורי אוחנה',
          customer_phone: '050-3333333',
          pickup_location_address: 'ויצמן 12, נתניה',
          issue_type: 'mechanical',
          call_status: 'assigning',
        },
        {
          call_number: 'C-1004',
          customer_name: 'מאיה דן',
          customer_phone: '050-4444444',
          pickup_location_address: 'יעקב דורי 8, ראשון לציון',
          issue_type: 'no_fuel',
          call_status: 'vendor_enroute',
        },
        {
          call_number: 'C-1005',
          customer_name: 'תומר לב',
          customer_phone: '050-5555555',
          pickup_location_address: 'דרך בר יהודה 77, חיפה',
          issue_type: 'locked_keys',
          call_status: 'in_progress',
        },
      ]);

      // Create demo queue items linked to calls
      await base44.entities.WorkQueue.bulkCreate(
        (demoCalls || []).map((c, idx) => ({
          call_id: c.id,
          queue_status: ['waiting_in_queue', 'assigned_to_agent', 'in_progress', 'completed'][
            idx % 4
          ],
          priority_score: 20 + idx * 15,
          added_to_queue_at: new Date().toISOString(),
        }))
      );

      await workQueueQuery.refetch();
      await callsQuery.refetch();
    } finally {
      setSeeding(false);
    }
  };

  const handleRemoveFromQueue = async (item) => {
    if (!window.confirm('האם להסיר את הקריאה מהתור?')) return;
    await base44.entities.WorkQueue.delete(item.id);
    queryClient.invalidateQueries({ queryKey: ['workQueue'] });
  };

  const columns = [
    {
      header: 'קריאה',
      accessor: 'call.call_number',
      cell: (item) => (
        <Link
          to={createPageUrl(`CaseDetails?id=${item.call_id}`)}
          className="font-medium text-blue-600 hover:underline"
        >
          {item.call?.call_number || `#${item.call_id?.slice(-6)}`}
        </Link>
      ),
    },
    {
      header: 'לקוח',
      accessor: 'call.customer_name',
      cell: (item) => (
        <div>
          <div className="font-medium">{item.call?.customer_name}</div>
          <div className="text-xs text-gray-500">{item.call?.customer_phone}</div>
        </div>
      ),
    },
    {
      header: 'סטטוס בתור',
      accessor: 'queue_status',
      cell: (item) => {
        const statusMap = {
          waiting_in_queue: { label: 'ממתין בתור', color: 'bg-yellow-100 text-yellow-800' },
          assigned_to_agent: { label: 'משובץ לנציג', color: 'bg-blue-100 text-blue-800' },
          in_progress: { label: 'בטיפול', color: 'bg-indigo-100 text-indigo-800' },
          completed: { label: 'הושלם', color: 'bg-green-100 text-green-800' },
          transferred: { label: 'הועבר', color: 'bg-purple-100 text-purple-800' },
          rejected: { label: 'נדחה', color: 'bg-red-100 text-red-800' },
        };
        const conf = statusMap[item.queue_status] || {
          label: item.queue_status,
          color: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${conf.color}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      header: 'עדיפות',
      accessor: 'priority_score',
      cell: (item) => (
        <Badge variant={item.priority_score > 80 ? 'destructive' : item.priority_score > 60 ? 'default' : 'secondary'}>
          {item.priority_score}
        </Badge>
      ),
    },
    {
      header: 'נציג מטפל',
      accessor: 'assigned_to_agent',
      cell: (item) => item.assigned_to_agent ? (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">
            {item.assigned_to_agent.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm">{item.assigned_to_agent}</span>
        </div>
      ) : (
        <span className="text-gray-400 text-sm">לא משובץ</span>
      ),
    },
    {
      header: 'זמן בתור',
      accessor: 'added_to_queue_at',
      cell: (item) => {
        if (!item.added_to_queue_at) return '-';
        const mins = Math.round((Date.now() - new Date(item.added_to_queue_at).getTime()) / 60000);
        const display = mins < 60 ? `${mins} דק׳` : `${Math.floor(mins / 60)} שע׳ ${mins % 60} דק׳`;
        return (
          <div>
            <div className={`text-sm font-medium ${mins > 30 ? 'text-red-600' : ''}`}>{display}</div>
            <div className="text-[10px] text-gray-400">{formatDateTime(item.added_to_queue_at)}</div>
          </div>
        );
      },
    },
    {
      header: 'פעולות',
      cell: (item) => (
        <div className="flex items-center gap-1">
          {(!item.assigned_to_agent && item.queue_status === 'waiting_in_queue') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => setAssignDialog({ open: true, item, mode: 'assign' })}
            >
              <UserPlus className="w-3 h-3" />
              שבץ
            </Button>
          )}
          {item.assigned_to_agent && item.queue_status !== 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={() => setAssignDialog({ open: true, item, mode: 'transfer' })}
            >
              <ArrowLeftRight className="w-3 h-3" />
              העבר
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0" aria-label="פעולות נוספות">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>פעולות</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigate(createPageUrl(`CaseDetails?id=${item.call_id}`))}
              >
                צפה בפרטים
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPriorityDialog({ open: true, item })}>
                <Gauge className="w-4 h-4 ml-2" />
                שנה עדיפות
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssignDialog({ open: true, item, mode: item.assigned_to_agent ? 'transfer' : 'assign' })}>
                <UserPlus className="w-4 h-4 ml-2" />
                {item.assigned_to_agent ? 'העבר לנציג אחר' : 'שבץ לנציג'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveFromQueue(item)}>
                <Trash2 className="w-4 h-4 ml-2" />
                הסר מהתור
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (workQueueQuery.isError || callsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">
          {workQueueQuery.error?.message || callsQuery.error?.message || 'נסה לרענן את הדף'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניטור תורים</h1>
          <p className="text-gray-500">ניהול ובקרה על תור המשימות ולו"ז משמרות</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seedDemoData} isLoading={seeding}>
            טען נתוני הדגמה
          </Button>
        </div>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList>
          <TabsTrigger value="queue" className="gap-1.5">
            <ListChecks className="w-4 h-4" />
            רשימת המתנה
          </TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5">
            <CalendarDays className="w-4 h-4" />
            לו"ז משמרות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-24" />}>
            <QueueStatsBar queueItems={enrichedItems} />
          </Suspense>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>רשימת המתנה ({filteredItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="חיפוש לפי שם לקוח או מספר קריאה..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                    aria-label="חיפוש בתור"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DataTable
                columns={columns}
                data={filteredItems}
                isLoading={isLoading}
                emptyMessage="אין קריאות בתור כרגע"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <Suspense fallback={<Skeleton className="h-[400px] rounded-lg" />}>
            <ShiftScheduleTab />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Suspense fallback={null}>
        <AssignAgentDialog
          open={assignDialog.open}
          onOpenChange={(open) => setAssignDialog(prev => ({ ...prev, open }))}
          queueItem={assignDialog.item}
          mode={assignDialog.mode}
        />
        <ChangePriorityDialog
          open={priorityDialog.open}
          onOpenChange={(open) => setPriorityDialog(prev => ({ ...prev, open }))}
          queueItem={priorityDialog.item}
        />
      </Suspense>
    </div>
  );
}