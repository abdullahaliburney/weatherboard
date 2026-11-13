import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEYS } from './lib/storage'
import { karachi, lahore } from './test/city-fixtures'

beforeEach(() => {
  localStorage.clear()
})

describe('App scaffold (C0)', () => {
  it('renders the WeatherBoard heading and the empty state', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'WeatherBoard' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /no city selected yet/i })).toBeInTheDocument()
  })

  it('does not pretend to have weather data yet', () => {
    render(<App />)

    // The unit toggle may label itself °C, but no actual temperature is shown.
    expect(screen.queryByText(/-?\d+\s?°[CF]/)).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})

describe('App preferences (C5)', () => {
  it('restores saved cities and the unit system from storage', () => {
    localStorage.setItem(STORAGE_KEYS.favourites, JSON.stringify([karachi, lahore]))
    localStorage.setItem(STORAGE_KEYS.units, '"imperial"')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Saved cities' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Karachi/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Lahore/ })).toBeInTheDocument()
    expect(screen.getByText('2/5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true')
    // Restoring favourites does not silently request weather for one of them.
    expect(
      screen.getByRole('heading', { level: 2, name: /no city selected yet/i }),
    ).toBeInTheDocument()
  })

  it('ignores malformed stored preferences', () => {
    localStorage.setItem(STORAGE_KEYS.favourites, '{not json')
    localStorage.setItem(STORAGE_KEYS.units, '"kelvin"')

    render(<App />)

    expect(screen.queryByRole('heading', { name: 'Saved cities' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('restores the remembered city and starts loading its weather', () => {
    localStorage.setItem(STORAGE_KEYS.selectedCity, JSON.stringify(karachi))

    render(<App />)

    expect(
      screen.queryByRole('heading', { level: 2, name: /no city selected yet/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/loading weather for karachi/i)).toBeInTheDocument()
  })

  it('keeps the empty state when the stored city is malformed', () => {
    localStorage.setItem(STORAGE_KEYS.selectedCity, '{"name":"Karachi"}')

    render(<App />)

    expect(
      screen.getByRole('heading', { level: 2, name: /no city selected yet/i }),
    ).toBeInTheDocument()
  })

  it('persists a unit change so a reload restores it', () => {
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '°F' }))
    first.unmount()

    render(<App />)

    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true')
  })
})
