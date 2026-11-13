import type { WeatherIconKey } from '../api/weather'

export type AtmosphereVariant =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'fog'
  | 'wind'
  | 'ambient'

/**
 * Map the snapshot's icon vocabulary onto the scenes we draw. No condition is
 * invented: an unknown or absent icon gets the neutral ambience.
 */
export function atmosphereFromIcon(icon: WeatherIconKey | null): AtmosphereVariant {
  switch (icon) {
    case 'clear-day':
    case 'clear-night':
      return 'clear'
    case 'partly-cloudy-day':
    case 'partly-cloudy-night':
      return 'partly'
    case 'cloudy':
      return 'cloudy'
    case 'fog':
      return 'fog'
    case 'drizzle':
    case 'rain':
    case 'heavy-rain':
      return 'rain'
    case 'snow':
    case 'sleet':
      return 'snow'
    case 'thunderstorm':
      return 'storm'
    case 'wind':
      return 'wind'
    default:
      return 'ambient'
  }
}

/** The icon key itself decides night for clear/partly; isDay is the fallback. */
export function isNightScene(icon: WeatherIconKey | null, isDay: boolean): boolean {
  if (icon === 'clear-night' || icon === 'partly-cloudy-night') return true
  return !isDay
}
