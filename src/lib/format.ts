/**
 * Display formatting. Every helper takes `null` and returns an em dash rather
 * than a fabricated zero: "0 °C" and "no data" must never look the same.
 */
export const NOT_AVAILABLE = '—'

export function formatTemperature(value: number | null, unit: '°C' | '°F'): string {
  if (value === null || !Number.isFinite(value)) return NOT_AVAILABLE
  return `${Math.round(value)}${unit}`
}

export function formatHumidity(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return NOT_AVAILABLE
  return `${Math.round(value)}%`
}

export function formatWind(value: number | null, unit: 'km/h' | 'mph'): string {
  if (value === null || !Number.isFinite(value)) return NOT_AVAILABLE
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value)
  return `${rounded} ${unit}`
}

export function formatPrecipitation(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null
  return `${Math.round(value)}%`
}

/** `2026-11-13` is a local calendar date, so format it in UTC to avoid shifting. */
function dateParts(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const [, year, month, day] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

export function formatWeekday(date: string): string {
  const parsed = dateParts(date)
  if (!parsed) return date
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(parsed)
}

export function formatShortDate(date: string): string {
  const parsed = dateParts(date)
  if (!parsed) return date
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed)
}

/**
 * Sunrise/sunset arrive as UTC instants. Format them in the city's timezone when
 * the provider gives one (Open-Meteo), otherwise apply the reported UTC offset
 * (OpenWeatherMap).
 */
export function formatTimeInZone(
  iso: string | null,
  timezone: string | null,
  utcOffsetSeconds: number,
): string | null {
  if (!iso) return null
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return null

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }

  if (timezone) {
    try {
      return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: timezone }).format(instant)
    } catch {
      // Unknown IANA name: fall through to the numeric offset.
    }
  }

  const shifted = new Date(instant.getTime() + utcOffsetSeconds * 1000)
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(shifted)
}

/** Human time for "last updated", in the city's timezone when one is known. */
export function formatUpdatedAt(timestamp: number | null, timeZone?: string | null): string | null {
  if (timestamp === null) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(timestamp))
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestamp))
  }
}

export function providerLabel(provider: string): string {
  if (provider === 'openweathermap') return 'OpenWeatherMap'
  if (provider === 'open-meteo') return 'Open-Meteo'
  return provider
}
