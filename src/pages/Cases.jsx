import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Filter,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const serviceTypeLabels = {
  towing: 'גרירה',
  flat_tire: 'פנצ\'ר',
  battery: 'מצבר',
  lockout: 'פתיחת רכב',
  fuel: 'דלק',
  accident: 'תאונה',
  mechanical: 'תקלה מכנית',
  other: 'אחר'
};

export default function Cases() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.Case.list('-created_date', 200),
  });

  // Filter cases
  const filteredCases = cases.filter(c => {
    const matchesSearch = !search || 
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
        <span className="font-medium text-[#0D47A1]">
          {row.case_number || `#${row.id?.slice(-6)}`}
        </span>
      )
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <p className="font-medium text-[#212121]">{row.customer_name}</p>
          <p className="text-xs text-[#616161] flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {row.caller_phone}
          </p>
        </div>
      )
    },
    {
      header: 'סוג שירות',
      accessor: 'service_type',
      cell: (row) => serviceTypeLabels[row.service_type] || row.service_type
    },
    {
      header: 'מיקום',
      accessor: 'location_city',
      cell: (row) => (
        <span className="flex items-center gap-1 text-[#616161]">
          <MapPin className="w-3 h-3" />
          {row.location_city || row.location_address?.slice(0, 20)}
        </span>
      )
    },
    {
      header: 'נותן שירות',
      accessor: 'assigned_provider_name',
      cell: (row) => row.assigned_provider_name || '-'
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (row) => row.created_date ? (
        <span className="text-[#616161] text-sm">
          {format(parseISO(row.created_date), 'dd/MM HH:mm', { locale: he })}
        </span>
      ) : '-'
    },
    {
      header: 'עדיפות',
      accessor: 'priority',
      cell: (row) => <StatusBadge status={row.priority || 'normal'} size="sm" />
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#212121]">קריאות שירות</h2>
          <p className="text-[#616161] text-sm">{filteredCases.length} קריאות</p>
        </div>
        <Link to={createPageUrl('NewCase')}>
          <Button className="bg-[#0D47A1] hover:bg-[#1565C0] gap-2">
            <Plus className="w-4 h-4" />
            קריאה חדשה
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E0E0E0] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
            <Input
              placeholder="חיפוש לפי מספר קריאה, לקוח, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
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
                <SelectItem key={key} value={key}>{label}</SelectItem>
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
        onRowClick={(row) => window.location.href = createPageUrl(`CaseDetails?id=${row.id}`)}
        emptyMessage="לא נמצאו קריאות"
      />
    </div>
  );
}