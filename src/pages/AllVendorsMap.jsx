import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from '@/components/ui/StatusBadge';
import { 
  MapPin,
  Navigation,
  Phone,
  Eye,
  RefreshCw,
  X,
  Menu,
  Users,
  Truck,
  AlertCircle,
  Clock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom vendor marker icon
const createVendorMarker = (status, hasActiveCalls) => {
  const colors = {
    available: '#2E7D32',
    busy: '#ED6C02',
    offline: '#616161',
    inactive: '#9E9E9E'
  };
  
  const color = colors[status] || '#616161';
  const pulseClass = hasActiveCalls ? 'animate-pulse' : '';
  
  return L.divIcon({
    className: 'custom-vendor-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      " class="${pulseClass}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

// Call marker icons
const createCallMarker = (status) => {
  const colors = {
    waiting_treatment: '#D32F2F',
    awaiting_assignment: '#ED6C02',
    assigning: '#0288D1',
    vendor_enroute: '#2E7D32',
    in_progress: '#FDD835'
  };
  
  const color = colors[status] || '#616161';
  
  return L.divIcon({
    className: 'custom-call-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

export default function AllVendorsMap() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [selectedTab, setSelectedTab] = useState('vendors'); // 'vendors' or 'calls'

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [mapCenter] = useState([31.7683, 35.2137]); // Jerusalem default

  // Fetch all vendors
  const { data: vendors = [], refetch: refetchVendors } = useQuery({
    queryKey: ['allVendors'],
    queryFn: () => base44.entities.Vendor.list(),
    refetchInterval: 30000,
  });

  // Fetch vendor locations
  const { data: vendorLocations = [], refetch: refetchLocations } = useQuery({
    queryKey: ['vendorLocations'],
    queryFn: () => base44.entities.VendorLocation.list('-created_date', 500),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch all active calls
  const { data: allCalls = [], refetch: refetchCalls } = useQuery({
    queryKey: ['mapCalls'],
    queryFn: () => base44.entities.Call.filter({ 
      call_status: { $in: ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress'] }
    }),
    refetchInterval: 30000,
  });

  const activeCalls = allCalls.filter(c => 
    c.pickup_location_lat && 
    c.pickup_location_lon
  );

  // Match vendors with their latest locations
  const vendorsWithLocations = vendors.map(vendor => {
    const location = vendorLocations.find(loc => loc.vendor_id === vendor.id);
    const vendorCalls = activeCalls.filter(call => call.assigned_vendor_id === vendor.id);
    return {
      ...vendor,
      location,
      activeCalls: vendorCalls.length,
      hasLocation: !!location
    };
  }).filter(v => v.hasLocation);

  const handleRefresh = () => {
    refetchVendors();
    refetchLocations();
    refetchCalls();
  };

  const stats = {
    totalVendors: vendors.length,
    availableVendors: vendors.filter(v => v.availability_status === 'available').length,
    activeVendors: vendorsWithLocations.length,
    activeCalls: activeCalls.length,
    unassignedCalls: activeCalls.filter(c => !c.assigned_vendor_id).length
  };

  return (
    <div className="h-[calc(100vh-4rem)] relative" dir="rtl">
      {/* Sidebar */}
      <div 
        className={`
          absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white border-l border-[#E0E0E0] 
          shadow-lg z-[1000] transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[#E0E0E0]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[24px] font-bold text-[#212121]">
                🗺️ מעקב ספקים
              </h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-[#212121]" />
                    <span className="text-xs text-[#616161]">ספקים</span>
                  </div>
                  <div className="text-2xl font-bold text-[#212121]">{stats.activeVendors}</div>
                  <div className="text-xs text-[#9E9E9E]">מתוך {stats.totalVendors}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-[#ED6C02]" />
                    <span className="text-xs text-[#616161]">קריאות</span>
                  </div>
                  <div className="text-2xl font-bold text-[#212121]">{stats.activeCalls}</div>
                  <div className="text-xs text-[#9E9E9E]">{stats.unassignedCalls} לא משובצות</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-3">
              <Button 
                variant={selectedTab === 'vendors' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedTab('vendors')}
              >
                <Users className="w-4 h-4 ml-1" />
                ספקים ({vendorsWithLocations.length})
              </Button>
              <Button 
                variant={selectedTab === 'calls' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedTab('calls')}
              >
                <MapPin className="w-4 h-4 ml-1" />
                קריאות ({activeCalls.length})
              </Button>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4" />
              רענן
            </Button>
          </div>

          {/* Lists */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedTab === 'vendors' ? (
              vendorsWithLocations.length === 0 ? (
                <div className="text-center text-[#616161] mt-8">
                  <Truck className="w-12 h-12 mx-auto mb-2 text-[#9E9E9E]" />
                  <p>אין ספקים עם מיקום זמין</p>
                </div>
              ) : (
                vendorsWithLocations.map(vendor => (
                  <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Link 
                            to={createPageUrl(`VendorProfile?id=${vendor.id}`)}
                            className="font-bold text-[#212121] hover:underline block mb-1"
                          >
                            {vendor.vendor_name}
                          </Link>
                          <StatusBadge status={vendor.availability_status || 'available'} size="sm" />
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        {vendor.activeCalls > 0 && (
                          <div className="flex items-center gap-1 text-[#ED6C02]">
                            <AlertCircle className="w-3 h-3" />
                            <span>{vendor.activeCalls} קריאות פעילות</span>
                          </div>
                        )}
                        {vendor.location?.created_date && (
                          <div className="flex items-center gap-1 text-[#616161]">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">
                              עדכון: {format(parseISO(vendor.location.created_date), 'HH:mm', { locale: he })}
                            </span>
                          </div>
                        )}
                        <a href={`tel:${vendor.phone}`} className="flex items-center gap-1 text-[#212121]">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs">{vendor.phone}</span>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              activeCalls.length === 0 ? (
                <div className="text-center text-[#616161] mt-8">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-[#9E9E9E]" />
                  <p>אין קריאות פעילות</p>
                </div>
              ) : (
                activeCalls.map(call => (
                  <Card key={call.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <Link 
                        to={createPageUrl(`CaseDetails?id=${call.id}`)}
                        className="font-bold text-[#212121] hover:underline"
                        >
                          {call.call_number || `#${call.id?.slice(-6)}`}
                        </Link>
                        <StatusBadge status={call.call_status} size="sm" />
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{call.customer_name}</p>
                        <p className="text-[#616161] text-xs">{call.pickup_location_city}</p>
                        {call.assigned_vendor_name && (
                          <div className="flex items-center gap-1 text-[#2E7D32]">
                            <Truck className="w-3 h-3" />
                            <span className="text-xs">{call.assigned_vendor_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-2">
                        <Link to={createPageUrl(`CaseDetails?id=${call.id}`)} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-1">
                            <Eye className="w-3 h-3" />
                            פרטים
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className={`absolute top-0 bottom-0 left-0 transition-all duration-300 ${sidebarOpen ? 'right-0 sm:right-96' : 'right-0'}`}>
        {!sidebarOpen && (
          <Button 
            className="absolute top-4 right-4 z-[1001] bg-white shadow-lg"
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        <MapContainer
          center={mapCenter}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {/* Vendor Markers */}
          {vendorsWithLocations.map(vendor => (
            vendor.location && (
              <Marker
                key={`vendor-${vendor.id}`}
                position={[vendor.location.latitude, vendor.location.longitude]}
                icon={createVendorMarker(vendor.availability_status, vendor.activeCalls > 0)}
              >
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold mb-2 text-[#212121]">
                      🚛 {vendor.vendor_name}
                    </h3>
                    <div className="space-y-1 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={vendor.availability_status || 'available'} size="sm" />
                      </div>
                      {vendor.activeCalls > 0 && (
                        <p className="text-[#ED6C02] font-medium">
                          {vendor.activeCalls} קריאות פעילות
                        </p>
                      )}
                      <p>
                        📞 <a href={`tel:${vendor.phone}`} className="text-[#0078D4]">
                          {vendor.phone}
                        </a>
                      </p>
                      {vendor.location.created_date && (
                        <p className="text-xs text-[#616161]">
                          עדכון: {format(parseISO(vendor.location.created_date), 'HH:mm dd/MM', { locale: he })}
                        </p>
                      )}
                    </div>
                    <Link to={createPageUrl(`VendorProfile?id=${vendor.id}`)}>
                      <Button size="sm" className="w-full">
                        פרטים מלאים
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            )
          ))}

          {/* Call Markers */}
          {activeCalls.map(call => (
            <Marker
              key={`call-${call.id}`}
              position={[call.pickup_location_lat, call.pickup_location_lon]}
              icon={createCallMarker(call.call_status)}
            >
              <Popup>
                <div className="text-right" dir="rtl">
                  <h3 className="font-bold mb-2">
                    {call.call_number || `#${call.id?.slice(-6)}`}
                  </h3>
                  <div className="space-y-1 text-sm mb-3">
                    <StatusBadge status={call.call_status} size="sm" />
                    <p>👤 {call.customer_name}</p>
                    <p>
                      📞 <a href={`tel:${call.customer_phone}`} className="text-[#0078D4]">
                        {call.customer_phone}
                      </a>
                    </p>
                    {call.assigned_vendor_name && (
                      <p className="text-[#2E7D32] font-medium">
                        🚛 {call.assigned_vendor_name}
                      </p>
                    )}
                  </div>
                  <Link to={createPageUrl(`CaseDetails?id=${call.id}`)}>
                    <Button size="sm" className="w-full">
                      פרטים מלאים
                    </Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}