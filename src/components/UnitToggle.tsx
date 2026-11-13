import type { Units } from '../api/weather'

export interface UnitToggleProps {
  readonly units: Units
  readonly onChange: (units: Units) => void
}

export default function UnitToggle({ units, onChange }: UnitToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Temperature units">
      <button
        type="button"
        className="unit-toggle__button"
        aria-pressed={units === 'metric'}
        onClick={() => onChange('metric')}
      >
        °C
      </button>
      <button
        type="button"
        className="unit-toggle__button"
        aria-pressed={units === 'imperial'}
        onClick={() => onChange('imperial')}
      >
        °F
      </button>
    </div>
  )
}
