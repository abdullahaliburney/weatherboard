import { describe, expect, it, vi } from 'vitest'
import {
  getBrowserStore,
  MAX_FAVOURITES,
  parseFavourites,
  parseUnits,
  readFavourites,
  readJson,
  readSelectedCity,
  readUnits,
  STORAGE_KEYS,
  writeFavourites,
  writeJson,
  writeSelectedCity,
  writeUnits,
} from './storage'
import { islamabad, karachi, lahore, multan, peshawar, quetta } from '../test/city-fixtures'
import { createBrokenStore, createMemoryStore } from '../test/memory-store'

describe('readJson / writeJson', () => {
  it('round-trips a value', () => {
    const { store } = createMemoryStore()
    writeJson(store, 'key', { hello: 'world' })
    expect(readJson(store, 'key')).toEqual({ hello: 'world' })
  })

  it('treats malformed JSON and missing keys as empty', () => {
    const { store } = createMemoryStore({ broken: '{not json' })
    expect(readJson(store, 'broken')).toBeNull()
    expect(readJson(store, 'missing')).toBeNull()
  })

  it('survives a store that throws on write or is unavailable', () => {
    expect(() => writeJson(createBrokenStore(), 'key', 1)).not.toThrow()
    expect(readJson(null, 'key')).toBeNull()
    expect(() => writeJson(null, 'key', 1)).not.toThrow()
  })
})

describe('parseFavourites', () => {
  it('keeps valid cities', () => {
    expect(parseFavourites([karachi, lahore])).toEqual([karachi, lahore])
  })

  it('rejects anything that is not an array of cities', () => {
    expect(parseFavourites(null)).toEqual([])
    expect(parseFavourites({ id: '1' })).toEqual([])
    expect(parseFavourites('karachi')).toEqual([])
    expect(parseFavourites([{ id: '1', name: '' }])).toEqual([])
    expect(parseFavourites([{ ...karachi, latitude: 'not-a-number' }])).toEqual([])
    expect(parseFavourites([{ ...karachi, latitude: Number.POSITIVE_INFINITY }])).toEqual([])
  })

  it('de-duplicates by id, keeping the first entry', () => {
    const duplicate = { ...karachi, name: 'Karachi duplicate' }
    expect(parseFavourites([karachi, duplicate])).toEqual([karachi])
  })

  it('caps the list at five cities', () => {
    const parsed = parseFavourites([karachi, lahore, multan, islamabad, quetta, peshawar])
    expect(parsed).toHaveLength(MAX_FAVOURITES)
    expect(parsed.map((city) => city.name)).not.toContain('Peshawar')
  })

  it('fills missing optional fields rather than rejecting the city', () => {
    const [parsed] = parseFavourites([
      { id: 'x', name: 'Thin', country: 'PK', countryCode: 'PK', latitude: 1, longitude: 2 },
    ])
    expect(parsed).toMatchObject({ region: null, population: null, timezone: null, label: 'Thin' })
  })
})

describe('favourites persistence', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(readFavourites(createMemoryStore().store)).toEqual([])
  })

  it('repairs malformed storage instead of throwing', () => {
    const { store } = createMemoryStore({ [STORAGE_KEYS.favourites]: '<<<>>>' })
    expect(readFavourites(store)).toEqual([])
  })

  it('writes and reads a list', () => {
    const { store } = createMemoryStore()
    writeFavourites(store, [karachi, lahore])
    expect(readFavourites(store)).toEqual([karachi, lahore])
  })

  it('does not throw when persistence is unavailable', () => {
    expect(() => writeFavourites(createBrokenStore(), [karachi])).not.toThrow()
  })
})

describe('units persistence', () => {
  it('accepts only a known unit system', () => {
    expect(parseUnits('imperial')).toBe('imperial')
    expect(parseUnits('metric')).toBe('metric')
    expect(parseUnits('fahrenheit')).toBe('metric')
    expect(parseUnits(null)).toBe('metric')
  })

  it('defaults to metric and round-trips imperial', () => {
    const { store } = createMemoryStore()
    expect(readUnits(store)).toBe('metric')
    writeUnits(store, 'imperial')
    expect(readUnits(store)).toBe('imperial')
  })

  it('falls back to metric when stored JSON is broken', () => {
    const { store } = createMemoryStore({ [STORAGE_KEYS.units]: '{"units":"imperial"' })
    expect(readUnits(store)).toBe('metric')
  })
})

describe('selected city persistence', () => {
  it('round-trips a city', () => {
    const { store } = createMemoryStore()
    expect(readSelectedCity(store)).toBeNull()

    writeSelectedCity(store, karachi)

    expect(readSelectedCity(store)).toEqual(karachi)
  })

  it('ignores malformed, partial or stale stored values', () => {
    expect(readSelectedCity(createMemoryStore({ [STORAGE_KEYS.selectedCity]: '{oops' }).store)).toBeNull()
    expect(
      readSelectedCity(
        createMemoryStore({ [STORAGE_KEYS.selectedCity]: '{"name":"Karachi"}' }).store,
      ),
    ).toBeNull()
    expect(readSelectedCity(null)).toBeNull()
  })

  it('clears the remembered city when written null', () => {
    const { store } = createMemoryStore()
    writeSelectedCity(store, karachi)

    writeSelectedCity(store, null)

    expect(readSelectedCity(store)).toBeNull()
  })
})

describe('getBrowserStore', () => {
  it('returns the real localStorage when it works', () => {
    expect(getBrowserStore()).not.toBeNull()
  })

  it('returns null when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    expect(getBrowserStore()).toBeNull()
    spy.mockRestore()
  })
})
