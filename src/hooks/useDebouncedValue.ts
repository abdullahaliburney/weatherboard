import { useEffect, useState } from 'react'

/**
 * Debouncing belongs to the UI, not the provider: this hook lets the search
 * input settle before a request is issued, while the Worker stays a pure,
 * cacheable data source.
 *
 * A zero (or negative) delay is handled during render rather than by calling
 * setState inside the effect, which would cause a cascading render.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (delayMs <= 0) return
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return delayMs <= 0 ? value : debounced
}
