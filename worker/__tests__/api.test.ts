// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import {
  geodbCitiesFixture,
  openMeteoGeocodeFixture,
  openMeteoWeatherFixture,
  owmCurrentFixture,
  owmForecastFixture,
} from '../fixtures/providers'
import type { CacheLike, Deps, Env } from '../types'

const NOW = Date.UTC(2026, 10, 12, 18, 0, 0)
const ORIGIN = 'https://app.test'

interface FakeCache extends CacheLike {
  readonly store: Map<string, Response>
}

function fakeCache(): FakeCache {
  const store = new Map<string, Response>()
  return {
    store,
    async match(request) {
      const hit = store.get(request.url)
      return hit ? hit.clone() : undefined
    },
    async put(request, response) {
      store.set(request.url, response.clone())
    },
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>

interface RecordedRequest {
  readonly url: string
  readonly headers: Record<string, string>
}

function stubFetch(handler: Handler) {
  const requests: RecordedRequest[] = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const headers: Record<string, string> = {}
    new Headers(init?.headers).forEach((value, name) => {
      headers[name] = value
    })
    requests.push({ url: raw, headers })
    return handler(new URL(raw), init)
  }) as typeof fetch
  return { impl, requests }
}

function makeApp(
  options: {
    env?: Env
    handler?: Handler
    cache?: FakeCache
    timeoutMs?: number
  } = {},
) {
  const cache = options.cache ?? fakeCache()
  const stub = stubFetch(options.handler ?? (() => jsonResponse({})))
  const deps: Deps = {
    env: { ALLOWED_ORIGINS: ORIGIN, ...options.env },
    fetchImpl: stub.impl,
    cache,
    now: () => NOW,
    timeoutMs: options.timeoutMs ?? 50,
  }
  return { app: createApp(deps), cache, requests: stub.requests }
}

const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://api.test${path}`, { headers })

const abortError = () => {
  const error = new Error('The operation was aborted')
  error.name = 'AbortError'
  return error
}

/** The Workers runtime throws DOMException, which is not an Error instance. */
const domExceptionAbort = () => ({ name: 'AbortError', message: 'The operation was aborted' })

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> }
}

interface CitiesBody {
  query: string
  cities: { name: string; country: string; label: string; latitude: number }[]
  meta: { source: string; fallbackFrom: string | null; fallbackReason: string | null }
}

interface WeatherBody {
  provider: string
  units: string
  fetchedAt: string
  weather: {
    location: { name: string | null; timezone: string | null }
    current: { temperature: number; isDay: boolean; condition: string }
    daily: { date: string; min: number; max: number }[]
  }
  meta: { fallbackFrom: string | null; fallbackReason: string | null }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

describe('GET /api/health', () => {
  it('reports which providers are configured without exposing credentials', async () => {
    const { app } = makeApp({ env: { OWM_API_KEY: 'owm-secret-key', RAPIDAPI_KEY: 'rapid-secret-key' } })
    const response = await app(get('/api/health'))
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(text).not.toContain('owm-secret-key')
    expect(text).not.toContain('rapid-secret-key')

    const body = JSON.parse(text) as {
      providers: Record<string, { configured: boolean }>
    }
    expect(body.providers.openweathermap.configured).toBe(true)
    expect(body.providers.geodb.configured).toBe(true)
    expect(body.providers['open-meteo'].configured).toBe(true)
  })
})

describe('CORS', () => {
  it('answers preflight for an allowed origin', async () => {
    const { app } = makeApp()
    const response = await app(
      new Request('https://api.test/api/weather', {
        method: 'OPTIONS',
        headers: { origin: ORIGIN },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(response.headers.get('access-control-allow-methods')).toContain('GET')
  })

  it('rejects a browser origin that is not on the allowlist', async () => {
    const { app, requests } = makeApp()
    const response = await app(get('/api/weather?lat=1&lon=2', { origin: 'https://evil.test' }))

    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(requests).toHaveLength(0)
    expect((await readJson<ErrorBody>(response)).error.code).toBe('cors_forbidden')
  })

  it('does not replay a cached response to a different allowed origin', async () => {
    const { app } = makeApp({
      env: { ALLOWED_ORIGINS: 'https://a.test,https://b.test' },
      handler: (url) =>
        url.host === 'api.open-meteo.com' ? jsonResponse(openMeteoWeatherFixture) : jsonResponse({}, 404),
    })

    const first = await app(get('/api/weather?lat=24.86&lon=67.01', { origin: 'https://a.test' }))
    expect(first.headers.get('x-weatherboard-cache')).toBe('MISS')
    expect(first.headers.get('access-control-allow-origin')).toBe('https://a.test')
    await first.text()

    const second = await app(get('/api/weather?lat=24.86&lon=67.01', { origin: 'https://b.test' }))
    expect(second.headers.get('x-weatherboard-cache')).toBe('HIT')
    expect(second.headers.get('access-control-allow-origin')).toBe('https://b.test')
    await second.text()
  })
})

describe('GET /api/cities validation', () => {
  it('rejects a query shorter than two characters without calling a provider', async () => {
    const { app, requests } = makeApp()
    const response = await app(get('/api/cities?q=a'))

    expect(response.status).toBe(400)
    const body = await readJson<ErrorBody>(response)
    expect(body.error.code).toBe('invalid_input')
    expect(body.error.details).toMatchObject({ field: 'q' })
    expect(requests).toHaveLength(0)
  })

  it('rejects whitespace-only queries', async () => {
    const { app } = makeApp()
    const response = await app(get('/api/cities?q=%20%20%20'))
    expect(response.status).toBe(400)
  })

  it('rejects an out-of-range limit', async () => {
    const { app } = makeApp()
    const response = await app(get('/api/cities?q=karachi&limit=50'))

    expect(response.status).toBe(400)
    expect((await readJson<ErrorBody>(response)).error.details).toMatchObject({ field: 'limit' })
  })

  it('rejects control characters', async () => {
    const { app } = makeApp()
    const response = await app(get('/api/cities?q=ka%00rachi'))
    expect(response.status).toBe(400)
  })
})

describe('GET /api/cities', () => {
  const geodbHandler: Handler = (url) =>
    url.host === 'wft-geo-db.p.rapidapi.com'
      ? jsonResponse(geodbCitiesFixture)
      : jsonResponse({ unexpected: url.host }, 500)

  it('uses GeoDB when configured, sends the key as a header and caches the result', async () => {
    const { app, cache, requests } = makeApp({
      env: { RAPIDAPI_KEY: 'rapid-secret-key' },
      handler: geodbHandler,
    })

    const first = await app(get('/api/cities?q=karachi'))
    const body = await readJson<CitiesBody>(first)

    expect(first.status).toBe(200)
    expect(first.headers.get('x-weatherboard-cache')).toBe('MISS')
    expect(body.meta.source).toBe('geodb')
    expect(body.cities).toHaveLength(2)
    expect(body.cities[0]).toMatchObject({
      name: 'Karachi',
      country: 'Pakistan',
      label: 'Karachi, Sindh, Pakistan',
      latitude: 24.8608,
    })

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toContain('namePrefix=karachi')
    expect(requests[0].url).not.toContain('rapid-secret-key')
    expect(requests[0].headers['x-rapidapi-key']).toBe('rapid-secret-key')
    expect(requests[0].headers['x-rapidapi-host']).toBe('wft-geo-db.p.rapidapi.com')

    const second = await app(get('/api/cities?q=karachi'))
    expect(second.headers.get('x-weatherboard-cache')).toBe('HIT')
    expect(requests).toHaveLength(1)
    expect(cache.store.size).toBe(1)
    await second.text()
  })

  it('falls back to Open-Meteo geocoding when GeoDB is not configured', async () => {
    const { app, requests } = makeApp({
      handler: (url) =>
        url.host === 'geocoding-api.open-meteo.com'
          ? jsonResponse(openMeteoGeocodeFixture)
          : jsonResponse({ unexpected: url.host }, 500),
    })

    const response = await app(get('/api/cities?q=karachi'))
    const body = await readJson<CitiesBody>(response)

    expect(response.status).toBe(200)
    expect(body.meta.source).toBe('open-meteo')
    expect(body.cities[0].label).toBe('Karachi, Sindh, Pakistan')
    expect(requests.every((request) => !request.url.includes('rapidapi'))).toBe(true)
  })

  it('falls back to Open-Meteo when GeoDB is rate limited', async () => {
    const { app } = makeApp({
      env: { RAPIDAPI_KEY: 'k' },
      handler: (url) => {
        if (url.host === 'wft-geo-db.p.rapidapi.com') return jsonResponse({}, 429)
        if (url.host === 'geocoding-api.open-meteo.com') return jsonResponse(openMeteoGeocodeFixture)
        return jsonResponse({}, 500)
      },
    })

    const response = await app(get('/api/cities?q=karachi'))
    const body = await readJson<CitiesBody>(response)

    expect(response.status).toBe(200)
    expect(body.meta.source).toBe('open-meteo')
    expect(body.meta.fallbackFrom).toBe('geodb')
    expect(body.meta.fallbackReason).toBe('rate_limited')
  })

  it('returns a provider error when both city providers fail, and caches nothing', async () => {
    const { app, cache } = makeApp({
      env: { RAPIDAPI_KEY: 'k' },
      handler: () => jsonResponse({}, 500),
    })

    const response = await app(get('/api/cities?q=karachi'))
    const body = await readJson<ErrorBody>(response)

    expect(response.status).toBe(502)
    expect(body.error.code).toBe('provider_error')
    expect(cache.store.size).toBe(0)
  })
})

describe('GET /api/weather validation', () => {
  it('requires lat and lon', async () => {
    const { app } = makeApp()
    const response = await app(get('/api/weather'))
    const body = await readJson<ErrorBody>(response)

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('invalid_input')
    expect(body.error.details).toMatchObject({ field: 'lat' })
  })

  it('rejects out-of-range coordinates', async () => {
    const { app } = makeApp()
    const response = await app(get('/api/weather?lat=91&lon=0'))
    expect(response.status).toBe(400)
  })

  it('rejects an unknown unit system', async () => {
    const { app } = makeApp()
    const response = await app(get('/api/weather?lat=1&lon=1&units=kelvin'))
    expect(response.status).toBe(400)
    expect((await readJson<ErrorBody>(response)).error.details).toMatchObject({ field: 'units' })
  })
})

describe('GET /api/weather', () => {
  const owmHandler: Handler = (url) => {
    if (url.host !== 'api.openweathermap.org') return jsonResponse({ unexpected: url.host }, 500)
    return url.pathname.endsWith('/forecast')
      ? jsonResponse(owmForecastFixture)
      : jsonResponse(owmCurrentFixture)
  }

  it('uses OpenWeatherMap as the primary provider', async () => {
    const { app, requests } = makeApp({ env: { OWM_API_KEY: 'owm-secret-key' }, handler: owmHandler })

    const response = await app(get('/api/weather?lat=24.86&lon=67.01'))
    const body = await readJson<WeatherBody>(response)

    expect(response.status).toBe(200)
    expect(body.provider).toBe('openweathermap')
    expect(body.units).toBe('metric')
    expect(body.weather.location.name).toBe('Karachi')
    expect(body.weather.daily).toHaveLength(5)
    expect(body.weather.current.temperature).toBe(26.3)
    expect(body.meta.fallbackFrom).toBeNull()

    expect(requests).toHaveLength(2)
    // OpenWeatherMap's free endpoints only accept the key as the `appid` query
    // parameter, so it is unavoidably present in the upstream URL. The proxy
    // therefore never logs or echoes an upstream URL; the client-facing
    // assertion below is the one that matters.
    for (const request of requests) {
      expect(new URL(request.url).searchParams.get('appid')).toBe('owm-secret-key')
    }
    expect(JSON.stringify(body)).not.toContain('owm-secret-key')
  })

  it('falls back to Open-Meteo when OpenWeatherMap rate limits, and says so', async () => {
    const { app } = makeApp({
      env: { OWM_API_KEY: 'k' },
      handler: (url) =>
        url.host === 'api.openweathermap.org'
          ? jsonResponse({}, 429)
          : jsonResponse(openMeteoWeatherFixture),
    })

    const response = await app(get('/api/weather?lat=24.86&lon=67.01'))
    const body = await readJson<WeatherBody>(response)

    expect(response.status).toBe(200)
    expect(body.provider).toBe('open-meteo')
    expect(body.meta.fallbackFrom).toBe('openweathermap')
    expect(body.meta.fallbackReason).toBe('rate_limited')
    expect(body.weather.location.timezone).toBe('Asia/Karachi')
    expect(body.weather.daily).toHaveLength(5)
  })

  it('falls back when OpenWeatherMap credentials are rejected', async () => {
    const { app } = makeApp({
      env: { OWM_API_KEY: 'bad-key' },
      handler: (url) =>
        url.host === 'api.openweathermap.org'
          ? jsonResponse({ cod: 401 }, 401)
          : jsonResponse(openMeteoWeatherFixture),
    })

    const response = await app(get('/api/weather?lat=24.86&lon=67.01'))
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(text).not.toContain('bad-key')
    const body = JSON.parse(text) as WeatherBody
    expect(body.provider).toBe('open-meteo')
    expect(body.meta.fallbackReason).toBe('provider_auth_error')
  })

  it('maps an upstream timeout to 504 when there is no healthy provider', async () => {
    const { app } = makeApp({
      env: { OWM_API_KEY: 'k' },
      handler: () => {
        throw abortError()
      },
    })

    const response = await app(get('/api/weather?lat=24.86&lon=67.01'))
    const body = await readJson<ErrorBody>(response)

    expect(response.status).toBe(504)
    expect(body.error.code).toBe('upstream_timeout')
  })

  it('maps a DOMException abort (not an Error instance) to 504', async () => {
    const { app } = makeApp({
      handler: () => {
        throw domExceptionAbort()
      },
    })

    const response = await app(get('/api/weather?lat=1&lon=1'))
    const body = await readJson<ErrorBody>(response)

    expect(response.status).toBe(504)
    expect(body.error.code).toBe('upstream_timeout')
  })

  it('falls back when OpenWeatherMap returns a structurally broken payload', async () => {
    const { app } = makeApp({
      env: { OWM_API_KEY: 'k' },
      handler: (url) => {
        if (url.host === 'api.openweathermap.org') return jsonResponse({ cod: 200, list: [] })
        return jsonResponse(openMeteoWeatherFixture)
      },
    })

    const response = await app(get('/api/weather?lat=24.86&lon=67.01'))
    const body = await readJson<WeatherBody>(response)

    expect(response.status).toBe(200)
    expect(body.provider).toBe('open-meteo')
    expect(body.meta.fallbackReason).toBe('provider_error')
  })

  it('returns 502 when both providers fail, and caches nothing', async () => {

    const { app, cache } = makeApp({
      env: { OWM_API_KEY: 'k' },
      handler: () => jsonResponse({}, 500),
    })

    const response = await app(get('/api/weather?lat=24.86&lon=67.01'))
    const body = await readJson<ErrorBody>(response)

    expect(response.status).toBe(502)
    expect(body.error.code).toBe('provider_error')
    expect(body.error.details).toMatchObject({ provider: 'open-meteo' })
    expect(cache.store.size).toBe(0)
  })

  it('returns 429 when every provider is rate limited', async () => {
    const { app } = makeApp({ env: { OWM_API_KEY: 'k' }, handler: () => jsonResponse({}, 429) })

    const response = await app(get('/api/weather?lat=1&lon=1'))
    expect(response.status).toBe(429)
    expect((await readJson<ErrorBody>(response)).error.code).toBe('rate_limited')
  })

  it('uses Open-Meteo directly when OpenWeatherMap is not configured', async () => {
    const { app, requests } = makeApp({
      handler: () => jsonResponse(openMeteoWeatherFixture),
    })

    const response = await app(get('/api/weather?lat=1&lon=1'))
    const body = await readJson<WeatherBody>(response)

    expect(response.status).toBe(200)
    expect(body.provider).toBe('open-meteo')
    expect(requests).toHaveLength(1)
  })

  it('bypasses the cache when an explicit refresh is requested', async () => {
    const { app, requests } = makeApp({ handler: () => jsonResponse(openMeteoWeatherFixture) })

    const first = await app(get('/api/weather?lat=24.86&lon=67.01'))
    expect(first.headers.get('x-weatherboard-cache')).toBe('MISS')
    await first.text()

    const cached = await app(get('/api/weather?lat=24.86&lon=67.01'))
    expect(cached.headers.get('x-weatherboard-cache')).toBe('HIT')
    await cached.text()
    expect(requests).toHaveLength(1)

    const refreshed = await app(get('/api/weather?lat=24.86&lon=67.01&refresh=1'))
    expect(refreshed.status).toBe(200)
    expect(refreshed.headers.get('x-weatherboard-cache')).toBe('MISS')
    expect(requests).toHaveLength(2)
    await refreshed.text()
  })

  it('serves a cached forecast on the second request and keys by units', async () => {
    const { app, requests } = makeApp({ handler: () => jsonResponse(openMeteoWeatherFixture) })

    const first = await app(get('/api/weather?lat=24.86&lon=67.01'))
    expect(first.headers.get('x-weatherboard-cache')).toBe('MISS')
    await first.text()

    const second = await app(get('/api/weather?lat=24.86&lon=67.01'))
    expect(second.headers.get('x-weatherboard-cache')).toBe('HIT')
    await second.text()
    expect(requests).toHaveLength(1)

    const imperial = await app(get('/api/weather?lat=24.86&lon=67.01&units=imperial'))
    expect(imperial.headers.get('x-weatherboard-cache')).toBe('MISS')
    await imperial.text()
    expect(requests).toHaveLength(2)
  })

  it('treats a malformed provider payload as a provider error', async () => {
    const { app } = makeApp({
      handler: () => new Response('not json', { status: 200 }),
    })

    const response = await app(get('/api/weather?lat=1&lon=1'))
    expect(response.status).toBe(502)
  })
})

describe('routing', () => {
  it('rejects unsupported methods', async () => {
    const { app } = makeApp()
    const response = await app(
      new Request('https://api.test/api/weather?lat=1&lon=1', { method: 'POST' }),
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toContain('GET')
    expect((await readJson<ErrorBody>(response)).error.code).toBe('method_not_allowed')
  })

  it('returns a typed 404 for unknown routes', async () => {
    const { app } = makeApp()
    const response = await app(get('/api/nope'))

    expect(response.status).toBe(404)
    expect((await readJson<ErrorBody>(response)).error.code).toBe('not_found')
  })
})
