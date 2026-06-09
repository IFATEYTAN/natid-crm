import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const vendorIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const callIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

export default function VendorMobileMap({ vendorProfile, activeCalls }) {
  const [myLocation, setMyLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    locateMe();
  }, []);

  // Use vendor's stored location or current GPS
  const vendorLat = myLocation?.lat || vendorProfile?.current_latitude || 32.08;
  const vendorLng = myLocation?.lng || vendorProfile?.current_longitude || 34.78;

  const callMarkers = (activeCalls || [])
    .filter((c) => c.pickup_location_lat && c.pickup_location_lon)
    .map((c) => ({
      id: c.id,
      lat: c.pickup_location_lat,
      lng: c.pickup_location_lon,
      label: c.vehicle_plate || c.call_number,
      address: c.pickup_location_address,
      customer: c.customer_name,
      status: c.call_status,
    }));

  const allPositions = [[vendorLat, vendorLng], ...callMarkers.map((m) => [m.lat, m.lng])];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold text-gray-900">מפה</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={locateMe}
          disabled={isLocating}
          className="gap-1 rounded-xl"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          מיקום שלי
        </Button>
      </div>

      <div
        className="rounded-xl overflow-hidden border border-gray-200"
        style={{ height: 'calc(100vh - 12rem)' }}
      >
        <MapContainer
          center={[vendorLat, vendorLng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          <FitBounds positions={allPositions} />

          {/* Vendor location */}
          <Marker position={[vendorLat, vendorLng]} icon={vendorIcon}>
            <Popup>
              <div className="text-center font-medium">
                {vendorProfile?.vendor_name || 'המיקום שלי'}
              </div>
            </Popup>
          </Marker>

          {/* Active call markers */}
          {callMarkers.map((m) => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={callIcon}>
              <Popup>
                <div className="space-y-1 text-sm" dir="rtl">
                  <div className="font-bold">{m.label}</div>
                  <div>{m.customer}</div>
                  <div className="text-gray-500 text-xs">{m.address}</div>
                  <a
                    href={`https://waze.com/ul?ll=${m.lat},${m.lng}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-xs underline block mt-1"
                  >
                    נווט ב-Waze
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {callMarkers.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center text-gray-400 text-sm">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
            אין קריאות פעילות עם מיקום להצגה
          </CardContent>
        </Card>
      )}
    </div>
  );
}
