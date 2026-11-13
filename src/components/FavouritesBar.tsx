import type { City } from '../api/cities'
import { MAX_FAVOURITES } from '../lib/storage'
import './FavouritesBar.css'

export interface FavouritesBarProps {
  readonly favourites: readonly City[]
  readonly selectedCity: City | null
  readonly isFull: boolean
  readonly onSelect: (city: City) => void
  readonly onRemove: (city: City) => void
  readonly onSave: (city: City) => void
}

/**
 * Saved cities: click one to switch to it, the × removes it. A city that is not
 * saved yet gets a save button, which is disabled (and explained) at five.
 */
export default function FavouritesBar({
  favourites,
  selectedCity,
  isFull,
  onSelect,
  onRemove,
  onSave,
}: FavouritesBarProps) {
  const selectedIsSaved = selectedCity
    ? favourites.some((city) => city.id === selectedCity.id)
    : false

  return (
    <section className="favourites" aria-labelledby="favourites-heading">
      <div className="favourites__head">
        <h2 className="favourites__title" id="favourites-heading">
          Saved cities
        </h2>
        <p className="favourites__count">
          {favourites.length}/{MAX_FAVOURITES}
        </p>
      </div>

      {favourites.length > 0 ? (
        <ul className="favourites__list">
          {favourites.map((city) => {
            const isCurrent = selectedCity?.id === city.id
            const meta = [city.region, city.country].filter(Boolean).join(', ')
            return (
              <li className="favourites__item" key={city.id}>
                <button
                  type="button"
                  className="favourites__select"
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => onSelect(city)}
                >
                  <span className="favourites__city">{city.name}</span>
                  {meta && <span className="favourites__meta">{meta}</span>}
                </button>
                <button
                  type="button"
                  className="favourites__remove"
                  aria-label={`Remove ${city.name} from saved cities`}
                  onClick={() => onRemove(city)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="favourites__empty">Save a city to switch back to it in one click.</p>
      )}

      {selectedCity && !selectedIsSaved && (
        <div className="favourites__actions">
          <button
            type="button"
            className="favourites__save"
            onClick={() => onSave(selectedCity)}
            disabled={isFull}
          >
            Save {selectedCity.name}
          </button>
          {isFull && (
            <p className="favourites__hint">
              Five cities saved — remove one to save another.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
