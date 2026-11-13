import { useEffect, useState } from 'react'
import type { City } from './api/cities'
import FavouritesBar from './components/FavouritesBar'
import BrandMark from './components/BrandMark'
import NavIcon from './components/NavIcon'
import SearchBar from './components/SearchBar'
import UnitToggle from './components/UnitToggle'
import WeatherAtmosphere from './components/WeatherAtmosphere'
import WeatherDashboard from './components/WeatherDashboard'
import WeatherIcon from './components/WeatherIcon'
import { useFavourites } from './hooks/useFavourites'
import { useRoute } from './hooks/useRoute'
import type { Route } from './hooks/useRoute'
import { useSelectedCity } from './hooks/useSelectedCity'
import { useUnitsPreference } from './hooks/useUnitsPreference'
import AboutPage from './pages/AboutPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

const NAV: ReadonlyArray<{ route: Route; label: string; icon: 'overview' | 'about' | 'privacy' | 'terms' }> = [
  { route: '/', label: 'Overview', icon: 'overview' },
  { route: '/about', label: 'About', icon: 'about' },
  { route: '/privacy', label: 'Privacy', icon: 'privacy' },
  { route: '/terms', label: 'Terms', icon: 'terms' },
]

const PAGE_TITLES: Record<Route, string> = {
  '/': 'Overview',
  '/about': 'About',
  '/privacy': 'Privacy',
  '/terms': 'Terms',
}

function formatToday(): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function greetingForNow(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

/**
 * App shell: sidebar navigation and supporting pages around the weather
 * experience. The selected city, unit system and up to five favourites are
 * remembered across routes exactly as before.
 */
export default function App() {
  const [selectedCity, setSelectedCity] = useSelectedCity()
  const [units, setUnits] = useUnitsPreference()
  const { favourites, add, remove, isFavourite, isFull } = useFavourites()
  const [statusMessage, setStatusMessage] = useState('')
  // The panel is open for the route it was opened on, so a route change (hash
  // links, back/forward) closes it without an effect and without stale state.
  const [menuRoute, setMenuRoute] = useState<Route | null>(null)
  const route = useRoute()
  const menuOpen = menuRoute === route
  const isOverview = route === '/'
  const BrandHeading = isOverview ? 'h1' : 'p'
  const today = formatToday()
  const greeting = greetingForNow()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuRoute(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

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
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="shell">
        <aside
          className="sidebar"
          id="site-nav"
          data-open={menuOpen ? 'true' : 'false'}
          aria-label="WeatherBoard"
        >
          <div className="sidebar__brand">
            <span className="brand-mark" aria-hidden="true">
              <BrandMark className="app__mark-icon" />
            </span>
            <div>
              <BrandHeading className="brand-name">WeatherBoard</BrandHeading>
              <p className="brand-sub">Atmospheric, precise.</p>
            </div>
            <button
              type="button"
              className="sidebar__close"
              aria-label="Close navigation"
              onClick={() => setMenuRoute(null)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <nav className="sidebar__nav" aria-label="Primary">
            <p className="nav__label">Workspace</p>
            {NAV.map((item) => (
              <a
                key={item.route}
                className="nav__link"
                href={`#${item.route}`}
                aria-current={route === item.route ? 'page' : undefined}
                onClick={() => setMenuRoute(null)}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </a>
            ))}
          </nav>

          {selectedCity && (
            <div className="sidebar__now">
              <p className="nav__label">Selected city</p>
              <div className="sidebar__now-card">
                <span className="sidebar__now-dot" aria-hidden="true" />
                <div>
                  <p className="sidebar__now-city">{selectedCity.name}</p>
                  <p className="sidebar__now-meta">
                    {[selectedCity.region, selectedCity.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="sidebar__note">
            <p className="sidebar__note-label">Data</p>
            <p className="sidebar__note-text">
              Live conditions arrive through a server-side edge proxy. Open-Meteo is the
              keyless fallback, so no provider key ever reaches the browser.
            </p>
          </div>

          <p className="sidebar__footer">© 2026 WeatherBoard</p>
        </aside>

        {menuOpen && (
          <button
            type="button"
            className="scrim"
            aria-label="Close navigation"
            onClick={() => setMenuRoute(null)}
          />
        )}

        <div className="shell__main">
          <header className="topbar">
            <div className="topbar__lead">
              <button
                type="button"
                className="menu-button"
                aria-expanded={menuOpen}
                aria-controls="site-nav"
                onClick={() => setMenuRoute((open) => (open === route ? null : route))}
              >
                <span className="menu-button__bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                Menu
              </button>

              <div className="topbar__mobile-brand">
                <span className="brand-mark" aria-hidden="true">
                  <BrandMark className="app__mark-icon" />
                </span>
                <span className="brand-name">WeatherBoard</span>
              </div>

              <div className="topbar__titles">
                <p className="topbar__eyebrow">Weather intelligence</p>
                <p className="topbar__title">{PAGE_TITLES[route]}</p>
              </div>
            </div>

            <div className="topbar__meta">
              <p className="topbar__date">{today}</p>
              <UnitToggle units={units} onChange={setUnits} />
            </div>
          </header>

          <main className="content" id="main">
            {isOverview ? (
              <div className="page overview">
                <div className="overview__intro">
                  <div className="overview__heading">
                    <p className="overview__eyebrow">Today’s briefing</p>
                    <p className="overview__greeting">{greeting}</p>
                    <p className="overview__lede">
                      Live conditions and a considered five-day outlook, wherever you are
                      looking.
                    </p>
                  </div>
                  <div className="overview__search">
                    <SearchBar onSelectCity={handleSelect} />
                  </div>
                </div>

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
                      <div className="empty__copy">
                        <p className="panel__eyebrow">Start exploring</p>
                        <h2 className="panel__title" id="empty-heading">
                          No city selected yet
                        </h2>
                        <p className="panel__body">
                          Search for a city to see its current conditions, today’s detail and a
                          five-day outlook. Save up to five cities to move between them in one
                          click.
                        </p>
                        <div className="empty-hint" aria-hidden="true">
                          <span className="empty-hint__item">Debounced city search</span>
                          <span className="empty-hint__item">Five-day outlook</span>
                          <span className="empty-hint__item">Offline-friendly</span>
                        </div>
                      </div>

                      <div className="empty__visual" aria-hidden="true">
                        <span className="empty__orb">
                          <span className="empty__orb-ring" />
                          <WeatherIcon icon="partly-cloudy-day" className="empty__icon" />
                        </span>
                        <p className="empty__caption">Conditions, detail and outlook</p>
                      </div>
                    </section>
                  </>
                )}
              </div>
            ) : route === '/about' ? (
              <AboutPage />
            ) : route === '/privacy' ? (
              <PrivacyPage />
            ) : (
              <TermsPage />
            )}
          </main>

          <footer className="footer">
            <div className="footer__inner">
              <p>
                <span className="footer__brand">WeatherBoard</span> © 2026. All rights reserved.
              </p>
              <nav className="footer__links" aria-label="Footer">
                <a href="#/">Overview</a>
                <a href="#/about">About</a>
                <a href="#/privacy">Privacy</a>
                <a href="#/terms">Terms</a>
              </nav>
              <p className="footer__note">
                Weather data via OpenWeatherMap and the keyless Open-Meteo fallback, proxied
                server-side. Conditions are indicative; always check an official source before
                making decisions that depend on the weather.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
