import type { Units, WeatherSnapshot } from '../api/weather'
import { isRecord, readJson, STORAGE_KEYS, writeJson } from './storage'
import type { KeyValueStore } from './storage'

export interface WeatherLocation {
  readonly latitude: number
  readonly longitude: number
}

export interface CachedWeather {
  readonly snapshot: WeatherSnapshot
  readonly provider: string
  readonly cachedAt: number
  readonly units: Units
}

/** Newest five city+unit combinations; older entries are evicted on write. */
export const MAX_CACHED_FORECASTS = 5

export function weatherCacheKey(location: WeatherLocation, units: Units): string {
  return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}|${units}`
}

function isSnapshot(value: unknown): value is WeatherSnapshot {
  if (!isRecord(value)) return false
  const current = value.current
  const units = value.units
  const daily = value.daily
  if (!isRecord(current) || typeof current.temperature !== 'number') return false
  if (typeof current.condition !== 'string' || typeof current.icon !== 'string') return false
  if (!isRecord(units) || typeof units.temperature !== 'string') return false
  if (!Array.isArray(daily) || daily.length === 0) return false
  return daily.every(
    (day) => isRecord(day) && typeof day.date === 'string' && typeof day.max === 'number',
  )
}

function readEntries(store: KeyValueStore | null): Record<string, unknown> {
  const raw = readJson(store, STORAGE_KEYS.weather)
  return isRecord(raw) ? raw : {}
}

/** The last successful forecast for this city and unit system, if one was saved. */
export function readCachedWeather(
  store: KeyValueStore | null,
  location: WeatherLocation,
  units: Units,
): CachedWeather | null {
  const entry = readEntries(store)[weatherCacheKey(location, units)]
  if (!isRecord(entry) || !isSnapshot(entry.snapshot)) return null
  if (typeof entry.cachedAt !== 'number' || !Number.isFinite(entry.cachedAt)) return null

  return {
    snapshot: entry.snapshot,
    provider: typeof entry.provider === 'string' ? entry.provider : 'cached',
    cachedAt: entry.cachedAt,
    units,
  }
}

/**
 * Store a successful forecast for offline display. Only the normalised snapshot
 * is kept — never a request URL, header or credential.
 */
export function writeCachedWeather(
  store: KeyValueStore | null,
  location: WeatherLocation,
  units: Units,
  snapshot: WeatherSnapshot,
  provider: string,
  now = Date.now(),
): void {
  const entries = readEntries(store)
  entries[weatherCacheKey(location, units)] = { snapshot, provider, cachedAt: now, units }

  const newest = Object.entries(entries)
    .sort(([, a], [, b]) => {
      const left = isRecord(a) && typeof a.cachedAt === 'number' ? a.cachedAt : 0
      const right = isRecord(b) && typeof b.cachedAt === 'number' ? b.cachedAt : 0
      return right - left
    })
    .slice(0, MAX_CACHED_FORECASTS)

  writeJson(store, STORAGE_KEYS.weather, Object.fromEntries(newest))
}

export function clearWeatherCache(store: KeyValueStore | null): void {
  writeJson(store, STORAGE_KEYS.weather, {})
}
