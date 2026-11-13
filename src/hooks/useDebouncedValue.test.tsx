import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('kar', 300))
    expect(result.current).toBe('kar')
  })

  it('only publishes the latest value after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'k' },
    })

    rerender({ value: 'ka' })
    rerender({ value: 'kar' })
    expect(result.current).toBe('k')

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('k')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('kar')
  })

  it('cancels a pending update when the value changes again', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ value: 'abc' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('abc')
  })
})
