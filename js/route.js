/* ═══════════════ ROAD-AWARE ROUTING (OSRM) ═══════════════
 * Uses the keyless OSRM public demo server with aggressive throttling
 * and graceful fallback (returns null on any failure -> straight-line
 * haversine continues to drive the ETA).
 */
import { S } from './state.js';
import { haversine } from './utils.js';
import {
  OSRM_URL, ROUTE_REFRESH_MS, ROUTE_REFRESH_M, ROUTE_PROFILES
} from './config.js';

let fetching = false;
let lastFetchAt = 0;
let lastFrom = null;
let lastTo = null;
let lastResult = null;

export function routeProfile() {
  return ROUTE_PROFILES[S.mode] || null;
}

/*
 * maybeRefreshRoute(from, to) -> Promise<{distanceM, durationS, geometry}|null>
 * geometry: [[lat,lng], ...] ready for Leaflet; null unless a fresh route arrived.
 */
export async function maybeRefreshRoute(from, to) {
  if (!S.routeEnabled || !from || !to) return null;
  const profile = routeProfile();
  if (!profile) return null;

  const now = Date.now();
  if (fetching) return null;
  if (lastFetchAt && now - lastFetchAt < ROUTE_REFRESH_MS) return null;

  const targetChanged = !lastTo ||
    Math.abs(lastTo.lat - to.lat) > 1e-6 || Math.abs(lastTo.lng - to.lng) > 1e-6;
  const moved = lastFrom ? haversine(lastFrom.lat, lastFrom.lng, from.lat, from.lng) : Infinity;
  if (!targetChanged && moved < ROUTE_REFRESH_M) return null;

  lastFetchAt = now;
  fetching = true;
  try {
    const url = `${OSRM_URL}/route/v1/${profile}/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout && AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const r = data && data.routes && data.routes[0];
    if (!r || typeof r.distance !== 'number' || typeof r.duration !== 'number') return null;

    lastFrom = { lat: from.lat, lng: from.lng };
    lastTo = { lat: to.lat, lng: to.lng };
    lastResult = {
      distanceM: r.distance,
      durationS: r.duration,
      geometry: (r.geometry && r.geometry.coordinates || []).map(c => [c[1], c[0]])
    };
    return lastResult;
  } catch (e) {
    return null; // offline / blocked -> fallback stays active
  } finally {
    fetching = false;
  }
}

/* Invalidate cached route state (target moved, units change, mode change). */
export function resetRoute() {
  lastFrom = null;
  lastTo = null;
  lastResult = null;
  lastFetchAt = 0;
}
