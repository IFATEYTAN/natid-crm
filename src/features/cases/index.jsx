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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Phone, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ImportExport from '@/components/ImportExport';
import { he } from 'date-fns/locale';
import { serviceTypeLabels } from '@/config/labels';

export default function Cases() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  const { data: cases = [], isLoading } = useQuery({
    queryKey: queryKeys.cases.all(),
    queryFn: () => base44.entities.Case.list('-created_date', 200),
  });

  // Filter cases
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      !search ||
      c.case_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.caller_phone?.includes(search) ||
      c.vehicle_number?.includes(search);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesService = serviceFilter === 'all' || c.service_type === serviceFilter;

    return matchesSearch && matchesStatus && matchesService;
  });

  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'case_number',
      cell: (row) => (
        <span className="font-semibold text-[#FF0000]">
          {row.case_number || `#${row.id?.slice(-6)}`}
        </span>
      ),
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <p className="font-medium text-[#212121]">{row.customer_name}</p>
          <p className="text-xs text-[#616161] flex items-center gap-1 mt-1 caption">
            <Phone className="w-3 h-3" strokeWidth={2} />
            {row.caller_phone}
          </p>
        </div>
      ),
    },
    {
      header: 'סוג שירות',
      accessor: 'service_type',
      cell: (row) => (
        <span className="text-[#212121]">
          {serviceTypeLabels[row.service_type] || row.service_type}
        </span>
      ),
    },
    {
      header: 'מיקום',
      accessor: 'location_city',
      cell: (row) => (
        <span className="flex items-center gap-1 text-[#616161]">
          <MapPin className="w-4 h-4" strokeWidth={2} />
          {row.location_city || row.location_address?.slice(0, 20)}
        </span>
      ),
    },
    {
      header: 'נותן שירות',
      accessor: 'assigned_provider_name',
      cell: (row) => <span className="text-[#212121]">{row.assigned_provider_name || '-'}</span>,
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (row) =>
        row.created_date ? (
          <span className="text-[#616161] caption">
            {format(parseISO(row.created_date), 'dd/MM HH:mm', { locale: he })}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'עדיפות',
      accessor: 'priority',
      cell: (row) => (
        <StatusBadge
          status={row.priority || 'normal'}
          showIcon={row.priority === 'high' || row.priority === 'urgent'}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>קריאות שירות</h1>
          <p className="text-[var(--color-text-secondary)]">{filteredCases.length} קריאות במערכת</p>
        </div>
        <div className="flex gap-2">
          <ImportExport
            entityName="Case"
            data={filteredCases}
            columns={columns}
            title="דוח קריאות שירות"
          />
          <Link to={createPageUrl('NewCase')}>
            <Button className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              קריאה חדשה
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card-base">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-disabled)]" />
            <Input
              placeholder="חיפוש לפי מספר קריאה, לקוח, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base ps-11"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 input-base">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="new">חדש</SelectItem>
              <SelectItem value="assigned">שובץ</SelectItem>
              <SelectItem value="en_route">בדרך</SelectItem>
              <SelectItem value="on_site">באתר</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
              <SelectItem value="completed">הושלם</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="סוג שירות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל השירותים</SelectItem>
              {Object.entries(serviceTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCases}
        isLoading={isLoading}
        onRowClick={(row) => (window.location.href = createPageUrl(`CaseDetails?id=${row.id}`))}
        emptyMessage="לא נמצאו קריאות"
      />
    </div>
  );
}
