/* ═══════════════ UI RENDERING ═══════════════ */
import { S, on, setUnits as pushUnits } from './state.js';
import { MODES } from './config.js';
import { $, fmt, fmtDuration, fmtSpeed, clamp, setUnits, getUnits } from './utils.js';
import { icon } from './icons.js';

export const el = {};

const IDS = [
  'v-setup', 'v-track',
  'search-box', 'search-results',
  'inp-lat', 'inp-lng', 'btn-gps', 'btn-stop', 'btn-go', 'btn-snooze',
  'rad-slider', 'rad-val', 'rad-min', 'rad-max',
  'pre-toggle', 'pre-time', 'pre-distance', 'pre-warn',
  't-icon', 't-name', 't-coords',
  'd-box', 'd-label', 'd-val',
  'p-fill', 't-elapsed', 't-pct',
  'c-mylat', 'c-mylng', 'c-tlat', 'c-tlng', 'c-speed',
  'eta-box', 'eta-label', 'eta-val', 'eta-sub',
  's-bat', 's-bat-text', 's-wl', 's-wl-dot', 's-wl-text',
  'r-dot',
  'units-metric', 'units-imperial', 'route-toggle',
  'resume-banner', 'resume-text', 'btn-resume', 'btn-discard'
];

export function initUI() {
  IDS.forEach(id => { el[id] = $(id); });

  on('target', () => { syncInputsFromState(); checkReady(); });
  on('radius', () => { updateRadiusLabel(); updatePreAlertHint(); });
  on('mode', m => setModeUI(m));
  on('alarm', lv => setAlarmUI(lv));
  on('prealert', () => { syncPreAlertInputs(); updatePreAlertHint(); });
  on('units', u => setUnitsUI(u));
  on('routeToggle', v => syncRouteToggle(v));

  setUnits(S.units);
  setModeUI(S.mode);
  setAlarmUI(S.alarm);
  syncInputsFromState();
  syncPreAlertInputs();
  setUnitsUI(S.units);
  syncRouteToggle(S.routeEnabled);
  checkReady();
  updatePreAlertHint();
}

/* ── setup: inputs / validation ── */
export function syncInputsFromState() {
  if (S.lat != null && S.lng != null) {
    setInputVal(el['inp-lat'], Number(S.lat).toFixed(6));
    setInputVal(el['inp-lng'], Number(S.lng).toFixed(6));
  }
  if (S.name) setInputVal(el['search-box'], S.name);
}

function setInputVal(input, v) {
  if (input && document.activeElement !== input) input.value = v;
}

export function checkReady() {
  const ok = S.lat !== null && S.lng !== null && !isNaN(S.lat) && !isNaN(S.lng);
  const btn = el['btn-go'];
  btn.className = ok ? 'btn-primary ready' : 'btn-primary disabled';
  btn.textContent = ok ? 'Activate ProxiWake' : 'Enter destination to activate';
}

export function updateRadiusLabel() {
  if (el['rad-val']) el['rad-val'].textContent = fmt(S.radius);
  const sl = el['rad-slider'];
  if (sl && sl.max > sl.min) {
    const f = $('rad-fill');
    if (f) f.style.width = (((S.radius - sl.min) / (sl.max - sl.min)) * 100) + '%';
  }
}

export function setModeUI(m) {
  const c = MODES[m];
  if (!c) return;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('m-' + m);
  if (btn) btn.classList.add('active');
  const sl = el['rad-slider'];
  if (sl) {
    sl.min = c.min; sl.max = c.max; sl.step = c.step; sl.value = S.radius;
  }
  el['rad-min'].textContent = fmt(c.min);
  el['rad-max'].textContent = fmt(c.max);
  updateRadiusLabel();
}

export function setAlarmUI(lv) {
  ['a1', 'a2', 'a3'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.className = 'alarm-btn';
  });
  const b = document.getElementById('a' + lv);
  if (b) b.classList.add(lv === 1 ? 'a-green' : lv === 2 ? 'a-yellow' : 'a-red');
}

export function syncPreAlertInputs() {
  if (el['pre-toggle']) el['pre-toggle'].checked = S.preAlertEnabled;
  if (el['pre-time']) el['pre-time'].value = Math.round(S.preAlertTimeSecs / 60);
  if (el['pre-distance']) el['pre-distance'].value = S.preAlertDistanceM;
}

export function updatePreAlertHint() {
  const hint = el['pre-warn'];
  if (!hint) return;
  const bad = S.preAlertEnabled && S.preAlertDistanceM > 0 && S.preAlertDistanceM < S.radius;
  if (bad) {
    hint.textContent = `Distance pre-alert must exceed the radius (${fmt(S.radius)}).`;
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

/* ── units & display toggles ── */
export function setUnitsUI(u) {
  if (el['units-metric']) el['units-metric'].classList.toggle('active', u === 'metric');
  if (el['units-imperial']) el['units-imperial'].classList.toggle('active', u === 'imperial');
  updateRadiusLabel();
  if (S.lat != null && S.lng != null) updateTargetMeta();
}

export function syncRouteToggle(v) {
  if (el['route-toggle']) el['route-toggle'].checked = !!v;
}

export function updatePreDistanceLabel() {
  const lb = el['pre-distance'] && el['pre-distance'].closest('.field-label');
  if (lb && lb.childNodes[0]) {
    lb.childNodes[0].nodeValue = getUnits() === 'imperial'
      ? 'Distance before (ft)' : 'Distance before (m)';
  }
}

/* ── resume banner ── */
export function showResume() {
  if (!el['resume-banner']) return;
  el['resume-text'].textContent = S.name ? `Trip to ${S.name} in progress` : 'Trip in progress';
  el['resume-banner'].style.display = 'flex';
}

export function hideResume() {
  if (el['resume-banner']) el['resume-banner'].style.display = 'none';
}

/* ── tracking: header ── */
export function updateTargetMeta() {
  el['t-icon'].dataset.icon = MODES[S.mode].icon;
  el['t-icon'].innerHTML = icon(MODES[S.mode].icon);
  el['t-name'].textContent = S.name || 'Custom location';
  el['t-coords'].textContent =
    `${S.lat.toFixed(4)}, ${S.lng.toFixed(4)} · Radius: ${fmt(S.radius)}`;
  el['c-tlat'].textContent = S.lat.toFixed(6);
  el['c-tlng'].textContent = S.lng.toFixed(6);
}

/* ── tracking: live values ── */
export function updateCoords(lat, lng) {
  el['c-mylat'].textContent = lat.toFixed(6);
  el['c-mylng'].textContent = lng.toFixed(6);
}

export function updateDistance(d) {
  el['d-val'].textContent = fmt(d);
}

export function updateDistanceText(text) {
  el['d-val'].textContent = text;
}

export function updateProgress(d) {
  const init = S.initDist;
  const pct = (!init || init <= 0) ? 0 : clamp(100 - (d / init) * 100, 0, 100);
  el['p-fill'].style.width = pct + '%';
  el['t-pct'].textContent = Math.round(pct) + '% there';
}

export function updateSpeed(speed) {
  el['c-speed'].textContent = fmtSpeed(speed);
}

export function updateElapsed(secs) {
  const m = Math.floor(secs / 60);
  el['t-elapsed'].textContent = 'Tracking for ' + (m ? m + 'm ' : '') + (secs % 60) + 's';
}

export function updateEtaCountdown(etaAlarmRemaining, etaDestRemaining, speed, snoozeLeft, trend) {
  const val = el['eta-val'], sub = el['eta-sub'], label = el['eta-label'];
  if (S.triggered) {
    label.textContent = 'Wake-up zone reached';
    val.textContent = 'NOW';
    sub.textContent = S.name || 'destination';
    return;
  }
  if (snoozeLeft != null) {
    label.textContent = 'Alarm snoozed';
    val.textContent = fmtDuration(snoozeLeft);
    sub.textContent = 'Will ring again soon';
    return;
  }
  if (etaAlarmRemaining == null) {
    label.textContent = 'ETA to wake-up zone';
    val.textContent = '—';
    sub.textContent = speed == null ? 'Acquiring speed…' : 'Stationary — no ETA';
    return;
  }
  label.textContent = 'ETA to wake-up zone';
  val.textContent = fmtDuration(etaAlarmRemaining);
  sub.textContent = trend === 'recede'
    ? 'moving away from the wake-up zone'
    : (etaDestRemaining != null
        ? '≈ ' + fmtDuration(etaDestRemaining) + ' to destination'
        : '');
}

export function updateBattery(d) {
  let text, color;
  if (d > S.radius * 3) { text = 'Low-power — you\'re far away'; color = 'green'; }
  else if (d > S.radius) { text = 'Medium polling — approaching zone'; color = 'yellow'; }
  else { text = 'High-precision — almost there!'; color = 'green'; }
  setStatusBat(text, color);
}

export function setStatusBat(text, color) {
  if (el['s-bat-text']) el['s-bat-text'].textContent = text;
  const dot = el['s-bat'] && el['s-bat'].querySelector('.status-dot');
  if (dot) dot.className = 'status-dot ' + color;
}

export function setStatusWl(text, color) {
  if (el['s-wl-text']) el['s-wl-text'].textContent = text;
  if (el['s-wl-dot']) el['s-wl-dot'].className = 'status-dot ' + color;
}

export function showAlertState() {
  el['d-box'].className = 'distance-box alert';
  el['d-label'].innerHTML = '<div class="alert-text">WAKE UP — YOU\'RE ARRIVING</div>';
  el['d-val'].style.color = 'var(--danger)';
  if (el['r-dot']) el['r-dot'].className = 'radar-dot arriving';
  document.querySelectorAll('.radar-ring').forEach(r => r.style.borderColor = 'var(--danger)');
  el['p-fill'].style.background = 'var(--danger)';
  el['eta-box'].classList.add('alert');
}

export function resetTrackingUI() {
  el['d-box'].className = 'distance-box normal';
  el['d-label'].textContent = 'Distance remaining';
  el['d-val'].style.color = 'var(--fg)';
  el['d-val'].textContent = 'Acquiring GPS...';
  if (el['r-dot']) el['r-dot'].className = 'radar-dot tracking';
  document.querySelectorAll('.radar-ring').forEach(r => r.style.borderColor = 'var(--accent)');
  el['p-fill'].style.width = '0%';
  el['p-fill'].style.background = 'var(--accent)';
  el['t-pct'].textContent = '0% there';
  el['t-elapsed'].textContent = 'Tracking for 0s';
  el['c-mylat'].textContent = '—';
  el['c-mylng'].textContent = '—';
  el['c-speed'].textContent = '—';
  updateEtaCountdown(null, null, null);
  if (el['eta-box']) el['eta-box'].classList.remove('alert', 'prealert');
  document.body.style.background = 'var(--bg)';
}
