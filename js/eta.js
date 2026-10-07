/* ═══════════════ ETA / SPEED ENGINE ═══════════════ */
import { S } from './state.js';
import { haversine } from './utils.js';
import {
  SPEED_EMA_ALPHA, MAX_SPEED_MS, MIN_MOVE_M,
  FIX_MIN_DT, FIX_MAX_DT, MIN_SPEED_MS, PREALERT_REARM_BUFFER,
  TREND_MIN_MOVE, TREND_NOISE_ACC
} from './config.js';
import { sendPreAlert } from './alarm.js';

/*
 * Update the smoothed speed estimate from a GPS fix.
 * fix = { lat, lng, t (ms), speed (m/s|null), accuracy (m|null) }
 */
export function updateMotion(fix) {
  const prev = S.lastFix;

  if (!prev) {
    /* first fix: only trust a reported speed */
    if (isValidSpeed(fix.speed)) S.speed = fix.speed;
    S.lastFix = { lat: fix.lat, lng: fix.lng, t: fix.t };
    return;
  }

  const dt = (fix.t - prev.t) / 1000;

  if (dt > FIX_MAX_DT) {
    /* long gap (tunnel / backgrounded) -> drop stale speed */
    S.speed = null;
    S.lastFix = { lat: fix.lat, lng: fix.lng, t: fix.t };
    return;
  }

  if (dt >= FIX_MIN_DT) {
    const dist = haversine(prev.lat, prev.lng, fix.lat, fix.lng);
    const noiseGate = Math.max(MIN_MOVE_M, (fix.accuracy || 0) * 0.5);

    if (dist >= noiseGate) {
      let inst = dist / dt; // derived speed
      if (isValidSpeed(fix.speed)) inst = fix.speed; // prefer device-reported
      if (inst >= 0 && inst < MAX_SPEED_MS) {
        S.speed = S.speed == null
          ? inst
          : SPEED_EMA_ALPHA * inst + (1 - SPEED_EMA_ALPHA) * S.speed;
      }
    }
  }

  S.lastFix = { lat: fix.lat, lng: fix.lng, t: fix.t };
}

function isValidSpeed(v) {
  return typeof v === 'number' && isFinite(v) && v >= 0 && v < MAX_SPEED_MS;
}

/* ── trend detection: is the user approaching or receding? ── */
export function updateTrend(d, accuracy) {
  const prev = S.lastDist;
  S.lastDist = d;
  if (d == null || prev == null) { S.trend = 'steady'; return S.trend; }

  const delta = d - prev; // positive = getting farther
  const noise = Math.max(TREND_MIN_MOVE, (accuracy || 0) * TREND_NOISE_ACC);
  if (delta > noise) S.trend = 'recede';
  else if (delta < -noise) S.trend = 'approach';
  else if (S.trend === 'recede' || S.trend === 'approach') S.trend = 'steady';
  return S.trend;
}

/*
 * Compute ETAs (seconds). Hybrid:
 *  - with a routed distance/duration (OSRM), use implied route speed and route distance
 *  - else fall back to the smoothed live speed and straight-line distance
 */
export function computeEta(d, route) {
  const routed = route && route.distanceM != null && route.durationS != null;
  const dist = routed ? route.distanceM : d;
  const spd = routed
    ? route.distanceM / Math.max(route.durationS, 1)
    : S.speed;

  if (spd == null || !isFinite(spd) || spd < MIN_SPEED_MS) {
    return { etaAlarm: null, etaDest: null, stopped: S.speed != null, routed: false };
  }
  return {
    etaAlarm: Math.max(0, dist - S.radius) / spd,
    etaDest: dist / spd,
    stopped: false,
    routed
  };
}

/* ── snooze helpers ── */
export function inSnooze() {
  return S.snoozeUntil > Date.now();
}

/*
 * Pre-alert evaluation. Fires once when EITHER the time OR distance
 * condition is met (never while receding or snoozed), then re-arms only
 * after both clear the buffer.
 */
export function evaluatePreAlert(distance, etaRemaining, trend) {
  if (!S.preAlertEnabled || S.triggered || distance == null) return;
  if (inSnooze()) return;

  const receding = trend === 'recede';
  const timeMet = S.preAlertTimeSecs > 0 &&
    etaRemaining != null && etaRemaining <= S.preAlertTimeSecs;
  const distMet = S.preAlertDistanceM > 0 &&
    distance <= S.preAlertDistanceM;

  if (!S.preAlertFired && (timeMet || distMet)) {
    if (!receding) {
      S.preAlertFired = true;
      sendPreAlert(timeMet ? 'time' : 'distance');
    }
  }

  if (S.preAlertFired) {
    const distClear = S.preAlertDistanceM <= 0 ||
      distance > S.preAlertDistanceM * (1 + PREALERT_REARM_BUFFER);
    const timeClear = S.preAlertTimeSecs <= 0 || etaRemaining == null ||
      etaRemaining > S.preAlertTimeSecs * (1 + PREALERT_REARM_BUFFER);
    if (distClear && timeClear) S.preAlertFired = false;
  }
}
