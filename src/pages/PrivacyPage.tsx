import InfoPage from './InfoPage'

const REPO = 'https://github.com/abdullahaliburney/weatherboard'

/** Plain-language description of data handling; explicitly not legal advice. */
export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Privacy, in plain language"
      lede="This page describes what this project stores and what leaves your browser. It is written to be accurate about the implementation; it is a project description, not legal advice or a compliance certification."
      updated="13 November 2026"
      asideTitle="Key points"
      aside={
        <dl className="info__facts">
          <div className="info__fact">
            <dt>Accounts</dt>
            <dd>None. There is no sign-in and no server-side user profile.</dd>
          </div>
          <div className="info__fact">
            <dt>Analytics</dt>
            <dd>No analytics, advertising or tracking scripts are included by this project.</dd>
          </div>
          <div className="info__fact">
            <dt>Preferences</dt>
            <dd>Saved cities, units and the selected city stay in your browser’s local storage.</dd>
          </div>
          <div className="info__fact">
            <dt>Contact</dt>
            <dd>
              <a href={`${REPO}/issues`} rel="noreferrer">
                Open an issue in the repository
              </a>
            </dd>
          </div>
        </dl>
      }
      sections={[
        {
          id: 'stored-locally',
          title: 'Stored in your browser',
          body: (
            <>
              <p>
                The app uses <code>localStorage</code> on this device for four things: the cities
                you save, your temperature unit preference, the last city you viewed, and a copy of
                the most recent successful forecast so it can be shown when the network fails.
              </p>
              <p>
                This data is not sent to a WeatherBoard database, because there is no WeatherBoard
                database. It stays in the browser profile you are using. Clearing site data for
                this origin removes it, and the app then starts from an empty state.
              </p>
            </>
          ),
        },
        {
          id: 'requests',
          title: 'What is sent when you use it',
          body: (
            <>
              <p>
                Searching sends the text you typed to this app’s <code>/api/cities</code> route.
                Viewing a city sends its latitude, longitude and unit system to{' '}
                <code>/api/weather</code>. Those requests are handled by a server-side proxy, which
                forwards them to the configured weather and geocoding provider.
              </p>
              <p>
                A provider may receive the search term or coordinates along with standard technical
                information such as the requesting server’s address. Which fields each provider
                retains is governed by that provider’s own policy; this project does not add
                tracking parameters or user identifiers to those requests.
              </p>
            </>
          ),
        },
        {
          id: 'third-parties',
          title: 'Third-party services',
          body: (
            <ul>
              <li>
                <strong>OpenWeatherMap</strong> and <strong>Open-Meteo</strong> supply weather data.
              </li>
              <li>
                <strong>GeoDB Cities</strong> is used for optional city autocomplete when its key is
                configured; otherwise Open-Meteo geocoding answers.
              </li>
              <li>
                The hosting platform serving this deployment processes the HTTP requests needed to
                deliver the site and may keep standard operational logs under its own policy.
              </li>
            </ul>
          ),
        },
        {
          id: 'choices',
          title: 'Your choices',
          body: (
            <>
              <p>
                You can remove individual saved cities in the interface, or clear all local data
                through your browser’s site-data settings. Private browsing windows normally discard
                this storage when they close. The app works without saving anything, though the
                offline forecast then has nothing to fall back to.
              </p>
              <p>
                There is no newsletter, no account deletion request and no marketing to opt out of,
                because none of those features exist.
              </p>
            </>
          ),
        },
        {
          id: 'changes',
          title: 'Changes to this page',
          body: (
            <p>
              If the implementation changes in a way that affects what is stored or transmitted,
              this page should be updated with the change. The repository history shows when that
              happens.
            </p>
          ),
        },
      ]}
    />
  )
}
