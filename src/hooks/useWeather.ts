import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWeather } from '../api/weather'
import type { Units, WeatherSnapshot } from '../api/weather'
import { ApiError } from '../api/client'
import { getBrowserStore } from '../lib/storage'
import type { KeyValueStore } from '../lib/storage'
import { readCachedWeather, writeCachedWeather } from '../lib/weatherCache'

export interface WeatherError {
  readonly code: string
  readonly message: string
}

export interface UseWeatherOptions {
  /** Injectable for tests; production always calls the Worker proxy. */
  readonly fetcher?: typeof getWeather
  /** Injectable for tests; `null` disables the offline snapshot cache. */
  readonly store?: KeyValueStore | null
}

export interface UseWeatherResult {
  readonly status: 'idle' | 'loading' | 'success' | 'error'
  readonly snapshot: WeatherSnapshot | null
  readonly provider: string | null
  readonly error: WeatherError | null
  readonly isRefreshing: boolean
  readonly updatedAt: number | null
  /** True when the snapshot came from the local cache because the request failed. */
  readonly fromCache: boolean
  readonly cachedAt: number | null
  readonly refresh: () => void
}

interface SettledState {
  readonly key: string
  readonly status: 'success' | 'error'
  readonly snapshot: WeatherSnapshot | null
  readonly provider: string | null
  readonly error: WeatherError | null
  readonly updatedAt: number | null
  readonly fromCache: boolean
  readonly cachedAt: number | null
}

export interface WeatherLocation {
  readonly latitude: number
  readonly longitude: number
}

const MESSAGES: Record<string, string> = {
  rate_limited: 'Weather providers are busy right now. Please try again shortly.',
  provider_unconfigured: 'Weather is temporarily unavailable.',
  provider_error: 'The weather service could not be reached. Please try again.',
  provider_auth_error: 'Weather is temporarily unavailable.',
  upstream_timeout: 'The weather request timed out. Please try again.',
  invalid_input: 'That location could not be used. Try another city.',
  network_error: 'Could not reach the server. Check your connection and try again.',
  timeout: 'The weather request took too long. Please try again.',
}

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function toWeatherError(error: unknown): WeatherError {
  if (error instanceof ApiError) {
    if (error.code === 'network_error' && isBrowserOffline()) {
      return {
        code: 'offline',
        message: 'You are offline and there is no saved weather for this city yet.',
      }
    }
    return { code: error.code, message: MESSAGES[error.code] ?? error.message }
  }
  if (isBrowserOffline()) {
    return { code: 'offline', message: 'You are offline and there is no saved weather for this city yet.' }
  }
  return { code: 'network_error', message: MESSAGES.network_error }
}

function locationKey(location: WeatherLocation, units: Units): string {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)},${units}`
}

/**
 * Weather for one location and unit system.
 *
 * - Switching city or units starts a new request and aborts the previous one.
 * - A response is only applied if it belongs to the newest request, so a slow
 *   city can never overwrite the one the user just picked.
 * - `refresh()` re-requests the same city and asks the Worker to skip its cache,
 *   keeping the current snapshot on screen while it updates.
 */
export function useWeather(
  location: WeatherLocation | null,
  units: Units,
  options: UseWeatherOptions = {},
): UseWeatherResult {
  const fetcher = options.fetcher ?? getWeather
  const store = useMemo(
    () => (options.store === undefined ? getBrowserStore() : options.store),
    [options.store],
  )
  const [settled, setSettled] = useState<SettledState | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const controllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const key = location ? locationKey(location, units) : ''

  const load = useCallback(
    async (target: WeatherLocation, targetUnits: Units, force: boolean) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const requestId = ++requestIdRef.current
      const requestKey = locationKey(target, targetUnits)
      const isLatest = () => requestId === requestIdRef.current && !controller.signal.aborted

      try {
        const response = await fetcher({
          lat: target.latitude,
          lon: target.longitude,
          units: targetUnits,
          refresh: force,
          signal: controller.signal,
        })
        if (!isLatest()) return
        const updatedAt = Date.now()
        writeCachedWeather(store, target, targetUnits, response.weather, response.provider, updatedAt)
        setSettled({
          key: requestKey,
          status: 'success',
          snapshot: response.weather,
          provider: response.provider,
          error: null,
          updatedAt,
          fromCache: false,
          cachedAt: null,
        })
      } catch (error) {
        if (!isLatest()) return
        // A failed request may still be answered honestly from the last saved
        // forecast for this city; the UI labels it as cached, never as live.
        const cached = readCachedWeather(store, target, targetUnits)
        if (cached) {
          setSettled({
            key: requestKey,
            status: 'success',
            snapshot: cached.snapshot,
            provider: cached.provider,
            error: null,
            updatedAt: cached.cachedAt,
            fromCache: true,
            cachedAt: cached.cachedAt,
          })
          return
        }
        setSettled({
          key: requestKey,
          status: 'error',
          snapshot: null,
          provider: null,
          error: toWeatherError(error),
          updatedAt: null,
          fromCache: false,
          cachedAt: null,
        })
      } finally {
        if (requestId === requestIdRef.current) setIsRefreshing(false)
      }
    },
    [fetcher, store],
  )

  useEffect(() => {
    if (!location) return
    // Fetching is an external-system synchronisation; `load` only calls setState
    // after the request settles, but the rule cannot see through the async call.
    // oxlint-disable-next-line react/set-state-in-effect
    void load(location, units, false)
  }, [location, units, load])

  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const refresh = useCallback(() => {
    if (!location) return
    setIsRefreshing(true)
    void load(location, units, true)
  }, [location, units, load])

  const isCurrent = settled !== null && settled.key === key
  const status: UseWeatherResult['status'] = !location
    ? 'idle'
    : isCurrent
      ? settled.status
      : 'loading'

  return {
    status,
    snapshot: isCurrent ? settled.snapshot : null,
    provider: isCurrent ? settled.provider : null,
    error: isCurrent ? settled.error : null,
    isRefreshing,
    updatedAt: isCurrent ? settled.updatedAt : null,
    fromCache: isCurrent ? settled.fromCache : false,
    cachedAt: isCurrent ? settled.cachedAt : null,
    // Retrying an error is the same operation as refreshing a success.
    refresh,
  }
}
