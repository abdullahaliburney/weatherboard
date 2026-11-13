import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFavourites } from './useFavourites'
import { STORAGE_KEYS } from '../lib/storage'
import { createMemoryStore } from '../test/memory-store'
import { islamabad, karachi, lahore, multan, peshawar, quetta } from '../test/city-fixtures'

describe('useFavourites', () => {
  it('starts empty and adds a city', () => {
    const { store } = createMemoryStore()
    const { result } = renderHook(() => useFavourites(store))

    expect(result.current.favourites).toEqual([])

    act(() => result.current.add(karachi))

    expect(result.current.favourites).toEqual([karachi])
    expect(result.current.isFavourite(karachi.id)).toBe(true)
    expect(result.current.isFull).toBe(false)
  })

  it('does not add the same city twice', () => {
    const { store, read } = createMemoryStore()
    const { result } = renderHook(() => useFavourites(store))

    act(() => result.current.add(karachi))
    act(() => result.current.add({ ...karachi, name: 'Karachi again' }))

    expect(result.current.favourites).toHaveLength(1)
    expect(JSON.parse(read(STORAGE_KEYS.favourites) ?? '[]')).toHaveLength(1)
  })

  it('caps the list at five cities and reports it', () => {
    const { store } = createMemoryStore()
    const { result } = renderHook(() => useFavourites(store))

    for (const city of [karachi, lahore, multan, islamabad, quetta, peshawar]) {
      act(() => result.current.add(city))
    }

    expect(result.current.favourites).toHaveLength(5)
    expect(result.current.favourites.map((city) => city.name)).not.toContain('Peshawar')
    expect(result.current.isFull).toBe(true)
    expect(result.current.max).toBe(5)
  })

  it('removes a saved city', () => {
    const { store } = createMemoryStore()
    const { result } = renderHook(() => useFavourites(store))

    act(() => result.current.add(karachi))
    act(() => result.current.add(lahore))
    act(() => result.current.remove(karachi.id))

    expect(result.current.favourites).toEqual([lahore])
    expect(result.current.isFavourite(karachi.id)).toBe(false)
  })

  it('restores saved cities after a remount', () => {
    const { store } = createMemoryStore()
    const first = renderHook(() => useFavourites(store))
    act(() => first.result.current.add(karachi))
    act(() => first.result.current.add(lahore))
    first.unmount()

    const second = renderHook(() => useFavourites(store))
    expect(second.result.current.favourites).toEqual([karachi, lahore])
  })

  it('sanitises broken storage on load', () => {
    const { store } = createMemoryStore({
      [STORAGE_KEYS.favourites]: JSON.stringify([karachi, { nonsense: true }, karachi]),
    })
    const { result } = renderHook(() => useFavourites(store))

    expect(result.current.favourites).toEqual([karachi])
  })

  it('works without a store (persistence disabled)', () => {
    const { result } = renderHook(() => useFavourites(null))

    act(() => result.current.add(karachi))

    expect(result.current.favourites).toEqual([karachi])
  })
})
