/* ═══════════════ TRACKING LOOP ═══════════════ */
import { S } from './state.js';
import { haversine } from './utils.js';
import { updateMotion, updateTrend, computeEta, evaluatePreAlert, inSnooze } from './eta.js';
import { triggerAlarm } from './alarm.js';
import { maybeRefreshRoute } from './route.js';
import * as ui from './ui.js';
import * as map from './map.js';

export function startTracking(resume = false) {
  S.initDist = null;
  S.distance = null;
  S.speed = null;
  S.lastFix = null;
  S.lastAccuracy = null;
  S.etaAlarm = null;
  S.etaDest = null;
  S.etaAt = Date.now();
  S.etarouted = false;
  S.preAlertFired = false;
  S.trend = 'steady';
  S.lastDist = null;
  S.heading = null;
  if (!resume) S.startTime = Date.now();

  if (!navigator.geolocation) {
    ui.updateDistanceText('GPS unavailable');
    return;
  }

  S.watchId = navigator.geolocation.watchPosition(onPos, onErr, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  });

  const ti = setInterval(tick, 1000);
  S.intervals.push(ti);
}

export function stopTracking() {
  if (S.watchId !== null) {
    navigator.geolocation.clearWatch(S.watchId);
    S.watchId = null;
  }
}

function applyEta(eta) {
  S.etaAlarm = eta.etaAlarm;
  S.etaDest = eta.etaDest;
  S.etarouted = eta.routed;
  S.etaAt = Date.now();
}

function onPos(p) {
  const la = p.coords.latitude, lo = p.coords.longitude;
  const d = haversine(la, lo, S.lat, S.lng);
  if (S.initDist === null) S.initDist = d;
  S.distance = d;
  S.lastAccuracy = p.coords.accuracy;

  const trend = updateTrend(d, p.coords.accuracy);

  updateMotion({
    lat: la, lng: lo,
    t: p.timestamp || Date.now(),
    speed: p.coords.speed,
    accuracy: p.coords.accuracy
  });

  const eta = computeEta(d);
  applyEta(eta);

  const snoozeLeft = inSnooze() ? (S.snoozeUntil - Date.now()) / 1000 : null;

  ui.updateCoords(la, lo);
  ui.updateDistance(d);
  ui.updateProgress(d);
  ui.updateSpeed(S.speed);
  ui.updateBattery(d);
  ui.updateEtaCountdown(S.etaAlarm, S.etaDest, S.speed, snoozeLeft, trend);
  map.updateUser(la, lo, p.coords.heading);
  map.fitBoth(false);

  evaluatePreAlert(d, S.etaAlarm, trend);

  if (d <= S.radius && !S.triggered && !inSnooze()) triggerAlarm();

  /* keep the road-aware route fresh in the background */
  maybeRefreshRoute({ lat: la, lng: lo }, { lat: S.lat, lng: S.lng }).then(r => {
    if (!r) return;
    S.routeDistance = r.distanceM;
    S.routeDuration = r.durationS;
    S.routeAt = Date.now();
    const drawn = map.setRoutePolyline(r.geometry);
    const eta2 = computeEta(d, r.distanceM != null ? r : null);
    applyEta(eta2);
    ui.updateEtaCountdown(S.etaAlarm, S.etaDest, S.speed, inSnooze() ? (S.snoozeUntil - Date.now()) / 1000 : null, trend);
  }).catch(() => {});
}

function onErr(e) {
  ui.updateDistanceText('GPS Error');
  ui.setStatusBat(e.message, 'yellow');
}

function tick() {
  if (!S.active) return;

  ui.updateElapsed(Math.floor((Date.now() - S.startTime) / 1000));

  /* snoozed: show snooze countdown; the normal branch re-fires on expiry */
  if (inSnooze()) {
    const left = (S.snoozeUntil - Date.now()) / 1000;
    ui.updateEtaCountdown(null, null, S.speed, left, S.trend);
    return;
  }

  let etaRemaining = null;
  let etaDestRemaining = null;
  if (S.etaAlarm != null) {
    const elapsed = (Date.now() - S.etaAt) / 1000;
    etaRemaining = Math.max(0, S.etaAlarm - elapsed);
    etaDestRemaining = Math.max(0, S.etaDest - elapsed);
  }

  ui.updateEtaCountdown(etaRemaining, etaDestRemaining, S.speed, null, S.trend);
  evaluatePreAlert(S.distance, etaRemaining, S.trend);

  /* re-fire after a snooze expires while still inside the zone */
  if (S.distance != null && S.distance <= S.radius && !S.triggered) triggerAlarm();
}
