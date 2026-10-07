/* ═══════════════ MAP (Leaflet + OpenStreetMap) ═══════════════ */
import { S, on, setTarget } from './state.js';

let L = null;
let map = null;
let targetMarker = null;
let userMarker = null;
let radiusCircle = null;
let routeLine = null;
let hasRouteGeometry = false;
let ready = false;

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

function targetIcon() {
  return L.divIcon({ className: 'pw-marker pw-marker-target', iconSize: [22, 22], iconAnchor: [11, 11] });
}

const ARROW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 6 20l6-4 6 4-6-16z"/></svg>';

function userIcon(heading) {
  if (heading == null || isNaN(heading)) {
    return L.divIcon({ className: 'pw-marker pw-marker-user', iconSize: [16, 16], iconAnchor: [8, 8] });
  }
  return L.divIcon({
    className: 'pw-marker pw-marker-heading',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div class="pw-arrow" style="transform:rotate(${Math.round(heading)}deg)">${ARROW_SVG}</div>`
  });
}

export function initMap() {
  if (!window.L) { console.warn('Leaflet failed to load'); return; }
  L = window.L;
  L.Icon.Default.imagePath = 'vendor/leaflet/images/';

  const hasTarget = S.lat !== null && S.lng !== null;
  const center = hasTarget ? [S.lat, S.lng] : [20, 0];

  map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    worldCopyJump: true
  }).setView(center, hasTarget ? 13 : 2);
  window.__map = map;

  L.tileLayer(OSM_URL, {
    maxZoom: 19,
    minZoom: 2,
    attribution: OSM_ATTR,
    crossOrigin: true
  }).addTo(map);

  map.on('click', e => {
    if (S.active) return; // don't move the target while tracking
    setTarget(e.latlng.lat, e.latlng.lng, 'Dropped pin');
  });

  if (hasTarget) drawTarget(false);
  ready = true;
  setTimeout(() => map.invalidateSize(), 200);

  on('target', () => { clearRouteLine(); drawTarget(true); });
  on('radius', () => drawCircle());
  on('mode', () => drawCircle());
}

/* ── routed polyline from OSRM ── */
export function setRoutePolyline(latlngs) {
  if (!ready || !latlngs || latlngs.length < 2) return false;
  if (!routeLine) {
    routeLine = L.polyline(latlngs, {
      color: '#10B981',
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
  } else {
    routeLine.setLatLngs(latlngs);
    routeLine.setStyle({ dashArray: null, opacity: 0.85, weight: 4 });
  }
  routeLine.bringToBack();
  hasRouteGeometry = true;
  return true;
}

export function clearRouteLine() {
  if (!ready) return;
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  hasRouteGeometry = false;
}

function drawTarget(fly) {
  if (!ready) return;
  if (S.lat === null || S.lng === null) {
    if (targetMarker) { map.removeLayer(targetMarker); targetMarker = null; }
    if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
    return;
  }

  const ll = [S.lat, S.lng];
  if (!targetMarker) {
    targetMarker = L.marker(ll, { draggable: true, icon: targetIcon() }).addTo(map);
    targetMarker.on('dragend', () => {
      const p = targetMarker.getLatLng();
      setTarget(p.lat, p.lng, 'Dropped pin');
    });
  } else {
    targetMarker.setLatLng(ll);
  }

  drawCircle();
  if (fly) map.flyTo(ll, Math.max(map.getZoom(), 13), { duration: 0.6 });
}

function drawCircle() {
  if (!ready || S.lat === null || S.lng === null) return;
  const ll = [S.lat, S.lng];
  if (!radiusCircle) {
    radiusCircle = L.circle(ll, {
      radius: S.radius,
      color: '#10B981',
      weight: 1.5,
      fillColor: '#10B981',
      fillOpacity: 0.08
    }).addTo(map);
  } else {
    radiusCircle.setLatLng(ll);
    radiusCircle.setRadius(S.radius);
  }
}

/* Live user position (heading in degrees, or null) */
export function updateUser(lat, lng, heading) {
  if (!ready) return;
  const ll = [lat, lng];
  const ic = userIcon(heading);
  if (!userMarker) {
    userMarker = L.marker(ll, { icon: ic, interactive: false }).addTo(map);
  } else {
    userMarker.setLatLng(ll);
    userMarker.setIcon(ic);
  }
  updateLine(lat, lng);
}

function updateLine(lat, lng) {
  if (!ready || S.lat === null || hasRouteGeometry) return; // routed line wins
  const pts = [[lat, lng], [S.lat, S.lng]];
  if (!routeLine) {
    routeLine = L.polyline(pts, { color: '#10B981', weight: 1.5, dashArray: '4 6', opacity: 0.6 }).addTo(map);
  } else {
    routeLine.setLatLngs(pts);
  }
}

export function clearUser() {
  if (!ready) return;
  if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
}

/* Center on the live user */
export function centerOnUser(lat, lng) {
  if (!ready) return;
  map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
}

/* Frame BOTH the live user and the destination on screen (navigation feel). */
export function fitBoth(animate = false) {
  if (!ready) return;
  const target = (S.lat !== null && S.lng !== null) ? [S.lat, S.lng] : null;
  const user = (S.lastFix && S.lastFix.lat != null) ? [S.lastFix.lat, S.lastFix.lng] : null;
  const pts = [target, user].filter(Boolean);
  if (!pts.length) return;
  if (pts.length === 2) {
    map.fitBounds(L.latLngBounds(pts), {
      paddingTopLeft: [36, 64],
      paddingBottomRight: [36, 260],
      maxZoom: 16,
      animate
    });
  } else if (!S.active) {
    map.setView(pts[0], 13);
  }
}
