/* ═══════════════ SCREEN WAKE LOCK ═══════════════ */
import { S } from './state.js';
import { setStatusWl } from './ui.js';

export async function requestWL() {
  if (!('wakeLock' in navigator)) {
    setStatusWl('Not supported — keep screen on manually', 'yellow');
    return;
  }
  try {
    S.wakeLock = await navigator.wakeLock.request('screen');
    S.wakeLock.addEventListener('release', () => {
      S.wakeLock = null; // allow re-acquire on visibilitychange
      setStatusWl('Released — will re-acquire when visible', 'yellow');
    });
    setStatusWl('Active — screen will stay on (dimmed)', 'green');
  } catch (e) {
    setStatusWl('Failed: ' + e.message, 'yellow');
  }
}

export async function releaseWL() {
  if (!S.wakeLock) return;
  try { await S.wakeLock.release(); } catch (e) { /* noop */ }
  S.wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (S.active && document.visibilityState === 'visible' && !S.wakeLock) {
    requestWL();
  }
});
