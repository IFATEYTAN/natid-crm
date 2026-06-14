import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import QueryErrorState from '@/components/ui/QueryErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, RefreshCw, MapPin, ChevronRight, ChevronLeft, User } from 'lucide-react';
import { cn } from '@/components/utils';
import { format } from 'date-fns';
import ColumnSelector from '@/components/calls/ColumnSelector';
import { useColumnVisibility } from '@/components/calls/useColumnVisibility';
import { buildCallColumns } from '@/components/calls/callTableColumns';

const PAGE_SIZE = 50; // Smaller pages = faster rendering

const SERVICE_TYPE_LABELS = {
  towing: 'גרירה',
  flat_tire: 'פנצ׳ר',
  battery: 'סוללה',
  lockout: 'נעילה',
  fuel: 'דלק',
  accident: 'תאונה',
  mechanical: 'מכאני',
  other: 'אחר',
};

const STATUS_LABELS = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיוך',
  assigning: 'ספק שובץ',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  vendor_arrived: 'ספק הגיע',
  future_service: 'שירות עתידי',
  in_followup: 'במעקב',
  in_storage: 'באחסנה',
  continued_treatment: 'המשך טיפול',
  awaiting_payment: 'ממתין לתשלום',
  completed: 'סגור',
  cancelled: 'בוטל',
};

const STATUS_COLORS = {
  waiting_treatment: 'bg-yellow-100 text-yellow-800',
  awaiting_assignment: 'bg-orange-100 text-orange-800',
  assigning: 'bg-blue-100 text-blue-800',
  vendor_enroute: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-purple-100 text-purple-800',
  vendor_arrived: 'bg-cyan-100 text-cyan-800',
  future_service: 'bg-teal-100 text-teal-800',
  in_followup: 'bg-sky-100 text-sky-800',
  in_storage: 'bg-gray-100 text-gray-700',
  continued_treatment: 'bg-violet-100 text-violet-800',
  awaiting_payment: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const PRIORITY_LABELS = {
  normal: 'רגיל',
  urgent: 'דחוף',
  critical: 'קריטי',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const CLOSED_STATUSES = ['completed', 'cancelled'];

export default function CallsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [openClosedTab, setOpenClosedTab] = useState('open');

  // עמודות אחידות לכל מסכי הקריאות (מקור אמת יחיד - callTableColumns)
  const allCallColumns = useMemo(
    () => buildCallColumns({ getCall: (c) => c, getCallId: (c) => c.id }),
    []
  );
  const CALL_COLUMNS = useMemo(() => allCallColumns.map((c) => c.header), [allCallColumns]);
  const { isHidden, toggleColumn, resetColumns } = useColumnVisibility({
    pageName: 'Calls',
    allColumns: CALL_COLUMNS,
  });
  const visibleColumns = allCallColumns.filter((c) => !isHidden(c.header));

  const {
    data: cases = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['calls-list', statusFilter, serviceTypeFilter],
    queryFn: () => {
      // Load only recent 2000 calls for performance (previously unlimited)
      // Server-side filtering when status/service filters are active
      if (statusFilter && statusFilter !== 'all') {
        return base44.entities.Call.filter({ call_status: statusFilter }, '-created_date', 2000);
      }
      return base44.entities.Call.list('-created_date', 2000);
    },
    staleTime: 30000, // Cache for 30 seconds to reduce re-fetches
  });

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.call_number?.toLowerCase().includes(q) ||
        c.customer_name?.toLowerCase().includes(q) ||
        c.customer_phone?.includes(searchQuery) ||
        c.vehicle_plate?.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || c.call_status === statusFilter;
      const matchesService =
        serviceTypeFilter === 'all' || c.service_category === serviceTypeFilter;
      const isClosed = CLOSED_STATUSES.includes(c.call_status);
      const matchesTab =
        openClosedTab === 'all' ||
        (openClosedTab === 'open' && !isClosed) ||
        (openClosedTab === 'closed' && isClosed);
      return matchesSearch && matchesStatus && matchesService && matchesTab;
    });
  }, [cases, searchQuery, statusFilter, serviceTypeFilter, openClosedTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page on filter change
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const stats = useMemo(
    () => ({
      total: cases.length,
      new: cases.filter((c) => c.call_status === 'waiting_treatment').length,
      inProgress: cases.filter((c) =>
        [
          'awaiting_assignment',
          'assigning',
          'vendor_enroute',
          'in_progress',
          'vendor_arrived',
        ].includes(c.call_status)
      ).length,
      completed: cases.filter((c) => c.call_status === 'completed').length,
    }),
    [cases]
  );

  if (isError) {
    return <QueryErrorState error={error} onRetry={refetch} entityName="Call" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="text-right">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#111827]">ניהול קריאות</h1>
          <p className="text-[#6b7280] text-xs sm:text-sm">צפייה וניהול כל הקריאות במערכת</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 h-10">
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            רענן
          </Button>
          <ColumnSelector
            allColumns={CALL_COLUMNS}
            isHidden={isHidden}
            onToggle={toggleColumn}
            onReset={resetColumns}
          />
          <Link to={createPageUrl('NewCase')}>
            <Button className="bg-[#FF0000] hover:bg-[#CC0000] gap-2 h-10">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">קריאה חדשה</span>
              <span className="sm:hidden">חדשה</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: 'סה"כ קריאות', value: stats.total, color: 'text-[#172B4D]' },
          { label: 'חדשות', value: stats.new, color: 'text-yellow-600' },
          { label: 'בטיפול', value: stats.inProgress, color: 'text-blue-600' },
          { label: 'נסגרו', value: stats.completed, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-white">
            <CardContent className="p-4">
              <div className={cn('text-2xl font-bold', color)}>{isLoading ? '...' : value}</div>
              <div className="text-sm text-[#6B778C]">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Open/Closed Tabs */}
      <div
        className="flex gap-2 border-b border-gray-200"
        role="tablist"
        aria-label="סינון פתוחות וסגורות"
      >
        {[
          {
            key: 'open',
            label: 'פתוחות',
            count: cases.filter((c) => !CLOSED_STATUSES.includes(c.call_status)).length,
          },
          {
            key: 'closed',
            label: 'סגורות',
            count: cases.filter((c) => CLOSED_STATUSES.includes(c.call_status)).length,
          },
          { key: 'all', label: 'הכל', count: cases.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={openClosedTab === tab.key}
            onClick={() => {
              setOpenClosedTab(tab.key);
              setPage(1);
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              openClosedTab === tab.key
                ? 'border-[#FF0000] text-[#FF0000]'
                : 'border-transparent text-[#6b7280] hover:text-[#111827]'
            )}
          >
            {tab.label}
            <span className="ms-2 text-xs tabular-nums">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
              <Input
                placeholder="חיפוש לפי מספר קריאה, שם לקוח, טלפון..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="ps-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={serviceTypeFilter}
                onValueChange={handleFilterChange(setServiceTypeFilter)}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="סוג שירות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-semibold text-[#172B4D]">
            {isLoading
              ? 'טוען...'
              : `${filtered.length} קריאות | עמוד ${currentPage} מתוך ${totalPages}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2 p-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div className="text-center py-8 text-[#6B778C]">אין קריאות להצגה</div>
            ) : (
              paginated.map((c) => (
                <Link key={c.id} to={createPageUrl(`CallDetails?id=${c.id}`)} className="block">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all active:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-[#172B4D] truncate">
                          {c.customer_name || 'ללא שם'}
                        </div>
                        <div className="text-xs text-[#6B778C] mt-0.5 tabular-nums" dir="ltr">
                          {c.vehicle_plate ||
                            c.vehicle_number ||
                            `#${c.call_number || c.id?.slice(0, 8) || ''}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ms-2 flex-shrink-0">
                        {c.call_status && (
                          <Badge
                            className={cn(
                              'text-[10px] px-2 py-0.5',
                              STATUS_COLORS[c.call_status] || 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {STATUS_LABELS[c.call_status] || c.call_status}
                          </Badge>
                        )}
                        {c.call_priority && c.call_priority !== 'normal' && (
                          <Badge
                            className={cn(
                              'text-[10px] px-2 py-0.5',
                              PRIORITY_COLORS[c.call_priority] || 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {PRIORITY_LABELS[c.call_priority] || c.call_priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B778C]">
                      {c.insurance_company && (
                        <span className="truncate max-w-[140px]">🛡️ {c.insurance_company}</span>
                      )}
                      {c.assigned_to_agent && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {c.assigned_to_agent}
                        </span>
                      )}
                      {c.assigned_vendor_name && (
                        <span className="truncate max-w-[120px]">🚚 {c.assigned_vendor_name}</span>
                      )}
                      {c.created_date && (
                        <span>{format(new Date(c.created_date), 'dd/MM HH:mm')}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.header}
                      className="px-4 py-3 text-xs font-semibold text-[#6B778C] whitespace-nowrap"
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {visibleColumns.map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length}
                      className="px-4 py-12 text-center text-[#6B778C]"
                    >
                      אין קריאות להצגה
                    </td>
                  </tr>
                ) : (
                  paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      {visibleColumns.map((col) => (
                        <td
                          key={col.header}
                          className="px-4 py-3 text-[#6B778C] whitespace-nowrap align-top"
                        >
                          {col.cell(c)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-gray-200">
              <span className="text-sm text-[#6B778C]">
                מציג {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} מתוך {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
