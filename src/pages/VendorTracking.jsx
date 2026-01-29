import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useVendors } from '@/components/hooks/useVendors';
import { useCalls } from '@/components/hooks/useCalls';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
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
  CheckCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vendor marker
const createVendorIcon = (status) => {
  const colors = {
    available: '#22c55e',
    busy: '#f97316',
    offline: '#6b7280',
    on_break: '#eab308'
  };
  
  return L.divIcon({
    className: 'custom-vendor-marker',
    html: `
      <div style="
        background-color: ${colors[status] || colors.offline};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 8H17V4H3C1.9 4 1 4.9 1 6V17H3C3 18.66 4.34 20 6 20S9 18.66 9 17H15C15 18.66 16.34 20 18 20S21 18.66 21 17H23V12L20 8ZM6 18.5C5.17 18.5 4.5 17.83 4.5 17S5.17 15.5 6 15.5 7.5 16.17 7.5 17 6.83 18.5 6 18.5ZM19.5 9.5L21.46 12H17V9.5H19.5ZM18 18.5C17.17 18.5 16.5 17.83 16.5 17S17.17 15.5 18 15.5 19.5 16.17 19.5 17 18.83 18.5 18 18.5Z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

// Auto-fit map to markers
function FitBounds({ vendors }) {
  const map = useMap();
  
  useEffect(() => {
    if (vendors.length > 0) {
      const validVendors = vendors.filter(v => v.current_latitude && v.current_longitude);
      if (validVendors.length > 0) {
        const bounds = L.latLngBounds(
          validVendors.map(v => [v.current_latitude, v.current_longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [vendors, map]);
  
  return null;
}

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
  const activeCalls = calls.filter(c => 
    ['vendor_enroute', 'in_progress', 'assigning'].includes(c.call_status)
  );

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesSearch = !searchQuery || 
        vendor.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
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
  const vendorsWithLocation = vendors.filter(v => v.current_latitude && v.current_longitude);

  // Stats
  const stats = useMemo(() => ({
    total: vendors.length,
    online: vendorsWithLocation.length,
    available: vendors.filter(v => v.availability_status === 'available').length,
    busy: vendors.filter(v => v.availability_status === 'busy').length,
  }), [vendors, vendorsWithLocation]);

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
    return activeCalls.find(c => c.assigned_vendor_id === vendorId);
  };

  // Israel center coordinates
  const defaultCenter = [31.7683, 35.2137];

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
            <RefreshCw className={cn("w-4 h-4", vendorsQuery.isFetching && "animate-spin")} />
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
            "bg-white cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'all' && "ring-2 ring-blue-500"
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
            "bg-white cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'online' && "ring-2 ring-blue-500"
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
            "bg-white cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'available' && "ring-2 ring-green-500"
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
            "bg-white cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'busy' && "ring-2 ring-orange-500"
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
              <MapContainer
                key="vendor-tracking-map"
                center={defaultCenter}
                zoom={8}
                style={{ height: '100%', width: '100%' }}
                whenCreated={(map) => {
                  window._vendorTrackingMap = map;
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds vendors={filteredVendors} />
                
                {filteredVendors.map(vendor => (
                  <Marker
                    key={vendor.id}
                    position={[vendor.current_latitude, vendor.current_longitude]}
                    icon={createVendorIcon(vendor.availability_status)}
                    eventHandlers={{
                      click: () => setSelectedVendor(vendor.id)
                    }}
                  >
                    <Popup>
                      <div className="text-right min-w-[200px]" dir="rtl">
                        <h3 className="font-bold text-lg mb-2">{vendor.vendor_name}</h3>
                        <Badge className={cn("mb-2", availabilityColors[vendor.availability_status])}>
                          {availabilityLabels[vendor.availability_status]}
                        </Badge>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span dir="ltr">{vendor.phone}</span>
                          </div>
                          
                          {vendor.last_location_update && (
                            <div className="flex items-center gap-2 text-[#6B778C]">
                              <Clock className="w-3 h-3" />
                              <span>
                                עודכן {formatDistanceToNow(new Date(vendor.last_location_update), { 
                                  addSuffix: true, 
                                  locale: he 
                                })}
                              </span>
                            </div>
                          )}
                          
                          {getVendorActiveCall(vendor.id) && (
                            <div className="mt-2 p-2 bg-orange-50 rounded">
                              <div className="flex items-center gap-1 text-orange-800">
                                <AlertCircle className="w-3 h-3" />
                                <span className="font-medium">בקריאה פעילה</span>
                              </div>
                              <Link 
                                to={createPageUrl(`CallDetails?id=${getVendorActiveCall(vendor.id).id}`)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {getVendorActiveCall(vendor.id).call_number}
                              </Link>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <Link to={createPageUrl(`VendorDetails?id=${vendor.id}`)}>
                            <Button size="sm" variant="outline">פרטים</Button>
                          </Link>
                          <a href={`tel:${vendor.phone}`}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Phone className="w-3 h-3 ml-1" />
                              התקשר
                            </Button>
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vendor List */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">רשימת ספקים</CardTitle>
            <div className="space-y-2 mt-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
                <Input
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="כל הסטטוסים" />
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
          <CardContent className="max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-8 text-[#6B778C]">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">אין ספקים עם מיקום פעיל</p>
                </div>
              ) : (
                filteredVendors.map(vendor => {
                  const activeCall = getVendorActiveCall(vendor.id);
                  return (
                    <div
                      key={vendor.id}
                      onClick={() => setSelectedVendor(vendor.id)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedVendor === vendor.id 
                          ? "border-red-500 bg-red-50" 
                          : "border-[#DFE1E6] hover:border-red-300"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{vendor.vendor_name}</span>
                        <Badge className={cn("text-xs", availabilityColors[vendor.availability_status])}>
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
                                locale: he 
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