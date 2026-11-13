import type {
  CurrentWeather,
  DailyWeather,
  WeatherResponse,
  WeatherSnapshot,
} from '../api/weather'

export function makeCurrent(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
    temperature: 25.9,
    feelsLike: 29.1,
    humidity: 76,
    pressure: null,
    windSpeed: 9.2,
    windDirection: null,
    condition: 'Overcast',
    icon: 'cloudy',
    isDay: false,
    observedAt: '2026-11-12T15:30:00.000Z',
    ...overrides,
  }
}

export function makeDaily(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return {
    date: '2026-11-12',
    min: 22.6,
    max: 29.8,
    condition: 'Overcast',
    icon: 'cloudy',
    precipitationProbability: 0,
    sunrise: '2026-11-12T01:46:00.000Z',
    sunset: '2026-11-12T12:45:00.000Z',
    ...overrides,
  }
}

export function makeSnapshot(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    location: {
      name: null,
      latitude: 24.85,
      longitude: 66.99,
      timezone: 'Asia/Karachi',
      utcOffsetSeconds: 18000,
    },
    units: { temperature: '°C', windSpeed: 'km/h' },
    current: makeCurrent(),
    daily: [
      makeDaily(),
      makeDaily({ date: '2026-11-13', condition: 'Drizzle', icon: 'drizzle', precipitationProbability: 53, min: 24.9, max: 31 }),
      makeDaily({ date: '2026-11-14', condition: 'Thunderstorm', icon: 'thunderstorm', precipitationProbability: 34, min: 24.5, max: 29.6 }),
      makeDaily({ date: '2026-11-15', condition: 'Fog', icon: 'fog', precipitationProbability: 2, min: 22, max: 29.4 }),
      makeDaily({ date: '2026-11-16', condition: 'Clear sky', icon: 'clear-day', precipitationProbability: 0, min: 20.7, max: 32.1 }),
    ],
    ...overrides,
  }
}

export function makeWeatherResponse(overrides: Partial<WeatherResponse> = {}): WeatherResponse {
  return {
    provider: 'open-meteo',
    units: 'metric',
    fetchedAt: '2026-11-12T17:45:00.000Z',
    weather: makeSnapshot(),
    meta: { fallbackFrom: null, fallbackReason: null },
    ...overrides,
  }
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
