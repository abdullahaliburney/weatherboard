import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { CitiesResponse, City } from '../api/cities'
import { useCitySearch } from './useCitySearch'

function makeCity(id: string, name: string, extra: Partial<City> = {}): City {
  return {
    id,
    name,
    country: 'Pakistan',
    countryCode: 'PK',
    region: 'Sindh',
    latitude: 24.8608,
    longitude: 67.0104,
    population: 11624219,
    timezone: 'Asia/Karachi',
    label: `${name}, Sindh, Pakistan`,
    ...extra,
  }
}

function makeResponse(query: string, cities: City[]): CitiesResponse {
  return {
    query,
    cities,
    meta: { source: 'geodb', fallbackFrom: null, fallbackReason: null },
  }
}

function createSearch() {
  return vi.fn(
    async (
      _query: string,
      _options?: { signal?: AbortSignal; limit?: number },
    ): Promise<CitiesResponse> => makeResponse('empty', []),
  )
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useCitySearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('never calls the API for queries shorter than the minimum', async () => {
    const search = createSearch()
    const { result } = renderHook(() => useCitySearch('k', { search }))

    await advance(500)

    expect(search).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
    expect(result.current.isTooShort).toBe(true)
  })

  it('does not search while the dropdown is closed', async () => {
    const search = createSearch()
    renderHook(() => useCitySearch('karachi', { search, enabled: false }))

    await advance(500)

    expect(search).not.toHaveBeenCalled()
  })

  it('debounces rapid typing into one request for the final query', async () => {
    const search = createSearch()
    search.mockResolvedValue(makeResponse('karachi', [makeCity('1', 'Karachi')]))

    const { result, rerender } = renderHook(({ term }) => useCitySearch(term, { search }), {
      initialProps: { term: '' },
    })

    rerender({ term: 'k' })
    await advance(100)
    rerender({ term: 'ka' })
    await advance(100)
    rerender({ term: 'karachi' })
    await advance(300)

    expect(search).toHaveBeenCalledTimes(1)
    expect(search.mock.calls[0][0]).toBe('karachi')
    expect(result.current.status).toBe('success')
    expect(result.current.cities).toHaveLength(1)
  })

  it('reports loading until the request settles', async () => {
    let resolveSearch: ((value: CitiesResponse) => void) | undefined
    const search = vi.fn(
      () =>
        new Promise<CitiesResponse>((resolve) => {
          resolveSearch = resolve
        }),
    )

    const { result } = renderHook(() => useCitySearch('karachi', { search }))
    await advance(300)

    expect(result.current.status).toBe('loading')

    await act(async () => {
      resolveSearch?.(makeResponse('karachi', [makeCity('1', 'Karachi')]))
    })

    expect(result.current.status).toBe('success')
  })

  it('returns an empty list without error when nothing matches', async () => {
    const search = createSearch()
    search.mockResolvedValue(makeResponse('zzzz', []))

    const { result } = renderHook(() => useCitySearch('zzzz', { search }))
    await advance(300)

    expect(result.current.status).toBe('success')
    expect(result.current.cities).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('maps an API error to friendly copy', async () => {
    const search = createSearch()
    search.mockRejectedValue(new ApiError('rate_limited', 429, 'upstream said 429'))

    const { result } = renderHook(() => useCitySearch('karachi', { search }))
    await advance(300)

    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe('rate_limited')
    expect(result.current.error?.message).toMatch(/too many searches/i)
  })

  it('maps a network failure to a network error', async () => {
    const search = createSearch()
    search.mockRejectedValue(new TypeError('Failed to fetch'))

    const { result } = renderHook(() => useCitySearch('karachi', { search }))
    await advance(300)

    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe('network_error')
  })

  it('cancels the in-flight request when the query changes', async () => {
    const search = createSearch()
    const pending = new Promise<CitiesResponse>(() => {})
    search.mockImplementationOnce(() => pending)
    search.mockResolvedValueOnce(makeResponse('karachi', [makeCity('2', 'Karachi')]))

    const { rerender } = renderHook(({ term }) => useCitySearch(term, { search }), {
      initialProps: { term: 'ka' },
    })
    await advance(100)

    const firstSignal = search.mock.calls[0][1]?.signal
    expect(firstSignal?.aborted).toBe(false)

    rerender({ term: 'karachi' })
    await advance(300)

    expect(firstSignal?.aborted).toBe(true)
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('ignores a stale response that resolves after a newer one', async () => {
    const resolvers: Array<(value: CitiesResponse) => void> = []
    const search = vi.fn(
      () =>
        new Promise<CitiesResponse>((resolve) => {
          resolvers.push(resolve)
        }),
    )

    const { result, rerender } = renderHook(({ term }) => useCitySearch(term, { search }), {
      initialProps: { term: 'ka' },
    })
    await advance(100)

    rerender({ term: 'karachi' })
    await advance(300)

    expect(resolvers).toHaveLength(2)

    // Newer query resolves first…
    await act(async () => {
      resolvers[1](makeResponse('karachi', [makeCity('2', 'Karachi')]))
    })
    expect(result.current.cities.map((city) => city.id)).toEqual(['2'])

    // …then the outdated one arrives late and must not win.
    await act(async () => {
      resolvers[0](makeResponse('ka', [makeCity('1', 'Stale city')]))
    })
    expect(result.current.cities.map((city) => city.id)).toEqual(['2'])
    expect(result.current.status).toBe('success')
  })

  it('does not refetch an unchanged query', async () => {
    const search = createSearch()
    search.mockResolvedValue(makeResponse('karachi', [makeCity('1', 'Karachi')]))

    const { rerender, result } = renderHook(({ term }) => useCitySearch(term, { search }), {
      initialProps: { term: 'karachi' },
    })
    await advance(300)
    expect(search).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('success')

    rerender({ term: 'karachi ' })
    await advance(300)

    expect(search).toHaveBeenCalledTimes(1)
  })

  it('refetches after an error when retry is called', async () => {
    const search = createSearch()
    search.mockRejectedValueOnce(new ApiError('provider_error', 502, 'boom'))
    search.mockResolvedValueOnce(makeResponse('karachi', [makeCity('1', 'Karachi')]))

    const { result } = renderHook(() => useCitySearch('karachi', { search }))
    await advance(300)
    expect(result.current.status).toBe('error')

    act(() => {
      result.current.retry()
    })
    await act(async () => {})

    expect(search).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('success')
    expect(result.current.cities).toHaveLength(1)
  })
})
