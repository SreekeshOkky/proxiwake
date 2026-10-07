/* ═══════════════ UTILITIES ═══════════════ */

export const $ = id => document.getElementById(id);

export function haversine(a1, o1, a2, o2) {
  const R = 6371000;
  const r = d => d * Math.PI / 180;
  const dA = r(a2 - a1), dO = r(o2 - o1);
  const x = Math.sin(dA / 2) ** 2 +
    Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function fmt(m) {
  if (m == null || isNaN(m)) return '—';
  return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
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
