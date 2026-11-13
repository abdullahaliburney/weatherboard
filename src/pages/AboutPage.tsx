import InfoPage from './InfoPage'

const REPO = 'https://github.com/abdullahaliburney/weatherboard'

/** Product context: what exists, how it is built and what was intentionally left out. */
export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Product"
      title="A calmer way to read the weather"
      lede="WeatherBoard is a focused weather workspace: search a city, read the current conditions at a glance, and scan the next five days without wrestling with the interface."
      updated="13 November 2026"
      asideTitle="At a glance"
      aside={
        <>
          <dl className="info__facts">
            <div className="info__fact">
              <dt>Project</dt>
              <dd>A frontend engineering submission for the Edspire React challenge.</dd>
            </div>
            <div className="info__fact">
              <dt>Frontend</dt>
              <dd>React 19, TypeScript and Vite, with plain CSS and design tokens.</dd>
            </div>
            <div className="info__fact">
              <dt>Data</dt>
              <dd>OpenWeatherMap first, Open-Meteo as the keyless fallback, through a Worker proxy.</dd>
            </div>
            <div className="info__fact">
              <dt>Source</dt>
              <dd>
                <a href={REPO} rel="noreferrer">
                  github.com/abdullahaliburney/weatherboard
                </a>
              </dd>
            </div>
          </dl>
        </>
      }
      sections={[
        {
          id: 'what-it-is',
          title: 'What it does',
          body: (
            <>
              <p>
                Type at least two characters and the app suggests matching cities. Selecting one
                loads its current conditions and a five-day outlook: temperature, feels-like,
                humidity, wind, sunrise and sunset, with the week’s highs, lows and chance of
                precipitation in one scan.
              </p>
              <p>
                Up to five cities can be saved for one-click switching. The unit preference, the
                last viewed city and the saved list survive a reload. Once the app has loaded, it
                keeps a local copy of the last successful forecast so an interrupted connection
                still has something honest to show.
              </p>
            </>
          ),
        },
        {
          id: 'how-it-works',
          title: 'How the data flows',
          body: (
            <>
              <p>
                The browser talks only to this app’s own <code>/api</code> routes. A Cloudflare
                Worker validates the request, applies rate-friendly caching and calls the weather
                provider. Provider credentials stay on the server; nothing secret is compiled into
                the frontend bundle.
              </p>
              <p>
                When a provider key is configured, OpenWeatherMap answers first. If it is
                unavailable, misconfigured or returns an unusable payload, the Worker falls back to
                Open-Meteo, which needs no key. The interface shows which source answered and never
                presents cached data as live.
              </p>
            </>
          ),
        },
        {
          id: 'design',
          title: 'Design intent',
          body: (
            <>
              <p>
                The interface is built around one reading moment: a large, quiet temperature, a
                single condition line, and supporting detail arranged so the eye can stop at the
                number and continue only if it wants to. Forecast days share one continuous sheet on
                wide screens and become full-width rows on phones, rather than the same card squeezed
                narrower.
              </p>
              <p>
                The ambience follows the reported condition and day/night state. It is decorative
                only, sits behind the content, and stops completely when the operating system asks
                for reduced motion. Keyboard focus, labels and live-region announcements are part
                of the same system, not an afterthought.
              </p>
            </>
          ),
        },
        {
          id: 'scope',
          title: 'Deliberately out of scope',
          body: (
            <>
              <p>
                There are no accounts, no analytics or advertising scripts, and no server-side
                profile of visitors. The optional morning push reminder was investigated but is not
                implemented: this deployment has no scheduler, durable subscription store or push
                credentials. Rather than simulate a notification, the feature is left out and
                described plainly.
              </p>
              <p>
                OpenWeatherMap and GeoDB are implemented and covered by tests with recorded
                payloads. The public deployment runs on the keyless Open-Meteo path because no
                provider keys are configured there.
              </p>
            </>
          ),
        },
        {
          id: 'built-with',
          title: 'Built with',
          body: (
            <ul>
              <li>React 19 and TypeScript, bundled by Vite.</li>
              <li>A Cloudflare Worker proxy with provider normalisation and edge caching.</li>
              <li>A hand-written service worker for the app shell and offline forecast fallback.</li>
              <li>Vitest and Testing Library for unit and integration coverage.</li>
              <li>Plain CSS and design tokens, with a small dependency-free WebGL liquid layer.</li>
            </ul>
          ),
        },
      ]}
    />
  )
}
