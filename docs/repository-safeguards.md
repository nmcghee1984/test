# Repository safeguards

## What this change configures after merge

- Weekly Dependabot npm and GitHub Actions update PRs. No automatic merging. Expo
  packages are grouped so compatible updates can be reviewed together.
- Full commit-SHA pins for workflow actions; read-only GITHUB_TOKEN; checkout does
  not leave a Git credential in the workspace.
- Existing quality suite plus a separate Security release gate. Audit failures are
  visible failures, not suppressed warnings. PR #3 contains compatible dependency
  remediation; this PR does not duplicate its package/lockfile changes.
- PR template, contribution/security policies and CODEOWNERS stewardship.
- Manually triggered release-candidate workflow on main only. It audits dependencies
  before building/testing and uploading a short-lived web artifact labelled with
  its source commit. It does not publish a site, GitHub release or app-store binary.
  It needs no publishing credentials and cannot clear the existing security block.

## Administration still needs activation

Repository files cannot turn on GitHub branch protection or security settings.
The connected GitHub tools do not expose administration writes. Until an administrator
applies these settings, main remains unprotected. A successful PR merge alone does
not activate them.

In Settings → Branches, protect main: require a PR, require the `verify` check,
require the branch to be up to date, require resolved conversations, apply to
administrators and disallow force pushes/deletion. `.github/main-protection.json`
contains the equivalent REST request body for the current single-maintainer prototype.
An authenticated repository administrator can apply it from the repository root:

```sh
gh api --method PUT repos/nmcghee1984/test/branches/main/protection --input .github/main-protection.json
gh api repos/nmcghee1984/test/branches/main/protection
```

First inspect any existing protection and rulesets: the PUT replaces the branch
protection configuration. The assessment on 15 October 2026 found main unprotected
and no rulesets. Reconcile any newer restrictions rather than overwriting them.

Zero required approvals is intentional for a solo-maintained prototype; PRs and
quality checks are still required. Do not claim independent review is enforced.
When a second authorised maintainer is available, require one approval, dismiss
stale approvals and require approval of the latest push. For production/private
student-system work, independent review is a prerequisite. Naming yourself in
CODEOWNERS does not supply it.

The Security release gate is deliberately separate from the required `verify`
check. Known upstream vulnerabilities currently fail it; making it mandatory for
all merges would also stop unrelated fixes. It MUST pass before any distribution,
and the candidate workflow enforces that. No warning-only or audit bypass exists.
When the baseline is fixed, make Security release gate a required merge check too.

Also review Settings → Code security: enable dependency graph, Dependabot alerts
and security updates, secret scanning/push protection, and private vulnerability
reporting where available. CodeQL has already run; keep it enabled. Configuration
files do not prove these account settings are active. Set automatic branch deletion
in General after choosing the team's cleanup policy. Verify public visibility is
intentional; do not put private student information in this public repository.

## Release and rollback

1. Review and merge the intended PRs; reconcile overlap with PR #3's security job.
2. Confirm required checks and security settings actually enforce the policy.
3. Run Release candidate on main. Audit failure means stop and remediate compatible
   dependencies; never downgrade the framework blindly or suppress the failure.
4. Record the exact source SHA, candidate artifact/run URL, dependency audit result,
   actual native/device tests, University approvals and known limitations.
5. Once approved, create an annotated version tag and release notes identifying
   that tested SHA. Publishing to hosting/app stores requires its own reviewed
   environment, credentials, approval and native build pipeline, not supplied here.
6. Before deployment, retain the previous approved artifact and test rollback on
   the actual hosting/store channel. Revert a faulty change through a PR, run all
   gates again and deploy an approved artifact. Do not reset or force-push main.

No production deployment or independent reviewer is invented by this setup.
