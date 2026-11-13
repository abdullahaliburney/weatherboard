import { createApp } from './app'
import type { CacheLike, Deps, Env } from './types'

const noopCache: CacheLike = {
  async match() {
    return undefined
  },
  async put() {
    // no-op
  },
}

function resolveCache(): CacheLike {
  const storage =
    typeof caches === 'undefined'
      ? undefined
      : (caches as unknown as { default?: CacheLike }).default
  return storage ?? noopCache
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const deps: Deps = {
      env,
      // Called as a method on `deps`, so wrap it: passing the bare `fetch`
      // reference throws "Illegal invocation" in the Workers runtime, where
      // fetch requires its global `this`. Unit tests inject their own stub, so
      // only the workerd smoke matrix catches a regression here.
      fetchImpl: (input, init) => fetch(input, init),
      cache: resolveCache(),
      now: () => Date.now(),
    }
    return createApp(deps)(request)
  },
}
