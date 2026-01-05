import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import {
  Route,
  Clock,
  MapPin,
  Navigation,
  Play,
  RotateCcw,
  GripVertical,
  Trash2,
  Plus,
  Truck,
  Flag,
  CheckCircle2
} from 'lucide-react';
import { calculateOptimalRoute, calculateDistanceMatrix } from '@/services/distanceMatrix';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create numbered marker icon
const createNumberedIcon = (number, color = '#0D47A1', isStart = false, isEnd = false) => {
  let bgColor = color;
  let symbol = number;

  if (isStart) {
    bgColor = '#4CAF50';
    symbol = '🚛';
  } else if (isEnd) {
    bgColor = '#F44336';
    symbol = '🏁';
  }

  return L.divIcon({
    className: 'numbered-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${bgColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${isStart || isEnd ? '16px' : '14px'};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Map bounds controller
function MapBoundsController({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points && points.length > 0) {
      const validPoints = points.filter(p => p.latitude && p.longitude);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints.map(p => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [points, map]);

  return null;
}

export default function MultiStopRouteOptimizer({
  startLocation,
  stops: initialStops = [],
  endLocation = null,
  returnToStart = true,
  onRouteCalculated,
  editable = true
}) {
  const [stops, setStops] = useState(initialStops);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Effective end location
  const effectiveEnd = endLocation || (returnToStart ? startLocation : null);

  // Calculate route when stops change
  useEffect(() => {
    if (stops.length > 0 && startLocation) {
      calculateRoute();
    }
  }, []);

  // Calculate optimized route
  const calculateRoute = async () => {
    if (!startLocation || stops.length === 0) return;

    setIsOptimizing(true);

    try {
      const result = await calculateOptimalRoute(startLocation, stops, effectiveEnd);
      setOptimizedRoute(result);

      // Update stops order based on optimization
      if (result.route.length > 0) {
        setStops(result.route);
      }

      // Fetch actual route polyline
      await fetchRoutePolyline(startLocation, result.route, effectiveEnd);

      onRouteCalculated?.(result);
    } catch (error) {
      console.error('Route optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Fetch route polyline from OSRM
  const fetchRoutePolyline = async (start, waypoints, end) => {
    const allPoints = [start, ...waypoints];
    if (end) allPoints.push(end);

    const coords = allPoints.map(p => `${p.longitude},${p.latitude}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
        const coordinates = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        setRoutePolyline(coordinates);
      }
    } catch (error) {
      console.error('Failed to fetch route polyline:', error);
      // Fallback to straight lines
      const coordinates = allPoints.map(p => [p.latitude, p.longitude]);
      setRoutePolyline(coordinates);
    }
  };

  // Handle drag and drop reordering
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStops = [...stops];
    const [draggedItem] = newStops.splice(draggedIndex, 1);
    newStops.splice(index, 0, draggedItem);

    setStops(newStops);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    // Recalculate route with new order (without optimization)
    recalculateWithCurrentOrder();
  };

  // Recalculate distances with current order
  const recalculateWithCurrentOrder = async () => {
    if (!startLocation || stops.length === 0) return;

    setIsOptimizing(true);

    try {
      const allPoints = [startLocation, ...stops];
      if (effectiveEnd) allPoints.push(effectiveEnd);

      let totalDistance = 0;
      let totalDuration = 0;
      const updatedStops = [];

      for (let i = 1; i < allPoints.length; i++) {
        const matrix = await calculateDistanceMatrix([allPoints[i - 1]], [allPoints[i]]);
        if (matrix[0]) {
          totalDistance += matrix[0].distance;
          totalDuration += matrix[0].duration;

          if (i <= stops.length) {
            updatedStops.push({
              ...stops[i - 1],
              distanceFromPrevious: matrix[0].distance,
              durationFromPrevious: matrix[0].duration
            });
          }
        }
      }

      setStops(updatedStops);
      setOptimizedRoute({
        route: updatedStops,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalDuration: Math.round(totalDuration)
      });

      await fetchRoutePolyline(startLocation, updatedStops, effectiveEnd);
    } catch (error) {
      console.error('Recalculation error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Remove a stop
  const removeStop = (index) => {
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
    if (newStops.length > 0) {
      recalculateWithCurrentOrder();
    } else {
      setOptimizedRoute(null);
      setRoutePolyline([]);
    }
  };

  // All points for map
  const allMapPoints = useMemo(() => {
    const points = [];
    if (startLocation) points.push({ ...startLocation, isStart: true });
    points.push(...stops.map((s, i) => ({ ...s, order: i + 1 })));
    if (effectiveEnd && effectiveEnd !== startLocation) {
      points.push({ ...effectiveEnd, isEnd: true });
    }
    return points;
  }, [startLocation, stops, effectiveEnd]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-5 h-5 text-[#0D47A1]" />
            אופטימיזציית מסלול
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={calculateRoute}
              disabled={isOptimizing || stops.length === 0}
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
              מטב מסלול
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Route summary */}
        {optimizedRoute && (
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 p-3 rounded-lg text-center"
            >
              <MapPin className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <div className="text-xl font-bold text-gray-900">{stops.length}</div>
              <div className="text-xs text-gray-500">עצירות</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-green-50 p-3 rounded-lg text-center"
            >
              <Navigation className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <div className="text-xl font-bold text-gray-900">{optimizedRoute.totalDistance}</div>
              <div className="text-xs text-gray-500">ק"מ</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-amber-50 p-3 rounded-lg text-center"
            >
              <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
              <div className="text-xl font-bold text-gray-900">{optimizedRoute.totalDuration}</div>
              <div className="text-xs text-gray-500">דקות</div>
            </motion.div>
          </div>
        )}

        {/* Map */}
        <div className="h-[300px] rounded-xl overflow-hidden border border-gray-200">
          <MapContainer
            center={startLocation ? [startLocation.latitude, startLocation.longitude] : [31.7683, 35.2137]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Route polyline */}
            {routePolyline.length > 0 && (
              <>
                <Polyline
                  positions={routePolyline}
                  color="#000000"
                  weight={6}
                  opacity={0.2}
                />
                <Polyline
                  positions={routePolyline}
                  color="#0D47A1"
                  weight={4}
                  opacity={0.8}
                />
              </>
            )}

            {/* Start marker */}
            {startLocation && (
              <Marker
                position={[startLocation.latitude, startLocation.longitude]}
                icon={createNumberedIcon(1, '#4CAF50', true, false)}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-green-600">נקודת התחלה</div>
                    <div className="text-sm text-gray-500">
                      {startLocation.name || startLocation.address || 'מיקום התחלה'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Stop markers */}
            {stops.map((stop, index) => (
              <Marker
                key={stop.id || index}
                position={[stop.latitude, stop.longitude]}
                icon={createNumberedIcon(index + 1)}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">עצירה {index + 1}</div>
                    <div className="text-sm text-gray-500">
                      {stop.name || stop.address || `קריאה #${stop.call_number || ''}`}
                    </div>
                    {stop.distanceFromPrevious && (
                      <div className="text-xs text-gray-400 mt-1">
                        {stop.distanceFromPrevious.toFixed(1)} ק"מ | {stop.durationFromPrevious} דק'
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* End marker (if different from start) */}
            {effectiveEnd && effectiveEnd !== startLocation && (
              <Marker
                position={[effectiveEnd.latitude, effectiveEnd.longitude]}
                icon={createNumberedIcon(stops.length + 1, '#F44336', false, true)}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-red-600">יעד סופי</div>
                    <div className="text-sm text-gray-500">
                      {effectiveEnd.name || effectiveEnd.address || 'מיקום סיום'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            <MapBoundsController points={allMapPoints} />
          </MapContainer>
        </div>

        {/* Stops list (draggable) */}
        {editable && stops.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              גרור לשינוי סדר העצירות
            </div>

            <div className="space-y-2">
              {/* Start point (not draggable) */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-green-700">התחלה</div>
                  <div className="text-sm text-green-600">
                    {startLocation?.name || startLocation?.address || 'מיקום נוכחי'}
                  </div>
                </div>
              </div>

              {/* Stops */}
              {stops.map((stop, index) => (
                <motion.div
                  key={stop.id || index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-white rounded-lg border cursor-move transition-colors ${
                    draggedIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  layout
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {stop.name || stop.address || `קריאה #${stop.call_number || index + 1}`}
                    </div>
                    {stop.distanceFromPrevious && (
                      <div className="text-xs text-gray-500">
                        {stop.distanceFromPrevious.toFixed(1)} ק"מ • {stop.durationFromPrevious} דקות מהעצירה הקודמת
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                    onClick={() => removeStop(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}

              {/* End point */}
              {effectiveEnd && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-red-700">
                      {returnToStart && effectiveEnd === startLocation ? 'חזרה להתחלה' : 'סיום'}
                    </div>
                    <div className="text-sm text-red-600">
                      {effectiveEnd.name || effectiveEnd.address || 'מיקום סיום'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigate button */}
        {optimizedRoute && stops.length > 0 && (
          <Button
            className="w-full bg-[#0D47A1] hover:bg-[#1565C0]"
            onClick={() => {
              // Open in Waze/Google Maps with waypoints
              const waypoints = stops.map(s => `${s.latitude},${s.longitude}`).join('/');
              const wazeUrl = `https://waze.com/ul?ll=${stops[0].latitude},${stops[0].longitude}&navigate=yes`;
              window.open(wazeUrl, '_blank');
            }}
          >
            <Navigation className="w-4 h-4 mr-2" />
            התחל ניווט
          </Button>
        )}

        {/* Empty state */}
        {stops.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Route className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>אין עצירות במסלול</p>
            <p className="text-sm">הוסף קריאות כדי לתכנן מסלול</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
