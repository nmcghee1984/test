# UofG Life: joined-up student experience delivery plan
16 October 2026 • Proposed product baseline • Parent backlog: [#28](https://github.com/nmcghee1984/test/issues/28)

## 1. Product promise and boundary
“I know what matters, what I need to do, where to go, who can help and whether it has been sorted.”

UofG Life is the student's coherent front door across University services. Students should not need to know the organisation chart or underlying platforms. Source systems retain authoritative records and decisions. “One stop shop” means a consistent experience, including secure, understandable handoffs where necessary; it does not require rebuilding every University transaction.

This plan translates the requested journey map into work. It is a hypothesis for student and service-owner validation, not research evidence. Read “days” in the request as “data”; no elapsed-day estimates are asserted.

### Shared journey pattern
Discover → understand → act → obtain confirmation → track outcome → resolve a problem.
Every epic must cover that pattern. A dashboard card alone is not a completed journey. A successful web redirect is not a successful payment, submission, booking or case decision.

## 2. What exists and what does not
Baseline main: 6804f45ee624fd9f4a0d33839f632083ddfa0d97.
- Repository safeguards and dependency remediation from PRs #8/#3 are merged; protected main requires an up-to-date verify check. See [release-readiness issue #17](https://github.com/nmcghee1984/test/issues/17).
- Existing prototype screens and synthetic campus/study data are experience scaffolding, not authoritative personal information or live capacity.
- Events source is explicitly unavailable in-app with an official website link. [The assessment](events-integration.md) does not establish a supported central feed or scraping/republication permission.
- [PR #7](https://github.com/nmcghee1984/test/pull/7) is open timetable-boundary work; it proposes contracts/unavailable states, not live student integration. Review and reuse it under J02.
- Existing Ask UofG citation/sensitive-enquiry safeguards are retained; answers do not replace authoritative decisions or human support.
- No approved private student API, working University SSO, production deployment, native acceptance or student research has been demonstrated for this prototype.
- Security findings continue to block distribution. A planning PR does not approve production/student-data use.

## 3. Journey portfolio and lifecycle coverage
| Epic | Student outcome | Lifecycle coverage from the journey map | Data domains | Proposed wave |
| --- | --- | --- | --- | --- |
| [J01: Join Glasgow and settle in](https://github.com/nmcghee1984/test/issues/18) | A new student knows what to do, completes required steps and arrives prepared. | Become a student; arrive; settle; re-register | D01–D03,D11–D13,D16 | 3 |
| [J02: Manage my day and my studies](https://github.com/nmcghee1984/test/issues/19) | A student can plan a real day, reach the right class and open the correct learning activity. | Organise my day; understand courses; access learning | D01–D05,D09 | 1 |
| [J03: Find my way and somewhere to study](https://github.com/nmcghee1984/test/issues/20) | A student reaches the right destination and can find and use a suitable study space. | Get around; find study space and resources | D03,D09,D10 | 1 |
| [J04: Complete assessments and understand my results](https://github.com/nmcghee1984/test/issues/21) | A student knows what is due, has evidence of submission and understands released outcomes and next actions. | Complete assessments; feedback; results; progression/reassessment | D02,D04–D07 | 1 |
| [J05: Get support when circumstances affect study](https://github.com/nmcghee1984/test/issues/22) | A student can find the appropriate support route, submit securely and know the outcome without repeating their story unnecessarily. | Wellbeing; circumstances; disability/adjustments; support to study | D05,D07,D08,D14 | 1 |
| [J06: Make friends and participate in Glasgow life](https://github.com/nmcghee1984/test/issues/23) | A student finds an activity they can attend, joins/books it and can choose to return. | Friendship; societies; sport; events; participation | D03,D09,D11,D15 | 1 |
| [J07: Afford university and manage everyday life](https://github.com/nmcghee1984/test/issues/24) | A student understands financial/admin obligations and can resolve a practical problem or seek help. | Fees/funding; housing; repairs; documents; everyday administration | D01,D12–D14 | 2 |
| [J08: Build my future and stay connected](https://github.com/nmcghee1984/test/issues/25) | A student finds relevant opportunities, makes a supported transition and leaves with the documents and connections they need. | Careers; placements/exchange; graduation; alumni transition | D02,D11,D15,D16 | 3 |
| [J09: Get an answer, resolve a problem and change my plans](https://github.com/nmcghee1984/test/issues/26) | A student reaches the right owner, can follow progress and understands their options during a difficult transition. | Adviser/enquiries; problems; change/interruption/withdrawal/return; complaints/appeals; student voice | D01,D02,D06–D08,D14,D16 | 2 |
| [E01: Shared foundation](https://github.com/nmcghee1984/test/issues/27) | Consistent identity, actions, calendar, requests, notifications, handoffs and provenance | Supports every journey in thin slices | D01 + source contracts | 0 and alongside each wave |

Source/owner hypotheses, verification state, proposed freshness and access requests are in [student-data-register.md](student-data-register.md). The epic issues contain detailed user stories and acceptance criteria.

## 4. Delivery sequence: complete thin journeys
Waves express dependencies and outcome order, not fixed release dates. Do not wait for every API or finish a large platform programme before testing a usable journey.

### Wave 0 — prove the service and integration foundations
Scope E01's minimum slice plus source discovery for wave 1.
- Walk the proposed journeys with a varied student sample and responsible services. Capture current tasks, handoffs, pain points, accessibility needs and policy constraints; verify rather than presume the problem.
- Confirm relationship to the existing official UofG Life/mobile integration, service ownership, approved brand scope and reuse opportunities.
- Inventory actual platforms and obtain approved sandbox identity, synthetic test students, permissions and source contracts.
- Agree stable student/course/assessment/room IDs and reusable action, event, request and source-status models.
- Define one accessible navigation and notification approach; prototype task-based entry points and human handoffs.
Exit: tested journey prototype, source coverage/ownership matrix, viable first cohort and a demonstrable cross-student denial test. Unknown/private sources remain unconnected.

### Wave 1 — “Make today work”
Deliver a deliberately small version of J02/J03/J04/J05/J06:
1. **My next class:** signed-in student's dated occurrence → source-confirmed room → validated route → correct course link.
2. **My next assessment:** authoritative assessment and applicable deadline → instructions/submission handoff → source receipt/status where available.
3. **I cannot meet this deadline:** correct policy-year/programme support route → secure EC/DAP handoff → receipt/status where supported → confirmed outcome reconciled to planner.
4. **Find something I can join:** approved real activity → interest/time/budget match → canonical booking/join route → confirmation where available → directions.

Start with read-only private data and approved external transaction routes. If case/booking status API is unavailable, show “Continue/check status with [service]”; do not fake an in-app tracker. Public content/directory slices can ship into an approved private test environment while access work proceeds.
Exit: students complete the four scenarios with the actually implemented scope; gaps are visible. For an end-to-end pilot, authoritative confirmation and return paths must work. No public distribution while #17 fails.

### Wave 2 — “Keep me on track and help me resolve things”
Extend J04/J05 and deliver J07/J09:
- Official released results/feedback and explicit progression/reassessment next actions.
- Confirmed individual deadlines and support outcomes reconciled across services.
- One My requests view, adviser/contact/appointment routes and escalation.
- Fee/payment handoff, funding help, accommodation repairs and student documents.
- Clear supported routes for complaints, appeals, interruption and return.
Exit: cross-service scenarios reconcile correctly; sensitive cases are segregated; service teams can operate and support the journeys.

### Wave 3 — “From joining to what comes next”
J01/J08 plus deeper J06:
- Personalised joining/re-registration and induction checklist.
- Careers, volunteering, mentoring, enterprise and placement/exchange opportunities.
- Graduation/documents and account/alumni transition.
- Additional programme/campus/cohort coverage and approved social coordination.
Exit: lifecycle tasks use authoritative completion/decisions, and researched cohort variants work. Do not claim a one-size-fits-all process.

## 5. First implementation-ready backlog
PRs are small reviewed changes implementing stories; epics describe outcomes. Do not create empty PRs for future intentions.

| Order | Proposed work / future PR | Parent | Ready when | Reviewable acceptance |
| --- | --- | --- | --- | --- |
| 1 | Shared journey entry points, navigation and source-status components | E01 | Student walkthrough + existing screen audit | Consistent loading/empty/stale/unavailable, keyboard/screen-reader use, human help and safe return paths; synthetic data labelled |
| 2 | University identity sandbox + per-student authorisation | E01 | Approved app registration, student-ID mapping and synthetic accounts | Two-user isolation; expired/revoked session denied; sign-out/cache/account-switch tests |
| 3 | Timetable boundary/date-range UI; reconcile existing PR #7 | J02 | Review existing branch; agree contract | Dated occurrences, London DST, cancellations, honest unavailable state; no duplicate adapter |
| 4 | Authorised timetable adapter for a confirmed cohort | J02 | D01–D03 contracts and access | Real test enrolments and room changes; no other-student records |
| 5 | Verified place/entrance directory + timetable route | J03 | D09 validation and rights | Correct destination; accessibility facts distinguish known/unknown; no invented indoor routing |
| 6 | Course and assessment read adapter + authoritative handoff | J02/J04 | D04–D06 authority and permissions | Correct course/assessment/student; release restrictions; actual receipt required for success |
| 7 | Support/circumstances route and status boundary | J05 | Current owner-reviewed content and D07 contract | Correct programme/year route; urgent help visible; pending request does not alter deadline |
| 8 | Approved events/societies source + booking handoff | J06 | D11 feed/rights/coverage | Stable occurrences, cancellations, timezone, no fabricated capacity or completed booking |
| 9 | Today actions/calendar/notifications joining delivered sources | E01/J02/J04/J06 | Actual contracts for implemented sources | De-duplication, source/updated time, changed deadline cancels old reminder; privacy-safe previews |
| 10 | Source-confirmed outcomes and My requests | J05/J09 | D07/D14 receipts/status and reconciliation | Real status, owner and next action; safe retry; conflict/escalation handling |

No estimates are supplied until access lead times, source quality, team capacity and native requirements are understood. Size each ready story with engineering, testing and the service owner; distinguish implementation effort from waiting for access.

## 6. Experience and data rules that keep this joined up
- **One Today/action view:** tasks carry source, student context, due/effective time, status, destination and updated time. Source-owned completion, not a local checkbox pretending to update University records.
- **One calendar:** classes, assessments, appointments and chosen activities share dated/timezone-aware models; provenance, collisions and cancellation are explicit. Calendar additions require student choice.
- **One My requests experience:** common presentation over source-owned cases. Specialist access and confidentiality stay intact; a general inbox must not expose wellbeing/complaint records.
- **Authoritative results:** agree grade/decision authority per field. Never infer official results/progression from Moodle gradebook or AI.
- **Deliberate handoffs:** explain destination/action, preserve safe context, offer a return route and reconcile receipt/status where possible. Never forward secrets or sensitive case details in URLs.
- **Freshness:** owner-agreed per source; “live” only when justified. Assessment deadlines, results and access decisions need stronger verification than static place descriptions.
- **Privacy:** minimum necessary data; no general-AI processing of grades, disability, health or case evidence by default. Explicit approved purpose/architecture is required for any such processing. No hidden inference of wellbeing or friendship.
- **Accessible and inclusive:** test screen readers, keyboard, zoom, contrast, simple language and low bandwidth; location/social sharing optional. No push-only critical information.
- **Human ownership:** each journey has a proposed product owner, service decision owner, technical source owner and support route. Names/commitments remain unassigned until agreed.

### Cohort validation
Walk every relevant journey with undergraduate, taught postgraduate, PGR, international, commuter, disabled, part-time, online, placement/exchange and student-parent scenarios. Not every variant belongs in the first release, but unsupported coverage must be stated. Timetable and assessment policies differ by programme; PGR routes are not copied from taught routes.

## 7. Cross-service acceptance scenarios
| Scenario | Required joined-up result |
| --- | --- |
| Room changes shortly before class | Class occurrence, room route and notification reflect the same authoritative revision; stale state is visible |
| Student becomes ill before an assessment | Suitable human/policy route, secure request, source receipt/status; only a confirmed outcome updates the applicable deadline |
| Results are released | Only authorised released records appear; provisional/confirmed is clear; adviser/reassessment/appeal route matches official decision |
| Commuter seeks an affordable activity | Real activity fitting chosen preferences and available time; canonical booking, confirmation and route; cancellation propagated |
| A student cannot access an agreed route/adjustment | Known access facts and limitations shown; correct service can receive and own a report |
| Source system fails or session expires | No invented data/success; clear safe retry/handoff; no other-user cache; critical human-help routes remain reachable |
| Student changes or interrupts studies | Human-advised options and confirmed tasks; calendar, access and cases follow authoritative effective dates |
| Student switches account or signs out | Private cached data and notification associations cannot bleed into another account |

## 8. Governance, measures and release
A proposed small journey group brings students, product/design, service owners, engineering, integration/data, accessibility, security and privacy expertise together. Do not appoint or claim commitments for named staff through this document.

Measure completed tasks, time and avoidable steps, first-contact resolution, data discrepancies, failures/staleness, accessibility task success and student confidence. Set targets after baseline research; app opens and clicks alone are insufficient. Use minimal, purpose-limited analytics; do not collect sensitive reasons for support or social attendance to measure engagement.

Definition of done for each slice:
- Student outcome and implemented scope tested; linked issue and source contract current.
- Authority, freshness, entitlements, error and unavailable behaviour proven with synthetic fixtures and approved test accounts.
- Accessible discover/action/receipt/track/recover flow; no misleading completion.
- Relevant unit/contract/browser/platform checks pass; security/privacy review proportional to change.
- Operational owner, monitoring, support/escalation, data retention and rollback defined.
- Native/device and University acceptance recorded where required.
- Release gating in #17 satisfied before distribution. Passing a planning or functional PR does not waive it.

Immediate next work: validate the first four wave-1 scenarios with students and owners; obtain D01–D07/D09/D11 access decisions; review existing timetable PR #7; implement the first small story only when its ready criteria are met.
