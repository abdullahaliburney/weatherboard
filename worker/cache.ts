import type { Deps } from './types'

/**
 * Wraps a producer in the edge cache. Errors are never cached, and the CORS
 * header of a cached response is stripped before it is served again so a cached
 * body cannot be replayed to a different origin.
 */
export async function withCache(
  deps: Deps,
  key: string,
  ttlSeconds: number,
  cors: Record<string, string>,
  produce: () => Promise<Response>,
  options: { readonly bypass?: boolean } = {},
): Promise<Response> {
  const cacheRequest = new Request(key, { method: 'GET' })
  if (!options.bypass) {
    const hit = await deps.cache.match(cacheRequest)
    if (hit) return withCacheStatus(hit, 'HIT', cors)
  }

  const fresh = await produce()

  if (fresh.ok) {
    const storable = fresh.clone()
    storable.headers.set('cache-control', `public, max-age=${ttlSeconds}`)
    storable.headers.delete('access-control-allow-origin')
    try {
      await deps.cache.put(cacheRequest, storable.clone())
    } catch {
      // Caching is best-effort: a cache failure must not fail the request.
    }
  }

  return withCacheStatus(fresh, 'MISS', cors)
}

function withCacheStatus(
  response: Response,
  status: 'HIT' | 'MISS',
  cors: Record<string, string>,
): Response {
  const headers = new Headers(response.headers)
  headers.delete('access-control-allow-origin')
  for (const [name, value] of Object.entries(cors)) headers.set(name, value)
  headers.set('x-weatherboard-cache', status)
  return new Response(response.body, { status: response.status, headers })
}

/** Stable cache key: sorted params so equivalent queries share an entry. */
export function cacheKey(url: URL, params: Record<string, string>): string {
  const search = new URLSearchParams(params)
  search.sort()
  return `${url.origin}${url.pathname}?${search.toString()}`
}
