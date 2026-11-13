import { getJson } from './client'

export interface City {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly countryCode: string
  readonly region: string | null
  readonly latitude: number
  readonly longitude: number
  readonly population: number | null
  readonly timezone: string | null
  readonly label: string
}

export interface CitiesMeta {
  readonly source: string
  readonly fallbackFrom: string | null
  readonly fallbackReason: string | null
}

export interface CitiesResponse {
  readonly query: string
  readonly cities: City[]
  readonly meta: CitiesMeta
}

export interface SearchCitiesOptions {
  readonly signal?: AbortSignal
  readonly limit?: number
}

/** City search through the Worker proxy — never straight to a provider. */
export function searchCities(
  query: string,
  options: SearchCitiesOptions = {},
): Promise<CitiesResponse> {
  const params = new URLSearchParams({ q: query })
  if (options.limit !== undefined) params.set('limit', String(options.limit))

  return getJson<CitiesResponse>(`/api/cities?${params.toString()}`, { signal: options.signal })
}
