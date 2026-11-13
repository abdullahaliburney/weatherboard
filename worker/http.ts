import type { Env } from './types'

export type ApiErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'method_not_allowed'
  | 'cors_forbidden'
  | 'provider_unconfigured'
  | 'provider_auth_error'
  | 'provider_error'
  | 'rate_limited'
  | 'upstream_timeout'
  | 'internal_error'

/**
 * Every failure the API returns is one of these. The envelope never includes an
 * upstream response body, a request URL or a credential, so a key cannot leak
 * through an error path.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export interface JsonInit {
  readonly status?: number
  readonly headers?: Record<string, string>
}

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8'

export function json(body: unknown, init: JsonInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': JSON_CONTENT_TYPE, ...init.headers },
  })
}

export function errorResponse(error: ApiError, cors: Record<string, string>): Response {
  const payload: Record<string, unknown> = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  }
  return json(payload, {
    status: error.status,
    headers: { ...cors, 'cache-control': 'no-store' },
  })
}

/** Anything thrown that is not an ApiError becomes a generic 500. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError('internal_error', 500, 'Something went wrong on the WeatherBoard API.')
}

export function parseAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

/**
 * Returns the CORS headers to echo, an empty object for same-origin / non-browser
 * requests, or null when a browser origin is explicitly not allowed.
 */
export function corsHeaders(origin: string | null, env: Env): Record<string, string> | null {
  if (!origin) return {}

  if (!parseAllowedOrigins(env).includes(origin)) return null

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    // A cached response must not be replayed to a different origin.
    vary: 'origin',
  }
}
