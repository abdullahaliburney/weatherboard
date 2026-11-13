import type { CityResult } from '../types'

/**
 * Provider-agnostic hardening for city results: drop entries the UI cannot use,
 * de-duplicate by id and cap the list. Both city providers pass through here so
 * the frontend can never receive a half-formed city.
 */
export function finalizeCities(cities: readonly CityResult[], limit: number): CityResult[] {
  const seen = new Set<string>()
  const result: CityResult[] = []

  for (const city of cities) {
    if (result.length >= limit) break
    if (!Number.isFinite(city.latitude) || !Number.isFinite(city.longitude)) continue
    if (city.latitude < -90 || city.latitude > 90) continue
    if (city.longitude < -180 || city.longitude > 180) continue
    if (city.name.trim() === '') continue
    if (seen.has(city.id)) continue

    seen.add(city.id)
    result.push(city)
  }

  return result
}
