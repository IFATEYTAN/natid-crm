import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  TILE_URL,
  TILE_ATTRIBUTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  createVendorDivIcon,
} from './mapUtils';

const availabilityLabels = {
  available: 'זמין',
  busy: 'עסוק',
  offline: 'לא מחובר',
  on_break: 'בהפסקה',
};

const availabilityBadgeColors = {
  available: 'bg-green-100 text-green-800',
  busy: 'bg-orange-100 text-orange-800',
  offline: 'bg-gray-100 text-gray-800',
  on_break: 'bg-yellow-100 text-yellow-800',
};

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
  const mapRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <MapContainer
      key="vendor-tracking-map"
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <FitBounds vendors={vendors} />

      {vendors.filter(v => v.current_latitude != null && v.current_longitude != null).map((vendor) => (
        <Marker
          key={vendor.id}
          position={[vendor.current_latitude, vendor.current_longitude]}
          icon={createVendorDivIcon(vendor.availability_status)}
          eventHandlers={{ click: () => onSelectVendor && onSelectVendor(vendor.id) }}
        >
          <Popup>
            <div className="text-right min-w-[200px]" dir="rtl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{vendor.vendor_name}</span>
                <Badge
                  className={cn('text-xs', availabilityBadgeColors[vendor.availability_status])}
                >
                  {availabilityLabels[vendor.availability_status]}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-[#6B778C]">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span dir="ltr">{vendor.phone}</span>
                </div>
                {vendor.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate" title={vendor.address}>{vendor.address}</span>
                  </div>
                )}
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
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span className="text-red-500">אין מיקום עדכני</span>
                  </div>
                )}
              </div>
              {vendor.current_latitude && vendor.current_longitude && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                  <a
                    href={`https://waze.com/ul?ll=${vendor.current_latitude},${vendor.current_longitude}&navigate=yes`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    Waze
                  </a>
                  <a
                    href={`https://maps.google.com/?q=${vendor.current_latitude},${vendor.current_longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-1.5 bg-gray-50 text-gray-700 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
                  >
                    Google Maps
                  </a>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}