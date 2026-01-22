import React from 'react';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from "@/components/ui/button";
import { Eye, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDateTime, cn } from '@/components/utils';

export default function CallsTable({ calls, isLoading }) {
  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link 
          to={createPageUrl(`CaseDetails?id=${row.id}`)}
          className="font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer_name}</div>
          {row.customer_phone && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />
              <a href={`tel:${row.customer_phone}`} className="hover:text-blue-600">
                {row.customer_phone}
              </a>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_city',
      cell: (row) => (
        <div className="flex items-center gap-1 text-gray-600" title={row.pickup_location_address}>
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[120px]">
            {row.pickup_location_city || row.pickup_location_address || '-'}
          </span>
        </div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => (
        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
          {row.issue_type === 'mechanical' ? 'תקלה מכנית' :
           row.issue_type === 'accident' ? 'תאונה' :
           row.issue_type === 'flat_tire' ? 'פנצ׳ר' :
           row.issue_type === 'dead_battery' ? 'מצבר' :
           row.issue_type || '-'}
        </span>
      )
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} size="sm" />
    },
    {
      header: 'נוצר',
      accessor: 'created_date',
      cell: (row) => (
        <span className="text-xs text-gray-500">
          {formatDateTime(row.created_date)}
        </span>
      )
    },
    {
      header: '',
      id: 'actions',
      cell: (row) => (
        <Link to={createPageUrl(`CaseDetails?id=${row.id}`)}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="w-4 h-4 text-gray-500" />
          </Button>
        </Link>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={calls}
      isLoading={isLoading}
      emptyMessage="לא נמצאו קריאות"
      onRowClick={(row) => window.location.href = createPageUrl(`CaseDetails?id=${row.id}`)}
    />
  );
}