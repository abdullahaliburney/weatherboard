import { useCallback, useEffect, useState } from 'react'
import { searchCities } from '../api/cities'
import type { City } from '../api/cities'
import { ApiError } from '../api/client'
import { useDebouncedValue } from './useDebouncedValue'

export type CitySearchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface CitySearchError {
  readonly code: string
  readonly message: string
}

export interface UseCitySearchOptions {
  readonly debounceMs?: number
  readonly minQueryLength?: number
  readonly limit?: number
  /** When false the hook idles: no request is made for a closed dropdown. */
  readonly enabled?: boolean
  /** Injectable for tests; production always calls the Worker proxy. */
  readonly search?: typeof searchCities
}

export interface UseCitySearchResult {
  readonly status: CitySearchStatus
  readonly cities: City[]
  readonly error: CitySearchError | null
  readonly debouncedQuery: string
  readonly isTooShort: boolean
  readonly minQueryLength: number
  readonly retry: () => void
}

interface SettledState {
  readonly query: string
  readonly status: 'success' | 'error'
  readonly cities: City[]
  readonly error: CitySearchError | null
}

const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_MIN_QUERY_LENGTH = 2
const DEFAULT_LIMIT = 5

const MESSAGES: Record<string, string> = {
  rate_limited: 'Too many searches right now. Please try again in a moment.',
  provider_unconfigured: 'City search is temporarily unavailable.',
  provider_error: 'City search could not reach its data source. Please try again.',
  upstream_timeout: 'City search timed out. Please try again.',
  provider_auth_error: 'City search is temporarily unavailable.',
  invalid_input: 'That search could not be understood. Try a different spelling.',
  network_error: 'Could not reach the server. Check your connection and try again.',
  timeout: 'City search timed out. Please try again.',
}

function toSearchError(error: unknown): CitySearchError {
  if (error instanceof ApiError) {
    return { code: error.code, message: MESSAGES[error.code] ?? error.message }
  }
  return { code: 'network_error', message: MESSAGES.network_error }
}

/**
 * Debounced city search with cancellation and a stale-response guard.
 *
 * - Typing is debounced in the UI (never inside the provider).
 * - Each query owns an AbortController, so an outdated request is cancelled.
 * - A response is ignored unless its query is still the latest one.
 * - Successful queries are memoised, so re-typing the same text is free.
 */
export function useCitySearch(
  term: string,
  options: UseCitySearchOptions = {},
): UseCitySearchResult {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const minQueryLength = options.minQueryLength ?? DEFAULT_MIN_QUERY_LENGTH
  const limit = options.limit ?? DEFAULT_LIMIT
  const enabled = options.enabled ?? true
  const search = options.search ?? searchCities

  const trimmed = term.trim()
  const debounced = useDebouncedValue(trimmed, debounceMs)

  const [cache, setCache] = useState<Record<string, City[]>>({})
  const [settled, setSettled] = useState<SettledState | null>(null)
  // Retrying must re-run the effect even when the cache object did not change
  // (an error never populated it, so its identity would otherwise be stable).
  const [attempt, setAttempt] = useState(0)

  const isTooShort = debounced.length < minQueryLength
  const cached = cache[debounced]

  useEffect(() => {
    if (!enabled) return
    if (debounced.length < minQueryLength) return
    if (cache[debounced]) return

    const controller = new AbortController()
    const query = debounced

    search(query, { signal: controller.signal, limit })
      .then((response) => {
        // Stale guard: a newer query has already taken over.
        if (controller.signal.aborted) return
        setCache((previous) => ({ ...previous, [query]: response.cities }))
        setSettled({ query, status: 'success', cities: response.cities, error: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ query, status: 'error', cities: [], error: toSearchError(error) })
      })

    return () => controller.abort()
  }, [enabled, debounced, minQueryLength, limit, search, cache, attempt])

  const isCurrent = settled !== null && settled.query === debounced
  const status: CitySearchStatus = !enabled || isTooShort
    ? 'idle'
    : cached
      ? 'success'
      : isCurrent
        ? settled.status
        : 'loading'
  const cities = cached ?? (isCurrent ? settled.cities : [])
  const error = cached ? null : isCurrent ? settled.error : null

  const retry = useCallback(() => {
    setCache((previous) => {
      if (!(debounced in previous)) return previous
      const next = { ...previous }
      delete next[debounced]
      return next
    })
    setSettled(null)
    setAttempt((previous) => previous + 1)
  }, [debounced])

  return { status, cities, error, debouncedQuery: debounced, isTooShort, minQueryLength, retry }
}
