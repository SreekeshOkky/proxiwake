/* ═══════════════ DESTINATION INPUT (search / coords / gps) ═══════════════ */
import { S, setTarget } from './state.js';
import { $ } from './utils.js';

let searchTimer = null;

export function initSearch() {
  const box = $('search-box');
  const results = $('search-results');

  box.addEventListener('input', function () {
    const q = this.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 3) { results.classList.remove('open'); return; }
    results.innerHTML = '<div class="search-loading">Searching</div>';
    results.classList.add('open');
    searchTimer = setTimeout(() => doSearch(q), 800); // Nominatim: 1 req/s
  });

  box.addEventListener('focus', function () {
    if (this.value.trim().length >= 3 && results.children.length > 0) {
      results.classList.add('open');
    }
  });

  document.addEventListener('touchstart', e => {
    if (!e.target.closest('.search-wrap')) results.classList.remove('open');
  }, { passive: true });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) results.classList.remove('open');
  });

  /* manual coordinates */
  $('inp-lat').addEventListener('input', function () {
    const v = parseFloat(this.value);
    setTarget(isNaN(v) ? null : v, S.lng, S.name || 'Custom location');
  });
  $('inp-lng').addEventListener('input', function () {
    const v = parseFloat(this.value);
    setTarget(S.lat, isNaN(v) ? null : v, S.name || 'Custom location');
  });

  $('btn-gps').addEventListener('click', getMyGPS);
}

const searchResultsEl = () => $('search-results');

async function doSearch(q) {
  const results = searchResultsEl();
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(q);
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (!data.length) {
      results.innerHTML = '<div class="search-hint">No results found. Try a different search.</div>';
      return;
    }
    renderResults(results, data);
  } catch (err) {
    results.innerHTML = '<div class="search-hint">Search unavailable. Enter coordinates manually.</div>';
  }
}

/* Build results with the DOM API (no innerHTML interpolation of untrusted text). */
function renderResults(results, data) {
  results.innerHTML = '';
  data.forEach(p => {
    const parts = p.display_name.split(',');
    const main = parts.slice(0, 2).join(',').trim();
    const detail = parts.slice(2, 4).join(',').trim();

    const item = document.createElement('div');
    item.className = 'sr-item';

    const nm = document.createElement('div');
    nm.className = 'sr-name';
    nm.textContent = main;
    item.appendChild(nm);

    if (detail) {
      const dd = document.createElement('div');
      dd.className = 'sr-detail';
      dd.textContent = detail;
      item.appendChild(dd);
    }

    const coord = document.createElement('div');
    coord.className = 'sr-coord';
    coord.textContent = parseFloat(p.lat).toFixed(4) + ', ' + parseFloat(p.lon).toFixed(4);
    item.appendChild(coord);

    item.addEventListener('click', () => {
      const lat = parseFloat(p.lat), lng = parseFloat(p.lon);
      setTarget(lat, lng, main);
      $('search-box').value = main;
      $('search-results').classList.remove('open');
    });

    results.appendChild(item);
  });
}

function getMyGPS() {
  if (!navigator.geolocation) { alert('Geolocation not available in this browser'); return; }
  navigator.geolocation.getCurrentPosition(
    p => {
      setTarget(p.coords.latitude, p.coords.longitude, 'Current GPS position');
      $('search-box').value = 'Current GPS position';
    },
    err => alert('GPS error: ' + err.message),
    { enableHighAccuracy: true, timeout: 15000 }
  );
}
