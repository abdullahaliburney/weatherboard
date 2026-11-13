import { describe, expect, it } from 'vitest'
import {
  formatHumidity,
  formatPrecipitation,
  formatShortDate,
  formatTemperature,
  formatTimeInZone,
  formatUpdatedAt,
  formatWeekday,
  formatWind,
  NOT_AVAILABLE,
  providerLabel,
} from './format'

describe('formatTemperature', () => {
  it('rounds to whole degrees', () => {
    expect(formatTemperature(25.6, '°C')).toBe('26°C')
    expect(formatTemperature(-3.4, '°C')).toBe('-3°C')
  })

  it('keeps a real 0 distinct from missing data', () => {
    expect(formatTemperature(0, '°C')).toBe('0°C')
    expect(formatTemperature(null, '°C')).toBe(NOT_AVAILABLE)
    expect(formatTemperature(Number.NaN, '°C')).toBe(NOT_AVAILABLE)
  })
})

describe('formatHumidity / formatWind / formatPrecipitation', () => {
  it('marks missing values as unavailable', () => {
    expect(formatHumidity(null)).toBe(NOT_AVAILABLE)
    expect(formatWind(null, 'km/h')).toBe(NOT_AVAILABLE)
    expect(formatPrecipitation(null)).toBeNull()
  })

  it('formats available values', () => {
    expect(formatHumidity(76)).toBe('76%')
    expect(formatWind(9.24, 'km/h')).toBe('9.2 km/h')
    expect(formatWind(12.6, 'mph')).toBe('13 mph')
    expect(formatPrecipitation(53)).toBe('53%')
    expect(formatPrecipitation(0)).toBe('0%')
  })
})

describe('date formatting', () => {
  it('formats local calendar dates without shifting them', () => {
    expect(formatWeekday('2026-11-13')).toBe('Fri')
    expect(formatShortDate('2026-11-13')).toBe('13 Nov')
  })

  it('returns the input when the date is malformed', () => {
    expect(formatWeekday('not-a-date')).toBe('not-a-date')
  })
})

describe('formatTimeInZone', () => {
  it('formats a UTC instant in the city timezone', () => {
    expect(formatTimeInZone('2026-11-12T01:46:00.000Z', 'Asia/Karachi', 18000)).toBe('06:46')
    expect(formatTimeInZone('2026-11-12T12:45:00.000Z', 'Asia/Karachi', 18000)).toBe('17:45')
  })

  it('falls back to the numeric offset when no timezone name exists', () => {
    expect(formatTimeInZone('2026-11-12T01:46:00.000Z', null, 18000)).toBe('06:46')
    expect(formatTimeInZone('2026-11-12T01:46:00.000Z', null, 0)).toBe('01:46')
  })

  it('falls back to the offset when the timezone name is unknown', () => {
    expect(formatTimeInZone('2026-11-12T01:46:00.000Z', 'Not/AZone', 3600)).toBe('02:46')
  })

  it('returns null for missing or unparsable instants', () => {
    expect(formatTimeInZone(null, 'Asia/Karachi', 18000)).toBeNull()
    expect(formatTimeInZone('nope', 'Asia/Karachi', 18000)).toBeNull()
  })
})

describe('formatUpdatedAt', () => {
  it('formats a timestamp and handles null', () => {
    expect(formatUpdatedAt(null)).toBeNull()
    expect(formatUpdatedAt(Date.parse('2026-11-12T17:45:00.000Z'))).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('providerLabel', () => {
  it('maps provider ids to display names', () => {
    expect(providerLabel('openweathermap')).toBe('OpenWeatherMap')
    expect(providerLabel('open-meteo')).toBe('Open-Meteo')
    expect(providerLabel('custom')).toBe('custom')
  })
})
