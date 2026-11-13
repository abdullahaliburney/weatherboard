import { ApiError } from '../http'
import type { Deps, Units, WeatherProvider } from '../types'
import { normalizeOwmWeather } from '../weather/snapshot'
import type { WeatherSnapshot } from '../weather/snapshot'
import { fetchProviderJson } from './fetch'

export interface WeatherRequest {
  readonly lat: number
  readonly lon: number
  readonly units: Units
}

const PROVIDER: WeatherProvider = 'openweathermap'
const LABEL = 'OpenWeatherMap'
const BASE = 'https://api.openweathermap.org/data/2.5'

/**
 * OpenWeatherMap free "Weather API": current conditions plus the 5-day /
 * 3-hour forecast, normalised into the shared WeatherSnapshot.
 *
 * One Call 3.0 is deliberately not used — it requires a paid subscription with
 * billing details, which a reviewer cannot be expected to enable.
 *
 * A 401 usually means a key that has not finished activating (up to ~2h), not
 * invalid code, so the error says the credentials were rejected rather than
 * guessing which.
 */
export async function fetchOwmWeather(
  query: WeatherRequest,
  deps: Deps,
  timeoutMs: number,
): Promise<WeatherSnapshot> {
  const key = deps.env.OWM_API_KEY
  if (!key) {
    throw new ApiError(
      'provider_unconfigured',
      503,
      'OpenWeatherMap is not configured on the server. Falling back to Open-Meteo.',
      { provider: PROVIDER },
    )
  }

  const params = new URLSearchParams({
    lat: String(query.lat),
    lon: String(query.lon),
    units: query.units,
    appid: key,
  })

  const [current, forecast] = await Promise.all([
    fetchProviderJson<unknown>(deps, {
      url: `${BASE}/weather?${params.toString()}`,
      label: LABEL,
      provider: PROVIDER,
      timeoutMs,
    }),
    fetchProviderJson<unknown>(deps, {
      url: `${BASE}/forecast?${params.toString()}`,
      label: LABEL,
      provider: PROVIDER,
      timeoutMs,
    }),
  ])

  return normalizeOwmWeather({ current, forecast }, query.units)
}
