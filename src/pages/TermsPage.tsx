import InfoPage from './InfoPage'

const REPO = 'https://github.com/abdullahaliburney/weatherboard'

/** Usage terms for a demonstration app, with explicit limits and no invented SLA. */
export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Terms & conditions"
      lede="These are plain-language terms for using this WeatherBoard deployment. They describe a small engineering project honestly. They are not legal advice, and they do not create guarantees the project cannot keep."
      updated="13 November 2026"
      asideTitle="The short version"
      aside={
        <dl className="info__facts">
          <div className="info__fact">
            <dt>Service</dt>
            <dd>A demonstration weather interface, provided as-is.</dd>
          </div>
          <div className="info__fact">
            <dt>Cost</dt>
            <dd>Free to use. There is no paid tier or subscription.</dd>
          </div>
          <div className="info__fact">
            <dt>Availability</dt>
            <dd>No uptime guarantee. The deployment may change or pause.</dd>
          </div>
          <div className="info__fact">
            <dt>Questions</dt>
            <dd>
              <a href={`${REPO}/issues`} rel="noreferrer">
                Repository issue tracker
              </a>
            </dd>
          </div>
        </dl>
      }
      sections={[
        {
          id: 'using-the-app',
          title: 'Using the app',
          body: (
            <p>
              By using this deployment you accept these terms. If you do not accept them, please
              stop using the site. The source code is public, so you may also run your own copy
              under the terms stated in the repository.
            </p>
          ),
        },
        {
          id: 'purpose',
          title: 'What this service is',
          body: (
            <p>
              WeatherBoard is a frontend engineering project built to demonstrate interface design,
              data handling and progressive web app behaviour. It is offered for personal,
              informational use. It is not a commercial forecasting service, an emergency alerting
              system, or a substitute for official meteorological guidance.
            </p>
          ),
        },
        {
          id: 'weather-data',
          title: 'Weather information',
          body: (
            <>
              <p>
                Conditions come from third-party providers and can be delayed, incomplete or wrong.
                Forecasts are estimates, not statements of fact. The interface identifies the
                provider that answered and marks cached results, but it cannot verify their
                accuracy.
              </p>
              <p>
                Do not rely on this app for decisions involving safety, travel, aviation, marine
                operations, health or property. Consult the relevant official weather service for
                those decisions.
              </p>
            </>
          ),
        },
        {
          id: 'acceptable-use',
          title: 'Acceptable use',
          body: (
            <ul>
              <li>Do not attempt to disrupt, overload or bypass rate limits on the service.</li>
              <li>Do not use automated scraping that degrades availability for other visitors.</li>
              <li>Do not use the service for unlawful purposes or to infringe third-party rights.</li>
              <li>Do not misrepresent provider data as your own original observation.</li>
            </ul>
          ),
        },
        {
          id: 'availability',
          title: 'Availability and changes',
          body: (
            <p>
              The deployment may be modified, suspended or removed at any time, including after the
              submission period. Features described on other pages may be changed or withdrawn.
              There is no service-level agreement, maintenance window or support commitment.
            </p>
          ),
        },
        {
          id: 'third-party',
          title: 'Third-party services and links',
          body: (
            <p>
              Weather data, geocoding and hosting are provided by third parties under their own
              terms and policies. Links to external sites, including the source repository, are
              provided for convenience; this project does not control their content.
            </p>
          ),
        },
        {
          id: 'liability',
          title: 'Limitation of liability',
          body: (
            <p>
              To the extent permitted by applicable law, this project is provided “as is” and
              without warranties of any kind, and its author is not liable for loss or damage
              arising from use of the app or reliance on its data. Nothing here excludes rights or
              liabilities that cannot lawfully be excluded.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          body: (
            <p>
              Questions about these terms can be raised in the{' '}
              <a href={`${REPO}/issues`} rel="noreferrer">
                repository issue tracker
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  )
}
