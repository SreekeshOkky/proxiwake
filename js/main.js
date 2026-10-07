/* ═══════════════ BOOT & WIRING ═══════════════ */
import {
  S, on, loadState, setRadius, setMode, setAlarm, setPreAlert, setActive
} from './state.js';
import { MODES } from './config.js';
import { $, clamp, fmt } from './utils.js';
import * as ui from './ui.js';
import { initUI } from './ui.js';
import { initMap, fitBoth, centerOnUser, updateUser, clearUser } from './map.js';
import { initSearch } from './search.js';
import { requestWL, releaseWL } from './wakelock.js';
import { startTracking, stopTracking } from './tracking.js';
import { requestNotificationPermission, stopAlarm } from './alarm.js';
import { initLock, unlock, scheduleAutoLock, cancelAutoLock } from './lock.js';
import { hydrateIcons } from './icons.js';

hydrateIcons();
loadState();
initUI();
initMap();
initSearch();
initLock();
wireControls();

on('active', active => (active ? enterTracking() : exitTracking()));
on('target', updateSetupSummary);
on('radius', updateSetupSummary);
on('radius', () => enforcePreAlertDistance());

/* keep the distance pre-alert outside the alarm radius */
function enforcePreAlertDistance() {
  if (S.preAlertDistanceM > 0 && S.preAlertDistanceM < S.radius) {
    setPreAlert({ preAlertDistanceM: S.radius + 100 });
  }
}
enforcePreAlertDistance();

document.addEventListener('proxiwake:alarm', () => ui.showAlertState());
document.addEventListener('proxiwake:prealert', () => {
  ui.el['eta-box'].classList.add('prealert');
  setTimeout(() => ui.el['eta-box'].classList.remove('prealert'), 1800);
});

/* soft locate on boot so the map opens on "you" (single permission ask) */
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    p => {
      S.lastFix = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
      updateUser(p.coords.latitude, p.coords.longitude);
      centerOnUser(p.coords.latitude, p.coords.longitude);
    },
    () => { /* silent: user may just pick a point on the map */ },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
  );
}

/* register the service worker only in deployed (secure, non-local) contexts —
 * localhost keeps the app always-fresh during development */
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && !isLocal) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ── control wiring ── */
function wireControls() {
  ['bus', 'train', 'flight'].forEach(m => {
    const b = $('m-' + m);
    if (b) b.addEventListener('click', () => setMode(m));
  });

  $('rad-slider').addEventListener('input', e => {
    setRadius(clamp(parseInt(e.target.value, 10), MODES[S.mode].min, MODES[S.mode].max));
  });

  [1, 2, 3].forEach(lv => {
    const b = $('a' + lv);
    if (b) b.addEventListener('click', () => setAlarm(lv));
  });

  $('pre-toggle').addEventListener('change', e =>
    setPreAlert({ preAlertEnabled: e.target.checked }));
  $('pre-time').addEventListener('change', e =>
    setPreAlert({ preAlertTimeSecs: clamp(parseInt(e.target.value, 10) || 0, 0, 120) * 60 }));
  $('pre-distance').addEventListener('change', e => {
    const v = Math.max(0, parseInt(e.target.value, 10) || 0);
    setPreAlert({ preAlertDistanceM: (v > 0 && v < S.radius) ? S.radius + 100 : v });
  });

  $('btn-go').addEventListener('click', activate);
  $('btn-stop').addEventListener('click', deactivate);
  $('btn-recenter').addEventListener('click', recenter);

  /* tap grip or summary to expand/collapse the sheets */
  ['v-setup', 'v-track'].forEach(id => {
    const sheet = $(id);
    sheet.querySelector('.sheet-grab')?.addEventListener('click', () => sheet.classList.toggle('open'));
  });
  $('setup-summary-row').addEventListener('click', () => $('v-setup').classList.toggle('open'));
}

function activate() {
  if (S.lat === null || S.lng === null) return;
  requestNotificationPermission();
  setActive(true);
}

function deactivate() {
  setActive(false);
}

function recenter() {
  if (S.lastFix && S.lastFix.lat != null) {
    centerOnUser(S.lastFix.lat, S.lastFix.lng);
    return;
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      p => {
        S.lastFix = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
        updateUser(p.coords.latitude, p.coords.longitude);
        centerOnUser(p.coords.latitude, p.coords.longitude);
      },
      () => alert('GPS error: could not get your position'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
}

/* collapsed setup sheet shows the chosen destination */
function updateSetupSummary() {
  const el = $('setup-summary');
  if (!el) return;
  if (S.lat !== null && S.lng !== null) {
    const name = S.name && S.name !== 'Custom location' ? S.name : `${S.lat.toFixed(4)}, ${S.lng.toFixed(4)}`;
    el.textContent = `${name} · within ${fmt(S.radius)}`;
  } else {
    el.textContent = 'Choose a destination';
  }
}

/* ── trip lifecycle ── */
function enterTracking() {
  ui.updateTargetMeta();
  ui.resetTrackingUI();
  ui.setStatusBat('Acquiring position...', 'green');
  ui.setStatusWl('Requesting...', 'yellow');
  $('v-setup').style.display = 'none';
  $('v-track').style.display = 'flex';
  $('v-setup').classList.remove('open');
  requestWL();
  startTracking();
  fitBoth(true);
  scheduleAutoLock();
}

function exitTracking() {
  stopTracking();
  releaseWL();
  unlock();
  cancelAutoLock();
  S.intervals.forEach(clearInterval);
  S.intervals = [];
  stopAlarm();
  S.triggered = false;
  clearUser();
  $('v-track').style.display = 'none';
  $('v-track').classList.remove('open');
  $('v-setup').style.display = 'flex';
  ui.resetTrackingUI();
  fitBoth(false);
}
