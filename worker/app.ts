import { cacheKey, withCache } from './cache'
import { ApiError, corsHeaders, errorResponse, json, toApiError } from './http'
import { fetchGeodbCities } from './providers/geodb'
import { fetchOpenMeteoCities, fetchOpenMeteoWeather } from './providers/openMeteo'
import { fetchOwmWeather } from './providers/owm'
import { parseCitiesQuery, parseWeatherQuery } from './validate'
import type { CityProvider, Deps, WeatherProvider } from './types'

const TTL_SECONDS = { cities: 300, weather: 600 } as const
const DEFAULT_TIMEOUT_MS = 8000

/**
 * The whole API surface as a pure function of injected dependencies. Nothing
 * here reads a key from a request, and nothing returns one.
 */
export function createApp(deps: Deps): (request: Request) => Promise<Response> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const cors = corsHeaders(request.headers.get('origin'), deps.env)
    if (!cors) {
      return errorResponse(
        new ApiError('cors_forbidden', 403, 'This origin is not allowed to call the WeatherBoard API.'),
        {},
      )
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse(
        new ApiError('method_not_allowed', 405, `${request.method} is not supported for this route.`),
        { ...cors, allow: 'GET, HEAD, OPTIONS' },
      )
    }

    try {
      switch (url.pathname) {
        case '/api/health':
          return json(healthPayload(deps), { headers: cors })
        case '/api/cities':
          return await handleCities(deps, url, cors, timeoutMs)
        case '/api/weather':
          return await handleWeather(deps, url, cors, timeoutMs)
        default:
          return errorResponse(
            new ApiError('not_found', 404, `No API route matches ${url.pathname}.`),
            cors,
          )
      }
    } catch (error) {
      return errorResponse(toApiError(error), cors)
    }
  }
}

function healthPayload(deps: Deps) {
  return {
    ok: true,
    checkedAt: new Date(deps.now()).toISOString(),
    providers: {
      openweathermap: { configured: Boolean(deps.env.OWM_API_KEY), role: 'primary weather' },
      geodb: { configured: Boolean(deps.env.RAPIDAPI_KEY), role: 'primary city search' },
      'open-meteo': { configured: true, role: 'fallback weather and city search' },
    },
  }
}

async function handleCities(
  deps: Deps,
  url: URL,
  cors: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  const query = parseCitiesQuery(url)
  const key = cacheKey(url, { q: query.q.toLowerCase(), limit: String(query.limit) })

  return withCache(deps, key, TTL_SECONDS.cities, cors, async () => {
    const providers: CityProvider[] = deps.env.RAPIDAPI_KEY ? ['geodb', 'open-meteo'] : ['open-meteo']
    let lastError: ApiError | undefined
    let previous: CityProvider | null = null

    for (const provider of providers) {
      try {
        const cities =
          provider === 'geodb'
            ? await fetchGeodbCities(query, deps, timeoutMs)
            : await fetchOpenMeteoCities(query, deps, timeoutMs)

        return json(
          {
            query: query.q,
            cities,
            meta: {
              source: provider,
              fallbackFrom: previous,
              fallbackReason: lastError?.code ?? null,
            },
          },
          { headers: cors },
        )
      } catch (error) {
        lastError = toApiError(error)
        previous = provider
      }
    }

    throw lastError ?? new ApiError('provider_error', 502, 'City search is unavailable right now.')
  })
}

async function handleWeather(
  deps: Deps,
  url: URL,
  cors: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  const query = parseWeatherQuery(url)
  // `refresh=1` reads through the cache but still stores the fresh result, so an
  // explicit refresh never serves a stale body.
  const bypassCache = url.searchParams.get('refresh') === '1'
  const key = cacheKey(url, {
    lat: query.lat.toFixed(3),
    lon: query.lon.toFixed(3),
    units: query.units,
  })

  return withCache(
    deps,
    key,
    TTL_SECONDS.weather,
    cors,
    async () => {
    const providers: WeatherProvider[] = deps.env.OWM_API_KEY
      ? ['openweathermap', 'open-meteo']
      : ['open-meteo']
    let lastError: ApiError | undefined
    let previous: WeatherProvider | null = null

    for (const provider of providers) {
      try {
        const weather =
          provider === 'openweathermap'
            ? await fetchOwmWeather(query, deps, timeoutMs)
            : await fetchOpenMeteoWeather(query, deps, timeoutMs)

        return json(
          {
            provider,
            units: query.units,
            fetchedAt: new Date(deps.now()).toISOString(),
            weather,
            meta: {
              fallbackFrom: previous,
              fallbackReason: lastError?.code ?? null,
            },
          },
          { headers: cors },
        )
      } catch (error) {
        lastError = toApiError(error)
        previous = provider
      }
    }

      throw lastError ?? new ApiError('provider_error', 502, 'Weather is unavailable right now.')
    },
    { bypass: bypassCache },
  )
}
