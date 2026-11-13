import { useCallback, useEffect, useState } from 'react'
import type { City } from '../api/cities'
import { getBrowserStore, readSelectedCity, writeSelectedCity } from '../lib/storage'
import type { KeyValueStore } from '../lib/storage'

/**
 * The city currently being viewed, persisted with the existing storage layer so
 * a reload restores it. With nothing stored the app keeps its initial empty
 * state; malformed stored data is ignored rather than surfaced as an error.
 */
export function useSelectedCity(
  store: KeyValueStore | null = getBrowserStore(),
): readonly [City | null, (city: City | null) => void] {
  const [selectedCity, setSelectedCity] = useState<City | null>(() => readSelectedCity(store))

  useEffect(() => {
    writeSelectedCity(store, selectedCity)
  }, [store, selectedCity])

  const update = useCallback((city: City | null) => setSelectedCity(city), [])

  return [selectedCity, update] as const
}
