# Security policy

This repository is an experimental prototype, not an approved University service.
Only the current main branch is maintained. Production distribution remains blocked
while the dependency release audit fails.

## Reporting a vulnerability

Use this repository's Security tab → Report a vulnerability if private reporting
is enabled. Do not put credentials, student records or exploit details in public
issues. If private reporting is unavailable, ask the repository owner to arrange a
private reporting channel without posting sensitive details. No response-time
commitment is implied by this policy.

## Handling findings

Validate the affected version, dependency path, runtime/build exposure and upstream
fix. Keep credentials server-side and out of EXPO_PUBLIC variables. Do not suppress
advisories or use npm audit fix --force to force an incompatible framework change.
Run the full quality suite and security:release-check before distributing an artifact.
See docs/repository-safeguards.md for the release and administration checks.
