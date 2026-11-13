/* WeatherBoard service worker.
 *
 * Scope: the app shell and static assets only.
 * - Navigations: network first, cached /index.html as the offline fallback.
 * - Static assets: cache first, refreshed in the background.
 * - /api/*: never intercepted. Live weather must never be faked from a cache;
 *   offline forecasts are rendered by the app from its own timestamped snapshot.
 *
 * CACHE_VERSION is replaced at build time with a hash of the precache list, so
 * every production build gets a fresh cache and old ones are dropped on activate.
 */
const CACHE_VERSION = '__SW_VERSION__'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            // A single missing file must not abort the whole install.
          }),
        ),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

function isStaticAsset(request) {
  if (request.destination === 'script' || request.destination === 'style') return true
  if (request.destination === 'image' || request.destination === 'font') return true
  return /\.(?:js|css|svg|png|webmanifest|woff2?)$/.test(new URL(request.url).pathname)
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_VERSION)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put('/index.html', response.clone())
    return response
  } catch {
    const cached = await cache.match('/index.html')
    if (cached) return cached
    return Response.error()
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)
  if (cached) {
    fetch(request)
      .then((response) => {
        if (response.ok) return cache.put(request, response)
        return undefined
      })
      .catch(() => undefined)
    return cached
  }

  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstAsset(request))
  }
})
