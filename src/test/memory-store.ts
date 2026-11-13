import type { KeyValueStore } from '../lib/storage'

/** In-memory Storage stand-in with the same synchronous contract as localStorage. */
export function createMemoryStore(initial: Record<string, string> = {}) {
  const values = new Map<string, string>(Object.entries(initial))
  const store: KeyValueStore = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }

  return {
    store,
    read: (key: string) => values.get(key) ?? null,
    write: (key: string, value: string) => values.set(key, value),
    keys: () => [...values.keys()],
  }
}

/** A store whose writes always fail, like private mode or a full quota. */
export function createBrokenStore(): KeyValueStore {
  return {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('QuotaExceededError')
    },
    removeItem: () => {},
  }
}
