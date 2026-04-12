import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import { issueTypeLabels } from '@/config/labels';
import { Map, Navigation, Loader2, Clock, MapPin, ExternalLink, LocateFixed } from 'lucide-react';

const ROUTE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&language=he&region=IL`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

export default function VendorActiveCallsGoogleMap({ vendorProfile, activeCalls }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routesRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [routeInfos, setRouteInfos] = useState({});
  const [selectedCallId, setSelectedCallId] = useState(null);

  const callsWithLocation = (activeCalls || []).filter(
    (c) => c.pickup_location_lat && c.pickup_location_lon
  );

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        if (vendorProfile?.current_latitude && vendorProfile?.current_longitude) {
          setMyLocation({
            lat: vendorProfile.current_latitude,
            lng: vendorProfile.current_longitude,
          });
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [vendorProfile]);

  const initMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getGoogleMapsKey', {});
      const apiKey = res.data?.apiKey;
      if (!apiKey) throw new Error('No API key');

      const maps = await loadGoogleMapsScript(apiKey);

      const center = myLocation || { lat: 32.08, lng: 34.78 };
      const map = new maps.Map(mapRef.current, {
        center,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapInstanceRef.current = map;
      infoWindowRef.current = new maps.InfoWindow();

      // Vendor marker
      if (myLocation) {
        new maps.Marker({
          position: myLocation,
          map,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
            scale: 10,
          },
          title: 'המיקום שלי',
          zIndex: 100,
        });
      }

      // Call markers + routes
      const directionsService = new maps.DirectionsService();
      const bounds = new maps.LatLngBounds();
      if (myLocation) bounds.extend(myLocation);

      const newRouteInfos = {};

      for (let i = 0; i < callsWithLocation.length; i++) {
        const call = callsWithLocation[i];
        const pos = { lat: call.pickup_location_lat, lng: call.pickup_location_lon };
        bounds.extend(pos);

        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

        // Custom marker
        const marker = new maps.Marker({
          position: pos,
          map,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
                <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 18 30 18 30s18-17.4 18-30C36 8.06 27.94 0 18 0z" fill="${color}"/>
                <circle cx="18" cy="18" r="10" fill="white"/>
                <text x="18" y="23" text-anchor="middle" font-size="13" font-weight="bold" fill="${color}">${i + 1}</text>
              </svg>`
            )}`,
            scaledSize: new maps.Size(36, 48),
            anchor: new maps.Point(18, 48),
          },
          title: call.call_number || `קריאה ${i + 1}`,
          zIndex: 50,
        });

        marker.addListener('click', () => {
          setSelectedCallId(call.id);
          const iw = infoWindowRef.current;
          iw.setContent(`
            <div dir="rtl" style="min-width:200px;font-family:Heebo,sans-serif;">
              <strong>${call.call_number || ''}</strong><br/>
              <span style="color:#6b7280">${call.customer_name || ''}</span><br/>
              <span style="font-size:12px">${call.pickup_location_address || ''}</span><br/>
              ${newRouteInfos[call.id] ? `<span style="color:#2563eb;font-size:12px">🚗 ${newRouteInfos[call.id].duration} | ${newRouteInfos[call.id].distance}</span><br/>` : ''}
              <div style="margin-top:6px;display:flex;gap:6px">
                <a href="https://waze.com/ul?ll=${pos.lat},${pos.lng}&navigate=yes" target="_blank"
                  style="background:#33ccff;color:white;padding:4px 10px;border-radius:6px;text-decoration:none;font-size:12px">Waze</a>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}&travelmode=driving" target="_blank"
                  style="background:#4285f4;color:white;padding:4px 10px;border-radius:6px;text-decoration:none;font-size:12px">Google</a>
              </div>
            </div>
          `);
          iw.open(map, marker);
        });

        markersRef.current.push(marker);

        // Route calculation
        if (myLocation) {
          try {
            const result = await new Promise((resolve, reject) => {
              directionsService.route(
                {
                  origin: myLocation,
                  destination: pos,
                  travelMode: maps.TravelMode.DRIVING,
                },
                (res, status) => {
                  if (status === 'OK') resolve(res);
                  else reject(status);
                }
              );
            });

            const leg = result.routes[0].legs[0];
            newRouteInfos[call.id] = {
              duration: leg.duration.text,
              distance: leg.distance.text,
              durationValue: leg.duration.value,
            };

            const renderer = new maps.DirectionsRenderer({
              map,
              directions: result,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: color,
                strokeWeight: 4,
                strokeOpacity: 0.7,
              },
            });
            routesRef.current.push(renderer);
          } catch {
            // Route calc failed — still show marker
          }
        }
      }

      setRouteInfos(newRouteInfos);

      if (callsWithLocation.length > 0 || myLocation) {
        map.fitBounds(bounds, { padding: { top: 50, right: 50, bottom: 50, left: 50 } });
      }

      setLoading(false);
    } catch (err) {
      console.error('Map init error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [myLocation, callsWithLocation.length]);

  useEffect(() => {
    if (mapRef.current) initMap();
    return () => {
      markersRef.current.forEach((m) => m.setMap && m.setMap(null));
      routesRef.current.forEach((r) => r.setMap && r.setMap(null));
      markersRef.current = [];
      routesRef.current = [];
    };
  }, [initMap]);

  const recenterMap = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(loc);
          mapInstanceRef.current.setZoom(13);
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  // Sort calls by route duration (fastest first)
  const sortedCalls = [...callsWithLocation].sort((a, b) => {
    const da = routeInfos[a.id]?.durationValue ?? Infinity;
    const db = routeInfos[b.id]?.durationValue ?? Infinity;
    return da - db;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-600" />
            מפת קריאות פעילות
            <Badge variant="outline" className="text-xs mr-2">
              {callsWithLocation.length} קריאות
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1" onClick={recenterMap}>
            <LocateFixed className="w-4 h-4" />
            <span className="hidden sm:inline">מרכז מיקום</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Map container */}
        <div className="relative" style={{ height: '400px' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-500">טוען מפה ומסלולים...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="text-center space-y-2">
                <MapPin className="w-8 h-8 text-red-400 mx-auto" />
                <p className="text-sm text-red-500">שגיאה בטעינת המפה</p>
                <Button size="sm" onClick={initMap}>
                  נסה שוב
                </Button>
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        </div>

        {/* Call list sorted by route duration */}
        {sortedCalls.length > 0 && (
          <div className="border-t divide-y max-h-[300px] overflow-y-auto">
            {sortedCalls.map((call, idx) => {
              const info = routeInfos[call.id];
              const color = ROUTE_COLORS[callsWithLocation.indexOf(call) % ROUTE_COLORS.length];
              return (
                <div
                  key={call.id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors ${selectedCallId === call.id ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    setSelectedCallId(call.id);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo({
                        lat: call.pickup_location_lat,
                        lng: call.pickup_location_lon,
                      });
                      mapInstanceRef.current.setZoom(14);
                    }
                  }}
                >
                  {/* Color indicator */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {idx + 1}
                  </div>

                  {/* Call info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{call.call_number}</span>
                      <StatusBadge status={call.call_status} />
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {call.customer_name} • {issueTypeLabels[call.issue_type] || call.issue_type}
                    </div>
                    <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {call.pickup_location_address}
                    </div>
                  </div>

                  {/* Route info */}
                  <div className="shrink-0 text-left space-y-1">
                    {info ? (
                      <>
                        <div className="flex items-center gap-1 text-sm font-semibold text-blue-700">
                          <Clock className="w-3.5 h-3.5" />
                          {info.duration}
                        </div>
                        <div className="text-xs text-gray-500">{info.distance}</div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">מחשב...</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <a
                      href={`https://waze.com/ul?ll=${call.pickup_location_lat},${call.pickup_location_lon}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        className="gap-1 h-7 text-xs bg-blue-600 hover:bg-blue-700 w-full"
                      >
                        <Navigation className="w-3 h-3" />
                        נווט
                      </Button>
                    </a>
                    <Link
                      to={createPageUrl(`VendorCallManagement?id=${call.id}`)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs w-full">
                        <ExternalLink className="w-3 h-3" />
                        נהל
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {callsWithLocation.length === 0 && !loading && (
          <div className="p-6 text-center text-gray-400">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">אין קריאות פעילות עם מיקום להצגה</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
