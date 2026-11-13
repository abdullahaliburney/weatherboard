import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSelectedCity } from './useSelectedCity'
import { STORAGE_KEYS } from '../lib/storage'
import { createMemoryStore } from '../test/memory-store'
import { karachi, lahore } from '../test/city-fixtures'

describe('useSelectedCity', () => {
  it('starts empty when nothing is stored', () => {
    const { store } = createMemoryStore()
    const { result } = renderHook(() => useSelectedCity(store))

    expect(result.current[0]).toBeNull()
  })

  it('remembers the selected city', () => {
    const { store, read } = createMemoryStore()
    const { result } = renderHook(() => useSelectedCity(store))

    act(() => result.current[1](karachi))

    expect(result.current[0]).toEqual(karachi)
    expect(JSON.parse(read(STORAGE_KEYS.selectedCity) ?? 'null')).toEqual(karachi)
  })

  it('restores the city after a remount', () => {
    const { store } = createMemoryStore()
    const first = renderHook(() => useSelectedCity(store))
    act(() => first.result.current[1](lahore))
    first.unmount()

    const second = renderHook(() => useSelectedCity(store))

    expect(second.result.current[0]).toEqual(lahore)
  })

  it('ignores malformed stored data', () => {
    const { store } = createMemoryStore({
      [STORAGE_KEYS.selectedCity]: '{"name":"broken"',
    })
    const { result } = renderHook(() => useSelectedCity(store))

    expect(result.current[0]).toBeNull()
  })

  it('clears the remembered city when set to null', () => {
    const { store } = createMemoryStore()
    const first = renderHook(() => useSelectedCity(store))
    act(() => first.result.current[1](karachi))
    act(() => first.result.current[1](null))
    first.unmount()

    const second = renderHook(() => useSelectedCity(store))

    expect(second.result.current[0]).toBeNull()
  })

  it('works without a store', () => {
    const { result } = renderHook(() => useSelectedCity(null))

    act(() => result.current[1](karachi))

    expect(result.current[0]).toEqual(karachi)
  })
})
