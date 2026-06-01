import React, { useState, useMemo, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, Phone, Star, MapPin, Search, Eye, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { cn } from '@/lib/utils';
import { getCoverageLabel } from '@/config/coverageConstants';
import { vendorServiceTypeLabels, availabilityLabels } from '@/config/labels';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const createIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const availabilityColors = {
  available: 'green',
  busy: 'orange',
  offline: 'grey',
  on_break: 'yellow',
};

const availabilityBadgeColors = {
  available: 'bg-green-100 text-green-800',
  busy: 'bg-orange-100 text-orange-800',
  offline: 'bg-gray-100 text-gray-800',
  on_break: 'bg-yellow-100 text-yellow-800',
};

export default function AllVendorsMapPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Unique map key to avoid container reuse across mounts
  const [mapKey] = useState(() => `all-vendors-${Date.now()}`);

  const {
    data: vendors = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.vendors.map(),
    queryFn: () => base44.entities.Vendor.list('-updated_date', 1000),
    refetchInterval: 90000, // Auto refresh every 30 seconds
  });

  // Filter vendors with location data
  const vendorsWithLocation = useMemo(() => {
    return vendors.filter((v) => {
      const hasLocation = v.current_latitude && v.current_longitude;
      const matchesSearch =
        !searchQuery ||
        v.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.coverage_areas || []).map(getCoverageLabel).join(' ').includes(searchQuery) ||
        v.coverage_cities?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAvailability =
        availabilityFilter === 'all' || v.availability_status === availabilityFilter;
      return hasLocation && matchesSearch && matchesAvailability;
    });
  }, [vendors, searchQuery, availabilityFilter]);

  // Calculate map center based on vendors or default to Israel center
  const mapCenter = useMemo(() => {
    if (vendorsWithLocation.length > 0) {
      const avgLat =
        vendorsWithLocation.reduce((sum, v) => sum + v.current_latitude, 0) /
        vendorsWithLocation.length;
      const avgLng =
        vendorsWithLocation.reduce((sum, v) => sum + v.current_longitude, 0) /
        vendorsWithLocation.length;
      return [avgLat, avgLng];
    }
    return [31.7683, 35.2137]; // Jerusalem
  }, [vendorsWithLocation]);

  const stats = useMemo(
    () => ({
      total: vendors.length,
      withLocation: vendorsWithLocation.length,
      available: vendorsWithLocation.filter((v) => v.availability_status === 'available').length,
      busy: vendorsWithLocation.filter((v) => v.availability_status === 'busy').length,
    }),
    [vendors, vendorsWithLocation]
  );

  if (isLoading) {
    return <PageLoader text="טוען מפת ספקים..." />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">מפת ספקים</h1>
            <p className="text-[#6b7280] text-sm">צפייה במיקום כל נותני השירות בזמן אמת</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            רענן מפה
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-[#111827]">{stats.total}</div>
              <div className="text-xs text-[#6b7280]">סה"כ ספקים</div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-[#3b82f6]">{stats.withLocation}</div>
              <div className="text-xs text-[#6b7280]">עם מיקום</div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">{stats.available}</div>
              <div className="text-xs text-[#6b7280]">זמינים</div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-orange-600">{stats.busy}</div>
              <div className="text-xs text-[#6b7280]">עסוקים</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                <Input
                  placeholder="חיפוש לפי שם או אזור..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pe-10"
                />
              </div>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="זמינות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הספקים</SelectItem>
                  {Object.entries(availabilityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="bg-white border border-[#e5e7eb] overflow-hidden">
          <div className="h-[500px] md:h-[600px]">
            {vendorsWithLocation.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto text-[#6b7280] mb-3" />
                  <h3 className="font-medium text-[#111827]">אין ספקים עם מיקום</h3>
                  <p className="text-sm text-[#6b7280]">ספקים יופיעו כאן כשישתפו את מיקומם</p>
                </div>
              </div>
            ) : (
              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={8}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {vendorsWithLocation.map((vendor) => (
                  <Marker
                    key={vendor.id}
                    position={[vendor.current_latitude, vendor.current_longitude]}
                    icon={createIcon(availabilityColors[vendor.availability_status] || 'blue')}
                  >
                    <Popup>
                      <div className="min-w-[200px] p-1" dir="rtl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                            <Truck className="w-4 h-4 text-[#6b7280]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[#111827]">{vendor.vendor_name}</div>
                            <Badge
                              className={cn(
                                'text-xs',
                                availabilityBadgeColors[vendor.availability_status]
                              )}
                            >
                              {availabilityLabels[vendor.availability_status]}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm mb-3">
                          <div className="flex items-center gap-2 text-[#6b7280]">
                            <Phone className="w-3 h-3" />
                            <span dir="ltr">{vendor.phone}</span>
                          </div>
                          {vendor.average_rating && (
                            <div className="flex items-center gap-2 text-[#6b7280]">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span>{vendor.average_rating.toFixed(1)}</span>
                            </div>
                          )}
                          {vendor.service_type?.length > 0 && (
                            <div className="text-xs text-[#6b7280]">
                              {vendor.service_type
                                .map((t) => vendorServiceTypeLabels[t] || t)
                                .join(', ')}
                            </div>
                          )}
                          {vendor.address && (
                            <div className="flex items-center gap-2 text-[#6b7280] text-xs">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate" title={vendor.address}>
                                {vendor.address}
                              </span>
                            </div>
                          )}
                          {vendor.last_location_update && (
                            <div className="flex items-center gap-2 text-[#6b7280] text-xs">
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

                        <Link to={createPageUrl(`VendorDetails?id=${vendor.id}`)}>
                          <Button
                            size="sm"
                            className="w-full gap-2 bg-[#3b82f6] hover:bg-[#2563eb]"
                          >
                            <Eye className="w-3 h-3" />
                            צפה בפרטים
                          </Button>
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </Card>

        {/* Legend */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium text-[#111827]">מקרא:</span>
              {Object.entries(availabilityLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        key === 'available'
                          ? '#22c55e'
                          : key === 'busy'
                            ? '#f97316'
                            : key === 'offline'
                              ? '#9ca3af'
                              : '#eab308',
                    }}
                  />
                  <span className="text-[#6b7280]">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}
