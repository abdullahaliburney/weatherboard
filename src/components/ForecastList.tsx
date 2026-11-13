import type { WeatherSnapshot } from '../api/weather'
import {
  formatPrecipitation,
  formatShortDate,
  formatTemperature,
  formatWeekday,
} from '../lib/format'
import WeatherIcon from './WeatherIcon'

export interface ForecastListProps {
  readonly snapshot: WeatherSnapshot
}

/**
 * Five-day outlook. Each day carries a shared range track so the week can be
 * compared at a glance, with the day's own span filled in. The track is purely
 * decorative and hidden from assistive technology; the numbers stay in text.
 */
export default function ForecastList({ snapshot }: ForecastListProps) {
  const { daily, units } = snapshot
  const weekMin = daily.length > 0 ? Math.min(...daily.map((day) => day.min)) : 0
  const weekMax = daily.length > 0 ? Math.max(...daily.map((day) => day.max)) : 0
  const weekSpan = Math.max(weekMax - weekMin, 1)

  return (
    <section className="forecast" aria-labelledby="forecast-heading">
      <header className="forecast__head">
        <div>
          <p className="forecast__eyebrow">Outlook</p>
          <h2 className="forecast__heading" id="forecast-heading">
            5-day forecast
          </h2>
        </div>
        <p className="forecast__meta">Daily high and low, local time</p>
      </header>

      <ol className="forecast__list">
        {daily.map((day, index) => {
          const precipitation = formatPrecipitation(day.precipitationProbability)
          const offset = ((day.min - weekMin) / weekSpan) * 100
          const span = Math.max(((day.max - day.min) / weekSpan) * 100, 7)
          const width = Math.min(span, 100 - offset)
          return (
            <li className="forecast__day" key={day.date} data-today={index === 0 ? 'true' : undefined}>
              <div className="forecast__day-head">
                <p className="forecast__weekday">
                  {formatWeekday(day.date)}
                  {index === 0 && <span className="forecast__today">Today</span>}
                </p>
                <p className="forecast__date">{formatShortDate(day.date)}</p>
              </div>

              <span className="forecast__icon-shell" aria-hidden="true">
                <WeatherIcon icon={day.icon} className="forecast__icon" />
              </span>

              <p className="forecast__condition">{day.condition}</p>

              <div className="forecast__range" aria-hidden="true">
                <span
                  className="forecast__range-fill"
                  style={{ left: `${offset}%`, width: `${width}%` }}
                />
              </div>

              <div className="forecast__footer">
                <p className="forecast__temps">
                  <span className="forecast__max">
                    <span className="visually-hidden">High </span>
                    {formatTemperature(day.max, units.temperature)}
                  </span>
                  <span className="forecast__min">
                    <span className="visually-hidden">Low </span>
                    {formatTemperature(day.min, units.temperature)}
                  </span>
                </p>
                {precipitation && (
                  <p className="forecast__precip">
                    <span className="visually-hidden">Chance of precipitation </span>
                    {precipitation}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
