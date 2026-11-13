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

export default function WeatherDashboard({ city, units, fetcher }: WeatherDashboardProps) {
  const { status, snapshot, provider, error, isRefreshing, updatedAt, fromCache, cachedAt, refresh } =
    useWeather(city, units, { fetcher })
  const isOnline = useOnlineStatus()
  const updatedLabel = formatUpdatedAt(updatedAt)

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
          <header className="dashboard__bar">
            <div>
              <p className="dashboard__eyebrow">Weather for</p>
              <h2 className="dashboard__city">{city.name}</h2>
              <p className="dashboard__place">
                {[city.region, city.country].filter(Boolean).join(', ')} ·{' '}
                {city.latitude.toFixed(3)}, {city.longitude.toFixed(3)}
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
                <span aria-hidden="true">↻</span> {isRefreshing ? 'Updating…' : 'Refresh'}
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
              {formatUpdatedAt(cachedAt) ? ` from ${formatUpdatedAt(cachedAt)}` : ''}.
              {isOnline
                ? ' It updates on your next refresh.'
                : ' Live data returns when you reconnect.'}
            </p>
          )}

          <CurrentConditions snapshot={snapshot} />

          <ForecastList snapshot={snapshot} />

          <p className="dashboard__source">
            Data from {providerLabel(provider ?? 'unknown provider')}
            {snapshot.location.timezone ? ` · times shown in ${snapshot.location.timezone}` : ''}
          </p>
        </section>
      )}
    </>
  )
}
