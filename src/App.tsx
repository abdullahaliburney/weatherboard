import { useState } from 'react'
import type { City } from './api/cities'
import FavouritesBar from './components/FavouritesBar'
import SearchBar from './components/SearchBar'
import UnitToggle from './components/UnitToggle'
import WeatherAtmosphere from './components/WeatherAtmosphere'
import WeatherDashboard from './components/WeatherDashboard'
import WeatherIcon from './components/WeatherIcon'
import { useFavourites } from './hooks/useFavourites'
import { useSelectedCity } from './hooks/useSelectedCity'
import { useUnitsPreference } from './hooks/useUnitsPreference'

/**
 * App shell: keeps the search bar visible, remembers the selected city, the
 * unit system and up to five saved cities, and renders the weather dashboard.
 */
export default function App() {
  const [selectedCity, setSelectedCity] = useSelectedCity()
  const [units, setUnits] = useUnitsPreference()
  const { favourites, add, remove, isFavourite, isFull } = useFavourites()
  const [statusMessage, setStatusMessage] = useState('')

  const handleSelect = (city: City) => {
    setSelectedCity(city)
    setStatusMessage(`Showing weather for ${city.name}.`)
  }

  const handleSave = (city: City) => {
    if (isFavourite(city.id)) {
      setStatusMessage(`${city.name} is already saved.`)
      return
    }
    if (isFull) {
      setStatusMessage('Five cities are saved. Remove one before saving another.')
      return
    }
    add(city)
    setStatusMessage(`${city.name} saved to favourites.`)
  }

  const handleRemove = (city: City) => {
    remove(city.id)
    setStatusMessage(`${city.name} removed from favourites.`)
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__mark" aria-hidden="true">
            <WeatherIcon icon="partly-cloudy-day" className="app__mark-icon" />
          </span>
          <div>
            <h1 className="app__title">WeatherBoard</h1>
            <p className="app__tagline">Current conditions and a 5-day forecast, anywhere.</p>
          </div>
        </div>
        <UnitToggle units={units} onChange={setUnits} />
      </header>

      <main className="app__main" id="main">
        <SearchBar onSelectCity={handleSelect} />

        {(favourites.length > 0 || selectedCity !== null) && (
          <FavouritesBar
            favourites={favourites}
            selectedCity={selectedCity}
            isFull={isFull}
            onSelect={handleSelect}
            onRemove={handleRemove}
            onSave={handleSave}
          />
        )}

        <p className="visually-hidden" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {selectedCity ? (
          <WeatherDashboard city={selectedCity} units={units} />
        ) : (
          <>
            <WeatherAtmosphere icon={null} />
            <section className="panel panel--empty" aria-labelledby="empty-heading">
            <h2 className="panel__title" id="empty-heading">
              No city selected yet
            </h2>
            <p className="panel__body">
                Search for a city above to see its current conditions, today’s details and a
                5-day forecast. Save up to five cities to switch between them quickly.
              </p>
            </section>
          </>
        )}
      </main>

      <footer className="app__footer">
        <p>
          Weather data comes from OpenWeatherMap with Open-Meteo as the fallback, via a
          server-side proxy so no API key ships in the browser bundle.
        </p>
      </footer>
    </div>
  )
}
