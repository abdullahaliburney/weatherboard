import { ApiError } from '../http'
import type { CityResult, CityProvider, Deps } from '../types'
import { finalizeCities } from './cities'
import { fetchProviderJson } from './fetch'

interface GeodbCity {
  readonly id?: number
  readonly city?: string
  readonly name?: string
  readonly country?: string
  readonly countryCode?: string
  readonly region?: string
  readonly latitude: number
  readonly longitude: number
  readonly population?: number
}

interface GeodbResponse {
  readonly data?: readonly GeodbCity[]
}

const HOST = 'wft-geo-db.p.rapidapi.com'
const PROVIDER: CityProvider = 'geodb'

/**
 * GeoDB Cities via RapidAPI — the primary autocomplete provider.
 *
 * Basic plan limits (1,000 requests/day, 1 request/second, max 10 results per
 * page) are respected here: the limit is clamped and the route caches results.
 */
export async function fetchGeodbCities(
  query: { readonly q: string; readonly limit: number },
  deps: Deps,
  timeoutMs: number,
): Promise<CityResult[]> {
  const key = deps.env.RAPIDAPI_KEY
  if (!key) {
    throw new ApiError(
      'provider_unconfigured',
      503,
      'GeoDB is not configured on the server. Falling back to Open-Meteo geocoding.',
      { provider: PROVIDER },
    )
  }

  const params = new URLSearchParams({
    namePrefix: query.q,
    limit: String(Math.min(query.limit, 10)),
    sort: '-population',
    types: 'CITY',
  })

  const payload = await fetchProviderJson<GeodbResponse>(deps, {
    url: `https://${HOST}/v1/geo/cities?${params.toString()}`,
    headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': HOST },
    label: 'GeoDB Cities',
    provider: PROVIDER,
    timeoutMs,
  })

  const cities = (payload.data ?? []).map<CityResult>((city) => {
    const name = city.city ?? city.name ?? ''
    const country = city.country ?? ''
    const region = city.region ?? null
    return {
      id: city.id === undefined ? `${city.latitude},${city.longitude}` : String(city.id),
      name,
      country,
      countryCode: city.countryCode ?? '',
      region,
      latitude: city.latitude,
      longitude: city.longitude,
      population: city.population ?? null,
      timezone: null,
      label: composeLabel(name, region, country),
    }
  })

  return finalizeCities(cities, query.limit)
}

export function composeLabel(name: string, region: string | null, country: string): string {
  return [name, region, country].filter((part): part is string => Boolean(part)).join(', ')
}
