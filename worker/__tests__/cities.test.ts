// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { finalizeCities } from '../providers/cities'
import type { CityResult } from '../types'

function city(overrides: Partial<CityResult> = {}): CityResult {
  return {
    id: '1',
    name: 'Karachi',
    country: 'Pakistan',
    countryCode: 'PK',
    region: 'Sindh',
    latitude: 24.8608,
    longitude: 67.0104,
    population: 11624219,
    timezone: 'Asia/Karachi',
    label: 'Karachi, Sindh, Pakistan',
    ...overrides,
  }
}

describe('finalizeCities', () => {
  it('keeps well-formed cities', () => {
    expect(finalizeCities([city()], 5)).toHaveLength(1)
  })

  it('drops cities with no name', () => {
    expect(finalizeCities([city({ name: '   ' })], 5)).toHaveLength(0)
  })

  it('drops impossible coordinates', () => {
    const result = finalizeCities(
      [city({ latitude: 120 }), city({ id: '2', longitude: -400 }), city({ id: '3', latitude: Number.NaN })],
      5,
    )
    expect(result).toHaveLength(0)
  })

  it('de-duplicates by id', () => {
    const result = finalizeCities([city(), city()], 5)
    expect(result).toHaveLength(1)
  })

  it('caps the list at the requested limit', () => {
    const many = Array.from({ length: 8 }, (_, index) => city({ id: String(index) }))
    expect(finalizeCities(many, 3)).toHaveLength(3)
  })
})
