# PROMPTS.md

Chronological record of the prompts actually sent to the coding agent while building
WeatherBoard, plus the real tool history. Nothing here is reconstructed after the fact:
each entry is the prompt as it was sent, appended before the work it asked for began.

## Tool / IDE

| Item | Value |
|---|---|
| Tool | Freebuff (desktop app, cloud mode) |
| Agent | Buffy |
| Workspace | Cloud Linux VM, chat-scoped worktree |
| Branch | `freebuff/e448b8d7a66722247e4c40a9` |
| Models | Not exposed to the agent; no model name is recorded because none was observed |
| Extra IDE/editor used | None observed in this session |

### Interaction history (including non-prompt events)

1. Prompt 1 — plan request (below).
2. Prompt 2 — challenge brief correction (below).
3. Between prompts 1 and 2, the agent asked two scope questions rendered as in-app cards.
   The user **skipped** them (recorded here because it affected the next plan; skipped
   cards are not prompts and are not reproduced as text).
4. Prompt 3 — approval of the revised architecture and instruction to start C0 (below).
5. Prompt 4 — C0 approval and instruction to build C1 (below).
6. Prompt 5 — C1 approval and instruction to build C2 (below).
7. Prompt 5 arrived a second time, character-for-character identical, after the cloud
   runner restarted. It is recorded once above; no work was redone because of the
   duplicate, and the restart only required reinstalling dependencies (`npm ci`).
8. Prompt 6 — C3 approval and instruction to build the city-search UI (below).
9. Prompt 7 — C3 approval and instruction to build the weather dashboard (below).
10. Prompt 8 — C4 approval and instruction to build C5, C6 and C7 in sequence (below).
11. Prompt 9 — C5–C7 approval and instruction for visual refinement, selected-city
    persistence and C8 feasibility (below).
12. Prompt 10 — final QA (C9), documentation and clean install (C10), GitHub
    preparation (C11) and deployment preparation (C12) (below).

---

## Prompt 1

> I need to build WeatherBoard for a Frontend React Developer technical interview.
>
> Before writing code:
> 1. Inspect the project workspace and available tools.
> 2. Create a complete implementation plan based on the challenge requirements.
> 3. Divide the work into small checkpoints.
> 4. Identify any features that require external API keys or backend services.
> 5. Do not pretend a feature works if it has not been tested.
>
> Do not skip requirements or overwrite existing work.
> Start by showing me the project structure and implementation plan.

## Prompt 2

> Your implementation plan is good, but it does not fully match the actual Edspire WeatherBoard technical challenge. Before creating files, revise the plan to include ALL of these mandatory requirements:
>
> 1. City autocomplete using GeoDB Cities API through RapidAPI, with debouncing and input validation.
> 2. OpenWeatherMap as the primary weather provider, with Open-Meteo as the fallback.
> 3. Current weather conditions and a 5-day forecast.
> 4. Favourites: users can save up to 5 cities, persisted in localStorage.
> 5. Installable Progressive Web App (PWA), including web app manifest, service worker and offline caching.
> 6. Daily morning weather reminder. Investigate genuine Web Push notifications that can arrive when the browser is closed. Identify the backend/push-service requirements and limitations. Do not fake this using an in-tab timer.
> 7. Responsive layouts specifically verified at 375px, 768px and 1280px.
> 8. Proper loading, empty, validation, network-error and API-error states.
> 9. README.md with setup, architecture, API configuration and deployment instructions.
> 10. PROMPTS.md containing the actual chronological AI prompt history and the IDE/tool used. Do not invent prompt history.
> 11. Prepare the application for deployment and a public GitHub repository. The final deliverables must include a live URL and public repository URL.
>
> Keep the Vite + React + TypeScript architecture if appropriate, but update the components, API layer, hooks, tests and checkpoints to cover every requirement.
>
> First provide:
>
> - Updated architecture and file structure.
> - A simple system data-flow diagram.
> - Required API keys and services.
> - A realistic implementation and testing checklist.
> - Any features that require backend infrastructure.
>
> Do not start coding until you have shown the revised plan. Do not mark anything complete unless it has actually been tested.

## Prompt 3

> The revised architecture is approved in principle. Before implementation, please resolve these points:
>
> 1. Verify whether this workspace can deploy Cloudflare Workers with Cron Triggers, D1 storage and required secrets. Distinguish Freebuff hosting limitations from Cloudflare platform limitations.
> 2. Keep OpenWeatherMap and GeoDB credentials server-side. Build the integration so missing credentials produce clear, honest error states. Do not claim live integration testing until valid credentials have been configured and tested.
> 3. Confirm that the push-worker architecture can genuinely schedule daily notifications and explain exactly which deployment steps require my own account or manual action.
> 4. PROMPTS.md must contain only actual prompts sent to the coding agent and the real tool history. Never fabricate earlier prompts.
> 5. Keep the implementation compatible with this Freebuff workspace. Do not assume Cloudflare deployment is available until verified.
>
> You may now begin C0: create the React + TypeScript scaffold, project configuration, initial styles, test setup and documentation skeleton.
>
> Work checkpoint by checkpoint. After C0, stop and report:
>
> - Files created
> - Commands actually executed
> - Build and lint results
> - Any errors
> - What remains for C1
>
> Do not deploy, publish a GitHub repository, or expose credentials without my explicit approval.

## Prompt 4

> C0 reviewed and approved. Proceed to C1.
>
> Important instructions:
>
> - Preserve all existing C0 files and passing tests.
> - Implement the Worker API proxy with mocked provider fixtures first.
> - Do not require live API keys to complete C1.
> - Keep all credentials server-side.
> - Test each route, invalid input, timeout, rate limit, provider failure and cache behaviour.
> - Do not start C2 until C1 tests pass.
> - Keep the application simple, polished and responsive; do not add unnecessary architecture.
> - Report exact files changed, commands run, test results and unresolved issues at the end of C1.
>
> For the push system, keep the separate-worker design documented. Do not spend time on external deployment during C1.

## Prompt 5

> C1 is approved based on the reported 28 passing tests and successful live Worker-runtime verification.
>
> Proceed to C2: implement the real provider integrations.
>
> Weather
>
> - OpenWeatherMap is the primary provider.
> - Open-Meteo is the automatic fallback when OpenWeatherMap is unavailable, unconfigured, times out or returns an error.
> - Normalize both providers into one consistent response format for the frontend.
> - Support current weather and a 5-day forecast.
> - Keep API credentials exclusively in Worker secrets. Never expose them to browser code or frontend environment variables.
> - Handle upstream errors, timeouts, invalid responses and fallback failures clearly.
>
> City search
>
> - Integrate GeoDB Cities through RapidAPI.
> - Implement debouncing in the appropriate frontend stage, not inside the provider.
> - Validate and normalize city results.
> - Handle missing credentials and provider errors without crashing.
>
> Testing and verification
>
> - Write mocked tests for both providers, successful fallback, both providers failing, timeouts, malformed responses and missing credentials.
> - Test the real Open-Meteo path in "workerd".
> - Do not claim GeoDB or OpenWeatherMap live integration works unless valid credentials have actually been configured and tested.
> - Preserve all C0 and C1 functionality and tests.
> - Update README.md and PROMPTS.md with the actual implementation and verification details.
>
> At the end, report exact files changed, test counts, build/typecheck/lint results, live runtime results, and unresolved issues. Do not begin C3 until C2 is verified.

## Prompt 6

> C2 reviewed and approved. Proceed to C3: connect the city-search functionality to the React frontend.
>
> Important: C2 is already implemented. Do not recreate or rewrite its provider integrations.
>
> Requirements
>
> 1. Connect the existing "useDebouncedValue" hook to the city-search input.
> 2. Search through the existing "/api/cities" Worker endpoint.
> 3. Show a polished autocomplete dropdown with city name, region and country where available.
> 4. Support keyboard navigation, Enter to select, Escape to close, and clicking a result.
> 5. Selecting a city must store its name and coordinates for the weather request.
> 6. Handle loading, empty results, invalid input, network errors and API errors.
> 7. Prevent stale responses from overwriting newer search results.
> 8. Avoid unnecessary API calls for short or unchanged queries.
> 9. Make the search responsive and accessible, including proper labels and keyboard focus.
> 10. Keep the existing application design consistent. Do not add unnecessary libraries.
>
> Testing
>
> - Test debounce and cancellation.
> - Test successful search and city selection.
> - Test empty results and API errors.
> - Test stale-response handling.
> - Test keyboard interaction.
> - Preserve all existing 54 tests.
>
> Run and report:
>
> - "npm ci" if dependencies are missing.
> - "npm run typecheck"
> - "npm run lint"
> - "npm test"
> - "npm run build"
>
> Also inspect the app in the browser at mobile width (375px) and desktop width (1280px), if the workspace supports screenshots or visual inspection.
>
> Do not start the weather dashboard implementation yet. Finish C3, report exact files changed and verification results, and wait for approval.

## Prompt 7

> C3 reviewed and approved. Proceed to C4: implement the complete WeatherBoard weather dashboard.
>
> Do not rebuild C0–C3 or change the working city-search architecture.
>
> 1. Connect weather data
>
> - When a user selects a city, request "/api/weather" using its latitude and longitude.
> - Use the existing API client and normalized "WeatherSnapshot" response from C2.
> - Correctly handle the "weather" response envelope.
> - Support metric and imperial units if the existing API supports both.
> - Add a refresh action.
>
> 2. Current weather section
>
> Display:
>
> - Selected city and location.
> - Current temperature and weather condition.
> - Weather icon.
> - Feels-like temperature.
> - Humidity.
> - Wind speed.
> - Sunrise and sunset when available.
>
> Handle null or unavailable fields gracefully. Never display misleading zero values for missing data.
>
> 3. Five-day forecast
>
> Display five local calendar days with:
>
> - Day and date.
> - Weather condition and icon.
> - Minimum and maximum temperature.
> - Precipitation probability when available.
>
> Use the existing normalized daily data. Do not create a second weather-normalization system in the frontend.
>
> 4. User experience
>
> - Build a clean, professional weather dashboard.
> - Include loading skeletons, initial empty state, API error state, retry action and refresh feedback.
> - Keep the city search visible.
> - Ensure the selected city remains clearly identified.
> - Use responsive layouts for 375px, 768px and 1280px.
> - Support light and dark themes if the existing design tokens allow it.
> - Ensure good contrast, accessible labels and keyboard navigation.
>
> 5. Testing
>
> Add tests for:
>
> - Successful weather loading.
> - Five-day forecast rendering.
> - Loading and error states.
> - Retry and refresh.
> - Missing optional fields.
> - Metric/imperial display.
> - Switching between selected cities.
> - Preventing stale weather responses.
>
> Preserve all 73 existing tests.
>
> 6. Final verification
>
> Run:
>
> - "npm run typecheck"
> - "npm run lint"
> - "npm test"
> - "npm run build"
>
> Inspect the real browser at 375px, 768px and 1280px using the live Worker and Open-Meteo path. Provide screenshots if supported.
>
> Update README.md and PROMPTS.md with actual work and verification.
>
> Do not begin favourites, PWA or push notifications yet. Finish C4, report exact files changed, test counts, browser results and unresolved issues, then wait for approval.

## Prompt 8

> C4 reviewed and approved. Excellent work. Preserve the existing implementation and all 101 passing tests.
>
> Proceed with the following work in sequence, without stopping for approval between these tasks unless you encounter a destructive change, essential missing credentials, or a genuine blocker.
>
> C5 — Favourites and preferences
>
> 1. Allow users to add and remove favourite cities.
> 2. Maximum five favourite cities.
> 3. Persist favourites in localStorage.
> 4. Allow switching between favourite cities.
> 5. Prevent duplicate favourites.
> 6. Persist the selected temperature unit (°C/°F).
> 7. Restore favourites and unit preference after page reload.
> 8. Handle malformed or unavailable localStorage gracefully.
> 9. Keep the interface minimal and responsive.
>
> Add essential tests for all behaviour.
>
> C6 — Installable PWA
>
> 1. Add a valid web app manifest.
> 2. Configure app name, short name, theme colour, background colour, display mode and icons.
> 3. Add a production-compatible service worker.
> 4. Ensure the app can be installed on supported mobile and desktop browsers.
> 5. Verify manifest and service-worker registration in the production build.
>
> C7 — Offline support
>
> 1. Cache the application shell and static assets.
> 2. Cache the most recent successful weather response for a city.
> 3. When offline, show cached weather data with a clear offline indicator.
> 4. Use an appropriate network-first or stale-while-revalidate strategy.
> 5. Do not cache secrets or API credentials.
> 6. Handle offline city search gracefully.
> 7. Do not make false claims that live data is available while offline.
>
> Efficiency and quality requirements
>
> - Inspect and reuse the existing code.
> - Do not rebuild C0–C4.
> - Avoid unnecessary dependencies.
> - Keep the existing cinematic dark visual identity direction in mind, but do not spend time on major decorative redesign yet. We will send a separate visual refinement prompt.
> - Keep README.md and PROMPTS.md accurate.
> - Add tests for important new functionality.
> - Run npm ci if node_modules has been removed.
> - Run typecheck, lint, all tests and production build.
> - Verify the actual production preview, not only the development server.
> - Check responsive behaviour at 375px, 768px and 1280px.
>
> At completion, provide a concise report containing:
>
> - Files created and modified.
> - Test count and results.
> - Typecheck, lint and build results.
> - Actual PWA installation verification.
> - Actual offline verification.
> - Any unresolved limitations.
>
> Do not begin push notifications yet. Report when C5, C6 and C7 are complete.

## Prompt 9

> C5–C7 reviewed and approved. Excellent work. Preserve the existing implementation and all 151 passing tests.
>
> Proceed with the next milestone.
>
> PART 1 — Premium visual refinement
>
> Use the previously supplied WeatherBoard reference image as the visual target.
>
> The desired identity is premium, minimal, cinematic and atmospheric — not cartoonish or flashy.
>
> Visual direction:
>
> - Deep midnight navy and charcoal backgrounds.
> - Elegant temperature typography and clear information hierarchy.
> - Subtle glass-effect panels and restrained borders.
> - Soft atmospheric gradients and lighting.
> - Consistent spacing and polished mobile-first layout.
> - Keep the interface clean and uncluttered.
>
> Weather-reactive atmosphere
>
> Implement lightweight CSS/SVG animations driven by the actual normalized weather condition and day/night state.
>
> 1. Sunny: softly glowing sun with slow ambient light.
> 2. Partly cloudy: layered drifting clouds with subtle sunlight.
> 3. Cloudy: slow-moving cloud layers.
> 4. Rain: realistic fine rain streaks.
> 5. Thunderstorm: occasional brief lightning only when the actual condition indicates thunder.
> 6. Snow: subtle snowfall with different particle depths.
> 7. Night: deep navy atmosphere, moon glow and restrained stars.
>
> Requirements:
>
> - Use CSS/SVG where practical.
> - Avoid large video backgrounds and unnecessary animation dependencies.
> - Do not block weather loading or interaction.
> - Respect "prefers-reduced-motion".
> - Ensure readable contrast and smooth performance on mobile.
> - Do not invent weather conditions.
>
> Apply this design consistently to the dashboard, search, favourites, forecast and offline states.
>
> Verify at 375px, 768px and 1280px.
>
> PART 2 — Small persistence improvement
>
> Persist the currently selected city if it can be done safely using the existing storage architecture. Restore it on reload and load its weather data. Do not break the initial empty state for users without a saved city.
>
> PART 3 — C8 feasibility investigation
>
> The challenge requires a morning reminder that works even when the browser is closed.
>
> Inspect the actual environment and determine whether genuine Web Push can be deployed.
>
> A real implementation requires:
>
> - Push subscription from the browser.
> - VAPID authentication.
> - Durable subscription storage.
> - A server-side push sender.
> - A scheduled trigger.
> - Service-worker push and notification-click handlers.
> - Appropriate permission and timezone handling.
>
> Do not fake this with an in-tab timer or local notification.
>
> Check whether a real deployment target, durable database, scheduler and required credentials are available. Never expose or commit secrets.
>
> If genuine deployment is possible, propose the implementation and proceed using available infrastructure.
>
> If essential credentials or infrastructure are missing, stop before pretending the feature is complete. Report exactly what is missing, what can be implemented safely, and what I must provide.
>
> PART 4 — Verification
>
> Preserve existing tests and add tests for the new functionality.
>
> Run:
>
> - npm run typecheck
> - npm run lint
> - npm test
> - npm run build
>
> Verify the production preview and responsive layout.
>
> Update README.md and PROMPTS.md with actual work and truthful limitations.
>
> At the end, report:
>
> 1. Visual changes and actual screenshots.
> 2. Weather animation behaviour.
> 3. Selected-city persistence result.
> 4. Test count and all check results.
> 5. C8 deployment feasibility and any missing requirements.
> 6. Remaining tasks before submission.
>
> Do not rebuild C0–C7 or introduce unnecessary dependencies.

## Prompt 10

> The visual refinement and selected-city persistence are approved. All 170 tests must remain passing.
>
> We are approaching the submission deadline. Prioritise submission readiness over additional features.
>
> C9 — Final quality assurance
>
> Perform a systematic final review:
>
> - Mobile: 375px
> - Tablet: 768px
> - Desktop: 1280px
> - Keyboard navigation and visible focus.
> - Accessible labels and screen-reader semantics.
> - Contrast and reduced-motion behaviour.
> - Search, city switching, favourites, unit preferences.
> - Weather loading, errors, refresh and retry.
> - PWA manifest, icons and service worker.
> - Offline shell and cached weather.
> - Selected-city persistence.
> - Browser console and network errors.
>
> Fix genuine defects without rewriting working architecture.
>
> C10 — Documentation and clean-install verification
>
> - Verify README instructions against the actual project.
> - Verify PROMPTS.md contains the real chronological prompts and actual tools used.
> - Document architecture, API flow, caching, offline behaviour and limitations.
> - Clearly disclose that real background push reminders are blocked by missing deployment infrastructure.
> - Confirm no API keys, secrets or private credentials are committed.
> - Test a clean dependency installation and production build.
>
> C11 — GitHub preparation
>
> Inspect Git status, branch, remotes and repository contents.
>
> Prepare the project for a public GitHub repository:
>
> - Appropriate README.
> - .gitignore.
> - No secrets or generated dependency folders.
> - Correct package lockfile.
> - Complete source and tests.
> - Clear commit history.
>
> Do not overwrite an existing repository or push to an unintended remote. If GitHub authentication or publication authorisation is missing, report exactly what is required.
>
> C12 — Deployment preparation
>
> Inspect available stable deployment options.
>
> Do not claim deployment is complete until a real public URL has been opened and verified.
>
> If credentials or authorisation are required, identify the exact action needed from me. Do not invent credentials or use a rotating preview URL as the final production URL.
>
> Final report
>
> Provide:
>
> 1. Test count and results.
> 2. Typecheck, lint and build results.
> 3. Accessibility and responsive QA results.
> 4. Clean-install results.
> 5. GitHub publication status.
> 6. Deployment status and public URL, if genuinely deployed.
> 7. Honest list of remaining limitations.
> 8. A concise submission email draft.
>
> Preserve all 170 existing tests and all approved functionality. No unnecessary new features.

### Work performed for Prompt 10 (non-prompt record)

Tools actually used, for the record: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`,
`npm run build`, `npx wrangler deploy --dry-run`, Chromium through Playwright/CDP in the
cloud browser panel, axe-core 4.10.2 injected from jsDelivr, `curl` against the local
preview Worker, and the connected GitHub API (read-only repository listing). No secret,
token or key value was read or printed.

<!-- Appended chronologically at each later checkpoint. Do not add synthetic entries. -->
