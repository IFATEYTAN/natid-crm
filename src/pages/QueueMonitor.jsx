import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl, cn, formatDate, formatDateTime } from '@/components/utils';
import { useWorkQueue } from '@/components/hooks/useWorkQueue';
import { useCalls } from '@/components/hooks/useCalls';
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

const statusOptions = [
  { value: 'all', label: 'הכל' },
  { value: 'waiting_in_queue', label: 'ממתין בתור' },
  { value: 'assigned_to_agent', label: 'משובץ לנציג' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'הושלם' },
];

export default function QueueMonitor() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [seeding, setSeeding] = useState(false);

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
        <Badge variant={item.priority_score > 80 ? 'destructive' : 'secondary'}>
          {item.priority_score}
        </Badge>
      ),
    },
    {
      header: 'נציג מטפל',
      accessor: 'assigned_to_agent',
      cell: (item) => item.assigned_to_agent || '-',
    },
    {
      header: 'זמן בתור',
      accessor: 'added_to_queue_at',
      cell: (item) => formatDateTime(item.added_to_queue_at),
    },
    {
      header: '',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>פעולות</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                (window.location.href = createPageUrl(`CaseDetails?id=${item.call_id}`))
              }
            >
              צפה בפרטים
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>שנה עדיפות</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">הסר מהתור</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניטור תורים</h1>
          <p className="text-gray-500">ניהול ובקרה על תור המשימות בזמן אמת</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seedDemoData} isLoading={seeding}>
            טען נתוני הדגמה
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>רשימת המתנה</CardTitle>
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
    </div>
  );
}