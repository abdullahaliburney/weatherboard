/**
 * Register the production service worker.
 *
 * Deliberately skipped during development: the dev server serves modules that
 * the precache manifest knows nothing about, and a stale SW in front of Vite is
 * a debugging trap. Registration is fire-and-forget; a failure only costs the
 * offline shell, never the app.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('[pwa] service worker registration failed', error)
    })
  })
}
