import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Navigation, Clock } from 'lucide-react';
import { format } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const vendorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to auto-fit bounds
function FitBounds({ positions }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  
  return null;
}

export default function VendorLiveMap({ 
  vendorId, 
  callId,
  pickupLat, 
  pickupLon, 
  dropoffLat, 
  dropoffLon,
  showHistory = false,
  height = "400px"
}) {
  const [vendorPosition, setVendorPosition] = useState(null);

  // Fetch vendor's current location
  const { data: vendor } = useQuery({
    queryKey: ['vendorLocation', vendorId],
    queryFn: async () => {
      const vendors = await base44.entities.Vendor.filter({ id: vendorId });
      return vendors[0];
    },
    enabled: !!vendorId,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch location history for this call
  const { data: locationHistory = [] } = useQuery({
    queryKey: ['vendorLocationHistory', callId],
    queryFn: async () => {
      if (!callId) return [];
      return await base44.entities.VendorLocation.filter(
        { call_id: callId },
        'created_date',
        100
      );
    },
    enabled: !!callId && showHistory,
    refetchInterval: 30000
  });

  useEffect(() => {
    if (vendor?.current_latitude && vendor?.current_longitude) {
      setVendorPosition([vendor.current_latitude, vendor.current_longitude]);
    }
  }, [vendor]);

  // Check if vendor has location sharing enabled
  if (vendor && vendor.is_location_sharing_enabled === false) {
    return (
      <Card className="bg-white">
        <CardContent className="py-8 text-center text-[#6B778C]">
          <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>הספק לא אישר שיתוף מיקום</p>
        </CardContent>
      </Card>
    );
  }

  // Default center (Israel)
  const defaultCenter = [31.7683, 35.2137];
  
  // Calculate center based on available positions
  let center = defaultCenter;
  if (vendorPosition) {
    center = vendorPosition;
  } else if (pickupLat && pickupLon) {
    center = [pickupLat, pickupLon];
  }

  // Build positions for bounds fitting
  const allPositions = [];
  if (vendorPosition) allPositions.push(vendorPosition);
  if (pickupLat && pickupLon) allPositions.push([pickupLat, pickupLon]);
  if (dropoffLat && dropoffLon) allPositions.push([dropoffLat, dropoffLon]);

  // Build path from history
  const historyPath = locationHistory.map(loc => [loc.latitude, loc.longitude]);

  return (
    <Card className="bg-white overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#6B778C]" />
          מיקום ספק בזמן אמת
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height, width: '100%' }}>
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {allPositions.length > 0 && <FitBounds positions={allPositions} />}

            {/* Vendor marker */}
            {vendorPosition && (
              <Marker position={vendorPosition} icon={vendorIcon}>
                <Popup>
                  <div className="text-center" dir="rtl">
                    <Truck className="w-6 h-6 mx-auto mb-1 text-green-600" />
                    <strong>{vendor?.vendor_name}</strong>
                    {vendor?.last_location_update && (
                      <p className="text-xs text-gray-500 mt-1">
                        עודכן: {format(new Date(vendor.last_location_update), 'HH:mm:ss')}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Pickup marker */}
            {pickupLat && pickupLon && (
              <Marker position={[pickupLat, pickupLon]} icon={pickupIcon}>
                <Popup>
                  <div className="text-center" dir="rtl">
                    <MapPin className="w-6 h-6 mx-auto mb-1 text-red-600" />
                    <strong>נקודת איסוף</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Dropoff marker */}
            {dropoffLat && dropoffLon && (
              <Marker position={[dropoffLat, dropoffLon]} icon={dropoffIcon}>
                <Popup>
                  <div className="text-center" dir="rtl">
                    <MapPin className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                    <strong>נקודת יעד</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* History path */}
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

        {/* Legend */}
        <div className="p-3 border-t border-[#DFE1E6] flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>ספק</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>איסוף</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>יעד</span>
          </div>
          {vendor?.last_location_update && (
            <div className="flex items-center gap-1 mr-auto text-[#6B778C]">
              <Clock className="w-3 h-3" />
              <span>עדכון אחרון: {format(new Date(vendor.last_location_update), 'HH:mm:ss')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}