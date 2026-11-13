import type { City } from '../api/cities'
import type { Units } from '../api/weather'

export const MAX_FAVOURITES = 5

export const STORAGE_KEYS = {
  favourites: 'weatherboard.favourites.v1',
  units: 'weatherboard.units.v1',
  weather: 'weatherboard.weather.v1',
  selectedCity: 'weatherboard.city.v1',
} as const

/** The slice of the Storage API we rely on; injectable so tests can simulate failures. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * localStorage can be unavailable (privacy mode, disabled storage) or throw on
 * access. Every caller treats `null` as "persistence is off", never as an error.
 */
export function getBrowserStore(): KeyValueStore | null {
  try {
    const candidate = globalThis.localStorage as KeyValueStore | undefined
    if (!candidate) return null
    const probe = 'weatherboard.probe'
    candidate.setItem(probe, '1')
    candidate.removeItem(probe)
    return candidate
  } catch {
    return null
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readJson(store: KeyValueStore | null, key: string): unknown {
  if (!store) return null
  try {
    const raw = store.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as unknown
  } catch {
    // Malformed JSON is treated like an empty slot, and the next write repairs it.
    return null
  }
}

export function writeJson(store: KeyValueStore | null, key: string, value: unknown): void {
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled: the app keeps working in memory.
  }
}

/** Validate a stored/restored city; anything malformed yields null. */
export function parseCity(value: unknown): City | null {
  if (!isRecord(value)) return null
  const { id, name, country, countryCode, region, latitude, longitude, population, timezone, label } =
    value
  if (typeof id !== 'string' || id.length === 0) return null
  if (typeof name !== 'string' || name.length === 0) return null
  if (typeof country !== 'string' || typeof countryCode !== 'string') return null
  if (typeof latitude !== 'number' || !Number.isFinite(latitude)) return null
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return null

  return {
    id,
    name,
    country,
    countryCode,
    region: typeof region === 'string' ? region : null,
    latitude,
    longitude,
    population: typeof population === 'number' ? population : null,
    timezone: typeof timezone === 'string' ? timezone : null,
    label: typeof label === 'string' && label.length > 0 ? label : name,
  }
}

/**
 * Turn whatever is in storage into a usable favourites list: drop invalid
 * entries, de-duplicate by id (first wins) and cap at five.
 */
export function parseFavourites(value: unknown): City[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const cities: City[] = []
  for (const entry of value) {
    const city = parseCity(entry)
    if (!city || seen.has(city.id)) continue
    seen.add(city.id)
    cities.push(city)
    if (cities.length === MAX_FAVOURITES) break
  }
  return cities
}

export function readFavourites(store: KeyValueStore | null): City[] {
  return parseFavourites(readJson(store, STORAGE_KEYS.favourites))
}

export function writeFavourites(store: KeyValueStore | null, cities: City[]): void {
  writeJson(store, STORAGE_KEYS.favourites, cities)
}

export function parseUnits(value: unknown): Units {
  return value === 'imperial' ? 'imperial' : 'metric'
}

export function readUnits(store: KeyValueStore | null): Units {
  return parseUnits(readJson(store, STORAGE_KEYS.units))
}

export function writeUnits(store: KeyValueStore | null, units: Units): void {
  writeJson(store, STORAGE_KEYS.units, units)
}

export function readSelectedCity(store: KeyValueStore | null): City | null {
  return parseCity(readJson(store, STORAGE_KEYS.selectedCity))
}

/** Passing null clears the remembered city, restoring the empty state. */
export function writeSelectedCity(store: KeyValueStore | null, city: City | null): void {
  writeJson(store, STORAGE_KEYS.selectedCity, city)
}
