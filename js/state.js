/* ═══════════════ STATE (single source of truth) ═══════════════ */
import { DEFAULTS, STORAGE_KEY, MODES } from './config.js';

export const S = {
  /* setup */
  mode: DEFAULTS.mode,
  name: DEFAULTS.name,
  lat: DEFAULTS.lat,
  lng: DEFAULTS.lng,
  radius: DEFAULTS.radius,
  alarm: DEFAULTS.alarm,
  preAlertEnabled: DEFAULTS.preAlertEnabled,
  preAlertTimeSecs: DEFAULTS.preAlertTimeSecs,
  preAlertDistanceM: DEFAULTS.preAlertDistanceM,
  /* runtime */
  active: false,
  triggered: false,
  locked: false,
  autoLock: true,
  watchId: null,
  wakeLock: null,
  startTime: null,
  audioCtx: null,
  intervals: [],
  alarmIntervals: [],
  initDist: null,
  distance: null,
  /* eta */
  speed: null,
  lastFix: null,
  lastAccuracy: null,
  etaAlarm: null,
  etaDest: null,
  etaAt: null,
  preAlertFired: false
};

/* ── tiny pub/sub ── */
const listeners = {};
export function on(evt, cb) {
  (listeners[evt] ||= []).push(cb);
  return () => {
    listeners[evt] = (listeners[evt] || []).filter(fn => fn !== cb);
  };
}
function emit(evt, payload) {
  (listeners[evt] || []).forEach(cb => {
    try { cb(payload); } catch (err) { console.error('[state]', evt, err); }
  });
}

/* ── mutations ── */
export function setTarget(lat, lng, name) {
  S.lat = lat;
  S.lng = lng;
  if (name !== undefined) S.name = name;
  saveState();
  emit('target');
}

export function setRadius(r) {
  S.radius = r;
  saveState();
  emit('radius');
}

export function setMode(m) {
  if (!MODES[m]) return;
  S.mode = m;
  S.radius = MODES[m].r;
  saveState();
  emit('mode', m);
  emit('radius');
}

export function setAlarm(level) {
  S.alarm = level;
  saveState();
  emit('alarm', level);
}

export function setPreAlert(cfg) {
  Object.assign(S, cfg);
  saveState();
  emit('prealert', cfg);
}

export function setActive(v) {
  S.active = v;
  emit('active', v);
}

/* ── persistence ── */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: S.mode,
      name: S.name,
      lat: S.lat,
      lng: S.lng,
      radius: S.radius,
      alarm: S.alarm,
      preAlertEnabled: S.preAlertEnabled,
      preAlertTimeSecs: S.preAlertTimeSecs,
      preAlertDistanceM: S.preAlertDistanceM,
      autoLock: S.autoLock
    }));
  } catch (e) { /* storage unavailable */ }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') Object.assign(S, data);
  } catch (e) { /* ignore corrupt state */ }
}
