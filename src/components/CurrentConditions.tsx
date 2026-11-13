import type { WeatherSnapshot } from '../api/weather'
import {
  formatHumidity,
  formatTemperature,
  formatTimeInZone,
  formatWind,
  NOT_AVAILABLE,
} from '../lib/format'
import WeatherIcon from './WeatherIcon'

export interface CurrentConditionsProps {
  readonly snapshot: WeatherSnapshot
}

export default function CurrentConditions({ snapshot }: CurrentConditionsProps) {
  const { current, units, location, daily } = snapshot
  const today = daily[0]
  const sunrise = formatTimeInZone(today?.sunrise ?? null, location.timezone, location.utcOffsetSeconds)
  const sunset = formatTimeInZone(today?.sunset ?? null, location.timezone, location.utcOffsetSeconds)
  const range =
    today && Number.isFinite(today.min) && Number.isFinite(today.max)
      ? { high: today.max, low: today.min }
      : null

  return (
    <section className="current" aria-labelledby="current-heading">
      <div className="current__main">
        <h2 className="visually-hidden" id="current-heading">
          Current conditions
        </h2>

        <p className="current__eyebrow">
          <span className="current__pulse" aria-hidden="true" />
          Right now
        </p>

        <div className="current__hero">
          <div className="current__reading">
            <p className="current__temperature">
              {formatTemperature(current.temperature, units.temperature)}
            </p>
            <p className="current__condition">{current.condition}</p>
          </div>

          <div className="current__orb" aria-hidden="true">
            <span className="current__orb-ring" />
            <WeatherIcon icon={current.icon} className="current__icon" />
          </div>
        </div>

        <div className="current__summary">
          <p className="current__feels">
            Feels like {formatTemperature(current.feelsLike, units.temperature)}
          </p>
          {range && (
            <p className="current__range">
              <span>
                <span className="current__range-label">H</span>{' '}
                {formatTemperature(range.high, units.temperature)}
              </span>
              <span className="current__range-divider" aria-hidden="true" />
              <span>
                <span className="current__range-label">L</span>{' '}
                {formatTemperature(range.low, units.temperature)}
              </span>
            </p>
          )}
        </div>
      </div>

      <dl className="metrics">
        <div className="metrics__item">
          <dt>Humidity</dt>
          <dd>{formatHumidity(current.humidity)}</dd>
        </div>
        <div className="metrics__item">
          <dt>Wind</dt>
          <dd>{formatWind(current.windSpeed, units.windSpeed)}</dd>
        </div>
        <div className="metrics__item">
          <dt>Sunrise</dt>
          <dd>{sunrise ?? NOT_AVAILABLE}</dd>
        </div>
        <div className="metrics__item">
          <dt>Sunset</dt>
          <dd>{sunset ?? NOT_AVAILABLE}</dd>
        </div>
      </dl>
    </section>
  )
}
