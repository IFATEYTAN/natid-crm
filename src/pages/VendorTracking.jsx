import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { useCalls } from '@/features/calls/hooks/useCalls';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Truck,
  Phone,
  MapPin,
  Clock,
  Battery,
  Navigation,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// Lazy map component
const VendorTrackingLeafletMap = lazyRetry(
  () => import('@/components/maps/VendorTrackingLeafletMap')
);

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

export default function VendorTrackingPage() {
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const vendorsQuery = useVendors();
  const callsQuery = useCalls();

  const vendors = vendorsQuery.data || [];
  const calls = callsQuery.data || [];

  // Get active calls (in progress)
  const activeCalls = calls.filter((c) =>
    ['vendor_enroute', 'in_progress', 'assigning'].includes(c.call_status)
  );

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        !searchQuery || vendor.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const hasLocation = vendor.current_latitude && vendor.current_longitude;

      // Handle special 'online' filter (vendors with active location)
      if (statusFilter === 'online') {
        return matchesSearch && hasLocation;
      }

      const matchesStatus = statusFilter === 'all' || vendor.availability_status === statusFilter;
      return matchesSearch && matchesStatus && hasLocation;
    });
  }, [vendors, searchQuery, statusFilter]);

  // Vendors with location
  const vendorsWithLocation = vendors.filter((v) => v.current_latitude && v.current_longitude);

  // Stats
  const stats = useMemo(
    () => ({
      total: vendors.length,
      online: vendorsWithLocation.length,
      available: vendors.filter((v) => v.availability_status === 'available').length,
      busy: vendors.filter((v) => v.availability_status === 'busy').length,
    }),
    [vendors, vendorsWithLocation]
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      vendorsQuery.refetch();
      callsQuery.refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (window._vendorTrackingMap) {
        window._vendorTrackingMap.remove();
        window._vendorTrackingMap = null;
      }
    };
  }, []);

  const getVendorActiveCall = (vendorId) => {
    return activeCalls.find((c) => c.assigned_vendor_id === vendorId);
  };

  // Israel center coordinates
  const defaultCenter = [31.7683, 35.2137];

  if (vendorsQuery.isError || callsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">
          {vendorsQuery.error?.message || callsQuery.error?.message || 'נסה לרענן את הדף'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">מעקב GPS ספקים</h1>
          <p className="text-[#6B778C] text-sm">מעקב מיקום ספקים בזמן אמת</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              vendorsQuery.refetch();
              callsQuery.refetch();
            }}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', vendorsQuery.isFetching && 'animate-spin')} />
            רענן
          </Button>
          <Badge
            variant={autoRefresh ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'רענון אוטומטי פעיל' : 'רענון אוטומטי כבוי'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            'bg-white cursor-pointer transition-all hover:shadow-md',
            statusFilter === 'all' && 'ring-2 ring-blue-500'
          )}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#172B4D]">{stats.total}</div>
            <div className="text-sm text-[#6B778C]">סה"כ ספקים</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'bg-white cursor-pointer transition-all hover:shadow-md',
            statusFilter === 'online' && 'ring-2 ring-blue-500'
          )}
          onClick={() => setStatusFilter('online')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.online}</div>
            <div className="text-sm text-[#6B778C]">עם מיקום פעיל</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'bg-white cursor-pointer transition-all hover:shadow-md',
            statusFilter === 'available' && 'ring-2 ring-green-500'
          )}
          onClick={() => setStatusFilter('available')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-sm text-[#6B778C]">זמינים</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'bg-white cursor-pointer transition-all hover:shadow-md',
            statusFilter === 'busy' && 'ring-2 ring-orange-500'
          )}
          onClick={() => setStatusFilter('busy')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.busy}</div>
            <div className="text-sm text-[#6B778C]">עסוקים</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <Card className="lg:col-span-3 bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[500px]">
              <Suspense fallback={<div className="h-full w-full bg-gray-50" />}>
                <VendorTrackingLeafletMap
                  vendors={filteredVendors}
                  onSelectVendor={setSelectedVendor}
                />
              </Suspense>
            </div>
          </CardContent>
        </Card>

        {/* Vendor List */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">רשימת ספקים</CardTitle>
            <div className="space-y-2 mt-2">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
                <Input
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pe-9 h-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="כל הסטטוסים" />
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
          <CardContent className="max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-8 text-[#6B778C]">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">אין ספקים עם מיקום פעיל</p>
                </div>
              ) : (
                filteredVendors.map((vendor) => {
                  const activeCall = getVendorActiveCall(vendor.id);
                  return (
                    <div
                      key={vendor.id}
                      onClick={() => setSelectedVendor(vendor.id)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedVendor === vendor.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-[#DFE1E6] hover:border-red-300'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{vendor.vendor_name}</span>
                        <Badge
                          className={cn('text-xs', availabilityColors[vendor.availability_status])}
                        >
                          {availabilityLabels[vendor.availability_status]}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-[#6B778C]">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span dir="ltr">{vendor.phone}</span>
                        </div>
                        {vendor.last_location_update && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDistanceToNow(new Date(vendor.last_location_update), {
                                addSuffix: true,
                                locale: he,
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {activeCall && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                          <AlertCircle className="w-3 h-3" />
                          <span>בקריאה {activeCall.call_number}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
