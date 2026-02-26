import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable from '@/components/ui/DataTable';
import {
  Plus,
  Search,
  Truck,
  Phone,
  Star,
  MapPin,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  PhoneCall,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SlideUp,
  AnimatedCard,
  StaggeredList,
  StaggeredItem,
} from '@/components/animations/AnimatedComponents';
import { showToast } from '@/components/ui/FeedbackToast';
import { InlineLoader } from '@/components/ui/LoadingSpinner';

const serviceTypeLabels = {
  tow_truck: 'גרר',
  mechanic: 'מכונאי',
  tire_service: 'צמיגים',
  locksmith: 'מנעולן',
  fuel_delivery: 'דלק',
  multi_service: 'שירות משולב',
};

const availabilityLabels = {
  available: 'זמין',
  busy: 'עסוק',
  offline: 'לא מחובר',
  on_break: 'בהפסקה',
};

const availabilityColors = {
  available: 'bg-green-100 text-green-800',
  busy: 'bg-orange-100 text-orange-800',
  offline: 'bg-gray-100 text-gray-800',
  on_break: 'bg-yellow-100 text-yellow-800',
};

export default function ServiceProvidersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [activeKpi, setActiveKpi] = useState('all');

  const queryClient = useQueryClient();

  const vendorsQuery = useQuery({
    queryKey: ['service-providers'],
    queryFn: () => base44.entities.Vendor.list('-updated_date', 1000),
  });

  const deleteVendor = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-providers'] }),
  });

  const updateAvailability = useMutation({
    mutationFn: ({ id, is_available_now, availability_status }) =>
      base44.entities.Vendor.update(id, { is_available_now, availability_status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-providers'] }),
  });

  const vendors = vendorsQuery.data || [];

  // Fetch calls to calculate open/closed per vendor
  const { data: calls = [] } = useQuery({
    queryKey: ['calls-for-vendors'],
    queryFn: () => base44.entities.Call.list('-created_date', 1000),
  });

  // Calculate call stats per vendor
  const vendorCallStats = useMemo(() => {
    const stats = {};
    calls.forEach((call) => {
      const vendorId = call.assigned_vendor_id;
      if (vendorId) {
        if (!stats[vendorId]) {
          stats[vendorId] = { open: 0, closed: 0 };
        }
        if (call.call_status === 'completed' || call.call_status === 'cancelled') {
          stats[vendorId].closed++;
        } else {
          stats[vendorId].open++;
        }
      }
    });
    return stats;
  }, [calls]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        !searchQuery ||
        vendor.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.phone?.includes(searchQuery) ||
        vendor.coverage_cities?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        typeFilter === 'all' ||
        (Array.isArray(vendor.service_type)
          ? vendor.service_type.includes(typeFilter)
          : vendor.service_type === typeFilter);
      const matchesAvailability =
        availabilityFilter === 'all' || vendor.availability_status === availabilityFilter;
      return matchesSearch && matchesType && matchesAvailability;
    });
  }, [vendors, searchQuery, typeFilter, availabilityFilter]);

  const stats = useMemo(() => {
    const active = vendors.filter((v) => v.is_active);
    const towTrucks = active.filter((v) => 
      Array.isArray(v.service_type) ? v.service_type.includes('tow_truck') : v.service_type === 'tow_truck'
    );
    const mobileUnits = active.filter((v) => 
      Array.isArray(v.service_type) ? v.service_type.includes('multi_service') || v.service_type.includes('mechanic') || v.service_type.includes('tire_service') || v.service_type.includes('fuel_delivery') || v.service_type.includes('locksmith') : false
    );
    const inactive = vendors.filter((v) => !v.is_active);
    
    const totalOpen = Object.values(vendorCallStats).reduce((sum, s) => sum + s.open, 0);
    const totalClosed = Object.values(vendorCallStats).reduce((sum, s) => sum + s.closed, 0);
    
    return {
      total: vendors.length,
      active: active.length,
      available: vendors.filter((v) => v.availability_status === 'available').length,
      busy: vendors.filter((v) => v.availability_status === 'busy').length,
      towTrucks: towTrucks.length,
      mobileUnits: mobileUnits.length,
      inactive: inactive.length,
      totalOpen,
      totalClosed,
      avgRating:
        vendors.length > 0
          ? (vendors.reduce((sum, v) => sum + (v.average_rating || 0), 0) / vendors.length).toFixed(1)
          : 0,
    };
  }, [vendors, vendorCallStats]);

  const toggleAvailability = (vendor) => {
    const newStatus = vendor.is_available_now ? 'offline' : 'available';
    updateAvailability.mutate(
      {
        id: vendor.id,
        is_available_now: !vendor.is_available_now,
        availability_status: newStatus,
      },
      {
        onSuccess: () => {
          showToast.success(
            `${vendor.vendor_name} ${!vendor.is_available_now ? 'זמין כעת' : 'לא זמין'}`
          );
        },
      }
    );
  };

  const handleDelete = (vendor) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את ${vendor.vendor_name}?`)) {
      deleteVendor.mutate(vendor.id, {
        onSuccess: () => {
          showToast.success(`${vendor.vendor_name} נמחק בהצלחה`);
        },
        onError: () => {
          showToast.error('שגיאה במחיקת הספק');
        },
      });
    }
  };

  const columns = [
    {
      header: 'ספק',
      accessor: 'vendor_name',
      cell: (vendor) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#6B778C]" />
          </div>
          <div>
            <Link
              to={createPageUrl(`VendorDetails?id=${vendor.id}`)}
              className="font-medium text-[#172B4D] hover:text-red-600"
            >
              {vendor.vendor_name}
            </Link>
            <div className="text-xs text-[#6B778C]">
              {Array.isArray(vendor.service_type)
                ? vendor.service_type.map((t) => serviceTypeLabels[t] || t).join(', ')
                : serviceTypeLabels[vendor.service_type] || vendor.service_type}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (vendor) => (
        <div className="flex items-center gap-1 text-sm">
          <Phone className="w-3 h-3 text-[#6B778C]" />
          <span dir="ltr">{vendor.phone}</span>
        </div>
      ),
    },
    {
      header: 'אזור כיסוי',
      accessor: 'coverage_cities',
      cell: (vendor) => (
        <div className="flex items-center gap-1 text-sm text-[#6B778C]">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[150px]">{vendor.coverage_cities || '-'}</span>
        </div>
      ),
    },
    {
      header: 'דירוג',
      accessor: 'average_rating',
      cell: (vendor) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium">{vendor.average_rating?.toFixed(1) || '-'}</span>
          <span className="text-xs text-[#6B778C]">({vendor.total_ratings || 0})</span>
        </div>
      ),
    },
    {
      header: 'קריאות פתוחות',
      accessor: 'open_calls',
      cell: (vendor) => {
        const stats = vendorCallStats[vendor.id] || { open: 0, closed: 0 };
        return (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span className="font-medium text-[#3b82f6]">{stats.open}</span>
          </div>
        );
      },
    },
    {
      header: 'קריאות סגורות',
      accessor: 'closed_calls',
      cell: (vendor) => {
        const stats = vendorCallStats[vendor.id] || { open: 0, closed: 0 };
        return (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-[#111827]" />
            <span className="font-medium text-[#111827]">{stats.closed}</span>
          </div>
        );
      },
    },
    {
      header: 'זמינות',
      accessor: 'availability_status',
      cell: (vendor) => (
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs', availabilityColors[vendor.availability_status])}>
            {availabilityLabels[vendor.availability_status]}
          </Badge>
          <Switch
            checked={vendor.is_available_now}
            onCheckedChange={() => toggleAvailability(vendor)}
            className="data-[state=checked]:bg-green-500"
            aria-label={`שנה זמינות ${vendor.vendor_name}`}
          />
        </div>
      ),
    },
    {
      header: '',
      cell: (vendor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="פעולות נוספות">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`VendorDetails?id=${vendor.id}`)}>
                <Eye className="w-4 h-4 me-2" />
                צפייה בפרטים
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`EditVendor?id=${vendor.id}`)}>
                <Pencil className="w-4 h-4 me-2" />
                עריכה
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(vendor)}>
              <Trash2 className="w-4 h-4 me-2" />
              מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (vendorsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{vendorsQuery.error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">נותני שירות</h1>
            <p className="text-[#6b7280] text-sm">ניהול גררים וספקי שירות</p>
          </div>
          <Link to={createPageUrl('NewVendor')}>
            <Button className="bg-[#f97316] hover:bg-[#ea580c] gap-2">
              <Plus className="w-4 h-4" />
              ספק חדש
            </Button>
          </Link>
        </div>

        {/* KPI Stats - like Fleet Management */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" dir="rtl">
          <Card
            className={cn(
              'bg-white border cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
              activeKpi === 'all' ? 'border-[#3b82f6] ring-1 ring-[#3b82f6]' : 'border-[#e5e7eb] hover:border-[#3b82f6]'
            )}
            onClick={() => { setActiveKpi('all'); setTypeFilter('all'); setAvailabilityFilter('all'); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.total}</div>
                  <div className="text-sm text-[#6b7280]">סה"כ ספקים</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'bg-white border cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
              activeKpi === 'available' ? 'border-[#10b981] ring-1 ring-[#10b981]' : 'border-[#e5e7eb] hover:border-[#10b981]'
            )}
            onClick={() => { setActiveKpi('available'); setTypeFilter('all'); setAvailabilityFilter('available'); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#ecfdf5] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#10b981]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.available}</div>
                  <div className="text-sm text-[#6b7280]">זמינים כעת</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'bg-white border cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
              activeKpi === 'busy' ? 'border-[#f59e0b] ring-1 ring-[#f59e0b]' : 'border-[#e5e7eb] hover:border-[#f59e0b]'
            )}
            onClick={() => { setActiveKpi('busy'); setTypeFilter('all'); setAvailabilityFilter('busy'); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#fffbeb] flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.busy}</div>
                  <div className="text-sm text-[#6b7280]">עסוקים</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'bg-white border cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
              activeKpi === 'inactive' ? 'border-[#ef4444] ring-1 ring-[#ef4444]' : 'border-[#e5e7eb] hover:border-[#ef4444]'
            )}
            onClick={() => { setActiveKpi('inactive'); setTypeFilter('all'); setAvailabilityFilter('offline'); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#fef2f2] flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-[#ef4444]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.inactive}</div>
                  <div className="text-sm text-[#6b7280]">לא פעילים</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
                <Input
                  placeholder="חיפוש לפי שם, טלפון או אזור..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                  aria-label="חיפוש ספקים"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="סוג שירות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  {Object.entries(serviceTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="זמינות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  {Object.entries(availabilityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <QueryStateWrapper query={vendorsQuery}>
              <DataTable columns={columns} data={filteredVendors} emptyMessage="לא נמצאו ספקים" />
            </QueryStateWrapper>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}