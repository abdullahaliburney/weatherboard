export interface WeatherSkeletonProps {
  readonly cityName: string
}

export default function WeatherSkeleton({ cityName }: WeatherSkeletonProps) {
  return (
    <section
      className="dashboard dashboard--loading"
      aria-busy="true"
      aria-label={`Loading weather for ${cityName}`}
    >
      <p className="visually-hidden" role="status">
        Loading weather for {cityName}
      </p>

      <div className="skeleton">
        <div className="skeleton__hero" aria-hidden="true">
          <div className="skeleton__lines">
            <div className="skeleton__bar skeleton__bar--short" />
            <div className="skeleton__bar skeleton__bar--title" />
            <div className="skeleton__grid">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="skeleton__tile" key={index} />
              ))}
            </div>
          </div>
          <div className="skeleton__orb" />
        </div>

        <div className="skeleton__row" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="skeleton__card" key={index} />
          ))}
        </div>

        <div className="skeleton__bar skeleton__bar--hero" aria-hidden="true" />
      </div>
    </section>
  )
}
