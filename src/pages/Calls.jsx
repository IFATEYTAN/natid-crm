import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
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
import { Search, RefreshCw, ChevronRight, ChevronLeft, Eye } from 'lucide-react';
import { cn } from '@/components/utils';
import { queryKeys } from '@/lib/queryKeys';
import { getAppealsList } from '@/features/calls/api';
import { listSuppliers } from '@/lib/srvApi';
import { DEPARTMENT_LABELS, APPEAL_STATUS_LABELS as STATUS_LABELS } from '@/config/appealLabels';

const PAGE_SIZE = 50;

const COLOR_CLASS_STYLES = {
  greenColor: 'bg-emerald-400',
  yellowColor: 'bg-yellow-400',
  redColor: 'bg-red-400',
  blueColor: 'bg-blue-400',
};

const EMPTY = '—';

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function currency(value) {
  if (value == null || value === '') return null;
  return `₪${Number(value).toLocaleString()}`;
}

export default function CallsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [department, setDepartment] = useState('-1');
  const [supplierFilter, setSupplierFilter] = useState('all');

  const searchQuery = useDebouncedValue(searchInput, 400);

  const filters = useMemo(
    () => ({
      dep: department,
      q: searchQuery || undefined,
      kablanFilter: supplierFilter !== 'all' ? supplierFilter : undefined,
      limit: 500,
    }),
    [department, searchQuery, supplierFilter]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.appeals.list(filters),
    queryFn: () => getAppealsList(filters),
    staleTime: 15000,
  });

  const appeals = data?.data ?? [];

  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.lookups.suppliers({}),
    queryFn: () => listSuppliers(),
    staleTime: 5 * 60 * 1000,
  });
  const suppliers = suppliersData?.data ?? [];

  const totalPages = Math.max(1, Math.ceil(appeals.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = appeals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  if (isError) {
    return <QueryErrorState error={error} onRetry={refetch} entityName="Appeal" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="text-right">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#111827]">ניהול קריאות</h1>
          <p className="text-[#6b7280] text-xs sm:text-sm">
            קריאות פתוחות · {isLoading ? '...' : appeals.length}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 h-10">
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            רענן
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
              <Input
                placeholder="חיפוש לפי מס' קריאה, שם לקוח, טלפון, מספר רכב..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="ps-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={department} onValueChange={handleFilterChange(setDepartment)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="מחלקה" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={handleFilterChange(setSupplierFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="ספק" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הספקים</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.kablan_id} value={String(s.kablan_id)}>
                      {s.kablan_name}
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
              : `${appeals.length} קריאות | עמוד ${currentPage} מתוך ${totalPages}`}
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
              paginated.map((a) => (
                <Link
                  key={a.appeal_id}
                  to={createPageUrl(`CallDetails?id=${a.appeal_id}`)}
                  className="block"
                >
                  <div
                    className={cn(
                      'border rounded-lg p-3 hover:shadow-md transition-all border-r-4 bg-white border-gray-200',
                      a.colorClass === 'greenColor' && 'border-r-emerald-400',
                      a.colorClass === 'yellowColor' && 'border-r-yellow-400',
                      a.colorClass === 'redColor' && 'border-r-red-400',
                      a.colorClass === 'blueColor' && 'border-r-blue-400',
                      !a.colorClass && 'border-r-gray-300'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-[#172B4D] truncate">
                          {a.requester || 'ללא שם'}
                        </div>
                        <div className="text-xs text-[#6B778C] mt-0.5 tabular-nums" dir="ltr">
                          {a.car_num || `#${a.appeal_id}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ms-2 flex-shrink-0">
                        <Badge className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700">
                          {STATUS_LABELS[a.status] ?? a.status}
                        </Badge>
                        {a.vip === 1 && (
                          <Badge className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800">
                            VIP
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B778C]">
                      <span>{DEPARTMENT_LABELS[String(a.department_id)] || a.department}</span>
                      {a.supplier_name && (
                        <span className="truncate max-w-[140px]">🚚 {a.supplier_name}</span>
                      )}
                      {a.date_added && <span>{a.date_added}</span>}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block max-h-[70vh] overflow-auto">
            <table className="w-full text-sm text-right min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    '',
                    'קוד קריאה',
                    'מחלקה',
                    'שם פונה',
                    "מס' רכב",
                    'טלפון',
                    'תקלה',
                    'ספק',
                    'סטטוס',
                    'זמן פתיחה',
                    'מוקדן',
                    'עלות',
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-xs font-semibold text-[#6B778C] whitespace-nowrap sticky top-0 z-10 bg-gray-50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-[#6B778C]">
                      אין קריאות להצגה
                    </td>
                  </tr>
                ) : (
                  paginated.map((a) => (
                    <tr
                      key={a.appeal_id}
                      className={cn(
                        'transition-colors border-r-4 bg-white hover:bg-gray-50',
                        a.colorClass === 'greenColor' && 'border-r-emerald-400',
                        a.colorClass === 'yellowColor' && 'border-r-yellow-400',
                        a.colorClass === 'redColor' && 'border-r-red-400',
                        a.colorClass === 'blueColor' && 'border-r-blue-400',
                        !a.colorClass && 'border-r-gray-300'
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link to={createPageUrl(`CallDetails?id=${a.appeal_id}`)}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            aria-label="צפה"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          to={createPageUrl(`CallDetails?id=${a.appeal_id}`)}
                          className="font-medium text-blue-600 hover:underline tabular-nums"
                          dir="ltr"
                        >
                          {a.appeal_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#6B778C]">
                        {DEPARTMENT_LABELS[String(a.department_id)] || a.department || EMPTY}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{a.requester || EMPTY}</td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums" dir="ltr">
                        {a.car_num || EMPTY}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums" dir="ltr">
                        {a.tel || a.tel1 || EMPTY}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-[#6B778C]">
                        {a.problem_desc || EMPTY}
                      </td>
                      <td className="px-4 py-3 max-w-[140px] truncate text-[#6B778C]">
                        {a.supplier_name || EMPTY}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {a.colorClass && (
                            <span
                              className={cn(
                                'inline-block w-2 h-2 rounded-full',
                                COLOR_CLASS_STYLES[a.colorClass]
                              )}
                            />
                          )}
                          <Badge className="text-xs bg-gray-100 text-gray-700">
                            {STATUS_LABELS[a.status] ?? a.status}
                          </Badge>
                          {a.vip === 1 && (
                            <Badge className="text-xs bg-amber-100 text-amber-800">VIP</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-[#6B778C]">
                        {a.date_added || EMPTY}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#6B778C]">
                        {a.user_name || EMPTY}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {currency(a.claim_total_cost) || EMPTY}
                      </td>
                      <td />
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
                {Math.min(currentPage * PAGE_SIZE, appeals.length)} מתוך {appeals.length}
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
