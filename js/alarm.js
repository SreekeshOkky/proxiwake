/* ═══════════════ ALARM (tone / vibration / notification) ═══════════════ */
import { S } from './state.js';
import { fmt } from './utils.js';

/* ── Web Audio tone ──
 * level 1 = gentle, 2 = moderate, 3 = aggressive.
 * gainScale lets the pre-alert reuse the tone more softly.
 */
export function playTone(level, gainScale = 1) {
  try {
    if (!S.audioCtx) {
      S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = S.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);

    let freq, gain, type;
    if (level === 1) { freq = 440; gain = 0.12; type = 'sine'; }
    else if (level === 2) { freq = 660; gain = 0.35; type = 'triangle'; }
    else { freq = 880; gain = 0.75; type = 'square'; }

    o.frequency.value = freq;
    g.gain.value = gain * gainScale;
    o.type = type;

    o.start();
    setTimeout(() => {
      try { o.stop(); o.disconnect(); g.disconnect(); } catch (e) { /* noop */ }
    }, 500);
  } catch (e) { /* audio unavailable */ }
}

export function vibratePattern(level) {
  if (!navigator.vibrate) return;
  const pat = level === 1
    ? [300, 100, 300]
    : level === 2
      ? [500, 200, 500, 200, 500]
      : [1000, 200, 1000, 200, 1000, 200, 1000];
  navigator.vibrate(pat);
}

export function showNotification(title, body, opts = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then(reg => reg.showNotification(title, { body, ...opts }))
        .catch(() => {});
    } else {
      new Notification(title, { body, ...opts });
    }
  } catch (e) { /* notifications unavailable */ }
}

/* ── Pre-alert: soft, one-shot, both tone + vibration + notification ── */
export function sendPreAlert(reason) {
  const dest = S.name || 'your destination';
  const msg = reason === 'time'
    ? `About ${Math.round(S.preAlertTimeSecs / 60)} min from ${dest}`
    : `Within ${fmt(S.preAlertDistanceM)} of ${dest}`;

  vibratePattern(1);
  playTone(2, 0.5);
  showNotification('ProxiWake — approaching', msg, { tag: 'proxiwake-pre' });
  document.dispatchEvent(new CustomEvent('proxiwake:prealert', { detail: { reason, msg } }));
}

/* ── Final radius alarm: repeats until dismissed ── */
export function triggerAlarm() {
  if (S.triggered) return;
  S.triggered = true;

  vibratePattern(S.alarm);
  if (S.alarm >= 2) playTone(S.alarm, 1);

  const iv = setInterval(() => {
    vibratePattern(S.alarm);
    if (S.alarm >= 2) playTone(S.alarm, 1);
  }, S.alarm === 3 ? 2000 : 4000);
  S.alarmIntervals.push(iv);

  showNotification('ProxiWake', `Arriving at ${S.name || 'your destination'}!`, {
    requireInteraction: true, tag: 'proxiwake-alarm'
  });

  /* aggressive: screen flash */
  if (S.alarm === 3) {
    let on = false;
    const fi = setInterval(() => {
      on = !on;
      document.body.style.background = on ? '#1a0505' : 'var(--bg)';
    }, 300);
    S.alarmIntervals.push(fi);
  }

  document.dispatchEvent(new CustomEvent('proxiwake:alarm'));
}

/* Stop the repeating alarm without ending the trip. S.triggered stays true
 * so it won't immediately re-fire while still inside the zone. */
export function stopAlarm() {
  S.alarmIntervals.forEach(clearInterval);
  S.alarmIntervals = [];
  if (navigator.vibrate) navigator.vibrate(0);
  document.body.style.background = 'var(--bg)';
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then(reg => reg.getNotifications({ tag: 'proxiwake-alarm' }))
        .then(list => list.forEach(n => n.close()))
        .catch(() => {});
    }
  } catch (e) { /* noop */ }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch (e) { /* noop */ }
  }
}
