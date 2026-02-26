import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet + Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const DEFAULT_CENTER = [31.7683, 35.2137]; // Israel
export const DEFAULT_ZOOM = 8;

const SHADOW_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

export const createColorIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const availabilityColors = {
  available: '#22c55e',
  busy: '#f97316',
  offline: '#6b7280',
  on_break: '#eab308',
};

export const createVendorDivIcon = (status) => {
  const color = availabilityColors[status] || availabilityColors.offline;
  return L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
        <path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H12"/>
        <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};