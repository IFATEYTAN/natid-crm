import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
import {
  Plus,
  Search,
  RefreshCw,
  MapPin,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/components/utils';
import { format } from 'date-fns';

const PAGE_SIZE = 100;

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
  new: 'חדש',
  assigned: 'שובץ',
  en_route: 'בדרך',
  on_site: 'באתר',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

const STATUS_COLORS = {
  new: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  en_route: 'bg-indigo-100 text-indigo-800',
  on_site: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const PRIORITY_LABELS = {
  low: 'נמוך',
  normal: 'רגיל',
  high: 'גבוה',
  urgent: 'דחוף',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function CallsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

  const { data: cases = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['cases-list'],
    queryFn: () => base44.entities.Case.list('-created_date', 50000),
  });

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.case_number?.toLowerCase().includes(q) ||
        c.customer_name?.toLowerCase().includes(q) ||
        c.caller_phone?.includes(searchQuery) ||
        c.vehicle_number?.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesService = serviceTypeFilter === 'all' || c.service_type === serviceTypeFilter;
      return matchesSearch && matchesStatus && matchesService;
    });
  }, [cases, searchQuery, statusFilter, serviceTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page on filter change
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const stats = useMemo(() => ({
    total: cases.length,
    new: cases.filter((c) => c.status === 'new').length,
    inProgress: cases.filter((c) => ['assigned', 'en_route', 'on_site', 'in_progress'].includes(c.status)).length,
    completed: cases.filter((c) => c.status === 'completed').length,
  }), [cases]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <Button variant="outline" onClick={() => refetch()}>נסה שוב</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">ניהול קריאות</h1>
          <p className="text-[#6B778C] text-sm">צפייה וניהול כל הקריאות במערכת</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
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
        {[
          { label: 'סה"כ קריאות', value: stats.total, color: 'text-[#172B4D]' },
          { label: 'חדשות', value: stats.new, color: 'text-yellow-600' },
          { label: 'בטיפול', value: stats.inProgress, color: 'text-blue-600' },
          { label: 'הושלמו', value: stats.completed, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-white">
            <CardContent className="p-4">
              <div className={cn('text-2xl font-bold', color)}>{isLoading ? '...' : value}</div>
              <div className="text-sm text-[#6B778C]">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
              <Input
                placeholder="חיפוש לפי מספר קריאה, שם לקוח, טלפון..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="ps-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serviceTypeFilter} onValueChange={handleFilterChange(setServiceTypeFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="סוג שירות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-[#172B4D]">
            {isLoading ? 'טוען...' : `${filtered.length} קריאות | עמוד ${currentPage} מתוך ${totalPages}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['מספר קריאה', 'שם לקוח', 'טלפון', 'סוג שירות', 'סטטוס', 'עדיפות', 'עיר', 'ספק', 'תאריך', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6B778C] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-[#6B778C]">אין קריאות להצגה</td>
                  </tr>
                ) : (
                  paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-blue-600">
                        <Link to={createPageUrl(`CallDetails?id=${c.id}`)} className="hover:underline">
                          {c.case_number || c.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#172B4D] whitespace-nowrap">{c.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-[#6B778C]" dir="ltr">{c.caller_phone || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.service_type ? (
                          <Badge variant="outline" className="text-xs">
                            {SERVICE_TYPE_LABELS[c.service_type] || c.service_type}
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {c.status ? (
                          <Badge className={cn('text-xs', STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600')}>
                            {STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {c.priority ? (
                          <Badge className={cn('text-xs', PRIORITY_COLORS[c.priority] || 'bg-gray-100 text-gray-600')}>
                            {PRIORITY_LABELS[c.priority] || c.priority}
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-[#6B778C]">
                        <div className="flex items-center gap-1">
                          {c.location_city && <MapPin className="w-3 h-3 shrink-0" />}
                          <span className="truncate max-w-[120px]">{c.location_city || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B778C] max-w-[150px]">
                        <span className="truncate block">{c.assigned_provider_name || <span className="text-gray-400">לא שובץ</span>}</span>
                      </td>
                      <td className="px-4 py-3 text-[#6B778C] whitespace-nowrap text-xs">
                        {c.created_date ? format(new Date(c.created_date), 'dd/MM/yy HH:mm') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={createPageUrl(`CallDetails?id=${c.id}`)}>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">צפה</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <span className="text-sm text-[#6B778C]">
                מציג {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} מתוך {filtered.length}
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
                <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
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