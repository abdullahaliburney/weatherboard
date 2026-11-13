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

  return (
    <section className="current" aria-labelledby="current-heading">
      <div className="current__main">
        <h2 className="visually-hidden" id="current-heading">
          Current conditions
        </h2>

        <p className="current__eyebrow">Now</p>

        <div className="current__hero">
          <WeatherIcon icon={current.icon} className="current__icon" />
          <div>
            <p className="current__temperature">
              {formatTemperature(current.temperature, units.temperature)}
            </p>
            <p className="current__condition">{current.condition}</p>
          </div>
        </div>

        <p className="current__feels">
          Feels like {formatTemperature(current.feelsLike, units.temperature)}
        </p>
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
