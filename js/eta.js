/* ═══════════════ ETA / SPEED ENGINE ═══════════════ */
import { S } from './state.js';
import { haversine } from './utils.js';
import {
  SPEED_EMA_ALPHA, MAX_SPEED_MS, MIN_MOVE_M,
  FIX_MIN_DT, FIX_MAX_DT, MIN_SPEED_MS, PREALERT_REARM_BUFFER
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

/*
 * Compute ETAs (seconds) for the current distance.
 * etaAlarm: time until the alert radius is reached (the countdown that matters)
 * etaDest:  time until the exact destination
 */
export function computeEta(d) {
  if (S.speed == null || S.speed < MIN_SPEED_MS) {
    return { etaAlarm: null, etaDest: null, stopped: S.speed != null };
  }
  return {
    etaAlarm: Math.max(0, d - S.radius) / S.speed,
    etaDest: d / S.speed,
    stopped: false
  };
}

/*
 * Pre-alert evaluation. Fires once when EITHER the time OR distance
 * condition is met, then re-arms only after both clear the buffer.
 */
export function evaluatePreAlert(distance, etaRemaining) {
  if (!S.preAlertEnabled || S.triggered || distance == null) return;

  const timeMet = S.preAlertTimeSecs > 0 &&
    etaRemaining != null && etaRemaining <= S.preAlertTimeSecs;
  const distMet = S.preAlertDistanceM > 0 &&
    distance <= S.preAlertDistanceM;

  if ((timeMet || distMet) && !S.preAlertFired) {
    S.preAlertFired = true;
    sendPreAlert(timeMet ? 'time' : 'distance');
  }

  if (S.preAlertFired) {
    const distClear = S.preAlertDistanceM <= 0 ||
      distance > S.preAlertDistanceM * (1 + PREALERT_REARM_BUFFER);
    const timeClear = S.preAlertTimeSecs <= 0 || etaRemaining == null ||
      etaRemaining > S.preAlertTimeSecs * (1 + PREALERT_REARM_BUFFER);
    if (distClear && timeClear) S.preAlertFired = false;
  }
}
