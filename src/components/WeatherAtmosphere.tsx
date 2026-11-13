import type { WeatherIconKey } from '../api/weather'
import { atmosphereFromIcon, isNightScene } from '../lib/atmosphere'
import LiquidSurface from './LiquidSurface'
import './WeatherAtmosphere.css'

export interface WeatherAtmosphereProps {
  /** The normalised icon key from the snapshot; null renders the neutral ambience. */
  readonly icon: WeatherIconKey | null
  readonly isDay?: boolean
}


// Deterministic particle fields: no Math.random, so SSR/tests/renders are stable.
const STARS = Array.from({ length: 34 }, (_, index) => ({
  left: (index * 37.6 + 11) % 100,
  top: (index * 53.3 + 4) % 38,
  size: index % 9 === 0 ? 3 : 2,
  delay: (index * 1.7) % 9,
  duration: 4 + (index % 6),
}))

const SNOWFLAKES = Array.from({ length: 22 }, (_, index) => ({
  left: (index * 31.7 + 3) % 100,
  size: 3 + (index % 4),
  delay: (index * 0.9) % 11,
  duration: 9 + (index % 7),
  depth: index % 3,
}))

/**
 * Purely decorative, condition-driven backdrop. CSS-only animation, fixed
 * behind the content, aria-hidden and pointer-events:none so it can never
 * block loading or interaction. Animation is disabled by reduced-motion CSS.
 */
export default function WeatherAtmosphere({ icon, isDay = true }: WeatherAtmosphereProps) {
  const variant = atmosphereFromIcon(icon)
  const night = isNightScene(icon, isDay)
  const showClouds = variant === 'partly' || variant === 'cloudy' || variant === 'rain' ||
    variant === 'storm' || variant === 'snow' || variant === 'fog'
  const showSun = isDay && (variant === 'clear' || variant === 'partly')

  return (
    <div
      className={`atmosphere atmosphere--${variant}${night ? ' atmosphere--night' : ' atmosphere--day'}`}
      data-variant={variant}
      data-night={night ? 'true' : 'false'}
      aria-hidden="true"
    >
      <LiquidSurface variant={variant} night={night} />
      <div className="atmosphere__aurora" />
      <div className="atmosphere__sheen" />

      {night && (
        <div className="atmosphere__stars">
          {STARS.map((star, index) => (
            <span
              key={index}
              className="atmosphere__star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {night && <div className="atmosphere__moon" />}
      {showSun && <div className="atmosphere__sun" />}

      {showClouds && (
        <div className="atmosphere__clouds">
          <span className="atmosphere__cloud atmosphere__cloud--far" />
          <span className="atmosphere__cloud atmosphere__cloud--mid" />
          <span className="atmosphere__cloud atmosphere__cloud--near" />
        </div>
      )}

      {(variant === 'rain' || variant === 'storm') && (
        <div className={`atmosphere__rain${variant === 'storm' ? ' atmosphere__rain--heavy' : ''}`} />
      )}

      {variant === 'storm' && <div className="atmosphere__lightning" />}

      {variant === 'snow' && (
        <div className="atmosphere__snow">
          {SNOWFLAKES.map((flake, index) => (
            <span
              key={index}
              className={`atmosphere__flake atmosphere__flake--d${flake.depth}`}
              style={{
                left: `${flake.left}%`,
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                animationDelay: `${flake.delay}s`,
                animationDuration: `${flake.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {variant === 'fog' && (
        <div className="atmosphere__fog">
          <span className="atmosphere__fog-band atmosphere__fog-band--one" />
          <span className="atmosphere__fog-band atmosphere__fog-band--two" />
        </div>
      )}

      {variant === 'wind' && (
        <div className="atmosphere__wind">
          <span className="atmosphere__gust atmosphere__gust--one" />
          <span className="atmosphere__gust atmosphere__gust--two" />
          <span className="atmosphere__gust atmosphere__gust--three" />
        </div>
      )}

      <div className="atmosphere__horizon" />
      <div className="atmosphere__grain" />
    </div>
  )
}
