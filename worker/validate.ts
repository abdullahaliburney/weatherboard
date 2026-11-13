import { ApiError } from './http'
import type { Units } from './types'

const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 80
const MAX_CITIES_LIMIT = 10

/** Control characters would end up inside an upstream query string. */
function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

export interface CitiesQuery {
  readonly q: string
  readonly limit: number
}

export interface WeatherQuery {
  readonly lat: number
  readonly lon: number
  readonly units: Units
}

export function parseCitiesQuery(url: URL): CitiesQuery {
  const raw = url.searchParams.get('q') ?? ''
  const q = raw.trim().replace(/\s+/g, ' ')

  if (q.length < MIN_QUERY_LENGTH) {
    throw new ApiError('invalid_input', 400, 'Enter at least 2 characters to search for a city.', {
      field: 'q',
    })
  }
  if (q.length > MAX_QUERY_LENGTH) {
    throw new ApiError('invalid_input', 400, `City search is limited to ${MAX_QUERY_LENGTH} characters.`, {
      field: 'q',
    })
  }
  if (hasControlCharacters(q)) {
    throw new ApiError('invalid_input', 400, 'City search contains unsupported characters.', {
      field: 'q',
    })
  }

  const limitParam = url.searchParams.get('limit')
  let limit = 5
  if (limitParam !== null) {
    const parsed = Number(limitParam)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_CITIES_LIMIT) {
      throw new ApiError(
        'invalid_input',
        400,
        `limit must be a whole number between 1 and ${MAX_CITIES_LIMIT}.`,
        { field: 'limit' },
      )
    }
    limit = parsed
  }

  return { q, limit }
}

function parseCoordinate(
  url: URL,
  field: 'lat' | 'lon',
  min: number,
  max: number,
  label: string,
): number {
  const raw = url.searchParams.get(field)
  if (raw === null || raw.trim() === '') {
    throw new ApiError('invalid_input', 400, `${label} is required.`, { field })
  }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ApiError('invalid_input', 400, `${label} must be a number between ${min} and ${max}.`, {
      field,
    })
  }
  return value
}

export function parseWeatherQuery(url: URL): WeatherQuery {
  const lat = parseCoordinate(url, 'lat', -90, 90, 'lat')
  const lon = parseCoordinate(url, 'lon', -180, 180, 'lon')

  const unitsParam = url.searchParams.get('units') ?? 'metric'
  if (unitsParam !== 'metric' && unitsParam !== 'imperial') {
    throw new ApiError('invalid_input', 400, 'units must be metric or imperial.', {
      field: 'units',
    })
  }

  return { lat, lon, units: unitsParam }
}
