import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FavouritesBar from './FavouritesBar'
import { karachi, lahore } from '../test/city-fixtures'
import { islamabad, multan, peshawar, quetta } from '../test/city-fixtures'

function renderBar(overrides: Partial<Parameters<typeof FavouritesBar>[0]> = {}) {
  const props = {
    favourites: [karachi, lahore],
    selectedCity: karachi,
    isFull: false,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<FavouritesBar {...props} />) }
}

describe('FavouritesBar', () => {
  it('lists saved cities with their region and count', () => {
    renderBar()

    expect(screen.getByRole('heading', { name: 'Saved cities' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Karachi/ })).toBeInTheDocument()
    expect(screen.getByText('2/5')).toBeInTheDocument()
    expect(screen.getByText('Punjab, Pakistan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Karachi/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /^Lahore/ })).not.toHaveAttribute('aria-current')
  })

  it('switches city when a saved city is clicked', () => {
    const { props } = renderBar()

    fireEvent.click(screen.getByRole('button', { name: /^Lahore/ }))

    expect(props.onSelect).toHaveBeenCalledWith(lahore)
  })

  it('removes a saved city', () => {
    const { props } = renderBar()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Karachi from saved cities' }))

    expect(props.onRemove).toHaveBeenCalledWith(karachi)
  })

  it('offers to save a city that is not saved yet', () => {
    const unsaved = quetta
    const { props } = renderBar({ favourites: [karachi], selectedCity: unsaved })

    const save = screen.getByRole('button', { name: 'Save Quetta' })
    fireEvent.click(save)

    expect(props.onSave).toHaveBeenCalledWith(unsaved)
  })

  it('hides the save button for an already saved city', () => {
    renderBar({ selectedCity: lahore, favourites: [karachi, lahore] })

    expect(screen.queryByRole('button', { name: /^Save / })).not.toBeInTheDocument()
  })

  it('disables saving and explains when five cities are saved', () => {
    const full = [karachi, lahore, multan, islamabad, peshawar]
    renderBar({ favourites: full, selectedCity: quetta, isFull: true })

    expect(screen.getByRole('button', { name: 'Save Quetta' })).toBeDisabled()
    expect(screen.getByText(/remove one to save another/i)).toBeInTheDocument()
    expect(screen.getByText('5/5')).toBeInTheDocument()
  })

  it('shows a hint when nothing is saved', () => {
    renderBar({ favourites: [], selectedCity: null })

    expect(screen.getByText(/save a city to switch back/i)).toBeInTheDocument()
  })
})
