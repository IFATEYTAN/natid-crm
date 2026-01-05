import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Navigation,
  MapPin,
  Truck,
  Clock,
  Route,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  CornerDownRight,
  CornerDownLeft,
  ArrowUp,
  Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom vendor icon (blue truck)
const vendorIcon = L.divIcon({
  className: 'vendor-marker',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #0D47A1, #1565C0);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Custom call icon (red location pin)
const callIcon = L.divIcon({
  className: 'call-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #D32F2F, #F44336);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">
      <div style="transform: rotate(45deg); color: white; font-weight: bold;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3" fill="#D32F2F"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42]
});

// Map tile layers
const tileLayers = {
  default: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    name: "רגיל",
    attribution: '&copy; OpenStreetMap'
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    name: "לוויין",
    attribution: '&copy; Esri'
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    name: "טופוגרפי",
    attribution: '&copy; OpenTopoMap'
  }
};

// Direction icon mapping
const getDirectionIcon = (instruction) => {
  if (!instruction) return ArrowUp;
  const lower = instruction.toLowerCase();
  if (lower.includes('right') || lower.includes('ימינה')) return ArrowRight;
  if (lower.includes('left') || lower.includes('שמאלה')) return ArrowLeft;
  if (lower.includes('sharp right')) return CornerDownRight;
  if (lower.includes('sharp left')) return CornerDownLeft;
  return ArrowUp;
};

// Translate OSRM instruction to Hebrew
const translateInstruction = (instruction) => {
  if (!instruction) return 'המשך ישר';
  return instruction
    .replace(/Turn right/gi, 'פנה ימינה')
    .replace(/Turn left/gi, 'פנה שמאלה')
    .replace(/Continue/gi, 'המשך')
    .replace(/Head/gi, 'התחל לנסוע')
    .replace(/Arrive/gi, 'הגעת ליעד')
    .replace(/north/gi, 'צפונה')
    .replace(/south/gi, 'דרומה')
    .replace(/east/gi, 'מזרחה')
    .replace(/west/gi, 'מערבה')
    .replace(/straight/gi, 'ישר')
    .replace(/onto/gi, 'אל')
    .replace(/Roundabout/gi, 'כיכר')
    .replace(/exit/gi, 'יציאה')
    .replace(/Keep/gi, 'הישאר')
    .replace(/Merge/gi, 'התמזג')
    .replace(/on/gi, 'ב');
};

// Map controller component
function MapController({ vendorPos, callPos, route }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (vendorPos && callPos) {
      const bounds = L.latLngBounds([vendorPos, callPos]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [vendorPos, callPos, route, map]);

  return null;
}

// Animated route component
function AnimatedRoute({ route, isLoading }) {
  if (isLoading) {
    return (
      <Polyline
        positions={route}
        color="#9E9E9E"
        weight={4}
        opacity={0.5}
        dashArray="10, 10"
      />
    );
  }

  return (
    <>
      {/* Route shadow */}
      <Polyline
        positions={route}
        color="#000000"
        weight={8}
        opacity={0.2}
      />
      {/* Main route */}
      <Polyline
        positions={route}
        color="#0D47A1"
        weight={5}
        opacity={0.9}
      />
      {/* Animated overlay */}
      <Polyline
        positions={route}
        color="#42A5F5"
        weight={3}
        opacity={0.8}
        dashArray="15, 20"
        className="animated-route"
      />
    </>
  );
}

export default function NavigationMap({
  vendorLocation,
  callLocation,
  distance: initialDistance,
  duration: initialDuration,
  onNavigate
}) {
  const [route, setRoute] = useState([]);
  const [routeDistance, setRouteDistance] = useState(initialDistance);
  const [routeDuration, setRouteDuration] = useState(initialDuration);
  const [directions, setDirections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [tileLayer, setTileLayer] = useState('default');
  const [error, setError] = useState(null);

  // Fetch route from OSRM (Open Source Routing Machine)
  const fetchRoute = useCallback(async () => {
    if (!vendorLocation || !callLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      // OSRM API for routing (free, no API key needed)
      const url = `https://router.project-osrm.org/route/v1/driving/${vendorLocation.lon},${vendorLocation.lat};${callLocation.lon},${callLocation.lat}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const routeData = data.routes[0];

        // Extract coordinates for the route polyline
        const coordinates = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(coordinates);

        // Extract distance and duration
        const distanceKm = (routeData.distance / 1000).toFixed(1);
        const durationMin = Math.round(routeData.duration / 60);
        setRouteDistance(distanceKm);
        setRouteDuration(durationMin);

        // Extract turn-by-turn directions
        if (routeData.legs && routeData.legs[0] && routeData.legs[0].steps) {
          const steps = routeData.legs[0].steps.map((step, index) => ({
            id: index,
            instruction: step.maneuver.instruction || 'המשך',
            distance: step.distance,
            duration: step.duration,
            name: step.name || ''
          }));
          setDirections(steps);
        }
      } else {
        throw new Error('לא ניתן לחשב מסלול');
      }
    } catch (err) {
      console.error('Route fetch error:', err);
      setError('שגיאה בחישוב המסלול');
      // Fallback to straight line
      setRoute([
        [vendorLocation.lat, vendorLocation.lon],
        [callLocation.lat, callLocation.lon]
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorLocation, callLocation]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

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
    <Card className="overflow-hidden">
      <style>{`
        .animated-route {
          animation: dash 20s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .vendor-marker, .call-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-5 h-5 text-[#0D47A1]" />
            מסלול נסיעה
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Layer selector */}
            <div className="relative group">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Layers className="w-4 h-4" />
              </Button>
              <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
                {Object.entries(tileLayers).map(([key, layer]) => (
                  <button
                    key={key}
                    onClick={() => setTileLayer(key)}
                    className={`w-full px-3 py-2 text-right text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      tileLayer === key ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {layer.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh route */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={fetchRoute}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Navigate button */}
            <Button
              onClick={onNavigate}
              className="bg-[#0D47A1] hover:bg-[#1565C0] gap-2"
              size="sm"
            >
              <Navigation className="w-4 h-4" />
              נווט ב-Waze
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200"
          >
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-xs font-medium">מרחק נסיעה</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <>{routeDistance || '-'} <span className="text-sm font-normal">ק"מ</span></>
              )}
            </div>
            {error && (
              <div className="text-xs text-amber-600 mt-1">קו אווירי</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200"
          >
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">זמן הגעה משוער</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <>{routeDuration || '-'} <span className="text-sm font-normal">דקות</span></>
              )}
            </div>
          </motion.div>
        </div>

        {/* Map */}
        <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-inner relative">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <TileLayer
              attribution={tileLayers[tileLayer].attribution}
              url={tileLayers[tileLayer].url}
            />

            {/* Vendor Marker with pulse animation */}
            <Marker position={[vendorLocation.lat, vendorLocation.lon]} icon={vendorIcon}>
              <Popup>
                <div className="text-center p-2">
                  <div className="font-bold text-blue-600 mb-1">המיקום שלך</div>
                  <div className="text-xs text-gray-500">
                    {vendorLocation.lat.toFixed(5)}, {vendorLocation.lon.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Pulse effect at vendor location */}
            <CircleMarker
              center={[vendorLocation.lat, vendorLocation.lon]}
              radius={20}
              pathOptions={{
                color: '#0D47A1',
                fillColor: '#0D47A1',
                fillOpacity: 0.2,
                weight: 2
              }}
            />

            {/* Call Location Marker */}
            <Marker position={[callLocation.lat, callLocation.lon]} icon={callIcon}>
              <Popup>
                <div className="text-center p-2">
                  <div className="font-bold text-red-600 mb-1">מיקום הקריאה</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {callLocation.lat.toFixed(5)}, {callLocation.lon.toFixed(5)}
                  </div>
                  {callLocation.address && (
                    <div className="text-sm">{callLocation.address}</div>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Route Line */}
            {route.length > 0 && (
              <AnimatedRoute route={route} isLoading={isLoading} />
            )}

            <MapController
              vendorPos={[vendorLocation.lat, vendorLocation.lon]}
              callPos={[callLocation.lat, callLocation.lon]}
              route={route}
            />
          </MapContainer>

          {/* Loading overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/50 flex items-center justify-center z-10"
              >
                <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm">מחשב מסלול...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Turn-by-turn directions */}
        {directions.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowDirections(!showDirections)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-700">
                <Map className="w-4 h-4" />
                <span className="font-medium">הנחיות נסיעה</span>
                <span className="text-xs text-gray-500">({directions.length} צעדים)</span>
              </div>
              {showDirections ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {showDirections && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-[200px] overflow-y-auto border-t border-gray-200">
                    {directions.map((step, index) => {
                      const Icon = getDirectionIcon(step.instruction);
                      const isLast = index === directions.length - 1;
                      return (
                        <div
                          key={step.id}
                          className={`flex items-start gap-3 px-4 py-3 ${
                            !isLast ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isLast ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-700">
                              {translateInstruction(step.instruction)}
                            </div>
                            {step.name && (
                              <div className="text-xs text-gray-500 truncate">
                                {step.name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 text-left flex-shrink-0">
                            {step.distance > 1000
                              ? `${(step.distance / 1000).toFixed(1)} ק"מ`
                              : `${Math.round(step.distance)} מ'`
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Destination address */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">יעד: </span>
            {callLocation.address || `${callLocation.lat.toFixed(4)}, ${callLocation.lon.toFixed(4)}`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
