import type { WeatherIconKey } from '../api/weather'

export interface WeatherIconProps {
  readonly icon: WeatherIconKey
  readonly className?: string
}

const CLOUD_PATH = 'M15 33a6.5 6.5 0 0 1 1.4-12.8 9.5 9.5 0 0 1 18 1.7A6 6 0 0 1 33.5 33Z'

function Cloud({ y = 0 }: { readonly y?: number }) {
  return <path d={CLOUD_PATH} transform={`translate(0 ${y})`} />
}

function Sun({ cx = 24, cy = 20, r = 7.5 }: { readonly cx?: number; readonly cy?: number; readonly r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <line
            key={angle}
            x1={cx + Math.cos(rad) * (r + 3)}
            y1={cy + Math.sin(rad) * (r + 3)}
            x2={cx + Math.cos(rad) * (r + 7)}
            y2={cy + Math.sin(rad) * (r + 7)}
          />
        )
      })}
    </g>
  )
}

function Moon() {
  return <path d="M27 9a13 13 0 1 0 9 21A11 11 0 0 1 27 9Z" />
}

function Drops({ count, y = 37 }: { readonly count: number; readonly y?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, index) => {
        const x = 19 + index * 5
        return <line key={index} x1={x} y1={y} x2={x - 2} y2={y + 5} />
      })}
    </g>
  )
}

function Flakes({ count }: { readonly count: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, index) => (
        <circle key={index} cx={19 + index * 6} cy={39} r={1.6} />
      ))}
    </g>
  )
}

function artwork(icon: WeatherIconKey) {
  switch (icon) {
    case 'clear-day':
      return <Sun cx={24} cy={24} r={10} />
    case 'clear-night':
      return <Moon />
    case 'partly-cloudy-day':
      return (
        <g>
          <Sun cx={30} cy={16} r={6} />
          <Cloud y={3} />
        </g>
      )
    case 'partly-cloudy-night':
      return (
        <g>
          <path d="M30 8a9 9 0 1 0 7 14A8 8 0 0 1 30 8Z" />
          <Cloud y={4} />
        </g>
      )
    case 'cloudy':
      return <Cloud />
    case 'fog':
      return (
        <g>
          <Cloud y={-4} />
          <line x1="14" y1="36" x2="34" y2="36" />
          <line x1="17" y1="41" x2="31" y2="41" />
        </g>
      )
    case 'drizzle':
      return (
        <g>
          <Cloud y={-3} />
          <Drops count={2} y={35} />
        </g>
      )
    case 'rain':
      return (
        <g>
          <Cloud y={-3} />
          <Drops count={3} y={35} />
        </g>
      )
    case 'heavy-rain':
      return (
        <g>
          <Cloud y={-4} />
          <Drops count={4} y={34} />
        </g>
      )
    case 'snow':
      return (
        <g>
          <Cloud y={-4} />
          <Flakes count={3} />
        </g>
      )
    case 'sleet':
      return (
        <g>
          <Cloud y={-4} />
          <line x1="19" y1="35" x2="17" y2="40" />
          <circle cx="26" cy="39" r={1.6} />
          <line x1="31" y1="35" x2="29" y2="40" />
        </g>
      )
    case 'thunderstorm':
      return (
        <g>
          <Cloud y={-5} />
          <path d="M25 32l-4 8h4l-2 6 8-9h-4l3-5Z" />
        </g>
      )
    case 'wind':
      return (
        <g>
          <path d="M10 18h18a4 4 0 1 0-4-4" />
          <path d="M10 26h24a4 4 0 1 1-4 4" />
          <path d="M10 34h14" />
        </g>
      )
    default:
      return (
        <g>
          <Cloud y={-2} />
          <line x1="24" y1="36" x2="24" y2="42" />
          <circle cx="24" cy="44.5" r="1" />
        </g>
      )
  }
}

export default function WeatherIcon({ icon, className }: WeatherIconProps) {
  return (
    <svg
      className={className ? `weather-icon ${className}` : 'weather-icon'}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={icon}
    >
      {artwork(icon)}
    </svg>
  )
}
