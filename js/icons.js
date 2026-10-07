/* ═══════════════ SVG ICON SET (stroke = currentColor) ═══════════════ */

const wrap = paths =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  logo: wrap(
    '<circle cx="12" cy="12" r="9" opacity=".38"/>' +
    '<circle cx="12" cy="12" r="5" opacity=".6"/>' +
    '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/>'
  ),
  bus: wrap(
    '<rect x="3" y="4" width="18" height="13.5" rx="3"/>' +
    '<path d="M3 11h18"/>' +
    '<circle cx="7.5" cy="19.2" r="1.4"/>' +
    '<circle cx="16.5" cy="19.2" r="1.4"/>' +
    '<path d="M7.2 6.6h.01M16.8 6.6h.01"/>'
  ),
  train: wrap(
    '<rect x="5" y="3" width="14" height="13" rx="3.5"/>' +
    '<path d="M5 9.5h14"/>' +
    '<path d="M9.2 19.5 12 16l2.8 3.5"/>' +
    '<path d="M9.3 6h.01M14.7 6h.01"/>'
  ),
  plane: wrap(
    '<path d="M21 3.5 3 11.2l6.2 1.9 1.8 6.2L21 3.5z"/>' +
    '<path d="M12.8 13.3 21 3.5"/>'
  ),
  search: wrap('<circle cx="11" cy="11" r="7"/><path d="m20.6 20.6-4.6-4.6"/>'),
  locate: wrap(
    '<circle cx="12" cy="12" r="6.2"/>' +
    '<path d="M12 2v3.6M12 18.4V22M2 12h3.6M18.4 12H22"/>' +
    '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>'
  ),
  radius: wrap('<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.4"/>'),
  bell: wrap(
    '<path d="M18 9.2a6 6 0 1 0-12 0c0 6.3-2.4 8-2.4 8h16.8S18 15.5 18 9.2z"/>' +
    '<path d="M10.4 20a1.9 1.9 0 0 0 3.2 0"/>'
  ),
  volume: wrap(
    '<path d="M11 5 6.4 9H3v6h3.4L11 19V5z"/>' +
    '<path d="M15.4 9.1a4.2 4.2 0 0 1 0 5.8"/>' +
    '<path d="M18.3 6.4a8.2 8.2 0 0 1 0 11.2"/>'
  ),
  alarm: wrap(
    '<circle cx="12" cy="13.2" r="7.4"/>' +
    '<path d="M12 10v3.4l2.3 1.5"/>' +
    '<path d="M5.4 3.4 3.3 5.4M18.6 3.4l2.1 2"/>'
  ),
  lock: wrap(
    '<rect x="4.5" y="10.5" width="15" height="10.5" rx="3"/>' +
    '<path d="M8 10.5V7.3a4 4 0 0 1 8 0v3.2"/>'
  ),
  screen: wrap(
    '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/>' +
    '<path d="M12 18.2h.01"/>'
  ),
  battery: wrap(
    '<rect x="2.5" y="8" width="16.5" height="8.5" rx="2.5"/>' +
    '<path d="M21.5 11v2.5"/>' +
    '<path d="M6.3 10.7v3.1M10 10.7v3.1"/>'
  ),
  radar: wrap(
    '<circle cx="12" cy="12" r="8.6"/>' +
    '<path d="m12 12-5-5"/>' +
    '<path d="M12 3.4a8.6 8.6 0 0 1 7 3.6"/>'
  ),
  clock: wrap('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 2"/>'),
  pin: wrap(
    '<path d="M20 10.3c0 5.7-8 11.7-8 11.7s-8-6-8-11.7a8 8 0 0 1 16 0z"/>' +
    '<circle cx="12" cy="10.3" r="2.8"/>'
  ),
  arrow: wrap('<path d="M5 12h13.5M12.8 5.7 19 12l-6.2 6.3"/>'),
  chev: wrap('<path d="m6 14.5 6-5.5 6 5.5" transform="translate(0,-1)"/>'),
  stop: wrap('<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>'),
  bookmark: wrap('<path d="M6.5 3h11v18l-5.5-4.2L6.5 21V3z"/>'),
  snooze: wrap(
    '<circle cx="10.5" cy="13.5" r="7"/>' +
    '<path d="M10.5 10.5V13.5l2.2 1.4"/>' +
    '<path d="M16.5 4.5h4l-4 4h4"/>'
  ),
  route: wrap(
    '<circle cx="6" cy="19" r="2.4"/>' +
    '<circle cx="18" cy="5" r="2.4"/>' +
    '<path d="M8.4 19H14a3.6 3.6 0 0 0 0-7.2H10a3.6 3.6 0 0 1 0-7.2h5.6"/>'
  ),
  resume: wrap('<path d="M20.8 12a8.8 8.8 0 1 1-2.6-6.2"/><path d="M21 3.2V8h-4.8"/>'),
  cross: wrap('<path d="M6 6l12 12M18 6 6 18"/>')
};

export function icon(name) { return ICONS[name] || ''; }

/* Replace every [data-icon] placeholder with its inline SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
}
