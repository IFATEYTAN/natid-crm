import React, { lazy } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Phone, Truck, MapPin, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { issueTypeLabels } from './dashboardConstants';

const StatusBadge = lazy(() => import('@/components/ui/StatusBadge'));

export const getCallColumns = () => [
  {
    header: 'מספר קריאה',
    accessor: 'call_number',
    cell: (row) => (
      <Link
        to={createPageUrl(`CallDetails?id=${row.id}`)}
        className="font-bold text-blue-600 hover:text-blue-800 transition-colors"
      >
        {row.call_number || `#${row.id?.slice(-6)}`}
      </Link>
    ),
  },
  {
    header: 'שם לקוח',
    accessor: 'customer_name',
    cell: (row) => <div className="font-medium text-gray-800">{row.customer_name}</div>,
  },
  {
    header: 'סוג תקלה',
    accessor: 'issue_type',
    cell: (row) => (
      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">
        {issueTypeLabels[row.issue_type] || row.issue_type || '-'}
      </span>
    ),
  },
  {
    header: 'סטטוס',
    accessor: 'call_status',
    cell: (row) => <StatusBadge status={row.call_status} size="sm" />,
  },
  {
    header: 'תאריך',
    accessor: 'created_date',
    cell: (row) =>
      row.created_date ? (
        <span className="text-gray-500 text-sm">
          {format(parseISO(row.created_date), 'dd/MM HH:mm', { locale: he })}
        </span>
      ) : (
        '-'
      ),
  },
  {
    header: 'ספק',
    accessor: 'assigned_vendor_name',
    cell: (row) =>
      row.assigned_vendor_name ? (
        <span className="text-green-700 font-medium text-sm">{row.assigned_vendor_name}</span>
      ) : (
        <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-full">
          טרם שובץ
        </span>
      ),
  },
];

export const getOperatorCallColumns = () => [
  {
    header: 'קריאה',
    accessor: 'call_number',
    cell: (row) => (
      <Link
        to={createPageUrl('CallDetails') + '?id=' + row.id}
        className="font-bold text-blue-600 hover:text-blue-800"
      >
        {row.call_number || `#${row.id?.slice(-6)}`}
      </Link>
    ),
  },
  {
    header: 'לקוח',
    accessor: 'customer_name',
    cell: (row) => (
      <div>
        <div className="font-medium text-gray-800">{row.customer_name}</div>
        <a
          href={`tel:${row.customer_phone}`}
          className="text-gray-500 text-xs flex items-center gap-1 hover:text-blue-600"
        >
          <Phone className="w-3 h-3" />
          {row.customer_phone}
        </a>
      </div>
    ),
  },
  {
    header: 'סוג תקלה',
    accessor: 'issue_type',
    cell: (row) => (
      <span className="text-gray-600">{issueTypeLabels[row.issue_type] || row.issue_type}</span>
    ),
  },
  {
    header: 'מיקום',
    accessor: 'pickup_location_city',
    cell: (row) => (
      <div className="flex items-center gap-1 text-gray-600">
        <MapPin className="w-3 h-3" />
        <span>
          {row.pickup_location_city || row.pickup_location_address?.substring(0, 20) + '...'}
        </span>
      </div>
    ),
  },
  {
    header: 'סטטוס',
    accessor: 'call_status',
    cell: (row) => <StatusBadge status={row.call_status} size="sm" />,
  },
  {
    header: 'ספק',
    accessor: 'assigned_vendor_name',
    cell: (row) =>
      row.assigned_vendor_name ? (
        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
          {row.assigned_vendor_name}
        </span>
      ) : (
        <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
          לא שובץ
        </span>
      ),
  },
  {
    header: '',
    cell: (row) => (
      <Link to={createPageUrl('CallDetails') + '?id=' + row.id}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Eye className="w-4 h-4" />
        </Button>
      </Link>
    ),
  },
];

export const getVendorColumns = () => [
  {
    header: 'ספק',
    accessor: 'vendor_name',
    cell: (row) => (
      <Link
        to={createPageUrl('VendorProfile') + '?id=' + row.id}
        className="font-medium text-gray-800 hover:text-blue-600 flex items-center gap-2"
      >
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <Truck className="w-4 h-4" />
        </div>
        {row.vendor_name}
      </Link>
    ),
  },
  {
    header: 'טלפון',
    accessor: 'phone',
    cell: (row) => (
      <a
        href={`tel:${row.phone}`}
        className="text-gray-600 flex items-center gap-1 hover:text-blue-600"
      >
        <Phone className="w-3 h-3" />
        {row.phone}
      </a>
    ),
  },
  {
    header: 'אזורים',
    accessor: 'coverage_areas',
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {(row.coverage_areas || []).slice(0, 2).map((area, idx) => (
          <span
            key={idx}
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200"
          >
            {area}
          </span>
        ))}
      </div>
    ),
  },
  {
    header: 'דירוג',
    accessor: 'average_rating',
    cell: (row) => (
      <div className="flex items-center gap-1 text-amber-500 font-medium">
        <span>{row.average_rating ? row.average_rating.toFixed(1) : '-'}</span>
        <span className="text-xs">⭐</span>
      </div>
    ),
  },
];
