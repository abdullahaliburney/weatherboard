/**
 * Canonical condition vocabulary. Both providers map into this, so the frontend
 * never sees a provider-specific code or description.
 */
export type WeatherIcon =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'sleet'
  | 'thunderstorm'
  | 'wind'
  | 'unknown'

export interface WeatherCondition {
  readonly condition: string
  readonly icon: WeatherIcon
}

const UNKNOWN: WeatherCondition = { condition: 'Unknown conditions', icon: 'unknown' }

/** OpenWeatherMap condition ids — https://openweathermap.org/weather-conditions */
export function owmCondition(id: number | null, isDay: boolean): WeatherCondition {
  if (id === null) return UNKNOWN
  if (id >= 200 && id < 300) return { condition: 'Thunderstorm', icon: 'thunderstorm' }
  if (id >= 300 && id < 400) return { condition: 'Drizzle', icon: 'drizzle' }
  if (id === 500) return { condition: 'Light rain', icon: 'rain' }
  if (id === 501) return { condition: 'Moderate rain', icon: 'rain' }
  if (id === 511) return { condition: 'Freezing rain', icon: 'sleet' }
  if (id >= 502 && id < 600) return { condition: 'Heavy rain', icon: 'heavy-rain' }
  if (id === 600) return { condition: 'Light snow', icon: 'snow' }
  if (id === 601) return { condition: 'Snow', icon: 'snow' }
  if (id === 602) return { condition: 'Heavy snow', icon: 'snow' }
  if (id >= 611 && id <= 616) return { condition: 'Sleet', icon: 'sleet' }
  if (id === 620 || id === 621 || id === 622) return { condition: 'Snow showers', icon: 'snow' }
  if (id >= 700 && id < 800) {
    if (id === 741) return { condition: 'Fog', icon: 'fog' }
    if (id === 771) return { condition: 'Squalls', icon: 'wind' }
    if (id === 781) return { condition: 'Tornado', icon: 'wind' }
    return { condition: 'Mist', icon: 'fog' }
  }
  if (id === 800) {
    return { condition: isDay ? 'Clear sky' : 'Clear night', icon: isDay ? 'clear-day' : 'clear-night' }
  }
  if (id === 801 || id === 802) {
    return {
      condition: 'Partly cloudy',
      icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night',
    }
  }
  if (id === 803 || id === 804) return { condition: 'Cloudy', icon: 'cloudy' }
  return UNKNOWN
}

/** WMO weather interpretation codes, as returned by Open-Meteo. */
export function wmoCondition(code: number | null, isDay: boolean): WeatherCondition {
  if (code === null) return UNKNOWN
  switch (code) {
    case 0:
      return {
        condition: isDay ? 'Clear sky' : 'Clear night',
        icon: isDay ? 'clear-day' : 'clear-night',
      }
    case 1:
      return {
        condition: 'Mainly clear',
        icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night',
      }
    case 2:
      return {
        condition: 'Partly cloudy',
        icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night',
      }
    case 3:
      return { condition: 'Overcast', icon: 'cloudy' }
    case 45:
    case 48:
      return { condition: 'Fog', icon: 'fog' }
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', icon: 'drizzle' }
    case 56:
    case 57:
      return { condition: 'Freezing drizzle', icon: 'sleet' }
    case 61:
      return { condition: 'Light rain', icon: 'rain' }
    case 63:
      return { condition: 'Rain', icon: 'rain' }
    case 65:
      return { condition: 'Heavy rain', icon: 'heavy-rain' }
    case 66:
    case 67:
      return { condition: 'Freezing rain', icon: 'sleet' }
    case 71:
      return { condition: 'Light snow', icon: 'snow' }
    case 73:
      return { condition: 'Snow', icon: 'snow' }
    case 75:
      return { condition: 'Heavy snow', icon: 'snow' }
    case 77:
      return { condition: 'Snow grains', icon: 'snow' }
    case 80:
      return { condition: 'Light showers', icon: 'rain' }
    case 81:
      return { condition: 'Showers', icon: 'rain' }
    case 82:
      return { condition: 'Heavy showers', icon: 'heavy-rain' }
    case 85:
    case 86:
      return { condition: 'Snow showers', icon: 'snow' }
    case 95:
      return { condition: 'Thunderstorm', icon: 'thunderstorm' }
    case 96:
    case 99:
      return { condition: 'Thunderstorm with hail', icon: 'thunderstorm' }
    default:
      return UNKNOWN
  }
}
