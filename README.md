# ProxiWake — GPS Proximity Alarm with Live ETA

**Never miss your bus stop, train station, or aerial sightseeing moment again.**

ProxiWake is a Progressive Web App (PWA) that triggers an alarm when you approach a
destination. Set your target on a map (or by search/coordinates), choose an alert
radius, and rest — ProxiWake monitors your GPS, shows a **live ETA countdown based on
your current speed**, and wakes you when you arrive.

> This project is a fork of
> [Manasteja/proxiwake](https://github.com/Manasteja/proxiwake) (MIT). See `LICENSE`.

## Live app

**[https://sreekeshokky.github.io/proxiwake/](https://sreekeshokky.github.io/proxiwake/)**

Open it on your phone (HTTPS ✓), add it to your Home Screen, and grant location +
notification permissions. Desktop Chrome's DevTools → **Sensors** panel can simulate
movement for quick testing.

## Features

- **App-like full-screen map layout** — the map is the canvas (Google Maps style):
  floating brand chip + recenter button, and glassy bottom sheets. Before the trip the
  sheet holds all options (mode, destination, radius, early warning, screen, intensity);
  during the trip it becomes a live stats card with **Lock screen** and **Cancel trip**.
- **Interactive map** — Leaflet + OpenStreetMap. Tap the map (or drag the pin) to set
  your destination; radius shown as a live circle; user and destination kept framed
  together while tracking.
- **Live ETA countdown** — estimates your speed (device-reported + derived, smoothed)
  and counts down the time until the wake-up zone, with an ETA to the destination.
- **Configurable early warning (pre-alert)** — notify before arrival by **time and/or
  distance** (default 5 min *or* 1 km, whichever comes first). Fires a soft tone,
  vibration and a system notification once, then re-arms. Suppressed while receding.
- **Road-aware ETA (OSRM)** — the ETA uses real road distance/duration from the
  keyless [OSRM](https://project-osrm.org) demo server (throttled, toggleable),
  falling back to straight-line estimates offline. The routed line is drawn on the map.
- **Saved places** — pin any destination with a name; recent destinations are kept
  automatically; one tap re-arms.
- **Units** — metric (km) ↔ imperial (mi/ft), applied everywhere including speed.
- **Snoozeable alarm** — snooze for 2 minutes from the trip card or lock screen;
  it re-fires if still inside the wake-up zone.
- **Resume after reload** — an active trip survives a page reload and can be resumed
  (elapsed time continues) or discarded.
- **Heading arrow** — the live user marker rotates to your direction of travel
  (device heading, or derived bearing while moving).
- **Location search** — type any place name (OpenStreetMap Nominatim geocoding).
- **Manual coordinates / current GPS** — enter lat/lng or use your position.
- **Three travel modes** — Bus, Train, Flight (different radius ranges).
- **Escalating alarms** — Gentle (vibrate), Moderate (vibrate + tone), Aggressive
  (full volume + screen flash). Repeats until dismissed.
- **Screen Wake Lock**, **smart battery indicators**, **live distance/progress**.
- **Travel lock** — an in-app overlay that keeps the screen awake for GPS but blocks
  accidental touches. Auto-locks when idle (configurable) and unlocks via a deliberate
  1.5 s hold.
- **Installable & offline-capable** (service worker caches the app shell; it skips
  registration on localhost so dev reloads stay fresh).
- **Real app icon & splash** — PNG icons `any` + `maskable` in the manifest, and
  device-sized iOS launch images (`apple-touch-startup-image`); Android derives its
  boot splash from `background_color` + the manifest icons.
- **No account, no backend** — everything runs on-device.

## Project structure

```
index.html            markup + module entry
manifest.json         PWA manifest
sw.js                 service worker (cache-first app shell)
css/styles.css        all styles
assets/
  icons/              app icons (192/512 PNG, maskable, apple-touch)
  splash/             iOS launch images for common devices
brand tool:
  tools/brand.html    renders icons & splash via query param (?type=icon|maskable|splash);
                      resize the browser viewport to the target pixel size and screenshot
js/
  config.js           constants, travel modes, defaults
  state.js            single source of truth + pub/sub + localStorage
  utils.js            haversine, formatting, DOM helpers
  ui.js               all DOM rendering
  map.js              Leaflet map, markers, radius circle, user trace
  search.js           Nominatim search, manual coords, GPS button
  wakelock.js         screen wake lock
  alarm.js            Web Audio tone, vibration, notifications
  eta.js              speed estimation, ETA math, pre-alert/trend logic
  route.js            road-aware routing via OSRM (throttled + fallback)
  places.js           saved destination chips
  tracking.js         geolocation watch + 1s countdown ticker
  lock.js             travel lock overlay (touch blocking + auto-lock)
  main.js             boot & event wiring
vendor/leaflet/       vendored Leaflet 1.9.4 (for offline app shell)
```

## Run locally

ES modules require `http(s)` (not `file://`). Any static server works:

```bash
npx serve .          # or: python3 -m http.server 8080
```

Open `http://localhost:8080`. For **mobile testing over LAN**, geolocation needs a
secure context — use a tunnel (e.g. `cloudflared tunnel --url http://localhost:8080`)
or `vite-plugin-mkcert`.

On desktop Chrome, mock movement via **DevTools → Sensors → Location** to test the
ETA, pre-alert (time & distance) and radius alarm.

## Deploy to GitHub Pages

1. Fork or push this repo to `https://github.com/<your-username>/proxiwake`
2. Repo **Settings → Pages** → *Deploy from a branch* → Branch `main`, folder `/ (root)`
3. The app goes live at `https://<your-username>.github.io/proxiwake/`

All asset paths are relative and the service worker is registered with `./sw.js`,
so it works out of the box under a sub-path like `/proxiwake/`. Map tiles, Nominatim
and the app shell are the only network requirements.

## How the ETA works

- **Road-aware (default):** when a route is available from OSRM (bus/train modes;
  the public demo server, throttled to ~1 fetch/20 s or 150 m of movement), the
  implied road speed = `road distance / road duration`, and ETAs use remaining road
  distance. The route polyline replaces the straight dashed line on the map.
- **Fallback:** the straight-line haversine distance and a smoothed live speed
  (device-reported `coords.speed` preferred, else derived `distance / dt`, EMA).
  Fixes with poor accuracy or no movement are ignored; long gaps (tunnels) reset it.
- ETA to the wake-up zone = remaining distance before the radius; the countdown
  interpolates between GPS fixes with a 1-second ticker.
- Pre-alert fires when **either** the time threshold **or** the distance threshold is
  crossed (never while receding off the route), then re-arms after both clear a 15%
  buffer (hysteresis).

Attribution: routing by [OSRM](https://project-osrm.org), map data ©
[OpenStreetMap](https://www.openstreetmap.org/copyright) contributors — both public,
keyless services intended for light/demo usage.

## Known PWA limitations

- **Must stay open** — GPS tracking stops if the browser tab is backgrounded (web
  platform limitation). The Screen Wake Lock keeps the display alive while foregrounded.
  **A service worker cannot replace this:** `navigator.geolocation` is unavailable in a
  service worker, and Background/Periodic Background Sync are network-only and
  throttled, so they cannot poll GPS. That is why the app keeps the screen on and uses
  the **travel lock** overlay to prevent accidental touches instead.
- **Map tiles** — OSM public tiles need network; only the app shell is cached offline.
  For production use a proper tile provider per the OSM tile usage policy.
- **Underground** — GPS may not work in tunnels or underground metro.

## License

MIT — see `LICENSE`. Original work © Manasteja.
