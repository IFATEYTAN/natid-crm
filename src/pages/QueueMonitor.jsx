import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl, formatDate, formatDateTime } from '@/components/utils';
import { cn } from '@/lib/utils';
import { useWorkQueue } from '@/features/queue/hooks/useQueue';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUserRole } from '@/components/auth/RoleGuard';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
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
  Settings,
  AlertTriangle,
  Edit,
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
import { buildCallColumns } from '@/components/calls/callTableColumns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ShiftScheduleTab = lazyRetry(() => import('@/components/queue/ShiftScheduleTab'));
const QueueStatsBar = lazyRetry(() => import('@/components/queue/QueueStatsBar'));
const AssignAgentDialog = lazyRetry(() => import('@/components/queue/AssignAgentDialog'));
const ChangePriorityDialog = lazyRetry(() => import('@/components/queue/ChangePriorityDialog'));
const DelaysTab = lazyRetry(() => import('@/components/queue/DelaysTab'));

const statusOptions = [
  { value: 'all', label: 'הכל' },
  { value: 'waiting_in_queue', label: 'ממתין בתור' },
  { value: 'assigned_to_agent', label: 'משובץ לנציג' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'סגור' },
  { value: 'transferred', label: 'הועבר' },
  { value: 'rejected', label: 'נדחה' },
];

const callStatusOptions = [
  { value: 'waiting_treatment', label: 'ממתין לטיפול' },
  { value: 'awaiting_assignment', label: 'ממתין לשיוך' },
  { value: 'assigning', label: 'ספק שובץ' },
  { value: 'vendor_enroute', label: 'ספק בדרך' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'סגור' },
  { value: 'cancelled', label: 'בוטל' },
];

export default function QueueMonitor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useCurrentUserRole();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [assignDialog, setAssignDialog] = useState({ open: false, item: null, mode: 'assign' });
  const [priorityDialog, setPriorityDialog] = useState({ open: false, item: null });
  const [editDialog, setEditDialog] = useState({ open: false, item: null });
  const [editForm, setEditForm] = useState({ call_status: '', assigned_to_agent: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const workQueueQuery = useWorkQueue();

  // Read active calls directly from Call entity (shares cache with useCalls via queryKeys.calls.all())
  const casesQuery = useQuery({
    queryKey: queryKeys.calls.all(),
    queryFn: () => base44.entities.Call.list('-created_date', 300),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  const queueItems = workQueueQuery.data || [];
  const directCases = casesQuery.data || [];
  const isLoading = workQueueQuery.isLoading || casesQuery.isLoading;

  // Build enriched items from work queue + case lookups
  // If queue is empty, show active cases directly as pseudo-queue items
  const enrichedItems =
    queueItems.length > 0
      ? queueItems.map((item) => {
          const call = directCases.find((c) => c.id === item.call_id);
          return { ...item, call };
        })
      : directCases.map((c) => ({
          id: c.id,
          call_id: c.id,
          queue_status: 'waiting_in_queue',
          priority_score:
            c.call_priority === 'critical' ? 90 : c.call_priority === 'urgent' ? 70 : 50,
          added_to_queue_at: c.created_date,
          assigned_to_agent: null,
          call: c,
        }));

  const filteredItems = enrichedItems.filter((item) => {
    const matchesStatus = filterStatus === 'all' || item.queue_status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      item.call?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.call?.call_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleKpiFilter = (status) => {
    setFilterStatus(status);
  };

  const seedDemoData = async () => {
    try {
      setSeeding(true);
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
      await casesQuery.refetch();
    } finally {
      setSeeding(false);
    }
  };

  const handleRemoveFromQueue = async (item) => {
    if (!window.confirm('האם להסיר את הקריאה מהתור?')) return;
    await base44.entities.WorkQueue.delete(item.id);
    queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
  };

  // Admin inline edit - open edit dialog
  const openEditDialog = (item) => {
    setEditForm({
      call_status: item.call?.call_status || '',
      assigned_to_agent: item.assigned_to_agent || '',
      notes: '',
    });
    setEditDialog({ open: true, item });
  };

  const handleSaveEdit = async () => {
    const item = editDialog.item;
    if (!item) return;

    setSaving(true);
    try {
      // Update queue item assignment
      const queueUpdates = {};
      if (editForm.assigned_to_agent !== (item.assigned_to_agent || '')) {
        queueUpdates.assigned_to_agent = editForm.assigned_to_agent;
        queueUpdates.assigned_at = new Date().toISOString();
        if (editForm.assigned_to_agent && item.queue_status === 'waiting_in_queue') {
          queueUpdates.queue_status = 'assigned_to_agent';
        }
      }

      if (Object.keys(queueUpdates).length > 0) {
        await base44.entities.WorkQueue.update(item.id, queueUpdates);
      }

      // Update call status if changed
      if (item.call_id && editForm.call_status && editForm.call_status !== item.call?.call_status) {
        await base44.entities.Call.update(item.call_id, {
          call_status: editForm.call_status,
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success('הקריאה עודכנה בהצלחה');
      setEditDialog({ open: false, item: null });
    } catch (err) {
      console.error('Edit error:', err);
      toast.error('שגיאה בעדכון הקריאה');
    } finally {
      setSaving(false);
    }
  };

  const renderActions = (item) => (
        <div className="flex items-center gap-1">
          {/* Admin: always allow assignment/reassignment */}
          {isAdmin && item.queue_status !== 'completed' && !item.assigned_to_agent && (
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
          {/* Non-admin: only allow if waiting and unassigned */}
          {!isAdmin && !item.assigned_to_agent && item.queue_status === 'waiting_in_queue' && (
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
          {/* Admin inline edit button */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => openEditDialog(item)}
            >
              <Edit className="w-3 h-3" />
              ערוך
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0" aria-label="פעולות נוספות">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>פעולות</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigate(createPageUrl(`CaseDetails?id=${item.call_id}`))}
              >
                צפה בפרטים
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPriorityDialog({ open: true, item })}>
                <Gauge className="w-4 h-4 ms-2" />
                שנה עדיפות
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setAssignDialog({
                    open: true,
                    item,
                    mode: item.assigned_to_agent ? 'transfer' : 'assign',
                  })
                }
              >
                <UserPlus className="w-4 h-4 ms-2" />
                {item.assigned_to_agent ? 'העבר לנציג אחר' : 'שבץ לנציג'}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openEditDialog(item)}>
                    <Edit className="w-4 h-4 ms-2" />
                    עריכת קריאה (מנהל)
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleRemoveFromQueue(item)}
              >
                <Trash2 className="w-4 h-4 ms-2" />
                הסר מהתור
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );

  const columns = buildCallColumns({
    getCall: (item) => item.call,
    getCallId: (item) => item.call_id,
    renderActions,
  });

  if (workQueueQuery.isError || casesQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">נסה לרענן את הדף</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניטור תורים</h1>
          <p className="text-gray-500">ניהול ובקרה על תור המשימות ולו&quot;ז משמרות</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => navigate(createPageUrl('Settings'))}
            >
              <Settings className="w-4 h-4" />
              ניהול
            </Button>
          )}
          <Button variant="outline" onClick={seedDemoData} isLoading={seeding}>
            טען נתוני הדגמה
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList>
          <TabsTrigger value="queue" className="gap-1.5">
            <ListChecks className="w-4 h-4" />
            רשימת המתנה
          </TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5">
            <CalendarDays className="w-4 h-4" />
            לו&quot;ז משמרות
          </TabsTrigger>
          <TabsTrigger value="delays" className="gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            איחורים
          </TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-24" />}>
            <QueueStatsBar
              queueItems={enrichedItems}
              onFilterByStatus={handleKpiFilter}
              activeFilter={filterStatus}
            />
          </Suspense>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>רשימת המתנה ({filteredItems.length})</CardTitle>
                {filterStatus !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500"
                    onClick={() => setFilterStatus('all')}
                  >
                    נקה סינון
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="חיפוש לפי שם לקוח או מספר קריאה..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10"
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

        {/* Shifts Tab */}
        <TabsContent value="shifts">
          <Suspense fallback={<Skeleton className="h-[400px] rounded-lg" />}>
            <ShiftScheduleTab />
          </Suspense>
        </TabsContent>

        {/* Delays Tab */}
        <TabsContent value="delays">
          <Suspense fallback={<Skeleton className="h-[400px] rounded-lg" />}>
            <DelaysTab queueItems={enrichedItems} calls={directCases} />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Suspense fallback={null}>
        <AssignAgentDialog
          open={assignDialog.open}
          onOpenChange={(open) => setAssignDialog((prev) => ({ ...prev, open }))}
          queueItem={assignDialog.item}
          mode={assignDialog.mode}
        />
        <ChangePriorityDialog
          open={priorityDialog.open}
          onOpenChange={(open) => setPriorityDialog((prev) => ({ ...prev, open }))}
          queueItem={priorityDialog.item}
        />
      </Suspense>

      {/* Admin Edit Dialog */}
      {editDialog.open && (
        <Suspense fallback={null}>
          <AdminEditDialog
            open={editDialog.open}
            onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
            item={editDialog.item}
            editForm={editForm}
            setEditForm={setEditForm}
            onSave={handleSaveEdit}
            saving={saving}
            callStatusOptions={callStatusOptions}
          />
        </Suspense>
      )}
    </div>
  );
}

// Admin Edit Dialog - inline component to avoid circular imports
function AdminEditDialog({
  open,
  onOpenChange,
  item,
  editForm,
  setEditForm,
  onSave,
  saving,
  callStatusOptions,
}) {
  const [dialogUsers, setDialogUsers] = React.useState([]);
  React.useEffect(() => {
    base44.entities.User.list()
      .then(setDialogUsers)
      .catch(() => {});
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>עריכת קריאה - מנהל</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {item && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="font-medium">
                {item.call?.call_number || `#${item.call_id?.slice(-6)}`}
              </div>
              <div className="text-gray-500">
                {item.call?.customer_name} — {item.call?.pickup_location_address}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">סטטוס קריאה</label>
            <Select
              value={editForm.call_status}
              onValueChange={(v) => setEditForm({ ...editForm, call_status: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סטטוס..." />
              </SelectTrigger>
              <SelectContent>
                {callStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">שיוך לנציג</label>
            <Select
              value={editForm.assigned_to_agent || '_none'}
              onValueChange={(v) =>
                setEditForm({ ...editForm, assigned_to_agent: v === '_none' ? '' : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר נציג..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">ללא שיוך</SelectItem>
                {dialogUsers.map((u) => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item?.assigned_to_agent && (
              <p className="text-xs text-gray-400 mt-1">נציג נוכחי: {item.assigned_to_agent}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}