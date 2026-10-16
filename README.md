# UofG Life

A React Native / Expo prototype for a joined-up University of Glasgow student experience. The current app combines sample campus/study/timetable screens, bounded public research discovery, an experimental cited assistant and an events website handoff. It has no University student authentication or private student-system integration and is not an approved production service.

## Current capability and documentation

| Area | Actual status |
| --- | --- |
| Timetable, campus facilities/access notes and study occupancy | Sample data; no personal timetable, live capacity or real booking |
| Discover Glasgow | Searches a locally harvested, bounded index of public Enlighten metadata; an empty checkout has no index |
| Ask UofG | Optional server-key prototype; withholds answers lacking acceptable citation structure; not authoritative advice |
| Events | In-app source unavailable; official University listings handoff |
| Phone access | Private Tailscale Serve development recipe; needs a computer/backend and compatible phone runtime |
| Delivery | Functional CI and protected main; dependency release gate still blocks distribution |

- [Architecture and code map](docs/architecture.md)
- [Physical-device setup and troubleshooting](docs/device-testing.md)
- [Assistant evidence policy](docs/assistant-evidence.md)
- [Events integration assessment](docs/events-integration.md)
- [Dependency security assessment](docs/security/dependency-review-2026-10-15.md)
- [Repository protection and release procedure](docs/repository-safeguards.md)
- [Contributing](CONTRIBUTING.md) and [security reporting](SECURITY.md)
- [Student experience delivery plan](docs/student-experience-plan.md), [data register](docs/student-data-register.md) and [journey backlog #28](https://github.com/nmcghee1984/test/issues/28). These are proposed delivery priorities, not completed integrations.

## Run locally

Use **Node 24**, matching CI, and npm. Run commands from the repository root. This setup requires a computer; an iPhone by itself cannot run the backend.

1. Run `npm ci` to install the committed lockfile.
2. Copy `.env.example` to `.env`. This sets the API to loopback port 8787.
3. Optional: copy `.env.server.example` to `.env.server` and replace `OPENAI_API_KEY` with your own server-only key. If testing without AI, omit that file or remove the placeholder key line; a non-empty placeholder makes the configuration indicator look configured but cannot authenticate to the provider. Restart the API after edits.
4. In one terminal run `npm run api`.
5. In another run `npx expo start --web --port 8084`. Use the printed localhost/127.0.0.1 URL. Port 8084 is explicitly allowed by the assistant's default browser-origin policy. If using a different origin, add that exact origin to `API_ALLOWED_ORIGINS` in `.env.server` and restart the API.
6. To populate public discovery, run `npm run smoke:enlighten` and then `npm run harvest` separately. These contact the configured public repository; the app can open without them, but discovery remains empty/unavailable until indexed.

For native simulator/Expo Go development, `npx expo start` is available; physical phones need the complete [private device setup](docs/device-testing.md), not the localhost API URL. Use a runtime compatible with SDK 57. Do not expose port 8787 or enable an unauthenticated public tunnel.

## Public research discovery (Phase A)

The **Discover Glasgow** tab searches a bounded local index of publicly exposed OAI-PMH repository metadata. The current allowlisted source is Enlighten Publications (`https://eprints.gla.ac.uk/`). Research Data and EdShare are listed as **UNAVAILABLE** and remain disabled until their OAI endpoints and formats are verified. Search uses Dublin Core metadata only; it does not download full text or cover every University repository record.

The app does not call repository URLs supplied by a user. The Node service uses fixed source endpoints, checks `Identify` and the advertised `oai_dc` format before importing, follows OAI resumption tokens, rejects malformed XML and document type declarations, limits request time/size/pages/records, and stores its index atomically in `data/discovery-index.json`. Source requests are sequential. A failed refresh preserves the last successfully indexed data and reports the issue; partially read pages are not committed as a successful harvest.

Live verification in this worktree on 2026-10-14: Enlighten Publications returned a valid `Identify`, advertised `oai_dc`, and returned 90 normalized records plus 10 deleted headers on the first smoke-check page. A bounded three-page harvest then processed 250 records, applied 32 deleted headers, and left 248 indexed records at `2026-10-14T17:26:27Z`. The persisted index is local/ignored and is not included in a source checkout. This snapshot does not establish complete repository coverage or verify the disabled sources.

1. Copy `.env.example` to `.env` and review its bounded defaults.
2. For the local OpenAI assistant, copy `.env.server.example` to `.env.server` and put your own API key in `OPENAI_API_KEY`. Keep `.env.server` private; it is ignored by Git and is read only by the Node API, never bundled into the app. Do not paste an API key into chat, source code or an `EXPO_PUBLIC_*` variable.
3. In one terminal run `npm run smoke:enlighten` for a read-only live protocol check, then `npm run harvest` to refresh the local index (up to 250 records per enabled source per run).
4. In a second terminal run `npm run api`.
5. For the browser run `npx expo start --web --port 8084`; for a phone follow the private-device guide.

### Quality and test regime

Run `npm ci`, install the browser once with `npx playwright install chromium`, then run `npm run test:all`. The same `test:all` command is the pull-request/main-branch CI gate.

| Layer | What it exercises | Command |
|---|---|---|
| Protocol, importer, persistence and HTTP API | XML/OAI errors and malformed input, unsafe links, retry/timeout/response limits, incremental dates, tombstones, de-duplication, bounded pagination, failed-harvest rollback, corrupt-index rejection, locking, API validation/CORS and result pagination; enforces 90% line, 75% branch and 90% function coverage across exercised backend modules | `npm run test:discovery` |
| Assistant evidence and input handling | Explicit citation validation, withholding/referral and provider/error handling; separate from the discovery coverage threshold | `npm run test:assistant` |
| Type safety | Strict TypeScript checks across the Expo app | `npm run typecheck` |
| Saved-state and reminder reliability | Field-level legacy preference recovery, failed storage reads/writes, ordered saves, reminder restart/restoration, cancellation retries and runtime API/cache validation | `npm run test:state` |
| Browser end-to-end and accessibility | Real Expo web UI against a deterministic local API fixture: search, source filters, pagination, explainable interests, bookmarks across reload, offline cache, empty-cache outage and retry; Axe WCAG 2.2 A/AA scans of every primary screen; keyboard operation of campus map pins and directory; Chromium desktop and Pixel 7 mobile emulation | `npm run test:e2e` |
| Platform bundles | Expo production web, Android and iOS JavaScript exports (platform-specific entry points) | `npm run build:web`, `npm run build:mobile-js` |
| Live repository compatibility | Read-only Enlighten protocol check, then a separately bounded import; deliberately not part of CI because it depends on a third-party service and network | `npm run smoke:enlighten`, `npm run harvest` |

Playwright saves traces, screenshots and video on failures under the ignored `test-results/` directory; CI uploads them as a short-lived artifact. Browser tests seed isolated deterministic fixtures under ignored `data/`, never production repository records. The tests do not certify native map rendering, iOS/Android notification delivery, real device accessibility behavior, University APIs, or complete repository coverage. Before release, also run this manual matrix on iOS and Android (including a physical device on Wi-Fi/mobile data):

| Area | Release check |
|---|---|
| Startup, offline and persistence | Cold start; API unavailable before first load; lose/restore network; relaunch with saved profile, interests, bookmarks and cached research. Confirm no spinner hangs and no login loop. |
| Navigation and layout | Visit all tabs at small/large device sizes, rotate where supported, open/close keyboard, verify tab selection and scroll/tap targets. |
| Map and external links | Confirm map tiles, attribution, selected pin, directory search, directions and safe repository links open the expected native/browser destinations. |
| Notifications | Grant and deny permission; schedule, cancel, restart and receive a class/event reminder; verify behavior in foreground/background and after date/time-zone changes. |
| Accessibility | VoiceOver/TalkBack navigation and rotor/heading order; system font scaling at the largest setting; high contrast; reduced-motion map behavior; keyboard/focus visibility; switch/selected state announcements; text-input zoom and reflow; map selection using both pins and the campus directory. Confirm every route, target and error/status message with disabled vision and assistive technology. |
| Data acceptance | UofG verifies actual buildings, lifts/access notes, event/room data, logo/branding and rights before any public release or private integration. |

Successful mobile JavaScript export is not a native binary build and does not verify native maps, push/local notification delivery or OS permission behavior. These automated checks are not a substitute for University/device acceptance tests.

The Node API and Expo app both read `.env`. The API is restricted to loopback addresses (`127.0.0.1`, `localhost` or `::1`); startup fails if `API_HOST` is set to a LAN or public interface. The app refuses to send search queries to non-loopback HTTP endpoints. For a reproducible private phone setup, follow [Expo Go on a physical device](docs/device-testing.md) (`npm run api:device`, Tailscale Serve and `npm run device:check`). For physical-device testing, keep the API bound to loopback and use a trusted HTTPS tunnel with access controls that forwards to `127.0.0.1:8787`; set `EXPO_PUBLIC_DISCOVERY_API_URL` to that tunnel's HTTPS URL. Do not expose the unauthenticated API through a public tunnel without access controls. Local HTTP is supported only for loopback development.

### Security release gate — currently blocked

Do not publish or distribute a release until `npm run security:release-check` exits successfully. It audits the installed production dependency tree and fails on moderate or higher advisories. The original 2026-10-15 baseline reported 23 affected production packages (16 high, 7 moderate). Compatible Expo patch updates and a validated Xcode-only UUID override reduce this to 16 high and zero moderate. Two underlying advisories remain without published patches. See [dependency security assessment](docs/security/dependency-review-2026-10-15.md) for exposure, validation and audit snapshots. The available automatic remediation downgrades Expo 57 to Expo 44, which is incompatible with this app; do not use `npm audit fix --force`. Keep Expo 57, monitor upstream for compatible patched releases, update the lockfile and rerun `npm run test:all` plus this release check before lifting the block.

The Security release gate runs separately in CI. The manual Release candidate workflow also enforces the audit before uploading any candidate artifact. There is no automated publishing workflow; whoever distributes an artifact must verify the gate and complete acceptance checks. Automated app tests passing does not override this security block.

The discovery tab uses **CACHED** for metadata from the local harvested index and **UNAVAILABLE** for sources without indexed data; locally saved research records are cached on-device as well. API health indicates whether the local service responds; it does not mean repository data is real-time. Other campus features continue to show their separate **sample/demo** labels. Search, bookmarks and explicit interest preferences are local-first; recommendations are based on matching the current result page and show their matching interest terms.

This public OAI feature is independent of private student systems. There is no UofG authentication, timetable, room booking, live capacity, or private API integration. Phase B integrations require University-approved authentication and data/API agreements.

## University events: source not connected

The Events screen now shows **UNAVAILABLE**, with a button to the [official University listings](https://www.gla.ac.uk/events/listings/). Demonstration events have been removed from the app data source. Search/filter, favourites, reminder and calendar code is retained for an approved integration; no real event cards, event cache or automatic refresh are claimed. Old demo-event reminders are retired at startup, with cancellation failures disclosed.

The central listings are readable HTML, but no documented feed for this service or permission for app extraction/transformation/republication has been verified. The separate Computing Science service is not verified as a replacement. See [the dated assessment and integration acceptance criteria](docs/events-integration.md) for evidence, limitations, the Web Team contact and the proposed refresh/cache policy. `e2e/events.spec.js` checks the unavailable state, absence of demo cards, filter controls, reload and official website navigation on desktop/mobile web.

## Prototype scope

The prototype includes a personalised home screen; a week-by-week sample timetable with reminders and calendar links; searchable campus maps and a facilities/support directory; study-space filters, favourites and sample occupancy; event search, category/date filters, favourites, reminders and calendar links; and accessibility preferences for larger text, higher contrast and reduced motion. Preferences and saved items are stored locally on the device without a login. Interactive controls expose accessible names and selected/checked states; text is kept above a small-type floor, text inputs remain legible at larger sizes, and the map pins can be operated by keyboard on web. Every map marker also has an equivalent selectable campus-directory entry.

**Ask UofG is an experimental, non-official OpenAI prototype—not a UofG service or verified source of University guidance.** When a developer configures a local key, questions go from the app to the loopback API and then to OpenAI Responses API web search, which is restricted to `gla.ac.uk` and its subdomains. The assistant is required to search and answer from public University pages; answers are withheld unless explicit University citations satisfy structural checks; merely consulted pages are not treated as answer evidence. These checks do not prove semantic correctness. Search can miss relevant pages or misinterpret them, so verify important information on the linked University page. The API key stays server-side; the API allows only local preview origins, limits prompt length and request rate, does not log prompt text, and keeps conversation only in screen memory. OpenAI processes prompts and search queries under the developer's account/API terms. Do not enter passwords, student numbers, health information or other sensitive/personal data. When no local key is configured, sending is disabled. Web search availability and cost depend on the selected OpenAI model/project and may require billing.

Before use beyond this local prototype, UofG must approve the provider, data terms and authoritative content sources. A production assistant needs privacy/security review, authenticated server deployment, access controls, retention and abuse policies, citations and source freshness, and robust evaluation for hallucinations, prompt injection and high-stakes student queries. Never put model keys or student-system credentials in the app bundle.

Browser accessibility scans use Axe against WCAG 2.2 A/AA criteria on the primary screens and run in both desktop and mobile browser projects. They are regression checks—not a compliance certificate—and cannot verify VoiceOver, TalkBack, native map/notification behavior, physical target usability, or all text enlargement/reflow behavior. Those need hands-on testing on current iOS and Android devices, including at the largest OS text setting and with screen readers enabled.

The sample timetable, campus directory and study spaces are bundled in `src/data/mockData.ts` and exposed through the `CampusDataSource` boundary in `src/data/storage.ts`. They are not live University information. Native maps use approximate campus pins with Google Maps on Android and Apple Maps on iOS. The browser uses an interactive OpenStreetMap map with selectable pins. Selecting a pin updates its place card, and Directions opens Google Maps.

Local notifications can be scheduled for classes and selected events on native devices. Browser reminders use the browser notification permission and a foreground timer; they are not guaranteed after the tab closes or reloads. Calendar actions open a Google Calendar event draft for the user to review and save. The app does not silently write to a personal calendar.

The timetable, campus directory, study spaces and occupancy elsewhere in the prototype remain sample data; events are unavailable pending an approved source; no UofG account credentials, live occupancy, or real bookings are configured. To connect official student services, the University must provide an approved timetable/events/room data API, authentication requirements and permission model, availability and booking endpoints, and data-use approval. Until then, no login, booking or real-time status is represented as working.

The campus building pin coordinates, opening hours, facilities, lift/access notes, occupancy and study-space details are approximate/sample values and are not authoritative indoor navigation data; some coordinates were looked up against [OpenStreetMap](https://www.openstreetmap.org/copyright). The browser basemap tiles are supplied by OpenStreetMap contributors and display their attribution. Maps and external calendar links require an internet connection. For a standalone Android/iOS app-store build using Google Maps, create restricted Google Maps SDK API keys and enable billing. Google Maps on iOS also requires a configured API key and native rebuild; without it, iOS uses Apple Maps.

The prototype is designed for quick access: it opens directly to the dashboard without an account gate and surfaces the next class and nearby study options. Platform-specific map components keep native map libraries out of the browser preview.

The visual theme follows the University's 2026 Brand Toolkit: University Blue (`#011451`), Secondary Light turquoise (`#4DBBC6`) and yellow (`#F2D25C`), with Noto Sans as the primary typeface and Noto Serif for display headings. The header uses the unboxed blue-text University logo from the [official toolkit artwork](https://www.gla.ac.uk/media/Media_1228330_smxx.zip), with its supplied artwork and exclusion space preserved. This is a prototype, not an official University service or endorsement; use of the logo here does not grant approval for public distribution.

Ask UofG now withholds responses without explicit, structurally valid University citations and conservatively routes uncertain/sensitive enquiries to student services. See [evidence policy and repeatable evaluation](docs/assistant-evidence.md) for checks, false negatives and remaining accuracy limitations.

## Repository safeguards

See [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md) and
[repository safeguards and release procedure](docs/repository-safeguards.md).
CI includes a separate dependency security gate; functional success is not security
clearance. The manual Release candidate workflow refuses to upload a web candidate
unless its audit and quality checks pass. Main protection and the reviewed dependency/secret security settings were activated and verified on 15 October 2026. See the dated status in the safeguards guide; settings can change independently of repository files.
