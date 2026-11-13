/**
 * Provider fixtures used by the tests. These are hand-written payloads that
 * follow the published provider contracts, not captures of live API calls — so
 * nothing here proves a live integration.
 */

export const owmCurrentFixture = {
  coord: { lon: 67.0104, lat: 24.8608 },
  weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01n' }],
  main: { temp: 26.3, feels_like: 29.4, temp_min: 25.1, temp_max: 27.2, pressure: 1012, humidity: 73 },
  visibility: 6000,
  wind: { speed: 2.5, deg: 240 },
  clouds: { all: 0 },
  dt: 1794483000,
  sys: { country: 'PK', sunrise: 1794448320, sunset: 1794487620 },
  timezone: 18000,
  id: 1174872,
  name: 'Karachi',
  cod: 200,
}

/**
 * First entry is 2026-11-12T00:00 local at UTC+05:00, stepping 3 hours, giving
 * exactly 5 local calendar days (40 entries) like the real endpoint.
 */
const OWM_FORECAST_START = 1794423600
const THREE_HOURS = 10_800

const round = (value: number) => Math.round(value * 10) / 10

function owmForecastEntry(index: number) {
  const dt = OWM_FORECAST_START + index * THREE_HOURS
  const iso = new Date(dt * 1000).toISOString()
  const temperature = 24 + 3 * Math.sin(((index % 8) / 8) * Math.PI * 2)
  const night = index % 8 < 2 || index % 8 > 5

  return {
    dt,
    main: {
      temp: round(temperature),
      feels_like: round(temperature + 2),
      temp_min: round(temperature - 1.2),
      temp_max: round(temperature + 1.8),
      humidity: 70,
    },
    weather: [
      night
        ? { id: 800, main: 'Clear', description: 'clear sky', icon: '01n' }
        : { id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' },
    ],
    wind: { speed: 2.4, deg: 240 },
    pop: index % 8 === 3 ? 0.35 : 0.05,
    dt_txt: `${iso.slice(0, 10)} ${iso.slice(11, 13)}:00:00`,
  }
}

export const owmForecastFixture = {
  cod: '200',
  message: 0,
  cnt: 40,
  list: Array.from({ length: 40 }, (_, index) => owmForecastEntry(index)),
  city: {
    id: 1174872,
    name: 'Karachi',
    country: 'PK',
    timezone: 18000,
    coord: { lat: 24.8608, lon: 67.0104 },
  },
}

export const geodbCitiesFixture = {
  data: [
    {
      id: 1174872,
      wikiDataId: 'Q8660',
      type: 'CITY',
      city: 'Karachi',
      name: 'Karachi',
      country: 'Pakistan',
      countryCode: 'PK',
      region: 'Sindh',
      latitude: 24.8608,
      longitude: 67.0104,
      population: 11624219,
    },
    {
      id: 552908,
      wikiDataId: 'Q15761',
      type: 'CITY',
      city: 'Karachi',
      name: 'Karachi',
      country: 'Russia',
      countryCode: 'RU',
      region: 'Kirov Oblast',
      latitude: 57.85386,
      longitude: 49.55974,
      population: 1200,
    },
  ],
  metadata: { currentOffset: 0, totalCount: 2 },
}

export const openMeteoGeocodeFixture = {
  results: [
    {
      id: 1174872,
      name: 'Karachi',
      latitude: 24.8608,
      longitude: 67.0104,
      elevation: 8,
      feature_code: 'PPLA',
      country_code: 'PK',
      admin1: 'Sindh',
      timezone: 'Asia/Karachi',
      population: 11624219,
      country: 'Pakistan',
    },
  ],
  generationtime_ms: 0.09,
}

export const openMeteoWeatherFixture = {
  latitude: 24.85,
  longitude: 66.99,
  utc_offset_seconds: 18000,
  timezone: 'Asia/Karachi',
  timezone_abbreviation: 'GMT+5',
  current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
  current: {
    time: '2026-11-12T20:30',
    interval: 900,
    temperature_2m: 26.3,
    relative_humidity_2m: 73,
    apparent_temperature: 29.4,
    weather_code: 0,
    wind_speed_10m: 9,
    is_day: 0,
  },
  daily_units: { weather_code: 'wmo code', temperature_2m_max: '°C' },
  daily: {
    time: ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'],
    weather_code: [3, 51, 95, 45, 0],
    temperature_2m_max: [29.8, 31, 29.6, 29.4, 32.1],
    temperature_2m_min: [22.6, 24.9, 24.5, 22, 20.7],
    precipitation_probability_max: [0, 10, 80, 5, 0],
    sunrise: [
      '2026-11-12T06:52',
      '2026-11-13T06:53',
      '2026-11-14T06:53',
      '2026-11-15T06:54',
      '2026-11-16T06:54',
    ],
    sunset: [
      '2026-11-12T17:47',
      '2026-11-13T17:47',
      '2026-11-14T17:46',
      '2026-11-15T17:46',
      '2026-11-16T17:45',
    ],
  },
}
