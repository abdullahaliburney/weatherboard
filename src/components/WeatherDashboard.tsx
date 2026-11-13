import type { City } from '../api/cities'
import type { Units } from '../api/weather'
import { useWeather } from '../hooks/useWeather'
import type { UseWeatherOptions } from '../hooks/useWeather'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatUpdatedAt, providerLabel } from '../lib/format'
import CurrentConditions from './CurrentConditions'
import ForecastList from './ForecastList'
import WeatherAtmosphere from './WeatherAtmosphere'
import WeatherSkeleton from './WeatherSkeleton'
import './WeatherDashboard.css'

export interface WeatherDashboardProps {
  readonly city: City
  readonly units: Units
  /** Injectable for tests; production uses the Worker proxy. */
  readonly fetcher?: UseWeatherOptions['fetcher']
}

/** Local wall-clock label for the city, falling back silently for odd zones. */
function formatCityTime(timezone: string | null): string | null {
  if (!timezone) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date())
  } catch {
    return null
  }
}

export default function WeatherDashboard({ city, units, fetcher }: WeatherDashboardProps) {
  const { status, snapshot, provider, error, isRefreshing, updatedAt, fromCache, cachedAt, refresh } =
    useWeather(city, units, { fetcher })
  const isOnline = useOnlineStatus()
  const updatedLabel = formatUpdatedAt(updatedAt, snapshot?.location.timezone)
  const cityTime = formatCityTime(snapshot?.location.timezone ?? null)

  return (
    <>
      {/* Driven strictly by the normalised snapshot; the neutral ambience shows
          while loading or when there is no usable data at all. */}
      <WeatherAtmosphere
        icon={snapshot?.current.icon ?? null}
        isDay={snapshot?.current.isDay ?? true}
      />

      {status === 'loading' ? (
        <WeatherSkeleton cityName={city.name} />
      ) : status === 'error' || !snapshot ? (
        <section className="dashboard dashboard--error" aria-labelledby="weather-error-heading">
          <p className="dashboard__eyebrow">Connection</p>
          <h2 className="dashboard__error-title" id="weather-error-heading">
            Weather unavailable for {city.name}
          </h2>
          <div role="alert">
            <p className="dashboard__error-message">{error?.message ?? 'Something went wrong.'}</p>
            {error?.code && <p className="dashboard__error-code">Error code: {error.code}</p>}
          </div>
          <button
            type="button"
            className="dashboard__refresh"
            onClick={refresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Trying again…' : 'Try again'}
          </button>
        </section>
      ) : (
        <section className="dashboard" aria-label={`Weather for ${city.name}`}>
          <div className="hero">
            <header className="dashboard__bar">
              <div className="dashboard__identity">
                <p className="dashboard__eyebrow">Weather for</p>
                <h2 className="dashboard__city">{city.name}</h2>
                <p className="dashboard__place">
                  {[city.region, city.country].filter(Boolean).join(', ')}
                </p>
                <p className="dashboard__coords">
                  {city.latitude.toFixed(3)}, {city.longitude.toFixed(3)}
                  {cityTime ? ` · Local time ${cityTime}` : ''}
                </p>
              </div>

              <div className="dashboard__actions">
                <p className="dashboard__updated">
                  {isRefreshing ? 'Updating…' : updatedLabel ? `Updated ${updatedLabel}` : ''}
                </p>
                <button
                  type="button"
                  className="dashboard__refresh"
                  onClick={refresh}
                  disabled={isRefreshing}
                  aria-label={`Refresh weather for ${city.name}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                    <path
                      d="M20 11a8 8 0 1 0-2.3 6.3M20 5.5V11h-5.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {isRefreshing ? 'Updating…' : 'Refresh'}
                </button>
              </div>
            </header>

            <span className="visually-hidden" role="status" aria-live="polite">
              {isRefreshing
                ? 'Updating weather'
                : updatedLabel
                  ? `Weather updated at ${updatedLabel}`
                  : ''}
            </span>

            {fromCache && (
              <p className="dashboard__offline" role="status">
                <span className="dashboard__offline-badge">{isOnline ? 'Cached' : 'Offline'}</span>
                {isOnline ? 'Live weather could not be reached.' : 'You are offline.'}{' '}
                Showing the last saved forecast
                {formatUpdatedAt(cachedAt, snapshot?.location.timezone)
                  ? ` from ${formatUpdatedAt(cachedAt, snapshot?.location.timezone)}`
                  : ''}.
                {isOnline
                  ? ' It updates on your next refresh.'
                  : ' Live data returns when you reconnect.'}
              </p>
            )}

            <CurrentConditions snapshot={snapshot} />

            <p className="dashboard__source">
              Data from {providerLabel(provider ?? 'unknown provider')}
              {snapshot.location.timezone
                ? ` · times shown in ${snapshot.location.timezone}`
                : ''}
            </p>
          </div>

          <ForecastList snapshot={snapshot} />
        </section>
      )}
    </>
  )
}
