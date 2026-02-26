import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { base44 } from '@/lib/api';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import ExportMenu from '@/components/ui/ExportMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Phone,
  MapPin,
  Eye,
  Edit,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreVertical,
  Navigation,
  Ban,
} from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { PageTransition } from '@/components/animations/AnimatedComponents';
import { issueTypeLabels } from '@/config/labels';

const statusOptions = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'waiting_treatment', label: 'ממתין לטיפול' },
  { value: 'awaiting_assignment', label: 'ממתין לשיוך' },
  { value: 'assigning', label: 'בשיוך' },
  { value: 'vendor_enroute', label: 'ספק בדרך' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

export default function Calls() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [vipOnly, setVipOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: () => base44.entities.Call.list('-created_date', 500),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  // Get unique cities
  const cities = [...new Set(calls.map((c) => c.pickup_location_city).filter(Boolean))];

  // Filter calls
  const filteredCalls = calls.filter((call) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      call.call_number?.toLowerCase().includes(searchLower) ||
      call.customer_name?.toLowerCase().includes(searchLower) ||
      call.customer_phone?.includes(searchTerm) ||
      call.vehicle_plate?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === 'all' || call.call_status === statusFilter;

    // Date filter
    const callDate = call.created_date ? parseISO(call.created_date) : null;
    const matchesDateFrom = !dateFrom || !callDate || callDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || !callDate || callDate <= new Date(dateTo + 'T23:59:59');

    // City filter
    const matchesCity = cityFilter === 'all' || call.pickup_location_city === cityFilter;

    // Vendor filter
    const matchesVendor = vendorFilter === 'all' || call.assigned_vendor_id === vendorFilter;

    // VIP filter
    const matchesVip = !vipOnly || call.is_vip === true;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesCity &&
      matchesVendor &&
      matchesVip
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / rowsPerPage);
  const paginatedCalls = filteredCalls.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Calculate waiting time
  const calculateWaitingTime = (call) => {
    if (!call.created_date) return '-';
    const now = new Date();
    const created = parseISO(call.created_date);
    const minutes = differenceInMinutes(now, created);

    if (call.call_status === 'completed' || call.call_status === 'cancelled') {
      return call.time_to_completion ? `${call.time_to_completion} דק'` : '-';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins} דק'`;
  };

  // SLA Status Icon
  const getSlaIcon = (call) => {
    if (call.sla_status === 'breached') {
      return <XCircle className="w-5 h-5 text-[#D32F2F]" strokeWidth={2} />;
    }
    if (call.sla_status === 'near_breach') {
      return <AlertTriangle className="w-5 h-5 text-[#ED6C02]" strokeWidth={2} />;
    }
    return <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" strokeWidth={2} />;
  };

  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link
            to={createPageUrl(`CallDetails?id=${row.id}`)}
            className="font-semibold text-[#0D47A1] hover:underline"
          >
            {row.call_number || `#${row.id?.slice(-6)}`}
          </Link>
          {row.is_vip && (
            <span className="text-xs bg-[#FFF4E5] text-[#ED6C02] px-2 py-0.5 rounded-[4px] font-medium">
              VIP
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'תאריך ושעה',
      accessor: 'created_date',
      cell: (row) =>
        row.created_date ? (
          <span className="text-[#616161] caption whitespace-nowrap">
            {format(parseISO(row.created_date), 'dd/MM/yy HH:mm', { locale: he })}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'שם לקוח',
      accessor: 'customer_name',
      cell: (row) => <span className="font-medium text-[#212121]">{row.customer_name}</span>,
    },
    {
      header: 'טלפון',
      accessor: 'customer_phone',
      cell: (row) => (
        <a
          href={`tel:${row.customer_phone}`}
          className="flex items-center gap-1 text-[#0D47A1] hover:underline"
        >
          <Phone className="w-3 h-3" strokeWidth={2} />
          {row.customer_phone}
        </a>
      ),
    },
    {
      header: 'מספר רכב',
      accessor: 'vehicle_plate',
      cell: (row) => row.vehicle_plate || '-',
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => issueTypeLabels[row.issue_type] || row.issue_type || '-',
    },
    {
      header: 'עיר',
      accessor: 'pickup_location_city',
      cell: (row) => (
        <span className="flex items-center gap-1 text-[#616161]">
          <MapPin className="w-3 h-3" strokeWidth={2} />
          {row.pickup_location_city || '-'}
        </span>
      ),
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} />,
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (row) =>
        row.assigned_vendor_name || <span className="text-[#9E9E9E] text-sm">טרם שובץ</span>,
    },
    {
      header: 'זמן המתנה',
      accessor: 'time_waiting',
      cell: (row) => (
        <span className="flex items-center gap-1 text-[#616161]">
          <Clock className="w-3 h-3" strokeWidth={2} />
          {calculateWaitingTime(row)}
        </span>
      ),
    },
    {
      header: 'SLA',
      accessor: 'sla_status',
      cell: (row) => getSlaIcon(row),
    },
    {
      header: 'פעולות',
      accessor: 'actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
              <Link to={createPageUrl(`CallDetails?id=${row.id}`)}>
                <Eye className="w-4 h-4" />
                צפייה בפרטים
              </Link>
            </DropdownMenuItem>

            {(row.call_status === 'waiting_treatment' ||
              row.call_status === 'awaiting_assignment') && (
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <Link to={createPageUrl(`AssignVendor?id=${row.id}`)}>
                  <Truck className="w-4 h-4" />
                  שיוך ספק
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
              <Link to={createPageUrl(`EditCall?id=${row.id}`)}>
                <Edit className="w-4 h-4" />
                עריכת קריאה
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {row.customer_phone && (
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <a href={`tel:${row.customer_phone}`}>
                  <Phone className="w-4 h-4" />
                  התקשר ללקוח
                </a>
              </DropdownMenuItem>
            )}

            {row.pickup_location_address && (
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() =>
                  window.open(
                    `https://waze.com/ul?q=${encodeURIComponent(row.pickup_location_address)}`,
                    '_blank'
                  )
                }
              >
                <Navigation className="w-4 h-4" />
                ניווט למיקום
              </DropdownMenuItem>
            )}

            {row.call_status !== 'completed' && row.call_status !== 'cancelled' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Link to={createPageUrl(`CallDetails?id=${row.id}&action=cancel`)}>
                    <Ban className="w-4 h-4" />
                    ביטול קריאה
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Columns for export (simplified without JSX)
  const exportColumns = [
    { header: 'מספר קריאה', accessor: 'call_number' },
    { header: 'תאריך', accessor: 'created_date' },
    { header: 'שם לקוח', accessor: 'customer_name' },
    { header: 'טלפון', accessor: 'customer_phone' },
    { header: 'מספר רכב', accessor: 'vehicle_plate' },
    { header: 'סוג תקלה', accessor: 'issue_type' },
    { header: 'עיר', accessor: 'pickup_location_city' },
    { header: 'סטטוס', accessor: 'call_status' },
    { header: 'ספק', accessor: 'assigned_vendor_name' },
  ];

  // Prepare export data with formatted values
  const exportData = filteredCalls.map((call) => ({
    ...call,
    created_date: call.created_date
      ? format(parseISO(call.created_date), 'dd/MM/yyyy HH:mm', { locale: he })
      : '',
    issue_type: issueTypeLabels[call.issue_type] || call.issue_type || '',
    call_status: statusOptions.find((s) => s.value === call.call_status)?.label || call.call_status,
    assigned_vendor_name: call.assigned_vendor_name || 'טרם שובץ',
  }));

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-[32px] font-bold text-[#0D47A1] leading-tight">רשימת קריאות</h1>
            <p className="text-[#616161] text-sm body-2 mt-1">{filteredCalls.length} קריאות</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              data={exportData}
              columns={exportColumns}
              filename="calls"
              title="רשימת קריאות"
              subtitle={`סה"כ ${filteredCalls.length} קריאות`}
            />
            <Link to={createPageUrl('NewCall')}>
              <Button className="bg-[#0D47A1] hover:bg-[#1565C0] text-white gap-2 rounded-[4px]">
                <Plus className="w-5 h-5" strokeWidth={2} />
                קריאה חדשה
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label className="text-[#616161] text-sm mb-2 block">חיפוש</Label>
              <div className="relative">
                <Search
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9E9E9E]"
                  strokeWidth={2}
                />
                <Input
                  placeholder="מספר קריאה, שם לקוח, טלפון, מספר רכב..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-[#616161] text-sm mb-2 block">סטטוס</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
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

            {/* City Filter */}
            <div>
              <Label className="text-[#616161] text-sm mb-2 block">עיר</Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הערים</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div>
              <Label className="text-[#616161] text-sm mb-2 block">מתאריך</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            {/* Date To */}
            <div>
              <Label className="text-[#616161] text-sm mb-2 block">עד תאריך</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            {/* Vendor Filter */}
            <div>
              <Label className="text-[#616161] text-sm mb-2 block">ספק</Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הספקים</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* VIP Checkbox */}
            <div className="flex items-end pb-2">
              <div className="flex items-center gap-2">
                <Checkbox id="vip" checked={vipOnly} onCheckedChange={setVipOnly} />
                <Label htmlFor="vip" className="text-[#212121] text-sm cursor-pointer">
                  VIP בלבד
                </Label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <DataTable
            columns={columns}
            data={paginatedCalls}
            isLoading={isLoading}
            emptyMessage="לא נמצאו קריאות"
            emptyPreset="calls"
          />
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex items-center justify-center gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              הקודם
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first, last, current, and pages around current
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                })
                .map((page, idx, arr) => {
                  // Add ellipsis
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-2 text-[#9E9E9E]">...</span>}
                      <Button
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={currentPage === page ? 'bg-[#0D47A1]' : ''}
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  );
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              הבא
            </Button>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
