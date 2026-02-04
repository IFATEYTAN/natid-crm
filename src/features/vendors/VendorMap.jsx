import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { MapPin, Navigation, Eye, RefreshCw, X, Menu } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'כבה בנסיעה',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'סוללה ריקה',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר',
};

// Custom marker icons by status
const createMarkerIcon = (status) => {
  const colors = {
    awaiting_assignment: '#ED6C02',
    assigning: '#0288D1',
    vendor_enroute: '#2E7D32',
    in_progress: '#FDD835',
  };

  const color = colors[status] || '#616161';

  return L.divIcon({
    className: 'custom-marker',
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

export default function VendorMap() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]); // Jerusalem default

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const currentVendor = vendors.find((v) => v.email === user?.email);

  const {
    data: allCalls = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['vendorMapCalls', currentVendor?.id],
    queryFn: () => base44.entities.Call.list('-created_date', 200),
    enabled: !!currentVendor,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Filter active calls for this vendor
  const activeCalls = allCalls.filter(
    (c) =>
      c.assigned_vendor_id === currentVendor?.id &&
      !['completed', 'cancelled'].includes(c.call_status) &&
      c.pickup_location_lat &&
      c.pickup_location_lon
  );

  const openNavigation = (address) => {
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(wazeUrl, '_blank');
  };

  if (!currentVendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#616161]">לא נמצא ספק מקושר</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 flex" dir="rtl">
      {/* Sidebar */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-[#E0E0E0] 
          shadow-lg z-[1000] transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[#E0E0E0]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-[#0078D4]">🚛 הקריאות שלי</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-[#616161]">{activeCalls.length} פעילות</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 gap-2"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4" />
              רענן
            </Button>
          </div>

          {/* Calls List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeCalls.length === 0 ? (
              <div className="text-center text-[#616161] mt-8">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-[#9E9E9E]" />
                <p>אין קריאות פעילות</p>
              </div>
            ) : (
              activeCalls.map((call) => (
                <div
                  key={call.id}
                  className="bg-[#FAFAFA] rounded-lg p-3 border border-[#E0E0E0] hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-[#0078D4]">
                      {call.call_number || `#${call.id?.slice(-6)}`}
                    </span>
                    <StatusBadge status={call.call_status} size="sm" />
                  </div>

                  <div className="space-y-1 text-sm mb-3">
                    <p className="font-medium">{call.customer_name}</p>
                    <p className="text-[#616161]">{call.pickup_location_city}</p>
                    <p className="text-[#616161]">
                      {issueTypeLabels[call.issue_type] || call.issue_type}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link to={createPageUrl(`CallDetailsVendor?id=${call.id}`)} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <Eye className="w-3 h-3" />
                        פרטים
                      </Button>
                    </Link>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 gap-1 bg-[#0078D4]"
                      onClick={() => openNavigation(call.pickup_location_address)}
                    >
                      <Navigation className="w-3 h-3" />
                      נווט
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
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

          {activeCalls.map((call) => (
            <Marker
              key={call.id}
              position={[call.pickup_location_lat, call.pickup_location_lon]}
              icon={createMarkerIcon(call.call_status)}
            >
              <Popup>
                <div className="text-right" dir="rtl">
                  <h3 className="font-bold mb-2">{call.call_number || `#${call.id?.slice(-6)}`}</h3>
                  <div className="space-y-1 text-sm mb-3">
                    <p>👤 {call.customer_name}</p>
                    <p>
                      📞{' '}
                      <a href={`tel:${call.customer_phone}`} className="text-[#0078D4]">
                        {call.customer_phone}
                      </a>
                    </p>
                    <p>🚗 {call.vehicle_plate || '-'}</p>
                    <p>🔧 {issueTypeLabels[call.issue_type] || call.issue_type}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => openNavigation(call.pickup_location_address)}
                    >
                      נווט ב-Waze
                    </Button>
                    <Link to={createPageUrl(`CallDetailsVendor?id=${call.id}`)}>
                      <Button size="sm" variant="outline">
                        פרטים
                      </Button>
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
