# Dependency security assessment — 15 October 2026

## Decision

**Distribution remains blocked.** Do not run `npm audit fix --force`, downgrade Expo/React Native, suppress advisories, move packages to devDependencies to hide them, or lower the moderate threshold. This review is scoped to npm advisories, not a complete application penetration test or native dependency assessment.

Baseline: main commit `b8f45a9`, npm 11.9.0, Node 24.19.0. A clean `npm ci --ignore-scripts` reproduced 23 affected production packages: 16 high and 7 moderate. These are npm package-level findings, not 23 independent vulnerabilities. There are three distinct advisory IDs, with severity propagated through dependency and peer cycles (including React Native/virtualized-lists/maps).

## Changes

- Lockfile updates Expo 57.0.28 → 57.0.30 and expo-notifications 57.0.22 → 57.0.23 within existing declared ranges. Expo's `install --check` recommends these patches and passes afterward. Their compatible toolchain updates are retained; React Native stays 0.86.3 and React/React DOM stay 19.2.3.
- Override only `xcode > uuid` to exact 11.1.1. Xcode 3.0.1 declares UUID ^7.0.3, so this is an intentional out-of-range override, not an upstream-supported dependency update. Inspection of `xcode/lib/pbxProject.js` found its UUID use is `require('uuid').v4()` without a supplied buffer; UUID 11 retains CommonJS and this API. UUID 12+ is not substituted because of its module-system change. See validation below. Remove the override when Xcode adopts a patched compatible UUID itself.
- Separate **Security release gate** CI job executes the unchanged audit command. It is expected to fail until remaining findings are fixed. No `continue-on-error`, exclusion or allowlist. Existing quality tests remain independent. Main protection requires the up-to-date verify job. The separate dependency gate deliberately does not block unrelated development merges; it must pass before distribution. The release-candidate workflow merged in PR #8 enforces it before artifact upload and does not publish.

Production audit after changes: **16 high, 0 moderate** (exit 1). Full audit including dev dependencies: **16 high, 2 moderate**, because @expo/ngrok still contains UUID 3.4.0. Machine-readable production snapshots are adjacent to this report; they record a point-in-time advisory service response, not permanent certification.

## Individual advisories and exposure

| Advisory | Installed / affected / patched | Dependency path and attack prerequisite | Assessment and required action |
|---|---|---|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), high, stack exhaustion | braces 3.0.3; affected <=3.0.3; registry latest 3.0.3; no published patch | Expo → @expo/metro → metro-file-map → micromatch 4.0.8 → braces; also RN → community-cli-plugin → Metro. Both Metro 0.84.5 and 0.84.6 trees reach it. Deeply nested **patterns** passed to brace processing can terminate the Node process. | Build/watch tooling availability risk. Metro's `watchers/common.js` passes configured globs to micromatch, with file paths as subjects. Student search/assistant inputs are not wired into these globs. No direct application input path identified by source inspection. Untrusted build configuration/plugins can expose the vulnerable parser; isolate builds and only run trusted configurations. Need a patched braces release accepted by micromatch, or compatible Metro/Expo/RN releases removing this dependency. Do not replace micromatch with a different matcher without API/semantic validation. |
| [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), high, RSA verification forgery | node-forge 1.4.0; affected <=1.4.0; registry latest 1.4.0; no published patch | Expo → @expo/cli → node-forge and @expo/code-signing-certificates 0.0.6 → node-forge. Attacker-crafted PKCS#1 v1.5 signatures with malformed nested DigestAlgorithm data and low-exponent keys can be accepted. | Tooling integrity risk, more serious than a pure build DoS when certificate/signature validation is involved. Certificate helper calls `certificate.verify`, `publicKey.verify` and CSR verification. No node-forge import in app/backend, and no expo-updates configuration in this project; that does not prove all future signing paths safe. Do not trust arbitrary external certificates/CSRs or use this toolchain to establish production signing trust until resolved. Need a corrected node-forge release plus compatible adoption/validated pin, or Expo tooling migration to a safe implementation. |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), moderate, missing buffer bounds checks | production UUID 7.0.3 → 11.1.1; affected <11.1.1; patched 11.1.1 | Expo → config-plugins → xcode 3.0.1 → uuid. Requires v3/v5/v6 with a caller-supplied buffer/offset. Xcode uses v4 without that buffer, so the affected function was not observed on this call path. | Production finding removed through the scoped override and native-project validation. A separate dev-only @expo/ngrok 4.1.0 → UUID 3.4.0 remains. Registry @expo/ngrok 4.1.3 still declares UUID ^3.3.2, so that patch does not fix it. Ngrok uses the legacy UUID interface; no blanket major override was applied. Avoid untrusted tunnel inputs, prefer local-only preview, and await compatible upstream replacement/update. This dev finding is outside the existing production gate, not an exception to it. |

The Node backend's third-party runtime parser is fast-xml-parser 5.11.2; these three advisory packages are not imported by the backend. Source inspection found no direct student-controlled route to the affected functions. This is a reachability assessment, not a claim of non-exploitability or proof that vulnerable tooling cannot affect build artifacts. `--omit=dev` includes Expo tooling because Expo is a production dependency; those reports must not be relabelled as shipped-client vulnerabilities or silently excluded. Native binaries and final bundle composition still require separate review.

## Validation

- Clean lockfile installation (`npm ci --ignore-scripts --no-audit`); no package resolution errors.
- `npx expo install --check`: passed after patch updates.
- `npm test`: backend tests and enforced coverage thresholds passed; TypeScript passed.
- `npm run build:web`: passed.
- `npm run build:mobile-js`: Android and iOS JavaScript exports passed. These are not native binary builds.
- In a disposable copy, `CI=1 npx expo prebuild --platform ios --no-install`: passed with the override. Parsed the generated Xcode project, generated 1,000 unique correctly formatted project identifiers, added a group, serialized and reparsed it successfully. No generated native files are committed. CocoaPods/Xcode compilation and physical-device tests were not performed.
- `npm run security:release-check`: exit 1, 16 high findings; gate remains blocked.
- Playwright browser install failed: the primary CDN returned a truncated/non-ZIP download; alternate host also failed. Local browser end-to-end tests are therefore unverified. Existing GitHub quality CI must validate them on this PR; do not infer a pass from the pre-change workflow.

## Conditions for lifting the block

1. Track [braces issue 70](https://github.com/micromatch/braces/issues/70), [forge issue 1149](https://github.com/digitalbazaar/forge/issues/1149), [forge issue 1152](https://github.com/digitalbazaar/forge/issues/1152), and the associated advisories. A release version outside the vulnerable ranges must actually exist; registry checks on 15 October found none for braces or node-forge.
2. Update through the supported Expo 57/RN 0.86 dependency line where possible. If an upstream safe release requires an SDK migration, plan and validate that migration separately. A narrowly scoped pin is acceptable only after compatible API, security-regression and build verification; no speculative unpublished versions, audit metadata editing or local patches that leave the audit failing are presented as resolution.
3. From a clean checkout of the exact candidate lockfile run `npm ci`, `npx expo install --check`, `npm run test:all`, and `npm run security:release-check`. The latter must genuinely exit 0 with no moderate-or-higher production advisories. Audit network/service failure is not a pass.
4. Require successful quality and security jobs before distribution; retain the README's device, native binary and University acceptance requirements. A passing npm gate is necessary, not sufficient, for distribution. Any future release workflow must depend on both jobs before packaging/signing/publishing.

## Follow-up integration

Reconciled with the latest main after PRs #4, #5, #6 and #8. Retains device and assistant tests, pinned workflow actions, restricted credentials and the audited candidate workflow. Registry recheck still returns braces 3.0.3 and node-forge 1.4.0; neither clears its advisory. Main protection is now active, including an up-to-date verify requirement and administrator enforcement.

Follow-up local validation: clean lockfile install passed; all 56 backend tests and TypeScript passed. Online Expo compatibility lookup timed out; offline validation against the installed SDK reports dependencies up to date (this is not a live compatibility guarantee). Browser downloads again returned a truncated archive, so current browser/platform quality validation must pass in GitHub CI before merge.

Follow-up production audit completed successfully as a lookup and still reports 16 high, zero moderate findings (audit exit 1). Web, Android and iOS JavaScript exports passed.
