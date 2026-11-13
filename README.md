# WeatherBoard

A weather board built for the Edspire Frontend React challenge: city autocomplete,
current conditions, a 5-day forecast, up to five saved favourites, an installable
offline-capable PWA, and a daily morning reminder delivered by real Web Push.

> **Status: submission-ready locally — C0–C7 and C9–C11 complete, C8 blocked, C12 prepared.**
> No public repository and no public deployment exist yet: both need authorisation and
> credentials that this workspace does not have (see *Deployment*).
> Working today: debounced autocomplete through the Worker, keyboard and pointer selection,
> a cinematic weather dashboard with a condition-driven atmosphere, a 5-day forecast,
> metric/imperial units and refresh, up to five persisted favourites, persisted unit and
> selected-city preferences, an installable manifest + service worker, and a cached
> forecast labelled honestly when the network is unavailable.
> The morning Web Push reminder (C8) is **not implemented**: this workspace has no
> deployment target with a scheduler, no durable subscription store and no credentials.
> `README` → *Push reminders (C8)* lists exactly what is missing.
> OpenWeatherMap and GeoDB still have **no credentials** in this environment, so they remain
> fixture-tested only; the live data you see runs on the Open-Meteo weather and geocoding
> fallbacks.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite 8 | Fast dev server, static output, first-class Worker/PWA tooling |
| UI | React 19 + TypeScript | Requirement of the challenge; typed API boundaries |
| Lint | Oxlint | Shipped with the Vite template, no plugin archaeology |
| Tests | Vitest + Testing Library (jsdom) | Unit tests for pure logic and hooks |
| Styles | Plain CSS with design tokens | No preprocessor/build step to justify |
| PWA | `vite-plugin-pwa` (Workbox) — planned C7 | Manifest, precache, runtime caching |
| API access | Edge Worker proxy (C1) | Keeps provider keys out of the browser bundle |

## Getting started

Requires Node 22+ (developed on Node 26) and npm.

```bash
npm ci             # reproducible install from package-lock.json
npm run dev        # app:     http://localhost:3001
npm run dev:api    # API proxy: http://localhost:8788  (second terminal)
```

A clean install from an empty `node_modules` was verified for this submission
(`npm ci` → typecheck → lint → tests → build, all passing).

During development Vite proxies `/api/*` to the Worker on port 8788, so the browser
stays same-origin and no CORS preflight is involved. The Worker is the only process that
reads provider credentials.

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 3001, bound to `0.0.0.0`, proxying `/api` |
| `npm run dev:api` | Edge API proxy under Wrangler on port 8788 |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm run lint` | Oxlint |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest watch mode |

## Architecture

```
worker/              Edge API proxy (Cloudflare Worker)
worker/providers/    OpenWeatherMap, Open-Meteo and GeoDB adapters
worker/weather/      Icon vocabulary + shared WeatherSnapshot normalisation
src/api/             Typed fetch client and error taxonomy
src/hooks/           Async state: search, weather, favourites, units, selected city
src/lib/             Pure logic: storage validation, offline snapshot cache,
                     formatting and atmosphere mapping
src/components/      Presentational components (search, dashboard, atmosphere)
src/pwa/             Production-only service-worker registration
public/sw.js         Shell + static-asset cache; never intercepts /api/*
scripts/             Icon generation
```

**Request flow:** component → hook → `src/api` → `/api/*` → Worker → provider. In
development Vite proxies `/api` to the Worker on port 8788; in production the same Worker
serves `dist/` and answers `/api/*` first (`wrangler.jsonc`). Provider URLs and response
shapes exist only in the API layer, async state only in hooks, and components render props.
Provider keys are read only by the Worker (`env.OWM_API_KEY`, `env.RAPIDAPI_KEY`); nothing
under `src/` can read them, and any `VITE_*` variable would be public.

**Three separate cache layers:**

1. **Worker edge cache** — 5 minutes for city search, 10 for weather, keyed by rounded
   coordinates/units; `refresh=1` skips the read. Errors are never cached.
2. **Service worker asset cache** — hashed JS/CSS/icons are cache-first with a background
   refresh; navigations are network-first with cached `/index.html` as the fallback.
3. **`localStorage` snapshot** — the last successful forecast per city *and unit system*
   (newest five), used only to render an explicitly labelled cached/offline state.

A failure never falls back to silently stale live data: the dashboard either shows the
cached snapshot with its timestamp, or an error with retry.

## API endpoints (C1)

| Route | Returns | Failure codes |
|---|---|---|
| `GET /api/health` | `{ ok, checkedAt, providers }` — configuration flags only, never a key | — |
| `GET /api/cities?q=&limit=` | `{ query, cities[], meta }` — GeoDB first, Open-Meteo geocoding fallback | 400 `invalid_input`, 429 `rate_limited`, 502 `provider_*`, 504 `upstream_timeout`, 403 `cors_forbidden` |
| `GET /api/weather?lat=&lon=&units=` | `{ provider, units, fetchedAt, weather, meta }`, where `weather` is the shared `WeatherSnapshot` — OpenWeatherMap first, Open-Meteo fallback | same as above |

Rules the proxy enforces:

- **Validation before any network call:** `q` trimmed to 2–80 characters with control
  characters rejected; `limit` an integer 1–10; `lat` ±90 and `lon` ±180; `units` one of
  `metric | imperial`.
- **Error envelope** `{ error: { code, message, details? } }` — never contains an
  upstream body, URL or credential.
- **Caching:** 5 minutes for city search, 10 minutes for weather, keyed by rounded
  coordinates and unit system. Responses carry `x-weatherboard-cache: HIT|MISS`, and
  errors are never cached.
- **CORS:** an explicit origin allowlist (`ALLOWED_ORIGINS`), echoed per request; a cached
  response has its `access-control-allow-origin` stripped before replay.
- **Timeouts:** 8 seconds per provider call, surfaced as `504 upstream_timeout`.

## Data contract (C2)

Both providers are normalised into one shape, so no component ever branches on which
provider answered:

```jsonc
{
  "provider": "openweathermap | open-meteo",
  "units": "metric | imperial",
  "fetchedAt": "ISO instant",
  "weather": {
    "location": { "name", "latitude", "longitude", "timezone", "utcOffsetSeconds" },
    "units": { "temperature": "°C | °F", "windSpeed": "km/h | mph" },
    "current": { "temperature", "feelsLike", "humidity", "pressure", "windSpeed",
                 "windDirection", "condition", "icon", "isDay", "observedAt" },
    "daily": [{ "date", "min", "max", "condition", "icon",
                "precipitationProbability", "sunrise", "sunset" }]   // 5 entries
  },
  "meta": { "fallbackFrom", "fallbackReason" }
}
```

Normalisation rules worth knowing:

- **Five local days.** OpenWeatherMap only offers 3-hourly entries, so they are grouped by
  *local* calendar date using the city's UTC offset, with min/max taken across the day and
  the entry nearest local noon chosen as that day's condition. Open-Meteo already returns
  daily figures, which are sliced to five.
- **One condition vocabulary.** OWM ids and WMO codes both map to a label plus an icon key
  (`clear-day`, `partly-cloudy-night`, `heavy-rain`, `thunderstorm`, …).
- **Honest nulls.** OWM has no timezone identifier and Open-Meteo has no place name or
  pressure, so those fields are `null` rather than guessed.
- **Timestamps** are UTC ISO instants; `daily.date` and the timezone are what you format
  for display. Open-Meteo's naive local times are converted using its UTC offset.
- **Malformed payloads** raise `502 provider_error` with a `reason` in `details`, which
  triggers the same fallback chain as a network failure.

## City search (C3)

`src/components/SearchBar.tsx` is an ARIA combobox; the work is split so each piece is
testable in isolation:

| Concern | Where | Detail |
|---|---|---|
| Debouncing | `useDebouncedValue` | 300 ms, in the UI — never inside a provider |
| Request state | `useCitySearch` | idle / loading / success / error, plus `retry()` |
| Cancellation | `useCitySearch` | each query owns an `AbortController`; the previous request is aborted |
| Stale responses | `useCitySearch` | a resolved response is ignored unless its query is still current |
| Repeat queries | `useCitySearch` | successful queries are memoised, so re-typing is free |
| Short queries | `useCitySearch` | fewer than 2 trimmed characters never reaches the network |
| Closed dropdown | `SearchBar` → `enabled` | no request is issued while the list is closed |
| Transport | `src/api/client.ts` | 8 s timeout, typed `ApiError`, friendly copy per code |

Interaction: type 2+ characters, then ↑/↓ to move, Enter to select, Escape to close, or click a result. Selecting stores the city's name, region, country and coordinates in `App`, which passes them to the weather dashboard. Loading
shows a spinner plus a polite live-region announcement, empty results explain themselves,
and API or network failures offer a *Try again* button.

## Weather dashboard (C4)

Selecting a city triggers `GET /api/weather?lat=&lon=&units=` through the existing typed
client; the Worker answers with the C2 `WeatherSnapshot` inside its `{ provider, units,
fetchedAt, weather, meta }` envelope. There is **no second normalisation layer** in the
frontend — components only read the snapshot, and the frontend types in
`src/api/weather.ts` are an explicit mirror of the Worker contract.

| Concern | Where | Detail |
|---|---|---|
| Weather state | `src/hooks/useWeather.ts` | `idle / loading / success / error`, `refresh()`, `isRefreshing`, `updatedAt` |
| Request guard | `useWeather` | one `AbortController` + request id per load; a superseded response is discarded |
| Units | `App` → `UnitToggle` → `useWeather` | the unit system is sent to the Worker, which returns already-converted values and labels — nothing is converted in the browser |
| Refresh | `refresh()` → `refresh=1` | bypasses the Worker's cache *read* while storing the fresh result; the current snapshot stays on screen with an *Updating…* label |
| Missing data | `src/lib/format.ts` | every formatter returns `—` for `null` (and for `NaN`); a genuine `0` still prints as `0` |
| Times | `formatTimeInZone` | sunrise/sunset are UTC instants rendered in the city's IANA zone, falling back to the numeric UTC offset |

| Component | Renders |
|---|---|
| `WeatherDashboard` | state machine: skeleton, error card with retry, or dashboard; city/region/country labels, coordinates, updated time, refresh button |
| `CurrentConditions` | temperature, condition, icon, feels-like, humidity, wind, sunrise, sunset |
| `ForecastList` | five local days: weekday, date, condition, icon, min/max, precipitation probability when present |
| `WeatherIcon` | 14 inline SVG icon keys (no icon dependency, no icon font) |
| `WeatherSkeleton` | shimmering placeholder blocks with `aria-busy` and a polite status message |
| `UnitToggle` | °C / °F toggle group; the active unit uses `aria-pressed` |

Accessibility and layout: the search field stays visible above the dashboard, the
selected city is the dashboard heading, updates are announced through a polite live
region, and the forecast is an ordered list with visually hidden *High*, *Low* and
*Chance of precipitation* labels. The forecast is two columns at 375 px, five from
768 px; the current-conditions block becomes two columns from 768 px. Colours come only
from the existing tokens, so light and dark themes follow `prefers-color-scheme`.

## Favourites and preferences (C5)

| Concern | Where | Detail |
|---|---|---|
| Storage access | `src/lib/storage.ts` | `localStorage` is probed once; privacy mode, disabled storage or a throwing write degrades to in-memory state instead of crashing |
| Reading | `src/lib/storage.ts` | malformed JSON, wrong shapes, bad coordinates, duplicates and lists longer than five are sanitised on read |
| Favourites | `src/hooks/useFavourites.ts` | add / remove, duplicate by `id` ignored, hard cap of 5, `isFull` for the UI |
| Units | `src/hooks/useUnitsPreference.ts` | °C / °F choice restored on reload; an unknown stored value falls back to metric |
| UI | `src/components/FavouritesBar.tsx` | saved-city chips with remove buttons, `aria-current` on the active city, save button that disables at five with an explanation |

Saving is explicit: restoring the *favourites list* never fires a weather request. Selecting
a saved city switches the dashboard, and every add/remove/switch is announced through a
polite live region.

The **currently viewed city** is persisted separately (`weatherboard.city.v1`, validated by
the same `parseCity` used for favourites), so a reload returns to that city and loads its
weather. A first-time visitor with nothing stored still sees the empty state; a malformed
stored value is ignored rather than shown as an error. There is no clear-city control yet —
choosing another city replaces it.

## Installable PWA (C6)

| Piece | Where | Notes |
|---|---|---|
| Manifest | `public/manifest.webmanifest` | name, short name, `display: standalone`, theme/background `#0b1220`, 192 + 512 icons and a maskable 512 |
| Icons | `public/icons/*.png` | generated from code by `python3 scripts/generate-icons.py`, no binary assets invented by hand |
| Registration | `src/pwa/register.ts` | production only (`import.meta.env.PROD`); a dev-mode SW in front of Vite is a debugging trap |
| Service worker | `public/sw.js` | versioned shell cache, `skipWaiting` + `clients.claim`, old caches deleted on activate |
| Precache | `vite.config.ts` | a small local plugin writes the hashed build asset list into `sw.js` and derives the cache name from that list, so every build gets a fresh cache |

The page links the manifest and apple-touch-icon, and the browser's own install affordance
is what matters — there is no custom install button pretending to be one.

## Offline behaviour (C7)

- **App shell:** navigations are network-first with the cached `/index.html` as fallback;
  hashed JS/CSS/icons are cache-first with a background refresh (stale-while-revalidate).
- **API:** the service worker never intercepts `/api/*`. Live weather is never faked from a
  cache and no key or provider URL can end up in a cache entry.
- **Forecast:** the last successful snapshot is stored per city **and unit system** in
  `localStorage` (`src/lib/weatherCache.ts`, newest five entries). When a request fails the
  dashboard renders that snapshot with a timestamped banner.
- **Wording:** the banner says *Offline* only when the browser reports no connectivity;
  if the browser is online but the request failed it says *Cached* instead, so the UI never
  claims to be offline (or online) when it is not.
- **City search:** with `navigator.onLine === false` no request is attempted and the field
  says city search needs a connection; if a request fails anyway, the normal API error and
  retry path is used.

## Visual identity

The interface is designed from the written brief (premium, minimal, cinematic, atmospheric).
The reference image was not present in this chat's workspace, so nothing was copied from it.

- **Palette:** deep midnight navy backgrounds, charcoal glass, a single cool accent and a
  restrained warm highlight. Light mode is a soft daylight variant of the same tokens,
  selected by `prefers-color-scheme`; dark is the primary identity.
- **Glass:** low-opacity panels (`--glass-bg`), one highlight line
  (`--glass-highlight`), hairline borders and large soft shadows. Backdrop blur is dropped
  below 480 px where it is most expensive, replaced by a more opaque fill.
- **Type:** light-weight display temperature (`font-weight: 200`, tight tracking, tabular
  numerals), small uppercase labels, and a measured hierarchy; all body text keeps the
  contrast fixes from earlier checkpoints.
- **Spacing:** consistent 4 px-based scale, generous panel padding from 768 px, and a
  mobile-first single column at 375 px.

### Weather-reactive atmosphere

`src/components/WeatherAtmosphere.tsx` renders one fixed, decorative layer behind the app.
It is driven **only** by the normalised snapshot (`current.icon`, `current.isDay`); there is
no invented condition, no video, no animation library.

| Snapshot icon | Scene | Motion |
|---|---|---|
| `clear-day` | sun glow | slow 20 s breathing light |
| `clear-night` / `partly-cloudy-night` | deep navy, moon, 34 stars | moon glow, star twinkle |
| `partly-cloudy-*` | sun/moon + three cloud layers | clouds drift at three speeds |
| `cloudy` | three cloud layers | slow drift |
| `drizzle` / `rain` / `heavy-rain` | masked fine streaks + clouds | 1.6 s fall (1.1 s heavy) |
| `thunderstorm` | rain + flash layer | two brief flashes per 13 s, only for real storms |
| `snow` / `sleet` | 22 flakes at three depths | varied fall speed and blur |
| `fog` | two blurred bands | slow alternating drift |
| `wind` | three gust streaks | sweep across the viewport |
| `unknown` / loading / empty | neutral ambience | none |

The layer is `aria-hidden`, `pointer-events: none` and `position: fixed`, so it cannot block
loading or interaction. All animation is CSS `transform`/`opacity` (plus a paint-only rain
translation) and every animation is disabled under `prefers-reduced-motion: reduce`, while
the scene itself stays visible.

## Verification

### C1 — edge proxy

`npm test` — 29 tests (27 proxy + 2 app shell). `npm run typecheck` and `npm run lint`
are clean. The proxy was also exercised against the real Workers runtime with
`npm run dev:api` and `curl` for: health, live city search, live weather, cache `MISS`
then `HIT` (0.90 s → 0.027 s), cache keying by units, invalid `q`, invalid `limit`,
invalid `lat`, invalid `units`, `POST` → 405, unknown route → 404, allowed-origin
preflight → 204, forbidden origin → 403, and the SPA asset fallback.

Two findings from that matrix, both fixed rather than papered over:

1. Passing the bare `fetch` reference into dependency injection threw
   *Illegal invocation* in the Workers runtime (the global needs its `this`). It is now
   wrapped, with a comment explaining why; unit tests inject a stub and cannot catch it.
2. Aborts arrive as `DOMException`, which is **not** an `instanceof Error` in workerd or
   browsers, so timeouts were being mislabelled as provider failures. Detection is now
   by `name`, with a regression test.

### C2 — provider integration

`npm test` — **54 tests** across five files (28 proxy, 16 normalisation, 5 city hardening,
3 debounce, 2 app shell); `npm run typecheck`, `npm run lint` and `npm run build` are all
clean. Live in workerd with no credentials configured, `/api/weather?lat=24.8608&lon=67.0104`
returned a real Open-Meteo snapshot: 5 daily entries, `units: {°C, km/h}`, current
25.9 °C / 76 % humidity / "Overcast", `timezone: Asia/Karachi`, sunrise as UTC instants;
the second request was served from cache in 0.027 s (`HIT`) versus 0.737 s (`MISS`). Live
`/api/cities?q=karachi` returned normalised GeoDB-shaped results from the Open-Meteo
fallback with `meta.source: open-meteo`.

OpenWeatherMap and GeoDB paths are covered only by fixture-driven tests, because no
credentials exist here. They are reported as **not live-tested** until a real key returns
a `200` through this proxy.

### C3 — city search UI

`npm test` — **73 tests** across 7 files. Browser checks in the Cloud browser at
**375 × 812** and **1280 × 800**: `documentElement.scrollWidth` equalled the viewport in
both (no horizontal overflow), the dropdown rendered 4 px below the hint line, 5 live
results appeared, and the console was free of errors. Keyboard flow was driven for real:
↑ moved `aria-activedescendant` from `option-0` to `option-1`, Enter selected that city
(coordinates 57.8539 / 49.5597), closed the listbox and kept focus in the input. The
network log showed `GET /api/cities?q=kar&limit=5` **aborted** and
`GET /api/cities?q=karachi&limit=5` returning 200 — cancellation observed in a real
browser, not just in tests.

Two visual findings were fixed: the dropdown overlapped the hint line by 6 px, and
`--color-text-subtle` in light mode was 3.81:1 (below AA for small text) — now 5.30:1;
the dark value moved from 4.61:1 to 6.64:1.

### C4 — weather dashboard

`npm test` — **101 tests** across 10 files; `npm run typecheck`, `npm run lint` (0
warnings, 0 errors) and `npm run build` are all clean (JS 238.5 kB / gzip 74.4 kB,
CSS 13.2 kB / gzip 3.1 kB). New coverage: successful load, five forecast days, loading,
error plus retry, refresh keeping data visible while it runs, missing optional fields,
imperial display, city switching and stale-response rejection, plus the Worker's
`refresh=1` cache bypass.

Live check in the Cloud browser against the real Worker and Open-Meteo (no credentials,
so the fallback serves the data), selecting Karachi: 25 °C / *Overcast* / feels like
29 °C / 85 % humidity / 8.7 km/h wind / sunrise 06:46 / sunset 17:45, five forecast days
(Fri 13 Nov – Tue 17 Nov) with min/max and 53 % / 34 % / 2 % / 0 % precipitation,
`Data from Open-Meteo · times shown in Asia/Karachi`. Verifications at **375 × 1000**,
**768 × 1100** and **1280 × 1000**: `documentElement.scrollWidth` never exceeded the
viewport, the forecast grid reported five columns at 1280, and the console had no errors.
Toggling °F re-requested with `units=imperial` and rendered 78 °F / feels like 85 °F /
5.4 mph; Refresh issued a request the Worker log recorded as `200`, consistent with the
bypass path. Dark mode was checked by emulating `prefers-color-scheme: dark`
(`rgb(11, 18, 32)` page background, all text legible). Screenshots:
`artifacts/c4-375-empty.png`, `c4-375-dashboard.png`, `c4-375-dashboard-dark.png`,
`c4-768-dashboard.png`, `c4-1280-dashboard.png`, `c4-1280-imperial.png`.

Three things were fixed rather than hidden during this checkpoint:

1. The first dashboard draft rendered the city name twice (toolbar and current
   conditions), which is redundant for sighted users and confusing for screen readers.
   The duplicate heading was removed and the section now has a visually hidden
   *Current conditions* heading.
2. The C0 shell test asserted that no `°C` string exists anywhere; that is no longer true
   once a unit toggle exists. It now asserts that no *numeric* temperature is rendered
   before a city is chosen, which preserves the test's intent (nothing pretends to have
   data) instead of weakening it.
3. Oxlint's `react(set-state-in-effect)` flagged the fetch effect. `load()` only updates
   state after the request settles, so the warning is a false positive; it is suppressed
   on that one line with a comment explaining why, not globally disabled.

### C5 — favourites and preferences

`npm test` — **150 tests** across 15 files at the end of C5 (17 storage, 7 favourites hook,
3 unit-preference hook, 7 favourites bar, 3 app-preference tests, plus the existing suite);
typecheck and lint clean. In the production preview: selecting Karachi and pressing
*Save Karachi* updated the counter to `1/5`; switching to °F and reloading restored both the
saved city chip and the °F selection, and the dashboard correctly did **not** auto-request
a city. Malformed storage (`{not json`, `"kelvin"`) renders an empty, usable app rather than
an error, covered by tests.

### C6 — installable PWA

Built with `npm run build`: `dist/sw.js` contains a 10-entry precache list and the cache name
`weatherboard-shell-8c83d8fdf8b3` derived from that list; `dist/manifest.webmanifest` carries
the 192/512/maskable icons, `display: standalone`, `start_url: /` and the theme colours.

In the real production preview, Chrome's DevTools Protocol reported:

- `Page.getAppManifest` — manifest loaded, **no errors**.
- `Page.getInstallabilityErrors` — `[]`, i.e. no installability blockers.
- Service worker — `activated`, scope `https://…/`, `navigator.serviceWorker.controller`
true.
- `caches.keys()` — one cache (`weatherboard-shell-8c83d8fdf8b3`) with 10 entries.

Screenshots: `artifacts/c6-375-production.png`, `c6-768-production.png`,
`c6-1280-production.png`. The browser's install affordance was not clicked (this is a
headless browser); installability is reported by Chrome's own checks, not by a custom button.

### C7 — offline behaviour

Verified against the production build with the network emulated offline **and the browser
HTTP cache disabled** (otherwise Chromium answered `/api/weather` from its own cache, which
is not the app's offline path). After a reload with no network: the shell rendered from the
service worker, the saved-city chip was restored, clicking it made `/api/weather` fail and
the dashboard displayed the cached snapshot (29 °C, five forecast days) with the banner
*“Cached — Live weather could not be reached. Showing the last saved forecast from 06:37.”*
Typing in the search field while offline produced the API error and *Try again*, no crash.

One honest environment limit: this headless Chromium keeps `navigator.onLine === true` even
under CDP offline emulation, so the *Offline* wording and the “skip the request entirely”
search path are covered by unit tests that mock `navigator.onLine`, not by the browser run.
Screenshots: `artifacts/c7-375-offline-shell.png`, `c7-375-offline-weather.png`,
`c7-375-offline-search.png`, `c7-1280-offline-weather.png`.

### Visual refinement, persistence and C8 feasibility

`npm test` — **170 tests** across 17 files (19 new: atmosphere mapping/rendering, selected-city
persistence, storage validation and app-level preference tests). `npm run typecheck` and
`npm run lint` are clean; `npm run build` succeeds with CSS 26.3 kB (gzip 5.8 kB) and JS
248.6 kB (gzip 77.1 kB), service-worker precache 10 entries in cache
`weatherboard-shell-ef20b0947f7d`.

Checked in the **production preview** at **375 × 1000**, **768 × 1100** and **1280 × 1000**
(dark colour scheme): `documentElement.scrollWidth` never exceeded the viewport, the header
stayed on one row at 375 px, and passwords/secrets are absent from the bundle as before.
The live conditions exercised the atmosphere with real data: rain (Moscow 3 °C, light rain),
clear night (Tokyo, 34 stars + moon), cloudy (Seattle), clear day (London, sun glow). No city
was showing snow or a thunderstorm at verification time, so those two scenes are covered by
tests rather than screenshots; lightning is rendered only for `thunderstorm`.

Other checks in the same build:

- `prefers-reduced-motion: reduce` → computed `animation-name: none` on the cloud and star
  layers; the scene remains visible.
- Reload with Moscow selected → the dashboard restored Moscow and **loaded its weather**; the
  stored value was the normalised city object, not a raw API body.
- Offline reload (network emulated offline, HTTP cache disabled) → the shell came from the
  service worker, the remembered city was restored, the cached forecast rendered with the
  *Cached* banner, five days, and the rain atmosphere from the cached snapshot. Offline
  search failed gracefully with the API error and *Try again*.
- Chrome `Page.getAppManifest` reports no errors and the parsed manifest carries
  `start_url`, `scope` and all three icons; `Page.getInstallabilityErrors` returns `[]`.
  A first read taken immediately after a fresh service-worker install transiently reported
  manifest errors before Chrome had processed the file; the re-read is the reliable result,
  and that is what is claimed here.

Screenshots: `artifacts/c8-prod-1280.png`, `c8-prod-768.png`, `c8-prod-375.png`, plus scene
captures `c8-1280-rain.png`, `c8-375-night.png`, `c8-375-fog.png`, `c8-375-cloudy.png`,
`c8-1280-clear-day.png`, `c8-prod-375-offline.png`, and the empty state in dark and light:
`c8-1280-empty-dark.png`, `c8-375-empty-dark.png`, `c8-375-empty-light.png`.

### C9/C10 final QA — accessibility, responsive and interaction checks

Checked against the **production build** (`vite preview`) in Chromium, dark and light.

- **Responsive:** 375 × 1000, 768 × 1100 and 1280 × 1000 all report
  `scrollWidth === innerWidth` (no horizontal overflow). The 375 px header stays on one
  row and the forecast collapses to a two-column grid; 768 px uses the five-column
  forecast and side-by-side current conditions.
- **Keyboard:** Tab order is unit toggle → search → saved cities → save/refresh; every
  focusable control reports a `2px solid` focus outline and `:focus-visible` matches.
  The combobox exposes `aria-expanded`, `aria-controls`, `aria-activedescendant` and
  `aria-autocomplete`, ArrowDown/ArrowUp move the active option, Enter selects, Escape
  closes. Selection was completed end-to-end with the keyboard alone.
- **Screen readers:** labelled search input, `role="listbox"`/`role="option"` with
  `aria-selected`, `aria-pressed` on the unit toggle, `aria-current` on the selected saved
  city, an `aria-label` on each remove button, `role="alert"` for errors and polite live
  regions for search and weather announcements.
- **axe-core 4.10.2** (WCAG 2.0/2.1 A+AA plus best-practice): **0 violations** on the
  empty state, dashboard, open search listbox and error state, in both dark and light
  themes. An earlier run taken mid-fade reported contrast failures; re-running after the
  600 ms entry animation and 140–240 ms colour transitions settle shows none, and the
  computed colours are the token values.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, 0 of 60 sampled atmosphere
  nodes report an animation, while the scene itself remains rendered.
- **Interactions (deterministic mocked weather because the upstream provider was down, see
  below):** keyboard city selection → 12 °C rain dashboard with 5 days; unit toggle →
  54 °F and correct `aria-pressed`; save → `1/5` saved city with a labelled remove button;
  refresh → 12 °C → 18 °C; reload → Karachi restored from storage and weather reloaded;
  forced network failure → *Weather unavailable for Karachi* with `network_error` and a
  working *Try again* that recovered. A previously cached snapshot correctly takes
  precedence over the error state, labelled *Cached*.
- **Console/network:** no page errors and no unexpected failed requests during normal
  flows; the only console error observed was the intentional `ERR_FAILED` injected for the
  error-path test. `/api/*` was never served by the service worker.
- **PWA:** manifest parses with no errors, `start_url`/`scope`/icons present,
  `Page.getInstallabilityErrors` returns `[]`, service worker `activated` and controlling.

**Provider outage during QA:** `api.open-meteo.com` became unreachable from this VM
(direct `curl` timed out, Worker returned `504 upstream_timeout`) while every other host
resolved. Live success-state checks therefore used deterministic mocked responses for this
pass; real-data screenshots and checks from earlier the same day remain in `artifacts/`.
OpenWeatherMap and GeoDB still cannot be live-tested without credentials.

Screenshots: `c9-375-dashboard.png`, `c9-768-dashboard.png`, `c9-1280-dashboard.png`,
`c9-1280-dashboard-light.png`, `c9-1280-empty-light.png`, `c9-1280-error-dark.png`,
`c9-focus-1280.png`.

### Push reminders (C8) — feasibility only, deliberately not implemented

The challenge requires a reminder that arrives when the browser is closed, which means real
Web Push. That was investigated and **not built**, because the pieces that make it real do
not exist in this workspace:

| Requirement | Status here |
|---|---|
| Browser `PushSubscription` | Implementable, but needs a public VAPID key and a server to receive it |
| VAPID key pair | Not configured; can be generated locally, but nothing would send |
| Durable subscription storage | No database provisioned. Freebuff Sites could supply D1, but no site exists and deploying needs authorisation |
| Server-side sender | No deployed server with credentials to run one |
| Scheduled trigger | **Unavailable.** Freebuff Sites deploys Workers with fetch handlers but exposes no cron triggers; `wrangler whoami` reports no Cloudflare account in this environment |
| Service-worker `push` / `notificationclick` | Could be written safely, but without a sender it can never deliver — that would be the fake feature the brief forbids |
| Stable HTTPS origin | Only rotating preview hostnames; a production URL is not configured |

What would unblock it: an authorised deployment target with a scheduler (a Cloudflare
account plus `wrangler login`/API token and a Cron Trigger, or any host with scheduled jobs),
a durable store for subscriptions (D1/KV), a VAPID key pair, and a decision between a
self-hosted sender (`web-push` in a Worker) or a managed notification service such as Knock
(which still needs its API key and a trigger). Nothing has been faked with a timer or a
local notification.

## API configuration

No credentials are committed, and none are exposed to the browser: every provider key
is used only by the edge proxy, because any `VITE_*` variable is compiled into the
public bundle.

Copy `.env.example` to `.env` for local worker development and fill in:

| Variable | Used by | Where to get it | Free-tier limits |
|---|---|---|---|
| `OWM_API_KEY` | `worker/` | openweathermap.org → Free "Weather API" plan | 60 calls/min, 1,000,000/month; current + 5-day/3-hour forecast |
| `RAPIDAPI_KEY` | `worker/` | rapidapi.com → GeoDB Cities (Basic plan) | 1,000 requests/day, 1/second, ≤10 results per page |

No push/VAPID variables are read: background push is **not implemented** (see *Push
reminders (C8)*), so `.env.example` lists only the two provider keys. Adding unused
secrets would imply a feature that does not exist.

Missing credentials are a supported state, not a crash: the app reports which provider
is unconfigured and falls back where it can. Open-Meteo needs no key and serves as the
weather fallback and the last-resort geocoder.

## Deployment

**Status: not deployed. There is no public URL, and this README does not claim one.**
Build artifacts are deployment-ready; publishing needs credentials and authorisation that
do not exist in this workspace.

### Option A — Cloudflare Workers (matches `wrangler.jsonc`)

```bash
npm ci && npm run build
npx wrangler login                      # or export CLOUDFLARE_API_TOKEN
npx wrangler secret put OWM_API_KEY      # server-side only
npx wrangler secret put RAPIDAPI_KEY     # optional; GeoDB autocomplete
npx wrangler deploy
```

Then set `ALLOWED_ORIGINS` in `wrangler.jsonc` (or the dashboard) to the deployed origin
and deploy once more. The Worker serves `dist/` and handles `/api/*`. Free plan supports
cron triggers, which C8 would need; this project does not use one yet.

`npx wrangler deploy --dry-run` is used by the project's QA to prove the Worker bundles
without needing an account.

### Option B — Freebuff Sites

Static assets plus a fetch-handler Worker, no cron and no Node server. This project's
Wrangler assets+Worker layout would need a Sites manifest and a deploy from an authorised
session; the platform URL is not a production domain for push subscriptions. Not done.

### What is missing for a real deployment

- A Cloudflare account login / API token **with authorisation to publish**, or approval to
  deploy through Freebuff Sites.
- Provider keys entered as Worker secrets (never committed, never in chat).
- The final origin, so `ALLOWED_ORIGINS` can be set to it and the 403 CORS guard keeps
  working.

Until those exist, the only URLs that have served this app are rotating preview hosts,
which are intentionally not presented as the final deployment.

## Checkpoints

| # | Scope | Status |
|---|---|---|
| C0 | Scaffold: Vite/React/TS, tokens, test setup, docs skeleton | **done — build, lint, typecheck, tests verified** |
| C1 | Edge API proxy: routes, CORS, cache, error envelope | **done — 29 tests + live workerd matrix** |
| C2 | OWM + Open-Meteo providers, normalisation, fallback | **done — 54 tests + live Open-Meteo snapshot in workerd** |
| C3 | GeoDB autocomplete, debounce, validation, race guard | **done — 73 tests + browser checks at 375/1280** |
| C4 | Current conditions + 5-day forecast grouping | **done — 101 tests + live browser checks at 375/768/1280** |
| C5 | Favourites (max 5) + unit preference persistence | **done — 150 tests + production reload check** |
| C6 | Installable PWA: manifest, icons, service worker | **done — 0 installability errors, SW activated** |
| C7 | Offline support: shell cache + cached forecast | **done — offline reload + cached forecast verified** |
| C8 | Web Push morning reminder (+ cron worker) | **blocked — no scheduler/deploy target/credentials; see feasibility above** |
| C9 | Responsive verification at 375 / 768 / 1280 | **done — keyboard, axe and interaction QA; see C9 QA** |
| C10 | Accessibility pass | **done — 0 axe violations in settled dark and light states** |
| C11 | Clean-install verification, README completion | **done — `npm ci` + build verified; local history prepared** |
| C12 | Deploy + public repository (authorisation required) | **prepared, not published — credentials/authorisation missing** |

## Known limitations

- The morning push reminder is still not built (C8), because there is no scheduler,
  durable store, deploy target or credentials — not because of missing UI code.
- No public repository and no public deployment: `.git` has a local history only, and no
  remote is configured. Publishing needs an explicit repository name/visibility and an
  authorised push; deployment needs a Cloudflare login/API token or approval to deploy via
  Freebuff Sites.
- A new deployment needs a reload before the updated service worker takes over; the old
  cache is deleted on activate.
- There is no custom “Install app” button. Installation uses the browser's own affordance;
  Chrome reported no installability errors, but the install flow itself was not clicked in
  the headless browser.
- Favourites, the unit preference and the currently viewed city persist. There is no
  explicit “clear city” control; selecting another city replaces the remembered one.
- The cinematic atmosphere follows the snapshot's icon. If a provider omits a usable icon,
  the neutral ambience is shown rather than a guessed scene.
- Genuine Web Push is blocked by infrastructure, not code — see *Push reminders (C8)*.
- The visual reference image was not available inside this chat's workspace, so the design
  follows the written direction only.
- OpenWeatherMap and GeoDB are implemented, normalised and fixture-tested but **not
  live-tested** — no credentials exist in this environment. Open-Meteo (weather and
  geocoding fallback) is live-tested in workerd.
- `/api/weather` returns the normalized `WeatherSnapshot`. Where a provider genuinely has
  no equivalent field (OWM timezone identifier, Open-Meteo place name and pressure) the
  value is `null` rather than invented.
- City search currently resolves through the Open-Meteo geocoding fallback, because no
  RapidAPI key is configured; the GeoDB path is fixture-tested only.
- Refresh sends `refresh=1`, which skips the Worker's 10-minute cache read but still
  writes the new result. There is no client-side polling; the timestamp tells the user
  how fresh the data is.
- The 5-day forecast shows precipitation probability when the provider supplies it;
  sunrise/sunset come from the first forecast day, which is *today* in the city's zone.
- `wrangler.jsonc` targets Cloudflare's deploy format. Publishing through Freebuff Sites
  will need a Sites manifest at C12 instead.
- `PROMPTS.md` records only prompts actually sent to the coding agent, and is appended
  as work proceeds.
