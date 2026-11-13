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

export default function ForecastList({ snapshot }: ForecastListProps) {
  const { daily, units } = snapshot

  return (
    <section className="forecast" aria-labelledby="forecast-heading">
      <h2 className="forecast__heading" id="forecast-heading">
        5-day forecast
      </h2>

      <ol className="forecast__list">
        {daily.map((day) => {
          const precipitation = formatPrecipitation(day.precipitationProbability)
          return (
            <li className="forecast__day" key={day.date}>
              <p className="forecast__weekday">{formatWeekday(day.date)}</p>
              <p className="forecast__date">{formatShortDate(day.date)}</p>
              <WeatherIcon icon={day.icon} className="forecast__icon" />
              <p className="forecast__condition">{day.condition}</p>
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
            </li>
          )
        })}
      </ol>
    </section>
  )
}
