# Central University events: integration assessment

Checked 15 October 2026. Outcome: **UNAVAILABLE in-app; official website link available**.
This is an investigation and honest fallback, not a completed live events integration.

## Evidence and limits

- [Central listings](https://www.gla.ac.uk/events/listings/) returned server-rendered HTML in a direct, anonymous GET. Individual links use `index.html/event/<id>`. The fetched page advertised no RSS/iCalendar alternate link, JSON endpoint or API documentation. Targeted searches for official central-events feed/API documentation found no supported interface. This does **not** prove that no internal or unadvertised interface exists.
- [Civil Service Careers](https://www.gla.ac.uk/events/listings/index.html/event/14911) was linked from the central listings. Its listing showed 20 October 2026, 11:00–14:00, Glasgow University Union. This was a verification example, not a bundled data snapshot.
- The HTML contains presentation-specific event tiles and English date/time strings. Some listings omit a time or end time, span multiple days or recur with the same detail URL. Scraping would require layout-dependent parsing, London daylight-saving handling, separate occurrence identifiers and rules for unknown times. One successful fetch establishes readability, not a reliable service contract or refresh SLA. No browser CORS support, conditional-request behavior or cancellation/deletion semantics have been established for an app integration.
- [robots.txt](https://www.gla.ac.uk/robots.txt) did not disallow `/events/listings/` for the wildcard agent at inspection. Robots rules are crawler instructions, not a republication licence or service commitment.
- [Terms of use](https://www.gla.ac.uk/legal/termsofuse/) reserve intellectual-property rights, permit certain personal/internal non-commercial uses subject to restrictions, require written consent for other uses, and restrict modification of downloaded material. These terms do not establish approval for extracting, transforming, caching and distributing event records in this prototype. The terms identify **webteam@gla.ac.uk** for enquiries. No permission request has been sent and no permission is claimed.
- [Computing Science events](https://www.gla.ac.uk/schools/computing/events/) is a separate, school-scoped service. Search surfaced historical documentation describing calendar/RSS feeds at [EventsSystemTutorial.pdf](https://samoa.dcs.gla.ac.uk/events/other/EventsSystemTutorial.pdf) and an [events-system repository](https://git.dcs.gla.ac.uk/events_system_docker/events-system/-/tree/main). The tutorial could not be read in the current fetch and the repository fetch failed. Neither demonstrates a supported feed covering the central listings, current endpoint availability or reuse permission. Do not silently substitute these school events for University-wide coverage.

## Options and next decision

| Option | Verified now | Specific limitation / requirement |
|---|---|---|
| Open central listings in the browser | Public listing and event pages are reachable | Users search/book on the website; no in-app records, favourites, reminders or event calendar actions until connected |
| Owner-supported central feed/API | No documented interface verified | Ask Web Team to identify the service owner and approved feed/export; obtain schema, licence, coverage, rate limits, stable IDs, deletions and support expectations |
| University-produced JSON/iCalendar export | Proposed, not an existing verified service | Owner must publish and authorise it; confirm categories, venue, full timestamps/timezone, descriptions and canonical detail URLs |
| Server-side HTML adapter | Public HTML is readable | Needs written approval for transformation/reuse and an owner agreement on change notification; layout and ambiguous event semantics remain technical risks |
| Computing Science feed | A separate school page exists; historical feed documentation surfaced | Current feed/protocol/rights still unverified; narrower coverage would need explicit product agreement |

Recommended next step: ask **webteam@gla.ac.uk** for a supported, permitted central-events export and its owner. Request confirmation of whether Civil Service Careers (14911) is included as an acceptance example. A feed URL alone is insufficient without coverage and reuse terms.

## Current app behavior

`src/data/events.ts` explicitly exposes an empty UNAVAILABLE source and the fixed official listings URL. The Events layout, search/date/category filtering code, local favourites, reminder actions and calendar-draft code remain in place, but there are no invented or stale event cards. No event HTTP requests, automatic refresh, event cache or mock fallback are enabled. The screen states this plainly. Reopening the website obtains the website's current view; it is not an app refresh. The three bundled demo records have been removed. Existing saved identifiers are retained locally; their cards cannot resurface. Previously scheduled reminders for those three demo IDs are cancelled at startup; cancellation failures are disclosed and remain cancellable through Settings.

## Acceptance criteria before enabling a source

Use an owner-approved server adapter, not per-device HTML requests. Keep its endpoint fixed/allowlisted, bound response size/time, validate every record and allow only canonical HTTPS University detail links. Render descriptions as text. Stable IDs must distinguish recurring occurrences. Represent all-day/unknown times explicitly; never invent an end time or reminder time. Calendar drafts and reminders must use full Europe/London-aware start/end timestamps, including DST, and canonical source links. Existing local-time calendar helpers require adaptation before real events are enabled.

Proposed refresh policy for owner agreement: shared server refresh no more than hourly, conditional requests where supported, request coalescing and backoff/Retry-After on failure. Cache only authorised records with fetched-at/source timestamps; retain the last valid snapshot on transient failure and label it CACHED/stale. Stop presenting records after an agreed maximum stale interval (proposed 24 hours), always filter ended events, and honour cancellations/deletions. App refresh on Events entry and manual retry should read this server snapshot, never bypass upstream rate limits. Distinguish loading, fresh, cached, stale, empty-success and unavailable states. None of these proposed policies are represented as an operational integration today.

Add adapter contract tests for timezone/DST, missing/end times, multi-day and recurring events, cancellation, duplicate IDs, malformed input, unsafe links, response limits, 304/429 handling, cache expiry and failed refresh rollback. Then exercise real cards, filters, favourites across reload, native reminder cancellation/delivery and calendar drafts on web/iOS/Android. Do not enable the source solely because a scraper passes fixture tests.
