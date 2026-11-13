import { useCallback, useEffect, useState } from 'react'
import type { Units } from '../api/weather'
import { getBrowserStore, readUnits, writeUnits } from '../lib/storage'
import type { KeyValueStore } from '../lib/storage'

/**
 * The °C/°F choice, persisted to localStorage and restored on reload.
 * Anything unrecognised in storage falls back to metric.
 */
export function useUnitsPreference(
  store: KeyValueStore | null = getBrowserStore(),
): readonly [Units, (units: Units) => void] {
  const [units, setUnits] = useState<Units>(() => readUnits(store))

  useEffect(() => {
    writeUnits(store, units)
  }, [store, units])

  const update = useCallback((next: Units) => setUnits(next), [])

  return [units, update] as const
}
