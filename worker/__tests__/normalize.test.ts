// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ApiError } from '../http'
import { owmCondition, wmoCondition } from '../weather/conditions'
import { normalizeOpenMeteoWeather, normalizeOwmWeather } from '../weather/snapshot'
import {
  openMeteoWeatherFixture,
  owmCurrentFixture,
  owmForecastFixture,
} from '../fixtures/providers'

const owmPayload = () => ({
  current: structuredClone(owmCurrentFixture),
  forecast: structuredClone(owmForecastFixture),
})

function expectProviderError(fn: () => unknown): ApiError {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.code).toBe('provider_error')
    expect(apiError.status).toBe(502)
    return apiError
  }
  throw new Error('expected the normaliser to throw')
}

describe('normalizeOwmWeather', () => {
  it('produces the shared snapshot shape with a 5-day forecast', () => {
    const snapshot = normalizeOwmWeather(owmPayload(), 'metric')

    expect(snapshot.daily).toHaveLength(5)
    expect(snapshot.daily.map((day) => day.date)).toEqual([
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ])
    expect(snapshot.current.temperature).toBe(26.3)
    expect(snapshot.current.condition).toBe('Clear night')
    expect(snapshot.current.icon).toBe('clear-night')
    expect(snapshot.current.isDay).toBe(false)
    expect(snapshot.current.humidity).toBe(73)
    expect(snapshot.current.windSpeed).toBe(2.5)
    expect(snapshot.units).toEqual({ temperature: '°C', windSpeed: 'km/h' })
    expect(snapshot.location).toMatchObject({
      name: 'Karachi',
      latitude: 24.8608,
      longitude: 67.0104,
      utcOffsetSeconds: 18000,
      // OWM has no timezone identifier; inventing one would be a lie.
      timezone: null,
    })
  })

  it('groups 3-hourly entries into local days and takes min/max across them', () => {
    const snapshot = normalizeOwmWeather(owmPayload(), 'metric')
    const first = snapshot.daily[0]

    expect(first.min).toBeCloseTo(19.8, 1)
    expect(first.max).toBeCloseTo(28.8, 1)
    // Daytime representative condition, not the midnight night icon.
    expect(first.icon).toBe('partly-cloudy-day')
    // pop is reported as a percentage.
    expect(first.precipitationProbability).toBe(35)
  })

  it('attaches sunrise and sunset to the first day only', () => {
    const snapshot = normalizeOwmWeather(owmPayload(), 'metric')

    expect(snapshot.daily[0].sunrise).toBe('2026-11-12T01:52:00.000Z')
    expect(snapshot.daily[0].sunset).toBe('2026-11-12T12:47:00.000Z')
    expect(snapshot.daily[1].sunrise).toBeNull()
  })

  it('labels imperial units without converting provider values twice', () => {
    const snapshot = normalizeOwmWeather(owmPayload(), 'imperial')

    expect(snapshot.units).toEqual({ temperature: '°F', windSpeed: 'mph' })
    expect(snapshot.current.temperature).toBe(26.3)
  })

  it('rejects a non-object payload', () => {
    expectProviderError(() => normalizeOwmWeather(null, 'metric'))
  })

  it('rejects a payload without current conditions', () => {
    expectProviderError(() =>
      normalizeOwmWeather({ forecast: structuredClone(owmForecastFixture) }, 'metric'),
    )
  })

  it('rejects a forecast with no usable entries', () => {
    const payload = owmPayload()
    payload.forecast.list = []
    expectProviderError(() => normalizeOwmWeather(payload, 'metric'))
  })

  it('drops malformed forecast entries instead of failing the whole day', () => {
    const forecast = structuredClone(owmForecastFixture) as unknown as { list: unknown[] }
    forecast.list = [forecast.list[0], { dt: 1 }, ...forecast.list.slice(2)]

    const snapshot = normalizeOwmWeather(
      { current: structuredClone(owmCurrentFixture), forecast },
      'metric',
    )
    expect(snapshot.daily).toHaveLength(5)
  })
})

describe('normalizeOpenMeteoWeather', () => {
  it('produces the same snapshot shape as OpenWeatherMap', () => {
    const snapshot = normalizeOpenMeteoWeather(
      structuredClone(openMeteoWeatherFixture),
      'metric',
    )

    expect(snapshot.daily).toHaveLength(5)
    expect(snapshot.daily[0]).toMatchObject({
      date: '2026-11-12',
      min: 22.6,
      max: 29.8,
      precipitationProbability: 0,
    })
    expect(snapshot.current).toMatchObject({
      temperature: 26.3,
      feelsLike: 29.4,
      humidity: 73,
      windSpeed: 9,
      isDay: false,
      icon: 'clear-night',
    })
    expect(snapshot.location).toMatchObject({
      timezone: 'Asia/Karachi',
      utcOffsetSeconds: 18000,
      name: null,
    })
    expect(snapshot.units).toEqual({ temperature: '°C', windSpeed: 'km/h' })
  })

  it('converts naive local timestamps to UTC instants', () => {
    const snapshot = normalizeOpenMeteoWeather(
      structuredClone(openMeteoWeatherFixture),
      'metric',
    )

    expect(snapshot.current.observedAt).toBe('2026-11-12T15:30:00.000Z')
    expect(snapshot.daily[0].sunrise).toBe('2026-11-12T01:52:00.000Z')
    expect(snapshot.daily[0].sunset).toBe('2026-11-12T12:47:00.000Z')
  })

  it('uses the WMO code for the daily condition', () => {
    const snapshot = normalizeOpenMeteoWeather(
      structuredClone(openMeteoWeatherFixture),
      'metric',
    )

    expect(snapshot.daily[0].condition).toBe('Overcast')
    expect(snapshot.daily[2].condition).toBe('Thunderstorm')
  })

  it('rejects mismatched daily arrays', () => {
    const payload = structuredClone(openMeteoWeatherFixture)
    payload.daily.temperature_2m_max = [29.8]
    expectProviderError(() => normalizeOpenMeteoWeather(payload, 'metric'))
  })

  it('rejects a payload with no daily block', () => {
    const payload = structuredClone(openMeteoWeatherFixture) as Partial<
      typeof openMeteoWeatherFixture
    >
    delete payload.daily
    expectProviderError(() => normalizeOpenMeteoWeather(payload, 'metric'))
  })

  it('rejects missing current temperature', () => {
    const payload = structuredClone(openMeteoWeatherFixture)
    payload.current = { ...payload.current, temperature_2m: Number.NaN }
    expectProviderError(() => normalizeOpenMeteoWeather(payload, 'metric'))
  })
})

describe('condition maps', () => {
  it('maps OWM ids to shared icons', () => {
    expect(owmCondition(800, true).icon).toBe('clear-day')
    expect(owmCondition(800, false).icon).toBe('clear-night')
    expect(owmCondition(502, true).icon).toBe('heavy-rain')
    expect(owmCondition(741, true).icon).toBe('fog')
    expect(owmCondition(null, true).icon).toBe('unknown')
  })

  it('maps WMO codes to shared icons', () => {
    expect(wmoCondition(0, true).icon).toBe('clear-day')
    expect(wmoCondition(3, true).icon).toBe('cloudy')
    expect(wmoCondition(95, true).icon).toBe('thunderstorm')
    expect(wmoCondition(99, true).condition).toBe('Thunderstorm with hail')
    expect(wmoCondition(999, true).icon).toBe('unknown')
  })
})
