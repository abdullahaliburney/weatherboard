import { useCallback, useEffect, useMemo, useState } from 'react'
import type { City } from '../api/cities'
import {
  getBrowserStore,
  MAX_FAVOURITES,
  readFavourites,
  writeFavourites,
} from '../lib/storage'
import type { KeyValueStore } from '../lib/storage'

export interface UseFavouritesResult {
  readonly favourites: City[]
  /** Adds a city unless it is already saved or the list is full. */
  readonly add: (city: City) => void
  readonly remove: (id: string) => void
  readonly isFavourite: (id: string) => boolean
  readonly isFull: boolean
  readonly max: number
}

/**
 * Up to five saved cities, persisted to localStorage.
 *
 * State is read once on mount (sanitising whatever is there) and written back
 * on every change. A missing or broken store simply means no persistence.
 */
export function useFavourites(store: KeyValueStore | null = getBrowserStore()): UseFavouritesResult {
  const [favourites, setFavourites] = useState<City[]>(() => readFavourites(store))

  useEffect(() => {
    writeFavourites(store, favourites)
  }, [store, favourites])

  const ids = useMemo(() => new Set(favourites.map((city) => city.id)), [favourites])

  const add = useCallback((city: City) => {
    setFavourites((previous) => {
      if (previous.some((saved) => saved.id === city.id)) return previous
      if (previous.length >= MAX_FAVOURITES) return previous
      return [...previous, city]
    })
  }, [])

  const remove = useCallback((id: string) => {
    setFavourites((previous) => previous.filter((city) => city.id !== id))
  }, [])

  const isFavourite = useCallback((id: string) => ids.has(id), [ids])

  return {
    favourites,
    add,
    remove,
    isFavourite,
    isFull: favourites.length >= MAX_FAVOURITES,
    max: MAX_FAVOURITES,
  }
}
