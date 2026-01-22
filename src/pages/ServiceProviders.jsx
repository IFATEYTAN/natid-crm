import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useVendors, useDeleteVendor, useUpdateVendorAvailability } from '@/components/hooks/useVendors';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  XCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";

const serviceTypeLabels = {
  tow_truck: 'גרר',
  mechanic: 'מכונאי',
  tire_service: 'צמיגים',
  locksmith: 'מנעולן',
  fuel_delivery: 'דלק',
  multi_service: 'שירות משולב'
};

const availabilityLabels = {
  available: 'זמין',
  busy: 'עסוק',
  offline: 'לא מחובר',
  on_break: 'בהפסקה'
};

const availabilityColors = {
  available: 'bg-green-100 text-green-800',
  busy: 'bg-orange-100 text-orange-800',
  offline: 'bg-gray-100 text-gray-800',
  on_break: 'bg-yellow-100 text-yellow-800'
};

export default function ServiceProvidersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const vendorsQuery = useVendors();
  const deleteVendor = useDeleteVendor();
  const updateAvailability = useUpdateVendorAvailability();

  const vendors = vendorsQuery.data || [];

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesSearch = !searchQuery || 
        vendor.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.phone?.includes(searchQuery) ||
        vendor.coverage_cities?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || vendor.service_type?.includes(typeFilter);
      const matchesAvailability = availabilityFilter === 'all' || vendor.availability_status === availabilityFilter;
      return matchesSearch && matchesType && matchesAvailability;
    });
  }, [vendors, searchQuery, typeFilter, availabilityFilter]);

  const stats = useMemo(() => ({
    total: vendors.length,
    available: vendors.filter(v => v.availability_status === 'available').length,
    busy: vendors.filter(v => v.availability_status === 'busy').length,
    avgRating: vendors.length > 0 
      ? (vendors.reduce((sum, v) => sum + (v.average_rating || 0), 0) / vendors.length).toFixed(1)
      : 0,
  }), [vendors]);

  const toggleAvailability = (vendor) => {
    const newStatus = vendor.is_available_now ? 'offline' : 'available';
    updateAvailability.mutate({ 
      id: vendor.id, 
      is_available_now: !vendor.is_available_now,
      availability_status: newStatus
    });
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
              {vendor.service_type?.map(t => serviceTypeLabels[t] || t).join(', ')}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (vendor) => (
        <div className="flex items-center gap-1 text-sm">
          <Phone className="w-3 h-3 text-[#6B778C]" />
          <span dir="ltr">{vendor.phone}</span>
        </div>
      )
    },
    {
      header: 'אזור כיסוי',
      accessor: 'coverage_cities',
      cell: (vendor) => (
        <div className="flex items-center gap-1 text-sm text-[#6B778C]">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[150px]">{vendor.coverage_cities || '-'}</span>
        </div>
      )
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
      )
    },
    {
      header: 'קריאות',
      accessor: 'total_calls_completed',
      cell: (vendor) => (
        <span className="font-medium">{vendor.total_calls_completed || 0}</span>
      )
    },
    {
      header: 'זמינות',
      accessor: 'availability_status',
      cell: (vendor) => (
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", availabilityColors[vendor.availability_status])}>
            {availabilityLabels[vendor.availability_status]}
          </Badge>
          <Switch
            checked={vendor.is_available_now}
            onCheckedChange={() => toggleAvailability(vendor)}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      )
    },
    {
      header: '',
      cell: (vendor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`VendorDetails?id=${vendor.id}`)}>
                <Eye className="w-4 h-4 ml-2" />
                צפייה בפרטים
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`EditVendor?id=${vendor.id}`)}>
                <Pencil className="w-4 h-4 ml-2" />
                עריכה
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => {
                if (confirm('האם אתה בטוח שברצונך למחוק ספק זה?')) {
                  deleteVendor.mutate(vendor.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">נותני שירות</h1>
          <p className="text-[#6B778C] text-sm">ניהול גררים וספקי שירות</p>
        </div>
        <Link to={createPageUrl('NewVendor')}>
          <Button className="bg-[#FF0000] hover:bg-[#CC0000] gap-2">
            <Plus className="w-4 h-4" />
            ספק חדש
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#172B4D]">{stats.total}</div>
            <div className="text-sm text-[#6B778C]">סה"כ ספקים</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-sm text-[#6B778C]">זמינים כעת</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.busy}</div>
            <div className="text-sm text-[#6B778C]">עסוקים</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-bold text-[#172B4D]">{stats.avgRating}</span>
            </div>
            <div className="text-sm text-[#6B778C]">דירוג ממוצע</div>
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
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="סוג שירות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                {Object.entries(serviceTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
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
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <QueryStateWrapper query={vendorsQuery}>
            <DataTable
              columns={columns}
              data={filteredVendors}
              emptyMessage="לא נמצאו ספקים"
            />
          </QueryStateWrapper>
        </CardContent>
      </Card>
    </div>
  );
}