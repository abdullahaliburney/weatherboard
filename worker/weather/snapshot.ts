import { ApiError } from '../http'
import type { Units } from '../types'
import { owmCondition, wmoCondition } from './conditions'
import type { WeatherIcon } from './conditions'

export interface CurrentWeather {
  readonly temperature: number
  readonly feelsLike: number | null
  readonly humidity: number | null
  readonly pressure: number | null
  readonly windSpeed: number | null
  readonly windDirection: number | null
  readonly condition: string
  readonly icon: WeatherIcon
  readonly isDay: boolean
  /** UTC instant, ISO 8601. */
  readonly observedAt: string | null
}

export interface DailyWeather {
  /** Local calendar date in the city's timezone, YYYY-MM-DD. */
  readonly date: string
  readonly min: number
  readonly max: number
  readonly condition: string
  readonly icon: WeatherIcon
  readonly precipitationProbability: number | null
  /** UTC instant, ISO 8601 (format in the city's timezone for display). */
  readonly sunrise: string | null
  readonly sunset: string | null
}

/** The single contract the frontend codes against, whichever provider answered. */
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

const TEMPERATURE_UNITS: Record<Units, '°C' | '°F'> = { metric: '°C', imperial: '°F' }
const WIND_UNITS: Record<Units, 'km/h' | 'mph'> = { metric: 'km/h', imperial: 'mph' }
const FORECAST_DAYS = 5

type ProviderId = 'openweathermap' | 'open-meteo'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function payloadError(provider: ProviderId, reason: string): ApiError {
  const label = provider === 'openweathermap' ? 'OpenWeatherMap' : 'Open-Meteo'
  return new ApiError('provider_error', 502, `${label} returned an unexpected payload.`, {
    provider,
    reason,
  })
}

function epochToIso(seconds: number | null): string | null {
  return seconds === null ? null : new Date(seconds * 1000).toISOString()
}

function localDate(seconds: number, offsetSeconds: number): string {
  return new Date((seconds + offsetSeconds) * 1000).toISOString().slice(0, 10)
}

function localHour(seconds: number, offsetSeconds: number): number {
  return new Date((seconds + offsetSeconds) * 1000).getUTCHours()
}

/** Open-Meteo sends naive local timestamps; convert them to a UTC instant. */
function localNaiveToUtcIso(local: string | null, offsetSeconds: number): string | null {
  if (local === null) return null
  const parsed = Date.parse(`${local}Z`)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed - offsetSeconds * 1000).toISOString()
}

interface OwmEntry {
  readonly dt: number
  readonly min: number
  readonly max: number
  readonly weatherId: number | null
  readonly pop: number
}

function parseOwmEntries(rawList: unknown): OwmEntry[] {
  const entries: OwmEntry[] = []
  for (const raw of toArray(rawList)) {
    if (!isRecord(raw)) continue
    const dt = toNumber(raw.dt)
    const main = isRecord(raw.main) ? raw.main : null
    const min = toNumber(main?.temp_min)
    const max = toNumber(main?.temp_max)
    if (dt === null || min === null || max === null) continue
    const weather = toArray(raw.weather)[0]
    entries.push({
      dt,
      min,
      max,
      weatherId: isRecord(weather) ? toNumber(weather.id) : null,
      pop: toNumber(raw.pop) ?? 0,
    })
  }
  return entries
}

function groupOwmDays(entries: readonly OwmEntry[], offsetSeconds: number): DailyWeather[] {
  const byDate = new Map<string, OwmEntry[]>()
  for (const entry of entries) {
    const date = localDate(entry.dt, offsetSeconds)
    const bucket = byDate.get(date)
    if (bucket) bucket.push(entry)
    else byDate.set(date, [entry])
  }

  return [...byDate.entries()].map(([date, bucket]) => {
    // The entry closest to local noon represents that day's conditions.
    const representative = bucket.reduce((best, entry) =>
      Math.abs(localHour(entry.dt, offsetSeconds) - 12) <
      Math.abs(localHour(best.dt, offsetSeconds) - 12)
        ? entry
        : best,
    )
    const { condition, icon } = owmCondition(representative.weatherId, true)
    const pop = Math.max(...bucket.map((entry) => entry.pop))

    return {
      date,
      min: Math.min(...bucket.map((entry) => entry.min)),
      max: Math.max(...bucket.map((entry) => entry.max)),
      condition,
      icon,
      precipitationProbability: Number.isFinite(pop) ? Math.round(pop * 100) : null,
      sunrise: null,
      sunset: null,
    }
  })
}

/**
 * OpenWeatherMap current + 5-day/3-hour forecast → WeatherSnapshot.
 * 3-hourly entries are grouped into local calendar days using the city offset.
 */
export function normalizeOwmWeather(payload: unknown, units: Units): WeatherSnapshot {
  if (!isRecord(payload)) throw payloadError('openweathermap', 'not_an_object')

  const current = isRecord(payload.current) ? payload.current : null
  const forecast = isRecord(payload.forecast) ? payload.forecast : null
  if (!current || !forecast) throw payloadError('openweathermap', 'missing_sections')

  const currentMain = isRecord(current.main) ? current.main : null
  const temperature = toNumber(currentMain?.temp)
  if (temperature === null) throw payloadError('openweathermap', 'missing_current_temperature')

  const currentWeather = isRecord(toArray(current.weather)[0]) ? toArray(current.weather)[0] : null
  const iconCode = isRecord(currentWeather) ? toText(currentWeather.icon) : null
  // OWM appends 'n' for night icons; fall back to day when the icon is absent.
  const isDay = iconCode === null ? true : !iconCode.endsWith('n')
  const { condition, icon } = owmCondition(
    isRecord(currentWeather) ? toNumber(currentWeather.id) : null,
    isDay,
  )

  const city = isRecord(forecast.city) ? forecast.city : null
  const offsetSeconds =
    toNumber(city?.timezone) ?? toNumber(current.timezone) ?? 0

  const entries = parseOwmEntries(forecast.list)
  if (entries.length === 0) throw payloadError('openweathermap', 'missing_forecast_entries')

  const allDays = groupOwmDays(entries, offsetSeconds)
  const daily = allDays.slice(0, FORECAST_DAYS)

  const sys = isRecord(current.sys) ? current.sys : null
  const sunrise = epochToIso(toNumber(sys?.sunrise))
  const sunset = epochToIso(toNumber(sys?.sunset))
  const days = daily.map((day, index) =>
    index === 0 && day.date === localDate(toNumber(sys?.sunrise) ?? Number.NaN, offsetSeconds)
      ? { ...day, sunrise, sunset }
      : day,
  )

  const coord = isRecord(current.coord) ? current.coord : isRecord(city?.coord) ? city.coord : null
  const wind = isRecord(current.wind) ? current.wind : null

  return {
    location: {
      name: toText(current.name) ?? toText(city?.name),
      latitude: toNumber(isRecord(coord) ? coord.lat : null),
      longitude: toNumber(isRecord(coord) ? coord.lon : null),
      // OWM reports a UTC offset, not a timezone identifier — do not invent one.
      timezone: null,
      utcOffsetSeconds: offsetSeconds,
    },
    units: { temperature: TEMPERATURE_UNITS[units], windSpeed: WIND_UNITS[units] },
    current: {
      temperature,
      feelsLike: toNumber(currentMain?.feels_like),
      humidity: toNumber(currentMain?.humidity),
      pressure: toNumber(currentMain?.pressure),
      windSpeed: toNumber(wind?.speed),
      windDirection: toNumber(wind?.deg),
      condition,
      icon,
      isDay,
      observedAt: epochToIso(toNumber(current.dt)),
    },
    daily: days,
  }
}

/** Open-Meteo current + daily forecast → the same WeatherSnapshot. */
export function normalizeOpenMeteoWeather(payload: unknown, units: Units): WeatherSnapshot {
  if (!isRecord(payload)) throw payloadError('open-meteo', 'not_an_object')

  const current = isRecord(payload.current) ? payload.current : null
  const dailyBlock = isRecord(payload.daily) ? payload.daily : null
  if (!current || !dailyBlock) throw payloadError('open-meteo', 'missing_sections')

  const temperature = toNumber(current.temperature_2m)
  if (temperature === null) throw payloadError('open-meteo', 'missing_current_temperature')

  const offsetSeconds = toNumber(payload.utc_offset_seconds) ?? 0
  const isDay = (toNumber(current.is_day) ?? 1) === 1
  const { condition, icon } = wmoCondition(toNumber(current.weather_code), isDay)

  const dates = toArray(dailyBlock.time)
  const maxima = toArray(dailyBlock.temperature_2m_max)
  const minima = toArray(dailyBlock.temperature_2m_min)
  const codes = toArray(dailyBlock.weather_code)
  const sunrises = toArray(dailyBlock.sunrise)
  const sunsets = toArray(dailyBlock.sunset)
  const precipitation = toArray(dailyBlock.precipitation_probability_max)

  if (dates.length === 0) throw payloadError('open-meteo', 'missing_daily_entries')
  if (
    maxima.length !== dates.length ||
    minima.length !== dates.length ||
    codes.length !== dates.length
  ) {
    throw payloadError('open-meteo', 'daily_arrays_mismatched')
  }

  const daily: DailyWeather[] = dates.slice(0, FORECAST_DAYS).map((rawDate, index) => {
    const date = toText(rawDate)
    const min = toNumber(minima[index])
    const max = toNumber(maxima[index])
    if (date === null || min === null || max === null) {
      throw payloadError('open-meteo', 'missing_daily_temperature')
    }
    const dayCondition = wmoCondition(toNumber(codes[index]), true)
    return {
      date,
      min,
      max,
      condition: dayCondition.condition,
      icon: dayCondition.icon,
      precipitationProbability: toNumber(precipitation[index]),
      sunrise: localNaiveToUtcIso(toText(sunrises[index]), offsetSeconds),
      sunset: localNaiveToUtcIso(toText(sunsets[index]), offsetSeconds),
    }
  })

  // Open-Meteo exposes no timezone identifier guarantee beyond this field, and
  // deliberately no place name — the selected city supplies that on screen.
  const timezone = toText(payload.timezone)

  return {
    location: {
      name: null,
      latitude: toNumber(payload.latitude),
      longitude: toNumber(payload.longitude),
      timezone,
      utcOffsetSeconds: offsetSeconds,
    },
    units: { temperature: TEMPERATURE_UNITS[units], windSpeed: WIND_UNITS[units] },
    current: {
      temperature,
      feelsLike: toNumber(current.apparent_temperature),
      humidity: toNumber(current.relative_humidity_2m),
      pressure: null,
      windSpeed: toNumber(current.wind_speed_10m),
      windDirection: null,
      condition,
      icon,
      isDay,
      observedAt: localNaiveToUtcIso(toText(current.time), offsetSeconds),
    },
    daily,
  }
}
