import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Navigation, Clock, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vendor icon
const vendorIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Pickup location icon
const pickupIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Dropoff location icon
const dropoffIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to fit map bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

export default function VendorLiveMap({
  callId,
  vendorId,
  pickupLocation,
  dropoffLocation,
  showHistory = false,
  height = '400px',
}) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch vendor's current location
  const { data: vendor, refetch: refetchVendor } = useQuery({
    queryKey: ['vendor-location', vendorId],
    queryFn: async () => {
      if (!vendorId) return null;
      const vendors = await base44.entities.Vendor.filter({ id: vendorId });
      return vendors[0] || null;
    },
    enabled: !!vendorId,
    refetchInterval: autoRefresh ? 10000 : false, // Refresh every 10 seconds
  });

  // Fetch location history for this call
  const { data: locationHistory = [] } = useQuery({
    queryKey: ['vendor-location-history', callId],
    queryFn: async () => {
      if (!callId) return [];
      return await base44.entities.VendorLocation.filter({ call_id: callId }, 'created_date', 500);
    },
    enabled: !!callId && showHistory,
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // Calculate map center and bounds
  const getMapBounds = () => {
    const points = [];

    if (vendor?.current_latitude && vendor?.current_longitude) {
      points.push([vendor.current_latitude, vendor.current_longitude]);
    }

    if (pickupLocation?.lat && pickupLocation?.lng) {
      points.push([pickupLocation.lat, pickupLocation.lng]);
    }

    if (dropoffLocation?.lat && dropoffLocation?.lng) {
      points.push([dropoffLocation.lat, dropoffLocation.lng]);
    }

    if (showHistory && locationHistory.length > 0) {
      locationHistory.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
          points.push([loc.latitude, loc.longitude]);
        }
      });
    }

    return points;
  };

  const bounds = getMapBounds();
  const defaultCenter = bounds.length > 0 ? bounds[0] : [32.0853, 34.7818]; // Tel Aviv default

  // Create polyline from location history
  const historyPath = locationHistory
    .filter((loc) => loc.latitude && loc.longitude)
    .map((loc) => [loc.latitude, loc.longitude]);

  const hasVendorLocation = vendor?.current_latitude && vendor?.current_longitude;
  const isLocationSharingEnabled = vendor?.is_location_sharing_enabled;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            מעקב מיקום ספק
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={autoRefresh ? 'text-green-600 border-green-200 bg-green-50' : ''}
            >
              {autoRefresh ? 'עדכון אוטומטי' : 'מושהה'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                refetchVendor();
                setAutoRefresh(!autoRefresh);
              }}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isLocationSharingEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3 text-sm text-yellow-800">
            ⚠️ הספק לא הפעיל שיתוף מיקום
          </div>
        )}

        {isLocationSharingEnabled && !hasVendorLocation && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3 text-sm text-gray-600">
            ממתין לעדכון מיקום מהספק...
          </div>
        )}

        <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-200">
          <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {bounds.length > 1 && <FitBounds bounds={bounds} />}

            {/* Vendor current location */}
            {hasVendorLocation && (
              <Marker
                position={[vendor.current_latitude, vendor.current_longitude]}
                icon={vendorIcon}
              >
                <Popup>
                  <div className="text-right" dir="rtl">
                    <strong className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      {vendor.vendor_name}
                    </strong>
                    {vendor.last_location_update && (
                      <p className="text-xs text-gray-500 mt-1">
                        <Clock className="w-3 h-3 inline ml-1" />
                        עדכון: {format(new Date(vendor.last_location_update), 'HH:mm:ss')}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Pickup location */}
            {pickupLocation?.lat && pickupLocation?.lng && (
              <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <strong className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-red-500" />
                      מיקום איסוף
                    </strong>
                    <p className="text-sm mt-1">{pickupLocation.address}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Dropoff location */}
            {dropoffLocation?.lat && dropoffLocation?.lng && (
              <Marker position={[dropoffLocation.lat, dropoffLocation.lng]} icon={dropoffIcon}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <strong className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-green-500" />
                      יעד
                    </strong>
                    <p className="text-sm mt-1">{dropoffLocation.address}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Location history path */}
            {showHistory && historyPath.length > 1 && (
              <Polyline
                positions={historyPath}
                color="#3b82f6"
                weight={3}
                opacity={0.7}
                dashArray="5, 10"
              />
            )}
          </MapContainer>
        </div>

        {/* Location info */}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {hasVendorLocation && vendor.last_location_update && (
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4" />
              עדכון אחרון: {format(new Date(vendor.last_location_update), 'HH:mm:ss dd/MM')}
            </div>
          )}
          {showHistory && locationHistory.length > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <Navigation className="w-4 h-4" />
              {locationHistory.length} נקודות מיקום נשמרו
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
