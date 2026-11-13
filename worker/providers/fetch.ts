import { ApiError } from '../http'
import type { Deps } from '../types'

export interface ProviderCall {
  readonly url: string
  readonly headers?: Record<string, string>
  /** Human label used in messages, e.g. "OpenWeatherMap". */
  readonly label: string
  readonly provider: string
  readonly timeoutMs: number
}

/**
 * Aborts surface as DOMException, which is NOT an instance of Error in the
 * Workers runtime (nor in browsers), so detect them by name only.
 */
function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  return name === 'AbortError' || name === 'TimeoutError'
}

/**
 * One place for provider transport rules: timeout, status mapping and JSON
 * parsing. Nothing from the upstream body is ever copied into an error.
 */
export async function fetchProviderJson<T>(deps: Deps, call: ProviderCall): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), call.timeoutMs)

  let response: Response
  try {
    response = await deps.fetchImpl(call.url, { headers: call.headers, signal: controller.signal })
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError(
        'upstream_timeout',
        504,
        `${call.label} did not respond within ${Math.round(call.timeoutMs / 1000)}s.`,
        { provider: call.provider },
      )
    }
    throw new ApiError('provider_error', 502, `${call.label} could not be reached.`, {
      provider: call.provider,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(
        'provider_auth_error',
        502,
        `${call.label} rejected the server's credentials.`,
        { provider: call.provider, upstreamStatus: response.status },
      )
    }
    if (response.status === 429) {
      throw new ApiError('rate_limited', 429, `${call.label} rate limit reached.`, {
        provider: call.provider,
        upstreamStatus: 429,
      })
    }
    throw new ApiError(
      'provider_error',
      502,
      `${call.label} returned an unexpected response (${response.status}).`,
      { provider: call.provider, upstreamStatus: response.status },
    )
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('provider_error', 502, `${call.label} returned data that could not be read.`, {
      provider: call.provider,
    })
  }
}
