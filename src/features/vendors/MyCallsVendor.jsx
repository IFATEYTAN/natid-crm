import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { base44 } from '@/lib/api';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Phone, MapPin, Navigation, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { issueTypeLabels } from '@/config/labels';
import { usePermissions } from '@/components/permissions/PermissionsContext';

const statusOptions = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'awaiting_assignment', label: 'ממתין לשיוך' },
  { value: 'assigning', label: 'בשיוך' },
  { value: 'vendor_enroute', label: 'בדרך' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

export default function MyCallsVendor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { currentUser: user } = usePermissions();

  const { data: vendors = [] } = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list(),
  });

  const currentVendor = vendors.find((v) => v.email === user?.email);

  const { data: allCalls = [], isLoading } = useQuery({
    queryKey: queryKeys.vendors.calls(currentVendor?.id),
    queryFn: () => base44.entities.Call.list('-created_date', 500),
    enabled: !!currentVendor,
  });

  // Filter only this vendor's calls
  const myCalls = allCalls.filter((call) => call.assigned_vendor_id === currentVendor?.id);

  // Apply filters
  const filteredCalls = myCalls.filter((call) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      call.call_number?.toLowerCase().includes(searchLower) ||
      call.customer_name?.toLowerCase().includes(searchLower) ||
      call.customer_phone?.includes(searchTerm) ||
      call.vehicle_plate?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || call.call_status === statusFilter;

    const callDate = call.created_date ? parseISO(call.created_date) : null;
    const matchesDateFrom = !dateFrom || !callDate || callDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || !callDate || callDate <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const openNavigation = (address) => {
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(wazeUrl, '_blank');
  };

  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link
          to={createPageUrl(`CallDetailsVendor?id=${row.id}`)}
          className="font-semibold text-[#0078D4] hover:underline"
        >
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      ),
    },
    {
      header: 'תאריך ושעה',
      accessor: 'created_date',
      cell: (row) =>
        row.created_date ? (
          <span className="text-[#616161] text-sm whitespace-nowrap">
            {format(parseISO(row.created_date), 'dd/MM/yy HH:mm', { locale: he })}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'שם לקוח',
      accessor: 'customer_name',
      cell: (row) => <span className="font-medium">{row.customer_name}</span>,
    },
    {
      header: 'טלפון',
      accessor: 'customer_phone',
      cell: (row) => (
        <a
          href={`tel:${row.customer_phone}`}
          className="flex items-center gap-1 text-[#0078D4] hover:underline"
        >
          <Phone className="w-3 h-3" />
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
      header: 'כתובת איסוף',
      accessor: 'pickup_location_address',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-[#616161]" />
          <span className="max-w-[200px] truncate">{row.pickup_location_address}</span>
        </div>
      ),
    },
    {
      header: 'כתובת יעד',
      accessor: 'dropoff_location_address',
      cell: (row) =>
        row.dropoff_location_address ? (
          <span className="max-w-[150px] truncate">{row.dropoff_location_address}</span>
        ) : (
          '-'
        ),
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => issueTypeLabels[row.issue_type] || row.issue_type || '-',
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} />,
    },
    {
      header: 'פעולות',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link to={createPageUrl(`CallDetailsVendor?id=${row.id}`)}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="צפייה" aria-label="צפה">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openNavigation(row.pickup_location_address)}
            title="ניווט"
            aria-label="ניווט"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!currentVendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-xl text-[#616161]">לא נמצא ספק מקושר</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>הקריאות שלי</h1>
        <p className="text-[var(--color-text-secondary)]">{filteredCalls.length} קריאות בסה״כ</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <Label className="text-[#6B7280] text-sm mb-1.5 block">חיפוש</Label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <Input
                placeholder="מספר קריאה, לקוח, טלפון, רכב..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
          </div>

          <div>
            <Label className="text-[#6B7280] text-sm mb-1.5 block">סטטוס</Label>
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

          <div>
            <Label className="text-[#6B7280] text-sm mb-1.5 block">מתאריך</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <DataTable
          columns={columns}
          data={filteredCalls}
          isLoading={isLoading}
          emptyMessage="לא נמצאו קריאות"
        />
      </div>
    </div>
  );
}
