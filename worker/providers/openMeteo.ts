import type { CityResult, Deps, Units } from '../types'
import { normalizeOpenMeteoWeather } from '../weather/snapshot'
import type { WeatherSnapshot } from '../weather/snapshot'
import { fetchProviderJson } from './fetch'
import { finalizeCities } from './cities'
import { composeLabel } from './geodb'

interface OpenMeteoGeocodeResponse {
  readonly results?: readonly {
    readonly id: number
    readonly name: string
    readonly latitude: number
    readonly longitude: number
    readonly country?: string
    readonly country_code?: string
    readonly admin1?: string
    readonly population?: number
    readonly timezone?: string
  }[]
}

export interface OpenMeteoWeatherQuery {
  readonly lat: number
  readonly lon: number
  readonly units: Units
}

const LABEL = 'Open-Meteo'

/**
 * Open-Meteo needs no API key, so it serves as the weather fallback and the
 * last-resort geocoder when GeoDB is unconfigured or unavailable.
 */
export async function fetchOpenMeteoCities(
  query: { readonly q: string; readonly limit: number },
  deps: Deps,
  timeoutMs: number,
): Promise<CityResult[]> {
  const params = new URLSearchParams({
    name: query.q,
    count: String(Math.min(query.limit, 10)),
    language: 'en',
    format: 'json',
  })

  const payload = await fetchProviderJson<OpenMeteoGeocodeResponse>(deps, {
    url: `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    label: LABEL,
    provider: 'open-meteo',
    timeoutMs,
  })

  const cities = (payload.results ?? []).map<CityResult>((city) => ({
    id: String(city.id),
    name: city.name,
    country: city.country ?? '',
    countryCode: city.country_code ?? '',
    region: city.admin1 ?? null,
    latitude: city.latitude,
    longitude: city.longitude,
    population: city.population ?? null,
    timezone: city.timezone ?? null,
    label: composeLabel(city.name, city.admin1 ?? null, city.country ?? ''),
  }))

  return finalizeCities(cities, query.limit)
}

/** Open-Meteo current + 5-day forecast, normalised into the shared snapshot. */
export async function fetchOpenMeteoWeather(
  query: OpenMeteoWeatherQuery,
  deps: Deps,
  timeoutMs: number,
): Promise<WeatherSnapshot> {
  const imperial = query.units === 'imperial'
  const params = new URLSearchParams({
    latitude: String(query.lat),
    longitude: String(query.lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '5',
    temperature_unit: imperial ? 'fahrenheit' : 'celsius',
    wind_speed_unit: imperial ? 'mph' : 'kmh',
  })

  const payload = await fetchProviderJson<unknown>(deps, {
    url: `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    label: LABEL,
    provider: 'open-meteo',
    timeoutMs,
  })

  return normalizeOpenMeteoWeather(payload, query.units)
}
