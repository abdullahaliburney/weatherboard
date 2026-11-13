import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function getSnapshot(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/** Browser connectivity, kept in sync with the online/offline events. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
