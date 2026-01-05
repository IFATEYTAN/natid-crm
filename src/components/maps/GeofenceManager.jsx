import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Circle as CircleIcon,
  Pentagon,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { haversineDistance } from '@/services/distanceMatrix';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Zone types
export const ZoneTypes = {
  SERVICE_AREA: 'service_area',
  RESTRICTED: 'restricted',
  PRIORITY: 'priority',
  VENDOR_COVERAGE: 'vendor_coverage'
};

// Zone colors
const zoneColors = {
  [ZoneTypes.SERVICE_AREA]: { fill: '#4CAF50', stroke: '#2E7D32' },
  [ZoneTypes.RESTRICTED]: { fill: '#F44336', stroke: '#C62828' },
  [ZoneTypes.PRIORITY]: { fill: '#FF9800', stroke: '#EF6C00' },
  [ZoneTypes.VENDOR_COVERAGE]: { fill: '#2196F3', stroke: '#1565C0' }
};

// Zone type labels
const zoneLabels = {
  [ZoneTypes.SERVICE_AREA]: 'אזור שירות',
  [ZoneTypes.RESTRICTED]: 'אזור מוגבל',
  [ZoneTypes.PRIORITY]: 'אזור עדיפות',
  [ZoneTypes.VENDOR_COVERAGE]: 'כיסוי ספק'
};

// Check if a point is inside a circle zone
export function isPointInCircle(point, center, radiusKm) {
  const distance = haversineDistance(
    point.latitude, point.longitude,
    center.latitude, center.longitude
  );
  return distance <= radiusKm;
}

// Check if a point is inside a polygon zone
export function isPointInPolygon(point, polygonPoints) {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const xi = polygonPoints[i].longitude;
    const yi = polygonPoints[i].latitude;
    const xj = polygonPoints[j].longitude;
    const yj = polygonPoints[j].latitude;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

// Check which zones a point is in
export function getZonesForPoint(point, zones) {
  return zones.filter(zone => {
    if (zone.shape === 'circle') {
      return isPointInCircle(point, zone.center, zone.radius);
    } else if (zone.shape === 'polygon') {
      return isPointInPolygon(point, zone.points);
    }
    return false;
  });
}

// Map click handler component
function MapClickHandler({ onMapClick, isDrawing }) {
  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      }
    }
  });
  return null;
}

// Center marker component
const centerIcon = L.divIcon({
  className: 'zone-center',
  html: `<div style="width: 16px; height: 16px; background: white; border: 3px solid #0D47A1; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export default function GeofenceManager({
  zones: initialZones = [],
  onZonesChange,
  selectedZoneId,
  onZoneSelect,
  checkPoint = null,
  readOnly = false
}) {
  const [zones, setZones] = useState(initialZones);
  const [editingZone, setEditingZone] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingShape, setDrawingShape] = useState('circle');
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState(ZoneTypes.SERVICE_AREA);
  const [newZoneRadius, setNewZoneRadius] = useState(10);
  const [visibleZones, setVisibleZones] = useState(new Set(initialZones.map(z => z.id)));
  const [pointZones, setPointZones] = useState([]);

  // Update zones when initial zones change
  useEffect(() => {
    setZones(initialZones);
    setVisibleZones(new Set(initialZones.map(z => z.id)));
  }, [initialZones]);

  // Check which zones the point is in
  useEffect(() => {
    if (checkPoint) {
      const matchingZones = getZonesForPoint(checkPoint, zones);
      setPointZones(matchingZones);
    }
  }, [checkPoint, zones]);

  // Handle map click during drawing
  const handleMapClick = useCallback((point) => {
    if (drawingShape === 'circle') {
      // For circle, first click sets center
      setDrawingPoints([point]);
      setIsDrawing(false);
    } else if (drawingShape === 'polygon') {
      setDrawingPoints(prev => [...prev, point]);
    }
  }, [drawingShape]);

  // Start drawing a new zone
  const startDrawing = (shape) => {
    setIsDrawing(true);
    setDrawingShape(shape);
    setDrawingPoints([]);
  };

  // Finish drawing polygon
  const finishPolygon = () => {
    if (drawingPoints.length < 3) {
      alert('צריך לפחות 3 נקודות ליצירת אזור');
      return;
    }
    setIsDrawing(false);
  };

  // Save new zone
  const saveNewZone = () => {
    if (!newZoneName.trim()) {
      alert('נא להזין שם לאזור');
      return;
    }

    let newZone;

    if (drawingShape === 'circle' && drawingPoints.length === 1) {
      newZone = {
        id: `zone-${Date.now()}`,
        name: newZoneName,
        type: newZoneType,
        shape: 'circle',
        center: drawingPoints[0],
        radius: newZoneRadius
      };
    } else if (drawingShape === 'polygon' && drawingPoints.length >= 3) {
      newZone = {
        id: `zone-${Date.now()}`,
        name: newZoneName,
        type: newZoneType,
        shape: 'polygon',
        points: drawingPoints
      };
    } else {
      return;
    }

    const updatedZones = [...zones, newZone];
    setZones(updatedZones);
    setVisibleZones(prev => new Set([...prev, newZone.id]));
    onZonesChange?.(updatedZones);

    // Reset drawing state
    setDrawingPoints([]);
    setNewZoneName('');
    setNewZoneRadius(10);
  };

  // Cancel drawing
  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    setNewZoneName('');
  };

  // Delete zone
  const deleteZone = (zoneId) => {
    const updatedZones = zones.filter(z => z.id !== zoneId);
    setZones(updatedZones);
    onZonesChange?.(updatedZones);
  };

  // Toggle zone visibility
  const toggleZoneVisibility = (zoneId) => {
    setVisibleZones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });
  };

  // Get zone color
  const getZoneColor = (zone) => {
    return zoneColors[zone.type] || zoneColors[ZoneTypes.SERVICE_AREA];
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#0D47A1]" />
            ניהול אזורי שירות
          </CardTitle>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startDrawing('circle')}
                disabled={isDrawing}
              >
                <CircleIcon className="w-4 h-4 mr-2" />
                עיגול
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startDrawing('polygon')}
                disabled={isDrawing}
              >
                <Pentagon className="w-4 h-4 mr-2" />
                מצולע
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Point check result */}
        {checkPoint && (
          <div className={`p-3 rounded-lg border ${
            pointZones.length > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-2">
              {pointZones.length > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              )}
              <div>
                <div className="font-medium">
                  {pointZones.length > 0 ? 'הנקודה באזור שירות' : 'הנקודה מחוץ לאזורי שירות'}
                </div>
                {pointZones.length > 0 && (
                  <div className="text-sm text-gray-600">
                    אזורים: {pointZones.map(z => z.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drawing mode */}
        <AnimatePresence>
          {(isDrawing || drawingPoints.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-blue-800">
                  {isDrawing
                    ? drawingShape === 'circle'
                      ? 'לחץ על המפה לבחירת מרכז העיגול'
                      : `ציור מצולע (${drawingPoints.length} נקודות)`
                    : 'הגדרות אזור חדש'
                  }
                </div>
                <Button variant="ghost" size="icon" onClick={cancelDrawing}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {drawingPoints.length > 0 && (
                <div className="space-y-3">
                  <Input
                    placeholder="שם האזור"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                  />

                  <select
                    value={newZoneType}
                    onChange={(e) => setNewZoneType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(zoneLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  {drawingShape === 'circle' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">רדיוס:</span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={newZoneRadius}
                        onChange={(e) => setNewZoneRadius(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">ק"מ</span>
                    </div>
                  )}

                  {drawingShape === 'polygon' && isDrawing && (
                    <Button
                      variant="outline"
                      onClick={finishPolygon}
                      disabled={drawingPoints.length < 3}
                    >
                      סיים ציור ({drawingPoints.length}/3+)
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={cancelDrawing} className="flex-1">
                      ביטול
                    </Button>
                    <Button
                      onClick={saveNewZone}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={!newZoneName.trim()}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      שמור
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map */}
        <div className="h-[350px] rounded-xl overflow-hidden border border-gray-200">
          <MapContainer
            center={[31.7683, 35.2137]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onMapClick={handleMapClick} isDrawing={isDrawing} />

            {/* Render zones */}
            {zones.map(zone => {
              if (!visibleZones.has(zone.id)) return null;

              const color = getZoneColor(zone);
              const isSelected = zone.id === selectedZoneId;

              if (zone.shape === 'circle') {
                return (
                  <React.Fragment key={zone.id}>
                    <Circle
                      center={[zone.center.latitude, zone.center.longitude]}
                      radius={zone.radius * 1000} // Convert km to meters
                      pathOptions={{
                        color: color.stroke,
                        fillColor: color.fill,
                        fillOpacity: isSelected ? 0.4 : 0.2,
                        weight: isSelected ? 3 : 2
                      }}
                      eventHandlers={{
                        click: () => onZoneSelect?.(zone.id)
                      }}
                    >
                      <Popup>
                        <div className="text-center">
                          <div className="font-bold">{zone.name}</div>
                          <div className="text-sm text-gray-500">{zoneLabels[zone.type]}</div>
                          <div className="text-xs text-gray-400">רדיוס: {zone.radius} ק"מ</div>
                        </div>
                      </Popup>
                    </Circle>
                    <Marker
                      position={[zone.center.latitude, zone.center.longitude]}
                      icon={centerIcon}
                    />
                  </React.Fragment>
                );
              } else if (zone.shape === 'polygon') {
                return (
                  <Polygon
                    key={zone.id}
                    positions={zone.points.map(p => [p.latitude, p.longitude])}
                    pathOptions={{
                      color: color.stroke,
                      fillColor: color.fill,
                      fillOpacity: isSelected ? 0.4 : 0.2,
                      weight: isSelected ? 3 : 2
                    }}
                    eventHandlers={{
                      click: () => onZoneSelect?.(zone.id)
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <div className="font-bold">{zone.name}</div>
                        <div className="text-sm text-gray-500">{zoneLabels[zone.type]}</div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }
              return null;
            })}

            {/* Drawing preview */}
            {drawingPoints.length > 0 && (
              <>
                {drawingShape === 'circle' && (
                  <Circle
                    center={[drawingPoints[0].latitude, drawingPoints[0].longitude]}
                    radius={newZoneRadius * 1000}
                    pathOptions={{
                      color: '#0D47A1',
                      fillColor: '#0D47A1',
                      fillOpacity: 0.2,
                      weight: 2,
                      dashArray: '5, 5'
                    }}
                  />
                )}
                {drawingShape === 'polygon' && drawingPoints.length >= 2 && (
                  <Polygon
                    positions={drawingPoints.map(p => [p.latitude, p.longitude])}
                    pathOptions={{
                      color: '#0D47A1',
                      fillColor: '#0D47A1',
                      fillOpacity: 0.2,
                      weight: 2,
                      dashArray: '5, 5'
                    }}
                  />
                )}
                {drawingPoints.map((point, index) => (
                  <Marker
                    key={index}
                    position={[point.latitude, point.longitude]}
                    icon={centerIcon}
                  />
                ))}
              </>
            )}

            {/* Check point marker */}
            {checkPoint && (
              <Marker
                position={[checkPoint.latitude, checkPoint.longitude]}
                icon={L.divIcon({
                  className: 'check-point',
                  html: `<div style="width: 20px; height: 20px; background: #9C27B0; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold">נקודת בדיקה</div>
                    <div className="text-xs text-gray-500">
                      {checkPoint.latitude.toFixed(5)}, {checkPoint.longitude.toFixed(5)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Zones list */}
        {zones.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">אזורים מוגדרים</div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {zones.map(zone => {
                const color = getZoneColor(zone);
                const isVisible = visibleZones.has(zone.id);
                const isSelected = zone.id === selectedZoneId;

                return (
                  <div
                    key={zone.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onZoneSelect?.(zone.id)}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color.fill, border: `2px solid ${color.stroke}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{zone.name}</div>
                      <div className="text-xs text-gray-500">
                        {zoneLabels[zone.type]}
                        {zone.shape === 'circle' && ` • ${zone.radius} ק"מ`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleZoneVisibility(zone.id);
                        }}
                      >
                        {isVisible ? (
                          <Eye className="w-4 h-4 text-gray-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-300" />
                        )}
                      </Button>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('למחוק את האזור?')) {
                              deleteZone(zone.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {zones.length === 0 && !isDrawing && (
          <div className="text-center py-6 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>אין אזורי שירות מוגדרים</p>
            {!readOnly && (
              <p className="text-sm">לחץ על "עיגול" או "מצולע" להגדרת אזור חדש</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for geofence checking
export function useGeofence(zones) {
  const checkPoint = useCallback((point) => {
    return getZonesForPoint(point, zones);
  }, [zones]);

  const isInServiceArea = useCallback((point) => {
    const matchingZones = getZonesForPoint(point, zones);
    return matchingZones.some(z => z.type === ZoneTypes.SERVICE_AREA || z.type === ZoneTypes.VENDOR_COVERAGE);
  }, [zones]);

  const isInRestrictedArea = useCallback((point) => {
    const matchingZones = getZonesForPoint(point, zones);
    return matchingZones.some(z => z.type === ZoneTypes.RESTRICTED);
  }, [zones]);

  const isInPriorityArea = useCallback((point) => {
    const matchingZones = getZonesForPoint(point, zones);
    return matchingZones.some(z => z.type === ZoneTypes.PRIORITY);
  }, [zones]);

  return {
    checkPoint,
    isInServiceArea,
    isInRestrictedArea,
    isInPriorityArea,
    getZonesForPoint: (point) => getZonesForPoint(point, zones)
  };
}
