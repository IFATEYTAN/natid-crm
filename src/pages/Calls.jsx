import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Phone,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'רכב לא נוסע',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'מצבר',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר'
};

const priorityLabels = {
  normal: 'רגיל',
  urgent: 'דחוף',
  critical: 'קריטי'
};

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  urgent: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function CallsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('active');

  const { data: calls = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['allCalls'],
    queryFn: () => base44.entities.Call.list('-created_date', 500),
    refetchInterval: 30000
  });

  // Filter calls
  const filteredCalls = useMemo(() => {
    return calls.filter(call => {
      const matchesSearch = !searchQuery || 
        call.call_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.customer_phone?.includes(searchQuery) ||
        call.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || call.call_status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || call.call_priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [calls, searchQuery, statusFilter, priorityFilter]);

  // Separate active and completed calls
  const activeCalls = filteredCalls.filter(c => 
    ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress'].includes(c.call_status)
  );
  const completedCalls = filteredCalls.filter(c => 
    ['completed', 'cancelled'].includes(c.call_status)
  );

  // Stats
  const stats = useMemo(() => ({
    total: calls.length,
    waiting: calls.filter(c => c.call_status === 'waiting_treatment').length,
    inProgress: calls.filter(c => ['vendor_enroute', 'in_progress'].includes(c.call_status)).length,
    urgent: calls.filter(c => c.call_priority === 'urgent' || c.call_priority === 'critical').length,
  }), [calls]);

  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (call) => (
        <Link 
          to={createPageUrl(`CallDetails?id=${call.id}`)}
          className="font-medium text-blue-600 hover:underline"
        >
          {call.call_number || call.id.slice(0, 8)}
        </Link>
      )
    },
    {
      header: 'עדיפות',
      accessor: 'call_priority',
      cell: (call) => (
        <Badge className={cn("text-xs", priorityColors[call.call_priority] || priorityColors.normal)}>
          {priorityLabels[call.call_priority] || 'רגיל'}
        </Badge>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (call) => (
        <div>
          <div className="font-medium">{call.customer_name}</div>
          <div className="text-xs text-[#6B778C]" dir="ltr">{call.customer_phone}</div>
        </div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (call) => issueTypeLabels[call.issue_type] || call.issue_type || '-'
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_address',
      cell: (call) => (
        <div className="flex items-center gap-1 text-sm max-w-[200px]">
          <MapPin className="w-3 h-3 text-[#6B778C] shrink-0" />
          <span className="truncate">{call.pickup_location_city || call.pickup_location_address || '-'}</span>
        </div>
      )
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (call) => call.assigned_vendor_name || <span className="text-[#6B778C]">לא שובץ</span>
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (call) => <StatusBadge status={call.call_status} />
    },
    {
      header: 'נוצר',
      accessor: 'created_date',
      cell: (call) => (
        <div className="text-sm">
          <div>{format(new Date(call.created_date), 'dd/MM HH:mm')}</div>
          <div className="text-xs text-[#6B778C]">
            {formatDistanceToNow(new Date(call.created_date), { addSuffix: true, locale: he })}
          </div>
        </div>
      )
    },
    {
      header: 'פעולות',
      cell: (call) => (
        <Link to={createPageUrl(`CallDetails?id=${call.id}`)}>
          <Button size="sm" variant="outline">צפה</Button>
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">ניהול קריאות</h1>
          <p className="text-[#6B778C] text-sm">צפייה וניהול כל הקריאות במערכת</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            רענן
          </Button>
          <Link to={createPageUrl('NewCase')}>
            <Button className="bg-[#FF0000] hover:bg-[#CC0000] gap-2">
              <Plus className="w-4 h-4" />
              קריאה חדשה
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#172B4D]">{stats.total}</div>
            <div className="text-sm text-[#6B778C]">סה"כ קריאות</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
            <div className="text-sm text-[#6B778C]">ממתינות לטיפול</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-[#6B778C]">בטיפול</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-[#6B778C]">דחופות</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
              <Input
                placeholder="חיפוש לפי מספר קריאה, שם לקוח, טלפון או מספר רכב..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="waiting_treatment">ממתין לטיפול</SelectItem>
                <SelectItem value="awaiting_assignment">ממתין לשיבוץ</SelectItem>
                <SelectItem value="assigning">בתהליך שיבוץ</SelectItem>
                <SelectItem value="vendor_enroute">ספק בדרך</SelectItem>
                <SelectItem value="in_progress">בטיפול</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="עדיפות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל העדיפויות</SelectItem>
                <SelectItem value="normal">רגיל</SelectItem>
                <SelectItem value="urgent">דחוף</SelectItem>
                <SelectItem value="critical">קריטי</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card className="bg-white">
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">פעילות ({activeCalls.length})</TabsTrigger>
              <TabsTrigger value="completed">הושלמו ({completedCalls.length})</TabsTrigger>
              <TabsTrigger value="all">הכל ({filteredCalls.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          {activeTab === 'active' && (
            <DataTable
              columns={columns}
              data={activeCalls}
              isLoading={isLoading}
              emptyMessage="אין קריאות פעילות"
            />
          )}
          {activeTab === 'completed' && (
            <DataTable
              columns={columns}
              data={completedCalls}
              isLoading={isLoading}
              emptyMessage="אין קריאות שהושלמו"
            />
          )}
          {activeTab === 'all' && (
            <DataTable
              columns={columns}
              data={filteredCalls}
              isLoading={isLoading}
              emptyMessage="אין קריאות להצגה"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}