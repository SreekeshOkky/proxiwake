/* ═══════════════ TRAVEL LOCK (touch-blocking overlay) ═══════════════
 * Keeps the screen awake for continuous GPS while ignoring accidental
 * touches. Unlock requires a deliberate hold gesture.
 */
import { S, saveState } from './state.js';
import { $, fmt, fmtDuration } from './utils.js';
import { stopAlarm } from './alarm.js';
import { icon } from './icons.js';

const HOLD_MS = 1500;
const IDLE_MS = 15000;

let overlay, nameEl, distEl, etaEl, etaLabelEl, statusEl, holdEl, holdTextEl, iconEl;
let idleTimer = null;
let updateTimer = null;
let holdTimer = null;
let inited = false;

export function initLock() {
  overlay = $('lock-overlay');
  if (!overlay) return;

  nameEl = $('lock-name');
  distEl = $('lock-distance');
  etaEl = $('lock-eta');
  etaLabelEl = $('lock-eta-label');
  statusEl = $('lock-status');
  holdEl = $('lock-unlock');
  holdTextEl = holdEl && holdEl.querySelector('.lock-hold-text');
  iconEl = $('lock-icon');

  const btn = $('btn-lock');
  if (btn) btn.addEventListener('click', lock);

  const toggle = $('auto-lock-toggle');
  if (toggle) {
    toggle.checked = !!S.autoLock;
    toggle.addEventListener('change', e => {
      S.autoLock = e.target.checked;
      saveState();
      if (S.autoLock) scheduleAutoLock(); else clearIdle();
    });
  }

  bindHold(holdEl, onHoldComplete);

  ['pointerdown', 'keydown', 'click', 'touchstart', 'wheel'].forEach(ev =>
    document.addEventListener(ev, noteActivity, { passive: true }));

  document.addEventListener('proxiwake:alarm', () => { if (isLocked()) setOverlayAlert(true); });

  inited = true;
}

function bindHold(el, cb) {
  if (!el) return;
  const start = e => {
    e.preventDefault();
    el.classList.add('holding');
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { el.classList.remove('holding'); cb(); }, HOLD_MS);
  };
  const cancel = () => { el.classList.remove('holding'); clearTimeout(holdTimer); };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', e => e.preventDefault());
}

function onHoldComplete() {
  if (S.triggered) stopAlarm();
  unlock();
}

export function isLocked() { return !!S.locked; }

export function lock() {
  if (!inited || S.locked) return;
  S.locked = true;
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  setOverlayAlert(S.triggered);
  renderLock();
  updateTimer = setInterval(renderLock, 1000);
  clearIdle();
}

export function unlock() {
  if (!inited || !S.locked) return;
  S.locked = false;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('locked');
  clearInterval(updateTimer);
  updateTimer = null;
  setOverlayAlert(false);
  scheduleAutoLock();
}

function setOverlayAlert(on) {
  overlay.classList.toggle('alert', !!on);
  if (iconEl) iconEl.innerHTML = icon(on ? 'alarm' : 'lock');
  if (holdTextEl) holdTextEl.textContent = on ? 'Hold to stop alarm' : 'Hold to unlock';
}

function renderLock() {
  if (!S.locked) return;
  nameEl.textContent = S.triggered ? 'Arriving!' : (S.name || 'destination');
  distEl.textContent = fmt(S.distance);

  let etaRem = null, etaDest = null;
  if (S.etaAlarm != null) {
    const el = (Date.now() - S.etaAt) / 1000;
    etaRem = Math.max(0, S.etaAlarm - el);
    etaDest = S.etaDest != null ? Math.max(0, S.etaDest - el) : null;
  }

  if (S.triggered) {
    etaLabelEl.textContent = 'Wake-up zone reached';
    etaEl.textContent = 'NOW';
  } else if (etaRem == null) {
    etaLabelEl.textContent = 'ETA to wake-up zone';
    etaEl.textContent = '—';
  } else {
    etaLabelEl.textContent = 'ETA to wake-up zone';
    etaEl.textContent = fmtDuration(etaRem);
  }

  if (S.speed == null) {
    statusEl.textContent = 'Acquiring GPS…';
  } else {
    const spd = (S.speed * 3.6).toFixed(0) + ' km/h';
    statusEl.textContent = etaDest != null
      ? `${spd} · ${fmtDuration(etaDest)} to destination`
      : spd;
  }
}

/* ── idle auto-lock ── */
export function scheduleAutoLock() {
  clearIdle();
  if (!S.active || !S.autoLock || S.locked) return;
  idleTimer = setTimeout(() => {
    if (S.active && S.autoLock && !S.locked) lock();
  }, IDLE_MS);
}

export function cancelAutoLock() { clearIdle(); }

function clearIdle() { clearTimeout(idleTimer); idleTimer = null; }

function noteActivity() {
  if (S.active && !S.locked) scheduleAutoLock();
}
