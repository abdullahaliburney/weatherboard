import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CitiesResponse, City } from '../api/cities'
import { ApiError } from '../api/client'
import SearchBar from './SearchBar'

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

function makeResponse(cities: City[]): CitiesResponse {
  return {
    query: 'karachi',
    cities,
    meta: { source: 'geodb', fallbackFrom: null, fallbackReason: null },
  }
}

const karachi = makeCity('1174872', 'Karachi')
const secondCity = makeCity('552908', 'Karachiovo', {
  country: 'Russia',
  region: 'Kirov Oblast',
  latitude: 57.85386,
  longitude: 49.55974,
})

function createSearch(cities: City[] = [karachi, secondCity]) {
  return vi.fn(
    async (
      _query: string,
      _options?: { signal?: AbortSignal; limit?: number },
    ): Promise<CitiesResponse> => makeResponse(cities),
  )
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function typeAndSettle(value: string) {
  const input = screen.getByLabelText(/search for a city/i)
  fireEvent.change(input, { target: { value } })
  await advance(300)
  return input
}

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('has an associated label and hint', () => {
    render(<SearchBar onSelectCity={vi.fn()} search={createSearch()} />)

    const input = screen.getByLabelText(/search for a city/i)
    expect(input).toHaveAttribute('role', 'combobox')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(screen.getByText(/start typing at least 2 characters/i)).toBeInTheDocument()
  })

  it('shows city name, region and country after debounce', async () => {
    render(<SearchBar onSelectCity={vi.fn()} search={createSearch()} />)

    await typeAndSettle('karachi')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveTextContent('Karachi')
    expect(options[0]).toHaveTextContent('Sindh, Pakistan')
    expect(options[1]).toHaveTextContent('Kirov Oblast, Russia')
  })

  it('does not request anything for a single character', async () => {
    const search = createSearch()
    render(<SearchBar onSelectCity={vi.fn()} search={search} />)

    await typeAndSettle('k')

    expect(search).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument()
  })

  it('navigates with arrow keys and selects with Enter', async () => {
    const onSelectCity = vi.fn()
    render(<SearchBar onSelectCity={onSelectCity} search={createSearch()} />)

    const input = await typeAndSettle('karachi')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toContain('option-0')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const second = screen.getAllByRole('option')[1]
    expect(input.getAttribute('aria-activedescendant')).toBe(second.id)

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSelectCity).toHaveBeenCalledTimes(1)
    expect(onSelectCity).toHaveBeenCalledWith(
      expect.objectContaining({ id: '552908', latitude: 57.85386, longitude: 49.55974 }),
    )
    expect((input as HTMLInputElement).value).toBe('Karachiovo')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the dropdown with Escape without selecting', async () => {
    const onSelectCity = vi.fn()
    render(<SearchBar onSelectCity={onSelectCity} search={createSearch()} />)

    const input = await typeAndSettle('karachi')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onSelectCity).not.toHaveBeenCalled()
  })

  it('selects a city by clicking it', async () => {
    const onSelectCity = vi.fn()
    render(<SearchBar onSelectCity={onSelectCity} search={createSearch()} />)

    await typeAndSettle('karachi')
    fireEvent.click(screen.getAllByRole('option')[0])

    expect(onSelectCity).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1174872', name: 'Karachi', latitude: 24.8608 }),
    )
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    render(<SearchBar onSelectCity={vi.fn()} search={createSearch([])} />)

    await typeAndSettle('zzzz')

    expect(screen.getByText(/no cities match/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('does not search and explains itself when offline', async () => {
    const search = createSearch()
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    try {
      render(<SearchBar onSelectCity={vi.fn()} search={search} />)

      const input = screen.getByLabelText(/search for a city/i)
      fireEvent.change(input, { target: { value: 'karachi' } })
      expect(screen.getByText(/offline — city search needs a connection/i)).toBeInTheDocument()

      await advance(400)

      expect(search).not.toHaveBeenCalled()
      expect(screen.getByText(/unavailable offline/i)).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      Reflect.deleteProperty(navigator, 'onLine')
    }
  })

  it('shows an API error and recovers via retry', async () => {
    const search = vi.fn()
    search.mockRejectedValueOnce(new ApiError('rate_limited', 429, 'upstream 429'))
    search.mockResolvedValueOnce(makeResponse([karachi]))

    render(<SearchBar onSelectCity={vi.fn()} search={search} />)

    await typeAndSettle('karachi')
    expect(screen.getByRole('alert')).toHaveTextContent(/too many searches/i)

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    await act(async () => {})

    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
