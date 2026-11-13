import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WeatherAtmosphere from './WeatherAtmosphere'
import { atmosphereFromIcon, isNightScene } from '../lib/atmosphere'

describe('atmosphereFromIcon', () => {
  it('maps every normalised icon to a scene', () => {
    expect(atmosphereFromIcon('clear-day')).toBe('clear')
    expect(atmosphereFromIcon('clear-night')).toBe('clear')
    expect(atmosphereFromIcon('partly-cloudy-day')).toBe('partly')
    expect(atmosphereFromIcon('partly-cloudy-night')).toBe('partly')
    expect(atmosphereFromIcon('cloudy')).toBe('cloudy')
    expect(atmosphereFromIcon('fog')).toBe('fog')
    expect(atmosphereFromIcon('drizzle')).toBe('rain')
    expect(atmosphereFromIcon('rain')).toBe('rain')
    expect(atmosphereFromIcon('heavy-rain')).toBe('rain')
    expect(atmosphereFromIcon('snow')).toBe('snow')
    expect(atmosphereFromIcon('sleet')).toBe('snow')
    expect(atmosphereFromIcon('thunderstorm')).toBe('storm')
    expect(atmosphereFromIcon('wind')).toBe('wind')
  })

  it('never invents weather for a missing or unknown icon', () => {
    expect(atmosphereFromIcon(null)).toBe('ambient')
    expect(atmosphereFromIcon('unknown')).toBe('ambient')
  })
})

describe('isNightScene', () => {
  it('follows the night icon keys and the isDay flag', () => {
    expect(isNightScene('clear-night', false)).toBe(true)
    expect(isNightScene('partly-cloudy-night', true)).toBe(true)
    expect(isNightScene('clear-day', false)).toBe(true)
    expect(isNightScene('cloudy', true)).toBe(false)
  })
})

describe('WeatherAtmosphere', () => {
  it('is decorative and hidden from assistive technology', () => {
    const { container } = render(<WeatherAtmosphere icon="rain" isDay />)
    const scene = container.querySelector('.atmosphere')
    expect(scene).toHaveAttribute('aria-hidden', 'true')
    expect(scene).toHaveAttribute('data-variant', 'rain')
  })

  it('draws stars and a moon only at night', () => {
    const { container: night } = render(<WeatherAtmosphere icon="clear-night" isDay={false} />)
    expect(night.querySelectorAll('.atmosphere__star')).toHaveLength(34)
    expect(night.querySelector('.atmosphere__moon')).not.toBeNull()
    expect(night.querySelector('.atmosphere__sun')).toBeNull()

    const { container: day } = render(<WeatherAtmosphere icon="clear-day" isDay />)
    expect(day.querySelector('.atmosphere__sun')).not.toBeNull()
    expect(day.querySelector('.atmosphere__moon')).toBeNull()
  })

  it('only shows lightning for an actual thunderstorm', () => {
    const { container: storm } = render(<WeatherAtmosphere icon="thunderstorm" isDay />)
    expect(storm.querySelector('.atmosphere__lightning')).not.toBeNull()
    expect(storm.querySelectorAll('.atmosphere__rain').length).toBeGreaterThan(0)

    const { container: rain } = render(<WeatherAtmosphere icon="rain" isDay />)
    expect(rain.querySelector('.atmosphere__lightning')).toBeNull()
  })

  it('renders snowflakes for snow and none for rain', () => {
    const { container: snow } = render(<WeatherAtmosphere icon="snow" isDay />)
    expect(snow.querySelectorAll('.atmosphere__flake')).toHaveLength(22)

    const { container: rain } = render(<WeatherAtmosphere icon="heavy-rain" isDay />)
    expect(rain.querySelectorAll('.atmosphere__flake')).toHaveLength(0)
  })

  it('renders nothing condition-specific for the neutral ambience', () => {
    const { container } = render(<WeatherAtmosphere icon={null} />)
    const scene = container.querySelector('.atmosphere')
    expect(scene).toHaveAttribute('data-variant', 'ambient')
    expect(container.querySelector('.atmosphere__rain')).toBeNull()
    expect(container.querySelector('.atmosphere__lightning')).toBeNull()
    expect(container.querySelector('.atmosphere__snow')).toBeNull()
  })
})
