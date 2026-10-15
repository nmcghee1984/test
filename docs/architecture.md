# Architecture and maintainer guide

Reviewed 16 October 2026 against main `6804f45`. This describes implemented code, not the target architecture or a security certification. Student journey planning is in [#28](https://github.com/nmcghee1984/test/issues/28) and proposed documentation PR #29.

## Current runtime and code map

| Boundary | Implementation | Responsibility / limitation |
| --- | --- | --- |
| App composition | `App.tsx` | Navigation, most screens, preferences/favourites and reminder coordination. Currently a large component; see maintainability work below. |
| Separate feature screens | `src/components/DiscoverScreen.tsx`, `AskUofGScreen.tsx` | Public discovery and experimental assistant UI. |
| Platform map/reminders | `CampusMap.native.tsx`, `CampusMap.web.tsx`; `src/data/reminders.native.ts`, `.web.ts` | Expo resolves platform-specific files. Native maps stay out of web. Browser reminders are foreground timers, not durable push delivery. |
| Prototype domain data | `src/data/mockData.ts`, `storage.ts`, `events.ts` | Sample timetable/place/study fixtures and local saved state; events are explicitly unavailable. The data-source type currently inherits fixture types. |
| Client API transport | `src/data/apiConnection.ts`, `networkPolicy.js`, `discovery.ts`, `assistant.ts` | HTTPS or loopback HTTP validation, timeout/connection errors, discovery cache and assistant-response filtering. JSON type casts do not constitute complete runtime schema validation. |
| Local HTTP backend | `server/index.js`, `deviceAccess.js`, `env.js` | Source index/search and assistant routes; loopback development or private Serve identity mode. No University SSO or production deployment. |
| Public research ingestion | `sources.js`, `oai.js`, `harvest.js`, `store.js` | Fixed source catalogue, bounded OAI-PMH/XML reads, normalization, deletions and atomic local index persistence. |
| Assistant provider boundary | `server/assistant.js` | Server-only OpenAI key; bounded request, origin/rate controls, public University search, citation checks and conservative withholding. Structural evidence validation is not proof every claim is correct. |
| Checks and delivery | `.github/workflows/quality.yml`, `release-candidate.yml`, `e2e/`, backend tests | Quality and dependency security run separately. Manual main-only candidate audit precedes artifact upload; nothing publishes. |

## Data paths

1. Campus/timetable/study screens read bundled **sample** data through `createSampleDataSource()`. Preferences, saved records and reminder IDs use AsyncStorage. There are no private student records, per-user University entitlements or account lifecycle in this design.
2. `npm run harvest` runs independently of HTTP requests. It reads allowlisted public sources and writes the ignored `data/discovery-index.json` (or configured DATA_DIR). API reads that snapshot; the client caches query/status responses in AsyncStorage. Neither an HTTP 200 nor cached results means the upstream repository is live or complete.
3. An assistant question goes through client transport → local/private API authorisation and input/origin/rate checks → server-side OpenAI call → cited answer or withheld/referral result. Provider use may incur cost. Sensitive/private student information must not be supplied.
4. Events currently use an official website handoff. An external calendar action opens a draft for user review; it does not silently save to the student's calendar. There is no real booking/payment/submission workflow.

## HTTP contract overview

All routes pass `deviceAccess` first. Local mode permits loopback callers; `api:device` forces Tailscale mode and loopback binding. The latter requires the loopback proxy's exact `Tailscale-User-Login` value in API_TESTER_LOGINS. Local processes are trusted and can forge proxy headers; this is a documented development trust boundary, not production authentication.

| Method / route | Result | Important behaviour |
| --- | --- | --- |
| GET `/api/health` | Local process health/time | Does not verify provider key, data freshness or private integration; denied without identity in device mode |
| GET `/api/integrations/status` | Public source coverage, counts, last attempt/success and errors | Derived from the local stored index; disabled/empty sources are unavailable |
| GET `/api/discover?q=&source=&cursor=` | Public cached index records, total and next offset | Query max 200 characters; known source only; safe non-negative cursor; page size 25; canonical record URL filtering |
| GET `/api/assistant/status` | Configured flag, provider and model | Non-empty key presence only, not credential verification; origin checked |
| POST `/api/assistant` | Cited or unverified result | JSON, max body 2,048 bytes, question 1–500 chars, five requests/minute per socket address, exact allowed browser origins; no-origin native requests permitted after device/local authorisation |
| OPTIONS | CORS preflight | Assistant routes use exact configured origins; discovery GET routes allow cross-origin access to public metadata |

Errors include 400 invalid input, 403 access/origin denied, 404 route absent, 405 unsupported method, 413 oversized body, 415 unsupported content type, 429 request/provider rate limit and 5xx backend/provider failure. See `server/discovery.test.js`, `device.test.js` and `assistant.test.js` for executable examples. The current per-socket limiter groups Serve-proxied testers behind loopback; it is not a production per-user quota.

## Configuration and operational limits

- Use Node 24 and `npm ci`; CI runs that major version. `package.json`'s broader Node engine floor is not a claim every allowed version is validated against current dependencies.
- Environment precedence for the backend: existing process environment → `.env.server` → `.env`. The app uses public Expo variables; do not put secrets in EXPO_PUBLIC names. Restart processes after changes.
- API defaults: loopback 8787. Browser quick start: Expo port 8084; e2e uses 8093 and a separate deterministic API on 8789. These browser origins are deliberately allowed by default. Other origins need explicit configuration.
- The backend reports configured when the key is non-empty; remove the example placeholder to test without AI.
- Public source imports are manual and bounded; no hosted scheduler, centralized database, backup/restore service, deployment monitoring or production incident response is implemented.
- Local AsyncStorage and the discovery index are prototype storage, not approved stores for grades, health, identity tokens or case evidence. Public caches have no implemented maximum-age expiry; do not reuse them for critical personal data without freshness and retention controls.
- See [device guide](device-testing.md) for HTTPS, proxy trust, account allowlists and positive/negative phone checks. The repository cannot run its backend on an iPhone alone.

## What is well separated

Server-side provider credentials, bounded public ingestion/persistence, shared URL/transport policy, native/web rendering boundaries, and separately extracted discovery/assistant screens are understandable foundations. Existing tests check meaningful malformed-input, access and evidence behaviours. These strengths do not establish a complete production architecture.

## Maintainability work before journey expansion

Tracked in [#30](https://github.com/nmcghee1984/test/issues/30):

1. `App.tsx` is 1,644 lines at this baseline and owns most screen/state concerns. Extract one screen at a time behind explicit props/hooks; keep the app root as composition, preserve UI and verify parity.
2. Replace mutable module-level text-scale/contrast variables with explicit React context/theme state as part of that extraction.
3. Define source-independent course/assessment/place models before private adapters; do not grow production contracts from `typeof` sample fixtures. Reuse timetable PR #7.
4. Separate persistence/reminder coordination and strengthen runtime validation of external/cached JSON. Keep saved-state migration and malformed-data recovery explicit.
5. The server assigns `globalThis.__discoveryIndex`; no reader was found in repository search. Remove it after regression verification or document a real consumer.

These are scoped findings from a source/documentation review, not a full audit, exploit assessment or native-device certification. Do not rewrite the app wholesale or combine this refactor with a major SDK migration.

## Where changes belong

| Change | Start here | Required evidence |
| --- | --- | --- |
| UI/journey | Existing screen and parent journey epic #28 | Student task, accessible states, truthful data and browser/device checks appropriate to the change |
| New data source | Source contract plus data/service boundary | Authority, permission, identity/IDs, schema, failures, freshness, retention and owner support; synthetic fixtures first |
| Assistant behaviour | `server/assistant.js` and client/UI boundaries | Citation/referral regressions and evaluation in [assistant-evidence.md](assistant-evidence.md) |
| Device access | Device scripts, access policy and shared transport | Positive/negative identity, origin, URL and real-network tests |
| Distribution | [Safeguards guide](repository-safeguards.md) and #17 | Actual passing audit, approved artifact SHA, independent review, native/device and University acceptance; no bypass |

Keep docs current in the same PR when commands, status, contracts or security behaviour change. Use dated observations for GitHub administrative settings, and label plans/open PRs separately from merged behaviour.
