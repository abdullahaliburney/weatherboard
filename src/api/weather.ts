import { getJson } from './client'

/**
 * Mirrors the Worker's `WeatherSnapshot` contract (worker/weather/snapshot.ts).
 * The Worker owns normalisation; the frontend only renders these fields.
 */
export type Units = 'metric' | 'imperial'

export type WeatherIconKey =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'sleet'
  | 'thunderstorm'
  | 'wind'
  | 'unknown'

export interface CurrentWeather {
  readonly temperature: number
  readonly feelsLike: number | null
  readonly humidity: number | null
  readonly pressure: number | null
  readonly windSpeed: number | null
  readonly windDirection: number | null
  readonly condition: string
  readonly icon: WeatherIconKey
  readonly isDay: boolean
  readonly observedAt: string | null
}

export interface DailyWeather {
  readonly date: string
  readonly min: number
  readonly max: number
  readonly condition: string
  readonly icon: WeatherIconKey
  readonly precipitationProbability: number | null
  readonly sunrise: string | null
  readonly sunset: string | null
}

export interface WeatherSnapshot {
  readonly location: {
    readonly name: string | null
    readonly latitude: number | null
    readonly longitude: number | null
    readonly timezone: string | null
    readonly utcOffsetSeconds: number
  }
  readonly units: {
    readonly temperature: '°C' | '°F'
    readonly windSpeed: 'km/h' | 'mph'
  }
  readonly current: CurrentWeather
  readonly daily: readonly DailyWeather[]
}

export interface WeatherMeta {
  readonly fallbackFrom: string | null
  readonly fallbackReason: string | null
}

export interface WeatherResponse {
  readonly provider: string
  readonly units: Units
  readonly fetchedAt: string
  readonly weather: WeatherSnapshot
  readonly meta: WeatherMeta
}

export interface WeatherQuery {
  readonly lat: number
  readonly lon: number
  readonly units: Units
  /** Ask the Worker to bypass its edge cache for an explicit user refresh. */
  readonly refresh?: boolean
  readonly signal?: AbortSignal
}

export function getWeather(query: WeatherQuery): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lon: String(query.lon),
    units: query.units,
  })
  if (query.refresh) params.set('refresh', '1')

  return getJson<WeatherResponse>(`/api/weather?${params.toString()}`, { signal: query.signal })
}
