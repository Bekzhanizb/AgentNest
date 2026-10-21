# Contributing to AgentNest

AgentNest has a Pre-alpha desktop foundation. Useful contributions include reviewing the first
workflow, challenging ADR assumptions, improving documentation, and proposing
small verifiable implementation slices. The shell runs, but agent/provider/database
functionality remains unimplemented.

## Before a change

Read [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md), and
[ADR-001](docs/adr/ADR-001-local-architecture.md). Use an issue form to describe
the user problem and expected outcome. Discuss changes to scope, architecture, or
dependencies before a large implementation. Documentation fixes can go straight
to a PR. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Make a focused PR

1. Fork the repository or use a branch if you have access.
2. Preserve useful existing content, license text, and attribution.
3. Keep English documentation and the [Russian summary](docs/ru/README.md) aligned.
4. Separate current behavior from proposals, mocks, and future work. A provider is
   supported only after a real integration has reproducible evidence.
5. Update [CHANGELOG.md](CHANGELOG.md) under Unreleased for meaningful changes,
   following the [conventions](docs/CHANGELOG_CONVENTIONS.md).
6. Run the checks below and complete the PR template with outcomes and limitations.

For future code, include tests that exercise meaningful behavior, particularly
permission boundaries, provider failures, and persistence. A passing fake adapter
test does not prove a working provider integration. Keep private notes, credentials,
prompts, and sensitive run output out of issues, fixtures, and logs.

## Development and checks

Use Node.js 24.19.0, npm 11.9.0, and the root npm workspaces lockfile. Packages are
private. See [desktop development](docs/DEVELOPMENT.md) for runtime boundaries,
PowerShell commands, and platform requirements.

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run check
git diff --check
```

`npm run lint` checks source boundaries and includes documentation validation.
`npm run check` alone runs Markdown lint, local link/anchor validation, and repository
structure checks. It does not test application execution or external link availability.
See [verification details](docs/VERIFICATION.md). Dependency installation needs
registry access; do not report checks as passed if installation failed.

## Review and decisions

PRs should state the problem, the resulting behavior or documents, checks actually
run, and remaining decisions. Maintainers review scope and evidence before merge;
no response time is promised. Use a new ADR to supersede an accepted architectural
decision rather than silently rewriting its history. Commit subjects such as
`docs: clarify MVP limits` are recommended; no commit-message enforcement is set up.

The [existing MIT LICENSE](LICENSE) remains unchanged. Retaining MIT is proposed
for owner confirmation in [the licensing note](docs/LICENSING.md); contributors
must have the right to submit their work and preserve third-party notices.
