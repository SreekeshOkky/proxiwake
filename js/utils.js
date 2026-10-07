/* ═══════════════ UTILITIES ═══════════════ */

export const $ = id => document.getElementById(id);

/* ── units ── */
let UNITS = 'metric';
export function setUnits(u) { UNITS = (u === 'imperial') ? 'imperial' : 'metric'; }
export function getUnits() { return UNITS; }

const M_PER_MI = 1609.344;
const FT_PER_M = 3.28084;

export function haversine(a1, o1, a2, o2) {
  const R = 6371000;
  const r = d => d * Math.PI / 180;
  const dA = r(a2 - a1), dO = r(o2 - o1);
  const x = Math.sin(dA / 2) ** 2 +
    Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* Initial bearing (degrees 0-360) from point 1 to point 2 */
export function bearing(a1, o1, a2, o2) {
  const r = d => d * Math.PI / 180;
  const p1 = r(a1), p2 = r(a2), dL = r(o2 - o1);
  const y = Math.sin(dL) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dL);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function fmt(m) {
  if (m == null || isNaN(m)) return '—';
  if (UNITS === 'imperial') {
    const mi = m / M_PER_MI;
    if (mi >= 0.1) return (mi < 10 ? mi.toFixed(1) : Math.round(mi)) + ' mi';
    return Math.round(m * FT_PER_M) + ' ft';
  }
  return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
}

export function fmtSpeed(mps) {
  if (mps == null || isNaN(mps) || mps < 0) return '—';
  return UNITS === 'imperial'
    ? (mps * 2.236936).toFixed(0) + ' mph'
    : (mps * 3.6).toFixed(0) + ' km/h';
}

export function fmtDuration(secs) {
  if (secs == null || isNaN(secs)) return '—';
  let s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${m}:${String(ss).padStart(2, '0')}`;
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
