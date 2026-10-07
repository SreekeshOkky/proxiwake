/* ═══════════════ TRACKING LOOP ═══════════════ */
import { S } from './state.js';
import { haversine } from './utils.js';
import { updateMotion, computeEta, evaluatePreAlert } from './eta.js';
import { triggerAlarm } from './alarm.js';
import * as ui from './ui.js';
import * as map from './map.js';

export function startTracking() {
  S.startTime = Date.now();
  S.initDist = null;
  S.distance = null;
  S.speed = null;
  S.lastFix = null;
  S.lastAccuracy = null;
  S.etaAlarm = null;
  S.etaDest = null;
  S.etaAt = Date.now();
  S.preAlertFired = false;

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

function onPos(p) {
  const la = p.coords.latitude, lo = p.coords.longitude;
  const d = haversine(la, lo, S.lat, S.lng);
  if (S.initDist === null) S.initDist = d;
  S.distance = d;

  updateMotion({
    lat: la, lng: lo,
    t: p.timestamp || Date.now(),
    speed: p.coords.speed,
    accuracy: p.coords.accuracy
  });

  const eta = computeEta(d);
  S.etaAlarm = eta.etaAlarm;
  S.etaDest = eta.etaDest;
  S.etaAt = Date.now();

  ui.updateCoords(la, lo);
  ui.updateDistance(d);
  ui.updateProgress(d);
  ui.updateSpeed(S.speed);
  ui.updateBattery(d);
  ui.updateEtaCountdown(S.etaAlarm, S.etaDest, S.speed);
  map.updateUser(la, lo);
  map.fitBoth(false);

  evaluatePreAlert(d, S.etaAlarm);

  if (d <= S.radius && !S.triggered) triggerAlarm();
}

function onErr(e) {
  ui.updateDistanceText('GPS Error');
  ui.setStatusBat(e.message, 'yellow');
}

function tick() {
  if (!S.active) return;

  ui.updateElapsed(Math.floor((Date.now() - S.startTime) / 1000));

  let etaRemaining = null;
  let etaDestRemaining = null;
  if (S.etaAlarm != null) {
    const elapsed = (Date.now() - S.etaAt) / 1000;
    etaRemaining = Math.max(0, S.etaAlarm - elapsed);
    etaDestRemaining = Math.max(0, S.etaDest - elapsed);
  }

  ui.updateEtaCountdown(etaRemaining, etaDestRemaining, S.speed);
  evaluatePreAlert(S.distance, etaRemaining);
}
