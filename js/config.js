/* ═══════════════ CONFIG & DEFAULTS ═══════════════ */

export const MODES = {
  bus:    { icon: 'bus',   r: 1000,  min: 200,  max: 10000, step: 100  },
  train:  { icon: 'train', r: 2000,  min: 200,  max: 10000, step: 100  },
  flight: { icon: 'plane', r: 15000, min: 5000, max: 50000, step: 1000 }
};

/* Routing profiles per travel mode (null = no routing, straight-line) */
export const ROUTE_PROFILES = {
  bus: 'driving',
  train: 'driving',
  flight: null
};

export const DEFAULTS = {
  mode: 'bus',
  name: '',
  lat: null,
  lng: null,
  radius: 1000,
  alarm: 2,
  preAlertEnabled: true,
  preAlertTimeSecs: 300,      // 5 minutes
  preAlertDistanceM: 1000,    // 1 km
  units: 'metric',            // 'metric' | 'imperial'
  routeEnabled: true,
  places: [],
  active: false
};

export const STORAGE_KEY = 'proxiwake.state.v1';

/* Speed / ETA tuning */
export const SPEED_EMA_ALPHA = 0.3;   // smoothing for speed estimate
export const MAX_SPEED_MS = 400;       // ignore absurd speeds (m/s)
export const MIN_MOVE_M = 3;           // minimum movement to update speed
export const FIX_MIN_DT = 0.5;         // seconds between fixes (lower bound)
export const FIX_MAX_DT = 30;          // seconds between fixes (upper bound -> reset)
export const MIN_SPEED_MS = 0.5;       // below this we treat as stopped

/* Pre-alert re-arm hysteresis */
export const PREALERT_REARM_BUFFER = 0.15; // 15% above threshold to re-arm

/* Trend (approaching / receding) detection */
export const TREND_MIN_MOVE = 5;        // metres beyond Accuracy-gate noise
export const TREND_NOISE_ACC = 0.6;     // fraction of accuracy treated as noise

/* Snooze */
export const SNOOZE_SECS = 120;         // 2 minutes

/* Routing (OSRM public demo server — keyless, low-volume usage) */
export const OSRM_URL = 'https://router.project-osrm.org';
export const ROUTE_REFRESH_MS = 20000;  // min wall-clock gap between route fetches
export const ROUTE_REFRESH_M = 150;     // min movement before a re-fetch is worthwhile

/* Saved places */
export const PLACES_MAX = 8;
export const PLACES_DEDUPE_M = 50;
