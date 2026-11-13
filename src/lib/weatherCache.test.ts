import { describe, expect, it } from 'vitest'
import { makeSnapshot } from '../test/weather-fixtures'
import { createMemoryStore } from '../test/memory-store'
import { STORAGE_KEYS } from './storage'
import {
  clearWeatherCache,
  MAX_CACHED_FORECASTS,
  readCachedWeather,
  weatherCacheKey,
  writeCachedWeather,
} from './weatherCache'

const KARACHI = { latitude: 24.8608, longitude: 67.0104 }

describe('weatherCache', () => {
  it('round-trips the latest snapshot for a city and unit system', () => {
    const { store } = createMemoryStore()
    writeCachedWeather(store, KARACHI, 'metric', makeSnapshot(), 'open-meteo', 1000)

    const cached = readCachedWeather(store, KARACHI, 'metric')
    expect(cached?.snapshot.current.temperature).toBe(25.9)
    expect(cached?.provider).toBe('open-meteo')
    expect(cached?.cachedAt).toBe(1000)
    expect(cached?.units).toBe('metric')
  })

  it('keys entries by unit system, so °F never shows °C data', () => {
    const { store } = createMemoryStore()
    writeCachedWeather(store, KARACHI, 'metric', makeSnapshot(), 'open-meteo', 1000)

    expect(readCachedWeather(store, KARACHI, 'imperial')).toBeNull()
  })

  it('returns null for missing, malformed or incomplete entries', () => {
    const { store } = createMemoryStore()
    expect(readCachedWeather(store, KARACHI, 'metric')).toBeNull()

    store.setItem(STORAGE_KEYS.weather, 'not json')
    expect(readCachedWeather(store, KARACHI, 'metric')).toBeNull()

    store.setItem(
      STORAGE_KEYS.weather,
      JSON.stringify({ [weatherCacheKey(KARACHI, 'metric')]: { snapshot: { current: {} } } }),
    )
    expect(readCachedWeather(store, KARACHI, 'metric')).toBeNull()

    store.setItem(
      STORAGE_KEYS.weather,
      JSON.stringify({
        [weatherCacheKey(KARACHI, 'metric')]: { snapshot: makeSnapshot(), cachedAt: 'yesterday' },
      }),
    )
    expect(readCachedWeather(store, KARACHI, 'metric')).toBeNull()
  })

  it('keeps the newest five city/unit entries', () => {
    const { store } = createMemoryStore()
    for (let index = 0; index < MAX_CACHED_FORECASTS + 2; index += 1) {
      writeCachedWeather(
        store,
        { latitude: 10 + index, longitude: 20 + index },
        'metric',
        makeSnapshot(),
        'open-meteo',
        1000 + index,
      )
    }

    // The two oldest writes are evicted; the newest survive.
    expect(readCachedWeather(store, { latitude: 10, longitude: 20 }, 'metric')).toBeNull()
    expect(readCachedWeather(store, { latitude: 11, longitude: 21 }, 'metric')).toBeNull()
    expect(readCachedWeather(store, { latitude: 16, longitude: 26 }, 'metric')).not.toBeNull()
  })

  it('overwrites an existing entry rather than duplicating it', () => {
    const { store, read } = createMemoryStore()
    writeCachedWeather(store, KARACHI, 'metric', makeSnapshot(), 'open-meteo', 1000)
    writeCachedWeather(store, KARACHI, 'metric', makeSnapshot(), 'openweathermap', 2000)

    expect(readCachedWeather(store, KARACHI, 'metric')?.cachedAt).toBe(2000)
    expect(Object.keys(JSON.parse(read(STORAGE_KEYS.weather) ?? '{}'))).toHaveLength(1)
  })

  it('clears all cached forecasts', () => {
    const { store } = createMemoryStore()
    writeCachedWeather(store, KARACHI, 'metric', makeSnapshot(), 'open-meteo', 1000)

    clearWeatherCache(store)

    expect(readCachedWeather(store, KARACHI, 'metric')).toBeNull()
  })

  it('does nothing when persistence is unavailable', () => {
    expect(() =>
      writeCachedWeather(null, KARACHI, 'metric', makeSnapshot(), 'open-meteo'),
    ).not.toThrow()
    expect(readCachedWeather(null, KARACHI, 'metric')).toBeNull()
  })
})
