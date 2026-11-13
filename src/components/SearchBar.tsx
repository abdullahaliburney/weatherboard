import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { City } from '../api/cities'
import { useCitySearch } from '../hooks/useCitySearch'
import type { UseCitySearchOptions } from '../hooks/useCitySearch'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import './SearchBar.css'

export interface SearchBarProps {
  readonly onSelectCity: (city: City) => void
  /** Injectable for tests; production always calls the Worker proxy. */
  readonly search?: UseCitySearchOptions['search']
}

export default function SearchBar({ onSelectCity, search }: SearchBarProps) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const listboxId = useId()
  const hintId = useId()
  const isOnline = useOnlineStatus()

  // Offline: do not fire requests that can only fail; saved cities still work.
  const { status, cities, error, debouncedQuery, isTooShort, minQueryLength, retry } =
    useCitySearch(term, { search, enabled: open && isOnline })

  const activeOption = activeIndex >= 0 && activeIndex < cities.length ? activeIndex : -1
  const showPanel = open && !isTooShort
  const optionId = (index: number) => `${listboxId}-option-${index}`

  const select = (city: City) => {
    onSelectCity(city)
    setTerm(city.name)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((previous) => Math.min(previous + 1, Math.max(cities.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((previous) => Math.max(previous - 1, -1))
      return
    }
    if (event.key === 'Enter') {
      const city = cities[activeOption]
      if (showPanel && city) {
        event.preventDefault()
        select(city)
      }
      return
    }
    if (event.key === 'Escape') {
      if (showPanel) {
        event.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  return (
    <div
      className="search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
          setActiveIndex(-1)
        }
      }}
    >
      <label className="search__label" htmlFor="city-search">
        Search for a city
      </label>

      <div className="search__field">
        <span className="search__icon" aria-hidden="true">
          ⌕
        </span>
        <input
          id="city-search"
          className="search__input"
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && activeOption >= 0 ? optionId(activeOption) : undefined}
          aria-describedby={hintId}
          aria-busy={status === 'loading'}
          autoComplete="off"
          spellCheck={false}
          placeholder="Try “Karachi”"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => {
            if (!isTooShort) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {status === 'loading' && <span className="search__spinner" aria-hidden="true" />}
      </div>

      <p className="search__hint" id={hintId}>
        {!isOnline
          ? 'You are offline — city search needs a connection. Saved cities still work.'
          : term.trim().length > 0 && term.trim().length < minQueryLength
            ? `Type at least ${minQueryLength} characters to see suggestions.`
            : `Start typing at least ${minQueryLength} characters, then use ↑ ↓ and Enter.`}
      </p>

      <span className="visually-hidden" role="status" aria-live="polite">
        {status === 'loading'
          ? 'Searching for cities'
          : status === 'success'
            ? `${cities.length} ${cities.length === 1 ? 'city' : 'cities'} found`
            : ''}
      </span>

      {showPanel && (
        <div className="search__panel" id={listboxId}>
          {!isOnline && (
            <p className="search__status">
              City search is unavailable offline. Pick one of your saved cities instead.
            </p>
          )}

          {isOnline && status === 'loading' && <p className="search__status">Searching…</p>}

          {status === 'error' && error && (
            <div className="search__status search__status--error" role="alert">
              <p>{error.message}</p>
              <button type="button" className="search__retry" onClick={retry}>
                Try again
              </button>
            </div>
          )}

          {status === 'success' && cities.length === 0 && (
            <p className="search__status">
              No cities match “{debouncedQuery}”. Try a different spelling.
            </p>
          )}

          {status === 'success' && cities.length > 0 && (
            <ul className="search__list" role="listbox" aria-label="City suggestions">
              {cities.map((city, index) => {
                const meta = [city.region, city.country].filter(Boolean).join(', ')
                return (
                  <li
                    key={city.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === activeOption}
                    className={
                      index === activeOption ? 'search__option search__option--active' : 'search__option'
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    // Keep focus in the input so the list is not unmounted by blur.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(city)}
                  >
                    <span className="search__city">{city.name}</span>
                    {meta && <span className="search__meta">{meta}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
