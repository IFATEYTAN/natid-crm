import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

function createVendorIcon(status) {
  const colors = {
    available: '#22c55e',
    busy: '#f97316',
    offline: '#6b7280',
    on_break: '#eab308',
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
    popupAnchor: [0, -18],
  });
}

function FitBounds({ vendors }) {
  const map = useMap();
  React.useEffect(() => {
    if (vendors.length > 0) {
      const valid = vendors.filter((v) => v.current_latitude && v.current_longitude);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map((v) => [v.current_latitude, v.current_longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [vendors, map]);
  return null;
}

export default function VendorTrackingLeafletMap({ vendors = [], onSelectVendor }) {
  const defaultCenter = [31.7683, 35.2137];

  return (
    <MapContainer
      key="vendor-tracking-map"
      center={defaultCenter}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      ref={(map) => {
        if (map) {
          window._vendorTrackingMap = map;
        }
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds vendors={vendors} />

      {vendors.map((vendor) => (
        <Marker
          key={vendor.id}
          position={[vendor.current_latitude, vendor.current_longitude]}
          icon={createVendorIcon(vendor.availability_status)}
          eventHandlers={{ click: () => onSelectVendor && onSelectVendor(vendor.id) }}
        >
          <Popup>
            <div className="text-right min-w-[200px]" dir="rtl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{vendor.vendor_name}</span>
                <Badge className={cn('text-xs', availabilityColors[vendor.availability_status])}>
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
                {!vendor.current_latitude && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>אין מיקום עדכני</span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
