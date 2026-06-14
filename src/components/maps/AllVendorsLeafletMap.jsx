import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Truck, Phone, Star, Eye, MapPin } from 'lucide-react';
import LocationFreshnessBadge from './LocationFreshnessBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  TILE_URL,
  TILE_ATTRIBUTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  createColorIcon,
} from './mapUtils';
import { vendorServiceTypeLabels, availabilityLabels } from '@/config/labels';

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

export default function AllVendorsLeafletMap({
  vendorsWithLocation = [],
  mapCenter = DEFAULT_CENTER,
}) {
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
      key="all-vendors-map"
      center={mapCenter}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      {vendorsWithLocation.map((vendor) => (
        <Marker
          key={vendor.id}
          position={[vendor.current_latitude, vendor.current_longitude]}
          icon={createColorIcon(availabilityColors[vendor.availability_status] || 'blue')}
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
                    className={cn('text-xs', availabilityBadgeColors[vendor.availability_status])}
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
                    {vendor.service_type.map((t) => vendorServiceTypeLabels[t] || t).join(', ')}
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
                {vendor.current_latitude && vendor.current_longitude && (
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <span dir="ltr" className="text-blue-600 font-mono">
                      {vendor.current_latitude.toFixed(5)}, {vendor.current_longitude.toFixed(5)}
                    </span>
                  </div>
                )}
                <div className="pt-0.5">
                  <LocationFreshnessBadge lastUpdate={vendor.last_location_update} />
                </div>
              </div>
              {vendor.current_latitude && vendor.current_longitude && (
                <div className="flex items-center gap-2 mb-3 pt-2 border-t border-gray-100">
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
              <Link to={createPageUrl(`VendorDetails?id=${vendor.id}`)}>
                <Button size="sm" className="w-full gap-2 bg-[#3b82f6] hover:bg-[#2563eb]">
                  <Eye className="w-3 h-3" />
                  צפה בפרטים
                </Button>
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
