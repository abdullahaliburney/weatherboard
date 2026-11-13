import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { City } from '../api/cities'
import type { WeatherQuery, WeatherResponse } from '../api/weather'
import { ApiError } from '../api/client'
import WeatherDashboard from './WeatherDashboard'
import {
  deferred,
  makeCurrent,
  makeDaily,
  makeSnapshot,
  makeWeatherResponse,
} from '../test/weather-fixtures'
import { getBrowserStore } from '../lib/storage'
import { writeCachedWeather } from '../lib/weatherCache'

const karachi: City = {
  id: '1174872',
  name: 'Karachi',
  country: 'Pakistan',
  countryCode: 'PK',
  region: 'Sindh',
  latitude: 24.8608,
  longitude: 67.0104,
  population: 11624219,
  timezone: 'Asia/Karachi',
  label: 'Karachi, Sindh, Pakistan',
}

const lahore: City = {
  ...karachi,
  id: '1172451',
  name: 'Lahore',
  latitude: 31.5204,
  longitude: 74.3587,
  label: 'Lahore, Punjab, Pakistan',
}

function fetcherReturning(response: WeatherResponse) {
  return vi.fn(async (_query: WeatherQuery) => response)
}

describe('WeatherDashboard', () => {
  // A success in one test writes the offline cache, which would legitimately
  // rescue the error tests; each test starts from an empty store.
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the selected city, current conditions and five forecast days', async () => {
    render(
      <WeatherDashboard
        city={karachi}
        units="metric"
        fetcher={fetcherReturning(makeWeatherResponse())}
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Karachi' })).toBeInTheDocument()
    expect(screen.getByText(/Sindh, Pakistan/)).toBeInTheDocument()
    expect(screen.getByText('26°C')).toBeInTheDocument()
    expect(screen.getAllByText('Overcast').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/feels like 29°c/i)).toBeInTheDocument()
    expect(screen.getByText('76%')).toBeInTheDocument()
    expect(screen.getByText('9.2 km/h')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: '5-day forecast' })).toBeInTheDocument()
    const days = screen.getAllByRole('listitem')
    expect(days).toHaveLength(5)
    expect(days[0]).toHaveTextContent('Thu')
    expect(days[1]).toHaveTextContent('Fri')
    expect(days[1]).toHaveTextContent('53%')
    expect(screen.getByText(/data from open-meteo/i)).toBeInTheDocument()
  })

  it('shows sunrise and sunset in the city timezone', async () => {
    render(
      <WeatherDashboard
        city={karachi}
        units="metric"
        fetcher={fetcherReturning(makeWeatherResponse())}
      />,
    )

    await screen.findByRole('heading', { name: 'Karachi' })
    expect(screen.getByText('06:46')).toBeInTheDocument()
    expect(screen.getByText('17:45')).toBeInTheDocument()
  })

  it('renders an em dash for missing fields instead of a misleading zero', async () => {
    const snapshot = makeSnapshot({
      current: makeCurrent({ feelsLike: null, humidity: null, windSpeed: null }),
      daily: Array.from({ length: 5 }, (_, index) =>
        makeDaily({
          date: `2026-11-${12 + index}`,
          sunrise: null,
          sunset: null,
          precipitationProbability: null,
        }),
      ),
    })

    const { container } = render(
      <WeatherDashboard
        city={karachi}
        units="metric"
        fetcher={fetcherReturning(makeWeatherResponse({ weather: snapshot }))}
      />,
    )

    await screen.findByRole('heading', { name: 'Karachi' })

    // Four metric tiles show an em dash, and the feels-like line is marked too.
    expect(screen.getAllByText('—')).toHaveLength(4)
    expect(screen.getByText(/feels like —/i)).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(screen.queryByText('0 km/h')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.forecast__precip')).toHaveLength(0)
  })

  it('renders imperial units and requests them from the API', async () => {
    const fetcher = fetcherReturning(
      makeWeatherResponse({
        units: 'imperial',
        weather: makeSnapshot({
          units: { temperature: '°F', windSpeed: 'mph' },
          current: makeCurrent({ temperature: 78.6, feelsLike: 84.4, windSpeed: 5.7 }),
        }),
      }),
    )

    render(<WeatherDashboard city={karachi} units="imperial" fetcher={fetcher} />)

    expect(await screen.findByText('79°F')).toBeInTheDocument()
    expect(screen.getByText('5.7 mph')).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({ units: 'imperial' }))
  })

  it('shows a loading skeleton before data arrives', async () => {
    const pending = deferred<WeatherResponse>()
    const { container } = render(
      <WeatherDashboard city={karachi} units="metric" fetcher={() => pending.promise} />,
    )

    expect(screen.getByText(/loading weather for karachi/i)).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    await act(async () => {
      pending.resolve(makeWeatherResponse())
    })

    expect(screen.queryByText(/loading weather for karachi/i)).not.toBeInTheDocument()
    expect(await screen.findByText('26°C')).toBeInTheDocument()
  })

  it('shows an API error with a retry that recovers', async () => {
    const fetcher = vi.fn(async (_query: WeatherQuery) => makeWeatherResponse())
    fetcher.mockRejectedValueOnce(new ApiError('provider_error', 502, 'upstream failed'))

    render(<WeatherDashboard city={karachi} units="metric" fetcher={fetcher} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not be reached/i)
    expect(screen.getByText(/error code: provider_error/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText('26°C')).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refreshes with feedback and keeps showing data while updating', async () => {
    const second = deferred<WeatherResponse>()
    const fetcher = vi.fn(async (_query: WeatherQuery) => makeWeatherResponse())
    fetcher.mockImplementationOnce(async () => makeWeatherResponse())
    fetcher.mockImplementationOnce(() => second.promise)

    render(<WeatherDashboard city={karachi} units="metric" fetcher={fetcher} />)
    await screen.findByText('26°C')

    fireEvent.click(screen.getByRole('button', { name: /refresh weather for karachi/i }))

    await waitFor(() => expect(screen.getAllByText(/updating/i).length).toBeGreaterThan(0))
    expect(screen.getByText('26°C')).toBeInTheDocument()
    expect(fetcher.mock.calls[1][0]).toMatchObject({ refresh: true })

    await act(async () => {
      second.resolve(makeWeatherResponse())
    })

    await waitFor(() => expect(screen.queryAllByText(/updating/i)).toHaveLength(0))
    expect(screen.getByText(/updated \d{2}:\d{2}/i)).toBeInTheDocument()
  })

  it('labels cached weather as offline when the browser is offline', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    writeCachedWeather(
      getBrowserStore(),
      { latitude: karachi.latitude, longitude: karachi.longitude },
      'metric',
      makeSnapshot(),
      'open-meteo',
      Date.parse('2026-11-12T17:45:00.000Z'),
    )
    const failing = vi.fn(async (_query: WeatherQuery) => {
      throw new ApiError('network_error', 0, 'offline')
    })

    render(<WeatherDashboard city={karachi} units="metric" fetcher={failing} />)

    expect(await screen.findByText('26°C')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument()
    expect(screen.getByText(/last saved forecast/i)).toBeInTheDocument()
    expect(screen.getByText(/live data returns when you reconnect/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh weather for karachi/i })).toBeEnabled()
    onLine.mockRestore()
  })

  it('says cached, not offline, when only the server is unreachable', async () => {
    writeCachedWeather(
      getBrowserStore(),
      { latitude: karachi.latitude, longitude: karachi.longitude },
      'metric',
      makeSnapshot(),
      'open-meteo',
      Date.parse('2026-11-12T17:45:00.000Z'),
    )
    const failing = vi.fn(async (_query: WeatherQuery) => {
      throw new ApiError('provider_error', 502, 'upstream down')
    })

    render(<WeatherDashboard city={karachi} units="metric" fetcher={failing} />)

    expect(await screen.findByText('26°C')).toBeInTheDocument()
    expect(screen.getByText('Cached')).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
    expect(screen.getByText(/live weather could not be reached/i)).toBeInTheDocument()
  })

  it('shows a clear offline error when no forecast is saved', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const failing = vi.fn(async (_query: WeatherQuery) => {
      throw new ApiError('network_error', 0, 'offline')
    })

    render(<WeatherDashboard city={karachi} units="metric" fetcher={failing} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/offline and there is no saved weather/i)
    expect(screen.queryByText('26°C')).not.toBeInTheDocument()
    onLine.mockRestore()
  })

  it('switches cities and ignores the previous city’s late response', async () => {
    const karachiPending = deferred<WeatherResponse>()
    const lahoreResponse = makeWeatherResponse({
      weather: makeSnapshot({
        current: makeCurrent({ temperature: 18.4, condition: 'Clear night' }),
      }),
    })
    const fetcher = vi.fn((query: WeatherQuery) =>
      query.lat === karachi.latitude ? karachiPending.promise : Promise.resolve(lahoreResponse),
    )

    const { rerender } = render(
      <WeatherDashboard city={karachi} units="metric" fetcher={fetcher} />,
    )

    rerender(<WeatherDashboard city={lahore} units="metric" fetcher={fetcher} />)

    expect(await screen.findByRole('heading', { name: 'Lahore' })).toBeInTheDocument()
    expect(screen.getByText('18°C')).toBeInTheDocument()

    await act(async () => {
      karachiPending.resolve(makeWeatherResponse())
    })

    expect(screen.getByRole('heading', { name: 'Lahore' })).toBeInTheDocument()
    expect(screen.getByText('18°C')).toBeInTheDocument()
    expect(screen.queryByText('26°C')).not.toBeInTheDocument()
  })
})
