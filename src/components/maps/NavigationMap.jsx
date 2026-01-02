import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin, Truck, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom icons
const vendorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const callIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapController({ vendorPos, callPos }) {
  const map = useMap();
  
  useEffect(() => {
    if (vendorPos && callPos) {
      const bounds = L.latLngBounds([vendorPos, callPos]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [vendorPos, callPos, map]);
  
  return null;
}

export default function NavigationMap({ 
  vendorLocation, 
  callLocation, 
  distance, 
  duration,
  onNavigate 
}) {
  const [route, setRoute] = useState([]);

  useEffect(() => {
    // Simple straight line route for now
    // In production, you'd fetch the actual route from Google Directions API
    if (vendorLocation && callLocation) {
      setRoute([
        [vendorLocation.lat, vendorLocation.lon],
        [callLocation.lat, callLocation.lon]
      ]);
    }
  }, [vendorLocation, callLocation]);

  if (!vendorLocation || !callLocation) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-[#616161]">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-[#9E9E9E]" />
          <p>אין נתוני מיקום זמינים</p>
        </CardContent>
      </Card>
    );
  }

  const center = [
    (vendorLocation.lat + callLocation.lat) / 2,
    (vendorLocation.lon + callLocation.lon) / 2
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#0078D4]" />
            מפת ניווט
          </CardTitle>
          <Button 
            onClick={onNavigate}
            className="bg-[#0078D4] hover:bg-[#1976D2] gap-2"
            size="sm"
          >
            <Navigation className="w-4 h-4" />
            נווט
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#E3F2FD] p-3 rounded-lg">
            <div className="flex items-center gap-2 text-[#0078D4] mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-xs font-medium">מרחק</span>
            </div>
            <div className="text-lg font-bold text-[#212121]">
              {distance ? `${distance} ק"מ` : '-'}
            </div>
          </div>
          <div className="bg-[#FFF4E5] p-3 rounded-lg">
            <div className="flex items-center gap-2 text-[#ED6C02] mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">זמן הגעה</span>
            </div>
            <div className="text-lg font-bold text-[#212121]">
              {duration ? `${duration} דק'` : '-'}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="h-[400px] rounded-lg overflow-hidden border border-[#E0E0E0]">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Vendor Marker */}
            <Marker position={[vendorLocation.lat, vendorLocation.lon]} icon={vendorIcon}>
              <Popup>
                <div className="text-center">
                  <strong>המיקום שלך</strong>
                  <br />
                  <span className="text-xs text-[#616161]">
                    {vendorLocation.lat.toFixed(4)}, {vendorLocation.lon.toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>

            {/* Call Location Marker */}
            <Marker position={[callLocation.lat, callLocation.lon]} icon={callIcon}>
              <Popup>
                <div className="text-center">
                  <strong>מיקום הקריאה</strong>
                  <br />
                  <span className="text-xs text-[#616161]">
                    {callLocation.lat.toFixed(4)}, {callLocation.lon.toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>

            {/* Route Line */}
            {route.length > 0 && (
              <Polyline positions={route} color="#0078D4" weight={3} opacity={0.7} />
            )}

            <MapController vendorPos={[vendorLocation.lat, vendorLocation.lon]} callPos={[callLocation.lat, callLocation.lon]} />
          </MapContainer>
        </div>

        {/* Address */}
        <div className="text-sm text-[#616161] bg-[#FAFAFA] p-3 rounded-lg">
          <strong>יעד:</strong> {callLocation.address || `${callLocation.lat.toFixed(4)}, ${callLocation.lon.toFixed(4)}`}
        </div>
      </CardContent>
    </Card>
  );
}