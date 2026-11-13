import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { Units, WeatherQuery, WeatherResponse } from '../api/weather'
import { useWeather } from './useWeather'
import { deferred, makeSnapshot, makeWeatherResponse } from '../test/weather-fixtures'
import { createMemoryStore } from '../test/memory-store'

const KARACHI = { latitude: 24.8608, longitude: 67.0104 }
const LAHORE = { latitude: 31.5204, longitude: 74.3587 }

function createFetcher(response: () => WeatherResponse = makeWeatherResponse) {
  return vi.fn(async (_query: WeatherQuery) => response())
}

describe('useWeather', () => {
  it('stays idle without a location and never calls the API', async () => {
    const fetcher = createFetcher()
    const { result } = renderHook(() => useWeather(null, 'metric', { fetcher, store: null }))

    expect(result.current.status).toBe('idle')
    expect(result.current.snapshot).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reports loading, then success with the snapshot', async () => {
    const pending = deferred<WeatherResponse>()
    const fetcher = vi.fn((_query: WeatherQuery) => pending.promise)
    const { result } = renderHook(() => useWeather(KARACHI, 'metric', { fetcher, store: null }))

    expect(result.current.status).toBe('loading')

    await act(async () => {
      pending.resolve(makeWeatherResponse())
    })

    expect(result.current.status).toBe('success')
    expect(result.current.snapshot?.current.temperature).toBe(25.9)
    expect(result.current.provider).toBe('open-meteo')
    expect(result.current.updatedAt).toBeTypeOf('number')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toMatchObject({
      lat: 24.8608,
      lon: 67.0104,
      units: 'metric',
      refresh: false,
    })
  })

  it('maps an API failure to a friendly error', async () => {
    const fetcher = vi.fn(async () => {
      throw new ApiError('provider_error', 502, 'upstream exploded')
    })
    const { result } = renderHook(() => useWeather(KARACHI, 'metric', { fetcher, store: null }))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.code).toBe('provider_error')
    expect(result.current.error?.message).toMatch(/could not be reached/i)
    expect(result.current.snapshot).toBeNull()
  })

  it('retries after an error', async () => {
    const fetcher = vi.fn(async (_query: WeatherQuery) => makeWeatherResponse())
    fetcher.mockRejectedValueOnce(new ApiError('upstream_timeout', 504, 'timeout'))

    const { result } = renderHook(() => useWeather(KARACHI, 'metric', { fetcher, store: null }))
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refreshes with the bypass flag while keeping the current snapshot visible', async () => {
    const second = deferred<WeatherResponse>()
    const fetcher = vi.fn(async (_query: WeatherQuery) => makeWeatherResponse())
    fetcher.mockImplementationOnce(async () => makeWeatherResponse())
    fetcher.mockImplementationOnce(() => second.promise)

    const { result } = renderHook(() => useWeather(KARACHI, 'metric', { fetcher, store: null }))
    await waitFor(() => expect(result.current.status).toBe('success'))

    act(() => {
      result.current.refresh()
    })

    expect(result.current.isRefreshing).toBe(true)
    expect(result.current.snapshot).not.toBeNull()
    expect(fetcher.mock.calls[1][0]).toMatchObject({ refresh: true })

    await act(async () => {
      second.resolve(makeWeatherResponse())
    })

    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.status).toBe('success')
  })

  it('requests the new unit system when units change', async () => {
    const fetcher = createFetcher()
    const { rerender } = renderHook(
      ({ units }: { units: Units }) => useWeather(KARACHI, units, { fetcher, store: null }),
      { initialProps: { units: 'metric' as Units } },
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    rerender({ units: 'imperial' })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(fetcher.mock.calls[1][0]).toMatchObject({ units: 'imperial' })
  })

  it('ignores a stale response after switching cities', async () => {
    const first = deferred<WeatherResponse>()
    const second = deferred<WeatherResponse>()
    const fetcher = vi.fn((query: WeatherQuery) =>
      query.lat === KARACHI.latitude ? first.promise : second.promise,
    )

    const { result, rerender } = renderHook(({ city }) => useWeather(city, 'metric', { fetcher, store: null }), {
      initialProps: { city: KARACHI as { latitude: number; longitude: number } },
    })

    rerender({ city: LAHORE })

    await act(async () => {
      second.resolve(
        makeWeatherResponse({
          weather: makeSnapshot({
            current: { ...makeSnapshot().current, temperature: 18.4, condition: 'Clear night' },
          }),
        }),
      )
    })

    expect(result.current.status).toBe('success')
    expect(result.current.snapshot?.current.temperature).toBe(18.4)

    // The Karachi response arrives late and must not replace Lahore's weather.
    await act(async () => {
      first.resolve(makeWeatherResponse())
    })

    expect(result.current.snapshot?.current.temperature).toBe(18.4)
    expect(result.current.status).toBe('success')
  })

  it('answers from the last saved forecast when the request fails', async () => {
    const { store } = createMemoryStore()
    const online = createFetcher()
    const first = renderHook(() => useWeather(KARACHI, 'metric', { fetcher: online, store }))
    await waitFor(() => expect(first.result.current.status).toBe('success'))
    first.unmount()

    const failing = vi.fn(async () => {
      throw new ApiError('network_error', 0, 'offline')
    })
    const { result } = renderHook(() => useWeather(KARACHI, 'metric', { fetcher: failing, store }))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.fromCache).toBe(true)
    expect(result.current.cachedAt).toBeTypeOf('number')
    expect(result.current.snapshot?.current.temperature).toBe(25.9)
    expect(result.current.provider).toBe('open-meteo')
  })

  it('reports a clear offline error when nothing is cached', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const failing = vi.fn(async () => {
      throw new ApiError('network_error', 0, 'offline')
    })

    const { result } = renderHook(() =>
      useWeather(KARACHI, 'metric', { fetcher: failing, store: null }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.code).toBe('offline')
    expect(result.current.error?.message).toMatch(/offline and there is no saved weather/i)
    onLine.mockRestore()
  })
})
