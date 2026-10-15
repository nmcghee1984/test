# Contributing

Use a short-lived branch and a focused pull request against main. Explain the
problem, behaviour, validation and any material limitations. Keep unrelated features
in separate PRs. Rebase or merge main and resolve conflicts before final validation.

Use Node 24 (the CI version), npm ci and npm run test:all. Run
npm run security:release-check separately: passing functional checks does not clear
known dependency findings. Never commit credentials or private student records.
Use synthetic fixtures for tests. Preserve explicit sample/unavailable data states.

A qualified independent maintainer should review identity, authorisation, private
data and deployment changes before production. CODEOWNERS currently identifies
Nicholas as steward; it cannot provide independent approval for his own changes.
Do not treat AI-generated code or a passing scan as human security approval.

Do not distribute while the security gate fails. Follow the candidate-build and
rollback checklist in docs/repository-safeguards.md. Browser/mobile JS exports do
not replace native builds, physical-device and University acceptance testing.
