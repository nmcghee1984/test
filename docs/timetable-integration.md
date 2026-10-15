# Timetable integration assessment — 15 October 2026

## Verified public evidence

[CMIS–MyCampus overview](https://www.gla.ac.uk/myglasgow/estates/timetabling/guidance/mycampusinterface/) describes enrolments flowing from MyCampus to the mobile app and timetable, instructor, time and location data from CMIS. It also describes mobile timetable change notifications and iCal. HR and Physical Resources supply staff and locations to CMIS. This is a published architecture description, not proof of the current implementation, endpoint availability or permission to reuse it.

[Registry enrolment guidance](https://www.gla.ac.uk/myglasgow/registry/enrolment/howtoenrolonmycampus/) directs students to the existing UofG Life app and allows up to 24 hours for updates. Do not promise immediate enrolment propagation. Neither page documents an API, service credentials, identity protocol, event transport or reuse licence.

Repository review: `createSampleDataSource()` supplies weekly mock classes; there is no institutional sign-in or personal timetable service. The default app now uses an empty unavailable timetable. Demo fixtures remain explicitly confined to the sample factory; the new adapter never falls back to them. Public discovery/Ask UofG endpoints must not become routes to student data.

## Recommended architecture (proposal requiring owner approval)

Prefer reuse of the existing mobile integration service and its enrolment-to-meeting mapping. First establish who operates it and whether its supported, licensed interface can serve this prototype. If unavailable, adapt approved MyCampus enrolment/class allocation and CMIS occurrence feeds behind the University's integration platform; do not scrape authenticated pages or connect phones directly to databases. Existing Boomi capability may be a candidate, not a verified dependency of this flow.

App → approved University identity provider → private timetable backend → existing mobile integration (preferred), or approved enrolment and CMIS feeds. The backend resolves the authenticated subject to the authorised student and joins actual class/group allocations with dated meetings. Course enrolment alone may not identify a student's tutorial group. Room identifiers resolve against authoritative Estates data; never infer precise rooms or accessible routes from the prototype's sample map.

The proposed `src/data/timetable.ts` contract is an isolated adapter seam, not a deployed service or upstream schema. It preserves dated occurrences with explicit offsets, stable IDs, revisions, cancellation/change status and room/building IDs. A 200 response with an empty list means genuinely no meetings; missing configuration, denied access, bad payload or outage means unavailable. `asOf` is source freshness, not fetch time. The default UI is unavailable; no live result is wired into the weekly demo renderer. Before wiring live results, implement date-range loading and Europe/London day grouping (including DST), source age display and stale handling. Never replay a weekday fixture into a real week.

## Security and operational boundaries

Use a registered public client and an approved OIDC authorization-code/PKCE flow if supported by the identity owners; otherwise follow their approved protocol. Confirm actual identity provider, issuer, audience, scopes and student mapping rather than assuming Entra claims map to MyCampus IDs. Backend validates tokens/session, expiry and entitlement on every request; no client-supplied student ID can grant access. Keep upstream service credentials server-side in a managed secret store, restrict service/network privileges, use TLS, restrict CORS and prevent shared/CDN caching of personal responses (`Cache-Control: private, no-store`). Do not reuse a shared development access token as student authentication.

Do not persist timetable records/tokens in the existing AsyncStorage preferences store. Define encrypted device storage, logout/account-switch deletion and retention before any offline cache. Exclude personal payloads, tokens and identifiers from analytics/logs. Establish DPIA/privacy notice, processors, support access and audit policy with University owners.

For changes, use an approved upstream change feed or bounded server-side polling of authoritative snapshots. Stable occurrence IDs and revisions support idempotent diffing; retain cancellation tombstones and handle deletions, moves, enrolment withdrawals and out-of-order events. Reconcile on foreground/refresh. Cancel obsolete local reminders before scheduling replacements. Push delivery requires approved APNs/FCM/Expo credentials, device-to-user binding, permission/opt-out and logout revocation; send generic lock-screen text and fetch authorised details. Existing demo local reminders are not institutional change notifications. Never interpret an unavailable feed as mass cancellations. Agree freshness thresholds, failure monitoring and notification latency separately from enrolment latency.

For iCalendar, preserve UID and increment SEQUENCE for revisions, handle cancellations and Europe/London/DST correctly. Decide download versus revocable private subscription: secret calendar URLs are bearer credentials, may leak and are not suitable public links. No calendar feed is implemented here.

## Institutional decisions and access checklist

Likely accountable teams below are hypotheses to confirm, not verified ownership assignments or individual commitments.

| Owner to confirm | Required interface, permission or decision | Acceptance evidence |
| --- | --- | --- |
| Existing UofG Life product/service owner and supplier | Integration operator, current topology, contract/licence permitting reuse, API specification, sandbox | Supported read-only endpoint/feed, contact and agreed SLA |
| Registry / MyCampus owner | Enrolment and class/group allocation authority, stable join keys, student subject mapping, withdrawals and term boundaries | Synthetic fixtures and reconciliation rules; least-privilege service grant |
| Estates timetabling / CMIS owner | Occurrence IDs, dates/timezones, revisions, cancellations, room/instructor schema, feed cadence and change mechanism | Versioned schema and synthetic change/cancellation scenarios |
| Estates physical resources owner | Authoritative building/room IDs, coordinate/accessibility dataset reuse rights | Agreed mapping and unknown-room behaviour |
| Identity and security owners | Client registration, redirect URIs, scopes, token validation, network boundary, per-user authorisation | Negative tests for wrong audience, expired token and cross-student access |
| Integration/platform and operations owners | Reuse existing connector vs new adapter, hosting, secrets, rate limits, failure recovery and support | Sandbox deployment, monitoring and documented freshness/latency targets |
| Information governance and mobile owner | Lawful processing, retention/offline policy, processor review, push and private calendar policy | Approved privacy/security design and notification lifecycle tests |

Next institutional step: a joint service walkthrough with the existing app owner, Registry/MyCampus and Estates/CMIS. Request current interface documentation, synthetic records, identity mapping and a supported sandbox. No production records or credentials are needed for that walkthrough. These are connection prerequisites, not claims that access has been approved.

## Validation and remaining work

Synthetic contract tests cover dated records, room IDs, changes/cancellations, field whitelisting, empty vs unavailable, malformed responses and access/outage failures. They validate the prototype contract only. Before production, add approved upstream schema mapping, backend authentication/authorisation tests, date-range UI and stale/offline tests, DST and term boundaries, withdrawn enrolments, deduplicated notifications and calendar lifecycle tests. No private student data or institutional endpoint was accessed.
