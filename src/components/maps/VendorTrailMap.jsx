import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import {
  Route,
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  Navigation,
  Target
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom vendor icon
const createVendorIcon = (isCurrentPosition = false, heading = 0) => {
  const size = isCurrentPosition ? 44 : 28;
  const bgColor = isCurrentPosition ? '#0D47A1' : '#42A5F5';

  return L.divIcon({
    className: 'vendor-trail-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${bgColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
        transform: rotate(${heading}deg);
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          ${isCurrentPosition
            ? '<rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'
            : '<circle cx="12" cy="12" r="4" fill="white"/>'
          }
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Trail point icon (small dot)
const trailPointIcon = L.divIcon({
  className: 'trail-point',
  html: `<div style="width: 8px; height: 8px; background: #1976D2; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4]
});

// Speed color gradient
const getSpeedColor = (speed) => {
  if (!speed || speed < 10) return '#9E9E9E'; // Gray - stationary
  if (speed < 30) return '#4CAF50'; // Green - slow
  if (speed < 60) return '#2196F3'; // Blue - moderate
  if (speed < 90) return '#FF9800'; // Orange - fast
  return '#F44336'; // Red - very fast
};

// Map bounds controller
function MapBoundsController({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
}

export default function VendorTrailMap({ vendorId, vendorName, showLast = 50 }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [showTrailPoints, setShowTrailPoints] = useState(true);

  // Fetch vendor location history
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['vendorLocations', vendorId],
    queryFn: async () => {
      const result = await base44.entities.VendorLocation.filter(
        { vendor_id: vendorId },
        '-created_date',
        showLast
      );
      // Return in chronological order
      return result.reverse();
    },
    enabled: !!vendorId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Calculate trail statistics
  const stats = useMemo(() => {
    if (locations.length < 2) return null;

    let totalDistance = 0;
    let maxSpeed = 0;
    let avgSpeed = 0;
    let movingTime = 0;

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];

      // Calculate distance between points (Haversine)
      const R = 6371; // Earth's radius in km
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;

      // Track max speed
      if (curr.speed > maxSpeed) maxSpeed = curr.speed;
      avgSpeed += curr.speed || 0;

      // Calculate time difference
      const timeDiff = differenceInMinutes(
        parseISO(curr.created_date),
        parseISO(prev.created_date)
      );
      if (timeDiff < 30) movingTime += timeDiff; // Ignore gaps > 30 min
    }

    return {
      totalDistance: totalDistance.toFixed(1),
      maxSpeed: Math.round(maxSpeed),
      avgSpeed: Math.round(avgSpeed / (locations.length - 1)),
      movingTime,
      pointCount: locations.length
    };
  }, [locations]);

  // Create trail path with gradient colors based on speed
  const trailSegments = useMemo(() => {
    if (locations.length < 2) return [];

    const segments = [];
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      segments.push({
        positions: [[prev.latitude, prev.longitude], [curr.latitude, curr.longitude]],
        color: getSpeedColor(curr.speed),
        speed: curr.speed
      });
    }
    return segments;
  }, [locations]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || locations.length === 0) return;

    const interval = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= locations.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500); // 500ms per point

    return () => clearInterval(interval);
  }, [isPlaying, locations.length]);

  const currentPosition = locations[playbackIndex] || locations[locations.length - 1];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>אין היסטוריית מיקום זמינה</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-5 h-5 text-[#0D47A1]" />
            מסלול נסיעה - {vendorName || 'ספק'}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTrailPoints(!showTrailPoints)}
          >
            <Target className={`w-4 h-4 ${showTrailPoints ? 'text-blue-600' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 p-3 rounded-lg text-center"
            >
              <Navigation className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-bold text-gray-900">{stats.totalDistance}</div>
              <div className="text-xs text-gray-500">ק"מ סה"כ</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-green-50 p-3 rounded-lg text-center"
            >
              <Gauge className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-bold text-gray-900">{stats.avgSpeed}</div>
              <div className="text-xs text-gray-500">ממוצע קמ"ש</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-amber-50 p-3 rounded-lg text-center"
            >
              <Gauge className="w-4 h-4 mx-auto mb-1 text-amber-600" />
              <div className="text-lg font-bold text-gray-900">{stats.maxSpeed}</div>
              <div className="text-xs text-gray-500">מקסימום</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-purple-50 p-3 rounded-lg text-center"
            >
              <Clock className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <div className="text-lg font-bold text-gray-900">{stats.movingTime}</div>
              <div className="text-xs text-gray-500">דקות נסיעה</div>
            </motion.div>
          </div>
        )}

        {/* Map */}
        <div className="h-[350px] rounded-xl overflow-hidden border border-gray-200 relative">
          <MapContainer
            center={[currentPosition?.latitude || 31.7683, currentPosition?.longitude || 35.2137]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Trail segments with speed-based colors */}
            {trailSegments.map((segment, idx) => (
              <Polyline
                key={idx}
                positions={segment.positions}
                color={segment.color}
                weight={4}
                opacity={0.8}
              />
            ))}

            {/* Trail points */}
            {showTrailPoints && locations.slice(0, -1).map((loc, idx) => (
              <Marker
                key={idx}
                position={[loc.latitude, loc.longitude]}
                icon={trailPointIcon}
              >
                <Popup>
                  <div className="text-center text-xs">
                    <div className="font-medium">
                      {format(parseISO(loc.created_date), 'HH:mm:ss')}
                    </div>
                    {loc.speed > 0 && (
                      <div className="text-gray-500">{Math.round(loc.speed)} קמ"ש</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Current position marker */}
            {currentPosition && (
              <>
                <Marker
                  position={[currentPosition.latitude, currentPosition.longitude]}
                  icon={createVendorIcon(true, currentPosition.heading || 0)}
                >
                  <Popup>
                    <div className="text-center p-2">
                      <div className="font-bold text-blue-600 mb-1">
                        {vendorName || 'ספק'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(parseISO(currentPosition.created_date), 'HH:mm:ss')}
                      </div>
                      {currentPosition.speed > 0 && (
                        <div className="text-sm mt-1">
                          <Gauge className="w-3 h-3 inline mr-1" />
                          {Math.round(currentPosition.speed)} קמ"ש
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Accuracy circle */}
                {currentPosition.accuracy && currentPosition.accuracy < 100 && (
                  <Circle
                    center={[currentPosition.latitude, currentPosition.longitude]}
                    radius={currentPosition.accuracy}
                    pathOptions={{
                      color: '#0D47A1',
                      fillColor: '#0D47A1',
                      fillOpacity: 0.1,
                      weight: 1
                    }}
                  />
                )}
              </>
            )}

            <MapBoundsController positions={locations} />
          </MapContainer>

          {/* Speed legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 z-[1000]">
            <div className="text-xs font-medium mb-1">מהירות</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>0</span>
              <span>90+</span>
            </div>
          </div>
        </div>

        {/* Playback controls */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPlaybackIndex(0)}
                disabled={playbackIndex === 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant={isPlaying ? "default" : "outline"}
                size="icon"
                className={`h-8 w-8 ${isPlaying ? 'bg-blue-600' : ''}`}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPlaybackIndex(locations.length - 1)}
                disabled={playbackIndex === locations.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {currentPosition && (
                <span>{format(parseISO(currentPosition.created_date), 'HH:mm:ss')}</span>
              )}
            </div>

            <div className="text-sm text-gray-500">
              {playbackIndex + 1} / {locations.length}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={locations.length - 1}
              value={playbackIndex}
              onChange={(e) => setPlaybackIndex(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
