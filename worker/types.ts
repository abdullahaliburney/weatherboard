/**
 * Shared Worker types. Deliberately small: the proxy does not import
 * @cloudflare/workers-types, it declares the handful of shapes it uses, which
 * keeps the Worker testable in plain Node/Vitest.
 */

export interface Env {
  readonly OWM_API_KEY?: string
  readonly RAPIDAPI_KEY?: string
  /** Comma-separated allowlist of browser origins permitted to call the API. */
  readonly ALLOWED_ORIGINS?: string
}

/** The subset of the Cache API the proxy relies on (injected so tests can fake it). */
export interface CacheLike {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

export interface Deps {
  readonly env: Env
  readonly fetchImpl: typeof fetch
  readonly cache: CacheLike
  readonly now: () => number
  /** Per-provider upstream timeout. Defaults to 8000ms. */
  readonly timeoutMs?: number
}

export type WeatherProvider = 'openweathermap' | 'open-meteo'
export type CityProvider = 'geodb' | 'open-meteo'
export type Units = 'metric' | 'imperial'

export interface CityResult {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly countryCode: string
  readonly region: string | null
  readonly latitude: number
  readonly longitude: number
  readonly population: number | null
  readonly timezone: string | null
  /** Pre-composed display label, e.g. "Karachi, Sindh, Pakistan". */
  readonly label: string
}
