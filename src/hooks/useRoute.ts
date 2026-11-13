import { useEffect, useState } from 'react'

export type Route = '/' | '/about' | '/privacy' | '/terms'

const ROUTES: readonly Route[] = ['/', '/about', '/privacy', '/terms']

/**
 * Hash routing keeps deep links working on static hosting without a router
 * dependency or a server rewrite. Links are plain anchors (`#/about`), so they
 * work with keyboard, middle-click and browser history.
 */
export function routeFromHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/'
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : '/'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? '/' : routeFromHash(window.location.hash),
  )

  useEffect(() => {
    const onChange = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
