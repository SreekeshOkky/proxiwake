/* ═══════════════ SAVED PLACES ═══════════════ */
import { S, setPlaces, setTarget, on } from './state.js';
import { $ } from './utils.js';
import { haversine } from './utils.js';
import { icon } from './icons.js';
import { PLACES_MAX, PLACES_DEDUPE_M } from './config.js';

const GENERIC_NAMES = new Set(['Dropped pin', 'Current GPS position', 'Custom location', '']);

export function initPlaces() {
  const saveBtn = $('btn-save-place');
  if (saveBtn) saveBtn.addEventListener('click', saveCurrent);
  on('places', render);
  render();
}

export function saveCurrent() {
  if (S.lat == null || S.lng == null) return;
  let name = !GENERIC_NAMES.has(S.name) ? S.name.trim() : '';
  if (!name) {
    name = (window.prompt('Name this place', '') || '').trim();
    if (!name) return;
  }
  push({ name, lat: S.lat, lng: S.lng });
}

/* Called when a trip starts — keep the destination as a recent place */
export function pushRecent() {
  if (S.lat == null || S.lng == null) return;
  const name = GENERIC_NAMES.has(S.name)
    ? `${S.lat.toFixed(4)}, ${S.lng.toFixed(4)}`
    : S.name;
  push({ name, lat: S.lat, lng: S.lng });
}

function push(place) {
  const list = S.places.slice();
  const i = list.findIndex(p =>
    p.lat != null && haversine(p.lat, p.lng, place.lat, place.lng) < PLACES_DEDUPE_M);
  if (i >= 0) {
    place.name = place.name || list[i].name;
    list.splice(i, 1);
  }
  list.unshift(place);
  setPlaces(list.slice(0, PLACES_MAX));
  render();
}

export function render() {
  const wrap = $('place-chips');
  if (!wrap) return;
  wrap.innerHTML = '';

  (S.places || []).forEach(p => {
    const chip = document.createElement('button');
    chip.className = 'place-chip';
    chip.type = 'button';

    const label = document.createElement('span');
    label.className = 'place-chip-text';
    label.textContent = p.name;
    chip.appendChild(label);

    const del = document.createElement('span');
    del.className = 'place-chip-x';
    del.setAttribute('role', 'button');
    del.setAttribute('aria-label', `Remove ${p.name}`);
    del.innerHTML = icon('cross');
    del.addEventListener('click', e => {
      e.stopPropagation();
      setPlaces(S.places.filter(q => q !== p));
      render();
    });
    chip.appendChild(del);

    chip.addEventListener('click', () => {
      setTarget(p.lat, p.lng, p.name);
      $('search-box').value = p.name;
    });

    wrap.appendChild(chip);
  });

  const saveBtn = $('btn-save-place');
  if (saveBtn) saveBtn.style.display = (S.lat != null) ? 'inline-flex' : 'none';
}
