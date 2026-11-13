export interface ApiErrorBody {
  readonly error?: {
    readonly code?: string
    readonly message?: string
    readonly details?: Record<string, unknown>
  }
}

/**
 * One error type for the whole client. `code` mirrors the Worker's error
 * envelope so the UI can choose friendly copy without parsing messages.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(code: string, status: number, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

const DEFAULT_TIMEOUT_MS = 8000

function isAbortLike(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ((error as { name?: unknown }).name === 'AbortError' ||
      (error as { name?: unknown }).name === 'TimeoutError')
  )
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

/**
 * GET a JSON endpoint. Caller cancellation is surfaced as the original abort,
 * so a hook can ignore it; a timeout becomes an ApiError the UI can show.
 */
export async function getJson<T>(
  path: string,
  options: { readonly signal?: AbortSignal; readonly timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(path, { signal, headers: { accept: 'application/json' } })
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (isAbortLike(error)) {
      throw new ApiError('timeout', 408, 'The request took too long. Please try again.')
    }
    throw new ApiError('network_error', 0, 'Could not reach the WeatherBoard API.')
  }

  if (!response.ok) {
    const body = await readJson<ApiErrorBody>(response)
    throw new ApiError(
      body?.error?.code ?? 'unknown_error',
      response.status,
      body?.error?.message ?? `The API returned HTTP ${response.status}.`,
      body?.error?.details,
    )
  }

  const body = await readJson<T>(response)
  if (body === null) {
    throw new ApiError('invalid_response', 502, 'The API returned a response that could not be read.')
  }
  return body
}
