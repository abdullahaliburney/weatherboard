import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useUnitsPreference } from './useUnitsPreference'
import { STORAGE_KEYS } from '../lib/storage'
import { createMemoryStore } from '../test/memory-store'

describe('useUnitsPreference', () => {
  it('defaults to metric and writes the default', () => {
    const { store, read } = createMemoryStore()
    const { result } = renderHook(() => useUnitsPreference(store))

    expect(result.current[0]).toBe('metric')
    expect(read(STORAGE_KEYS.units)).toBe('"metric"')
  })

  it('persists a change and restores it after a remount', () => {
    const { store, read } = createMemoryStore()
    const first = renderHook(() => useUnitsPreference(store))

    act(() => first.result.current[1]('imperial'))

    expect(first.result.current[0]).toBe('imperial')
    expect(read(STORAGE_KEYS.units)).toBe('"imperial"')
    first.unmount()

    const second = renderHook(() => useUnitsPreference(store))
    expect(second.result.current[0]).toBe('imperial')
  })

  it('ignores an unknown stored value', () => {
    const { store } = createMemoryStore({ [STORAGE_KEYS.units]: '"kelvin"' })
    const { result } = renderHook(() => useUnitsPreference(store))

    expect(result.current[0]).toBe('metric')
  })
})
